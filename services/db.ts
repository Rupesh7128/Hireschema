import { HistoryItem, FileData, ContactProfile, ApplicationStatus } from '../types';
import { storageService } from './storageService';

// Storage Keys
const KEYS = {
    HISTORY: 'hireSchemaHistory',
    MASTERS: 'hireSchemaMasters',
    PROFILE: 'hireSchemaUserProfile'
};

// Simulated Delay to mimic real API network latency (optional, set to 0 for instant)
const DELAY = 0; 

const wait = () => new Promise(resolve => setTimeout(resolve, DELAY));

const readKey = async <T>(key: string, fallback: T): Promise<T> => {
    await storageService.migrateFromLocalStorage(key);
    const value = await storageService.getJSON<T>(key);
    return value ?? fallback;
};

const writeKey = async <T>(key: string, value: T): Promise<void> => {
    await storageService.setJSON(key, value);
};

export const db = {
    history: {
        getAll: async (): Promise<HistoryItem[]> => {
            await wait();
            return readKey<HistoryItem[]>(KEYS.HISTORY, []);
        },
        add: async (item: HistoryItem): Promise<HistoryItem[]> => {
            await wait();
            const current = await db.history.getAll();
            const updated = [item, ...current];
            await writeKey(KEYS.HISTORY, updated);
            return updated;
        },
        update: async (updatedItem: HistoryItem): Promise<HistoryItem[]> => {
            await wait();
            const current = await db.history.getAll();
            const updated = current.map(item => item.id === updatedItem.id ? updatedItem : item);
            await writeKey(KEYS.HISTORY, updated);
            return updated;
        },
        updateStatus: async (id: string, status: ApplicationStatus): Promise<HistoryItem[]> => {
            await wait();
            const current = await db.history.getAll();
            const updated = current.map(item => item.id === id ? { ...item, status } : item);
            await writeKey(KEYS.HISTORY, updated);
            return updated;
        },
        delete: async (id: string): Promise<HistoryItem[]> => {
            await wait();
            const current = await db.history.getAll();
            const updated = current.filter(item => item.id !== id);
            await writeKey(KEYS.HISTORY, updated);
            return updated;
        }
    },

    resumes: {
        getAll: async (): Promise<FileData[]> => {
            await wait();
            return readKey<FileData[]>(KEYS.MASTERS, []);
        },
        add: async (file: FileData): Promise<FileData[]> => {
            await wait();
            const current = await db.resumes.getAll();
            // Avoid duplicates by name
            if (current.some(f => f.name === file.name)) return current;
            
            const newFile = { ...file, id: Math.random().toString(36).substr(2, 9), uploadDate: new Date().toLocaleDateString() };
            const updated = [...current, newFile];
            await writeKey(KEYS.MASTERS, updated);
            return updated;
        },
        delete: async (name: string): Promise<FileData[]> => {
            await wait();
            const current = await db.resumes.getAll();
            const updated = current.filter(f => f.name !== name);
            await writeKey(KEYS.MASTERS, updated);
            return updated;
        }
    },

    user: {
        get: async (): Promise<ContactProfile> => {
            await wait();
            return readKey<ContactProfile>(KEYS.PROFILE, { name: '', email: '', phone: '', linkedin: '', location: '', photo: '' });
        },
        update: async (profile: ContactProfile): Promise<ContactProfile> => {
            await wait();
            await writeKey(KEYS.PROFILE, profile);
            return profile;
        }
    }
};
