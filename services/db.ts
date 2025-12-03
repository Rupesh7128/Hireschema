import { HistoryItem, FileData, ContactProfile, ApplicationStatus } from '../types';

// Storage Keys
const KEYS = {
    HISTORY: 'hireSchemaHistory',
    MASTERS: 'hireSchemaMasters',
    PROFILE: 'hireSchemaUserProfile'
};

// Simulated Delay to mimic real API network latency (optional, set to 0 for instant)
const DELAY = 0; 

const wait = () => new Promise(resolve => setTimeout(resolve, DELAY));

// Helper to safe-guard localStorage calls (prevents SecurityError in blocked envs)
const safeStorage = {
    getItem: (key: string): string | null => {
        try {
            return localStorage.getItem(key);
        } catch (e) {
            console.warn("localStorage access denied", e);
            return null;
        }
    },
    setItem: (key: string, value: string) => {
        try {
            localStorage.setItem(key, value);
        } catch (e) {
            console.warn("localStorage write denied", e);
        }
    }
};

export const db = {
    history: {
        getAll: async (): Promise<HistoryItem[]> => {
            await wait();
            const data = safeStorage.getItem(KEYS.HISTORY);
            return data ? JSON.parse(data) : [];
        },
        add: async (item: HistoryItem): Promise<HistoryItem[]> => {
            await wait();
            const current = await db.history.getAll();
            const updated = [item, ...current];
            safeStorage.setItem(KEYS.HISTORY, JSON.stringify(updated));
            return updated;
        },
        update: async (updatedItem: HistoryItem): Promise<HistoryItem[]> => {
            await wait();
            const current = await db.history.getAll();
            const updated = current.map(item => item.id === updatedItem.id ? updatedItem : item);
            safeStorage.setItem(KEYS.HISTORY, JSON.stringify(updated));
            return updated;
        },
        updateStatus: async (id: string, status: ApplicationStatus): Promise<HistoryItem[]> => {
            await wait();
            const current = await db.history.getAll();
            const updated = current.map(item => item.id === id ? { ...item, status } : item);
            safeStorage.setItem(KEYS.HISTORY, JSON.stringify(updated));
            return updated;
        },
        delete: async (id: string): Promise<HistoryItem[]> => {
            await wait();
            const current = await db.history.getAll();
            const updated = current.filter(item => item.id !== id);
            safeStorage.setItem(KEYS.HISTORY, JSON.stringify(updated));
            return updated;
        }
    },

    resumes: {
        getAll: async (): Promise<FileData[]> => {
            await wait();
            const data = safeStorage.getItem(KEYS.MASTERS);
            return data ? JSON.parse(data) : [];
        },
        add: async (file: FileData): Promise<FileData[]> => {
            await wait();
            const current = await db.resumes.getAll();
            // Avoid duplicates by name
            if (current.some(f => f.name === file.name)) return current;
            
            const newFile = { ...file, id: Math.random().toString(36).substr(2, 9), uploadDate: new Date().toLocaleDateString() };
            const updated = [...current, newFile];
            safeStorage.setItem(KEYS.MASTERS, JSON.stringify(updated));
            return updated;
        },
        delete: async (name: string): Promise<FileData[]> => {
            await wait();
            const current = await db.resumes.getAll();
            const updated = current.filter(f => f.name !== name);
            safeStorage.setItem(KEYS.MASTERS, JSON.stringify(updated));
            return updated;
        }
    },

    user: {
        get: async (): Promise<ContactProfile> => {
            await wait();
            const data = safeStorage.getItem(KEYS.PROFILE);
            return data ? JSON.parse(data) : { name: '', email: '', phone: '', linkedin: '', location: '', photo: '' };
        },
        update: async (profile: ContactProfile): Promise<ContactProfile> => {
            await wait();
            safeStorage.setItem(KEYS.PROFILE, JSON.stringify(profile));
            return profile;
        }
    }
};