const DB_NAME = 'hireSchemaApp';
const STORE_NAME = 'kv';
const DB_VERSION = 1;

const memoryFallback = new Map<string, string>();
let dbPromise: Promise<IDBDatabase | null> | null = null;

const hasWindow = () => typeof window !== 'undefined';
const hasIndexedDb = () => hasWindow() && typeof window.indexedDB !== 'undefined';

const openDatabase = async (): Promise<IDBDatabase | null> => {
  if (!hasIndexedDb()) return null;
  if (!dbPromise) {
    dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Failed to open IndexedDB'));
    }).catch((error) => {
      console.warn('IndexedDB unavailable, using fallback storage:', error);
      return null;
    });
  }

  return dbPromise;
};

const readFromLocalStorage = (key: string): string | null => {
  try {
    if (hasWindow() && window.localStorage) return window.localStorage.getItem(key);
  } catch (error) {
    console.warn('localStorage read failed:', error);
  }
  return memoryFallback.get(key) ?? null;
};

const writeToLocalStorage = (key: string, value: string): void => {
  try {
    if (hasWindow() && window.localStorage) {
      window.localStorage.setItem(key, value);
      return;
    }
  } catch (error) {
    console.warn('localStorage write failed:', error);
  }
  memoryFallback.set(key, value);
};

const removeFromLocalStorage = (key: string): void => {
  try {
    if (hasWindow() && window.localStorage) {
      window.localStorage.removeItem(key);
    }
  } catch (error) {
    console.warn('localStorage remove failed:', error);
  }
  memoryFallback.delete(key);
};

const getRaw = async (key: string): Promise<string | null> => {
  const db = await openDatabase();
  if (!db) return readFromLocalStorage(key);

  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(key);

    request.onsuccess = () => {
      const value = request.result;
      resolve(typeof value === 'string' ? value : null);
    };
    request.onerror = () => {
      console.warn('IndexedDB read failed, falling back to localStorage');
      resolve(readFromLocalStorage(key));
    };
  });
};

const setRaw = async (key: string, value: string): Promise<void> => {
  const db = await openDatabase();
  if (!db) {
    writeToLocalStorage(key, value);
    return;
  }

  await new Promise<void>((resolve) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(value, key);

    request.onsuccess = () => resolve();
    request.onerror = () => {
      console.warn('IndexedDB write failed, falling back to localStorage');
      writeToLocalStorage(key, value);
      resolve();
    };
  });
};

const removeRaw = async (key: string): Promise<void> => {
  const db = await openDatabase();
  if (!db) {
    removeFromLocalStorage(key);
    return;
  }

  await new Promise<void>((resolve) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(key);

    request.onsuccess = () => resolve();
    request.onerror = () => {
      console.warn('IndexedDB delete failed, falling back to localStorage');
      removeFromLocalStorage(key);
      resolve();
    };
  });
};

export const storageService = {
  async getJSON<T>(key: string): Promise<T | null> {
    const raw = await getRaw(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch (error) {
      console.warn(`Failed to parse JSON for key "${key}":`, error);
      return null;
    }
  },

  async setJSON<T>(key: string, value: T): Promise<void> {
    await setRaw(key, JSON.stringify(value));
  },

  async remove(key: string): Promise<void> {
    await removeRaw(key);
  },

  async migrateFromLocalStorage(key: string): Promise<void> {
    if (!hasIndexedDb()) return;
    const existing = await getRaw(key);
    if (existing) return;

    const legacy = readFromLocalStorage(key);
    if (!legacy) return;

    await setRaw(key, legacy);
    removeFromLocalStorage(key);
  }
};
