// js/data.js

class Database {
    constructor() {
        this.dbName = 'WorkLogDB';
        this.version = 1;
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = (event) => {
                console.error("Database error:", event.target.error);
                reject(event.target.error);
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Entries Store: indexed by monthKey for easy chunking during sync
                if (!db.objectStoreNames.contains('entries')) {
                    const entryStore = db.createObjectStore('entries', { keyPath: 'id' });
                    entryStore.createIndex('monthKey', 'monthKey', { unique: false });
                    entryStore.createIndex('date', 'date', { unique: false });
                    entryStore.createIndex('projectId', 'projectId', { unique: false });
                }

                // Projects Store
                if (!db.objectStoreNames.contains('projects')) {
                    db.createObjectStore('projects', { keyPath: 'id' });
                }

                // Metadata Store: Used for sync state (SHAs), tokens, and settings
                if (!db.objectStoreNames.contains('metadata')) {
                    db.createObjectStore('metadata', { keyPath: 'key' });
                }
            };
        });
    }

    async _runTransaction(storeName, mode, operation) {
        if (!this.db) throw new Error("Database not initialized");
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, mode);
            const store = transaction.objectStore(storeName);
            const request = operation(store);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // --- Entries API ---

    async saveEntry(entry) {
        entry.updatedAt = new Date().toISOString();
        return this._runTransaction('entries', 'readwrite', store => store.put(entry));
    }

    async getEntriesByMonth(monthKey) {
        if (!this.db) throw new Error("Database not initialized");
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction('entries', 'readonly');
            const store = transaction.objectStore('entries');
            const index = store.index('monthKey');
            const request = index.getAll(monthKey);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // --- Projects API ---

    async saveProject(project) {
        project.updatedAt = new Date().toISOString();
        return this._runTransaction('projects', 'readwrite', store => store.put(project));
    }

    async getAllProjects() {
        return this._runTransaction('projects', 'readonly', store => store.getAll());
    }

    // --- Metadata / Sync API ---

    async getMetadata(key) {
        return this._runTransaction('metadata', 'readonly', store => store.get(key));
    }

    async saveMetadata(key, value) {
        return this._runTransaction('metadata', 'readwrite', store => store.put({ key, value }));
    }
}

const db = new Database();