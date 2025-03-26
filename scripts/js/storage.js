// storage.js - Responsible for data persistence using IndexedDB
const SnippetStorage = {
    // Database configuration
    dbConfig: {
        name: 'SnipMasterDB',
        version: 1,
        storeName: 'snippets'
    },

    // Open database connection
    openDB: function () {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbConfig.name,
                this.dbConfig.version);

            // Handle database upgrade/creation
            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Create snippets object store if it doesn't exist
                if
                    (!db.objectStoreNames.contains(this.dbConfig.storeName)) {
                    const store =
                        db.createObjectStore(this.dbConfig.storeName, { keyPath: 'id' });

                    // Create useful indexes
                    store.createIndex('by-language', 'language', {
                        unique:
                            false
                    });
                    store.createIndex('by-modified', 'lastModified', {
                        unique: false
                    });
                    store.createIndex('by-sync-status', 'syncStatus', {
                        unique: false
                    });

                    console.log('Database schema created');
                }
            };
            // Success handler
            request.onsuccess = (event) => {
                const db = event.target.result;
                console.log('Database opened successfully');
                resolve(db);
            };

            // Error handler
            request.onerror = (event) => {
                console.error('Database error:', event.target.error);
                reject('Error opening database');
            };
        });
    },

    // Get all snippets
    getAll: async function () {
        const db = await this.openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(this.dbConfig.storeName,
                'readonly');
            const store =
                transaction.objectStore(this.dbConfig.storeName);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    // Get a single snippet by ID
    getById: async function (id) {
        const db = await this.openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(this.dbConfig.storeName,
                'readonly');
            const store =
                transaction.objectStore(this.dbConfig.storeName);
            const request = store.get(id);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    // Save a snippet (create or update)
    save: async function (snippet) {
        // Ensure snippet has required fields
        if (!snippet.id) {
            snippet.id = Date.now().toString();
        }

        if (!snippet.created) {
            snippet.created = new Date().toISOString();
        }

        snippet.lastModified = new Date().toISOString();
        snippet.syncStatus = 'pending'; // For future sync functionality

        const db = await this.openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(this.dbConfig.storeName,
                'readwrite');
            const store =
                transaction.objectStore(this.dbConfig.storeName);
            const request = store.put(snippet);

            request.onsuccess = () => resolve(snippet);
            request.onerror = () => reject(request.error);
        });
    },

    // Delete a snippet
    delete: async function (id) {
        const db = await this.openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(this.dbConfig.storeName,
                'readwrite');
            const store =
                transaction.objectStore(this.dbConfig.storeName);
            const request = store.delete(id);

            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    },

    // Get snippets by language
    getByLanguage: async function (language) {
        const db = await this.openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(this.dbConfig.storeName,
                'readonly');
            const store =
                transaction.objectStore(this.dbConfig.storeName);
            const index = store.index('by-language');
            const request = index.getAll(language);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    // Migrate data from localStorage
    migrateFromLocalStorage: async function () {
        // Check if migration has been done
        if (localStorage.getItem('dbMigrationDone')) {
            console.log('Migration already completed');
            return;
        }

        try {
            // Get snippets from localStorage
            const localSnippets =
                JSON.parse(localStorage.getItem('snippets') || '[]');

            if (localSnippets.length > 0) {
                console.log(`Migrating ${localSnippets.length} snippets to
IndexedDB...`);

                // Save each snippet to IndexedDB
                for (const snippet of localSnippets) {
                    await this.save(snippet);
                }

                console.log('Migration completed successfully');
            } else {
                console.log('No snippets to migrate');
            }

            // Mark migration as done
            localStorage.setItem('dbMigrationDone', 'true');

        } catch (error) {
            console.error('Error during migration:', error);
        }
    }
};