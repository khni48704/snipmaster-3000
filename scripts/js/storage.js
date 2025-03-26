const SnippetStorage = {
    // Database configuration
    dbConfig: {
        name: 'SnipMasterDB',
        version: 1,
        storeName: 'snippets'
    },

    // Sync configuration
    syncConfig: {
        lastSyncTime: localStorage.getItem('lastSyncTime') || null,
        isSyncing: false,
        syncEndpoint: '/api/sync' // Mock endpoint. No endpoint yet
    },

    // Open database connection
    openDB: function () {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbConfig.name, this.dbConfig.version);

            // Handle database upgrade/creation
            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Create snippets object store if it doesn't exist
                if (!db.objectStoreNames.contains(this.dbConfig.storeName)) {
                    const store = db.createObjectStore(this.dbConfig.storeName, { keyPath: 'id' });

                    // Create useful indexes
                    store.createIndex('by-language', 'language', { unique: false });
                    store.createIndex('by-modified', 'lastModified', { unique: false });
                    store.createIndex('by-sync-status', 'syncStatus', { unique: false });

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
            const transaction = db.transaction(this.dbConfig.storeName, 'readonly');
            const store = transaction.objectStore(this.dbConfig.storeName);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    // Get a single snippet by ID
    getById: async function (id) {
        const db = await this.openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(this.dbConfig.storeName, 'readonly');
            const store = transaction.objectStore(this.dbConfig.storeName);
            const request = store.get(id);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    // Save a snippet (create or update)
    save: async function (snippet, setPending = true) {
        // Ensure snippet has required fields
        if (!snippet.id) {
            snippet.id = Date.now().toString();
        }
        if (!snippet.created) {
            snippet.created = new Date().toISOString();
        }

        snippet.lastModified = new Date().toISOString();

        // Only set as pending if not already synced and setPending is true
        if (setPending && snippet.syncStatus !== 'synced') {
            snippet.syncStatus = 'pending';
        }

        const db = await this.openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(this.dbConfig.storeName, 'readwrite');
            const store = transaction.objectStore(this.dbConfig.storeName);
            const request = store.put(snippet);

            request.onsuccess = () => resolve(snippet);
            request.onerror = () => reject(request.error);
        });
    },

    // Delete a snippet
    delete: async function (id) {
        const db = await this.openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(this.dbConfig.storeName, 'readwrite');
            const store = transaction.objectStore(this.dbConfig.storeName);
            const request = store.delete(id);

            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    },

    // Get snippets by language
    getByLanguage: async function (language) {
        const db = await this.openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(this.dbConfig.storeName, 'readonly');
            const store = transaction.objectStore(this.dbConfig.storeName);
            const index = store.index('by-language');
            const request = index.getAll(language);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    // Get all pending snippets
    getPendingSync: async function () {
        const db = await this.openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(this.dbConfig.storeName, 'readonly');
            const store = transaction.objectStore(this.dbConfig.storeName);
            const index = store.index('by-sync-status');
            const request = index.getAll('pending');

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    // Mark snippet as synced
    markAsSynced: async function (id) {
        const snippet = await this.getById(id);
        if (snippet) {
            snippet.syncStatus = 'synced';
            return this.save(snippet, false); // Pass false to avoid setting pending status again
        }
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
            const localSnippets = JSON.parse(localStorage.getItem('snippets') || '[]');

            if (localSnippets.length > 0) {
                console.log(`Migrating ${localSnippets.length} snippets to IndexedDB...`);

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
    },

    // Sync a single snippet
    syncSingleSnippet: async function (id) {
        try {
            // Get the snippet
            const snippet = await this.getById(id);
            if (!snippet || snippet.syncStatus !== 'pending') {
                return { success: false, message: 'Nothing to sync' };
            }

            // Send to server
            await this.syncWithServer(snippet);

            // Mark as synced
            await this.markAsSynced(snippet.id);
            return { success: true };
        } catch (error) {
            console.error(`Failed to sync snippet ${id}:`, error);
            return { success: false, error };
        }
    },

    // Sync all pending snippets
    syncAll: async function () {
        // Prevent multiple simultaneous syncs
        if (this.syncConfig.isSyncing) {
            return { success: false, message: 'Sync already in progress' };
        }

        this.syncConfig.isSyncing = true;
        // Notify sync started
        document.dispatchEvent(new CustomEvent('sync-status-change', {
            detail: { status: 'syncing', message: 'Starting sync...' }
        }));

        try {
            const pendingSnippets = await this.getPendingSync();

            if (pendingSnippets.length === 0) {
                // Notify nothing to sync
                document.dispatchEvent(new CustomEvent('sync-status-change', {
                    detail: { status: 'sync-success', message: 'Nothing to sync' }
                }));
                this.syncConfig.isSyncing = false;
                return { success: true, message: 'Nothing to sync' };
            }

            let successCount = 0;
            let errorCount = 0;

            for (const snippet of pendingSnippets) {
                try {
                    // Send to server
                    await this.syncWithServer(snippet);

                    // Mark as synced
                    await this.markAsSynced(snippet.id);

                    successCount++;

                    // Update UI with progress
                    document.dispatchEvent(new CustomEvent('sync-status-change', {
                        detail: {
                            status: 'syncing',
                            message: `Syncing ${successCount + errorCount}/${pendingSnippets.length}`
                        }
                    }));

                } catch (error) {
                    console.error(`Failed to sync snippet ${snippet.id}:`, error);
                    errorCount++;
                }
            }

            // Update last sync time
            if (successCount > 0) {
                this.updateLastSyncTime();
            }

            // Notify sync completed
            if (errorCount === 0) {
                document.dispatchEvent(new CustomEvent('sync-status-change', {
                    detail: {
                        status: 'sync-success',
                        message: `All ${successCount} snippets synced successfully`
                    }
                }));
            } else {
                document.dispatchEvent(new CustomEvent('sync-status-change', {
                    detail: {
                        status: 'sync-error',
                        message: `Synced ${successCount}/${pendingSnippets.length} snippets. ${errorCount} failed.`
                    }
                }));
            }

            return { success: true, totalCount: pendingSnippets.length, successCount, errorCount };
        } catch (error) {
            console.error('Sync failed:', error);
            document.dispatchEvent(new CustomEvent('sync-status-change', {
                detail: { status: 'sync-error', message: 'Sync failed completely' }
            }));
            return { success: false, error };
        } finally {
            this.syncConfig.isSyncing = false;
        }
    },

    // Update last sync time
    updateLastSyncTime: function () {
        this.syncConfig.lastSyncTime = new Date().toISOString();
        localStorage.setItem('lastSyncTime', this.syncConfig.lastSyncTime);

        // Notify any open tabs about the sync (for multi-tab support)
        try {
            localStorage.setItem('syncEvent', Date.now().toString());
        } catch (e) {
            console.error('Failed to notify other tabs about sync:', e);
        }

        // Dispatch event for last sync time update
        document.dispatchEvent(new CustomEvent('last-sync-updated', {
            detail: { time: this.syncConfig.lastSyncTime }
        }));
    },

    // Get last sync time
    getLastSyncTime: function () {
        return this.syncConfig.lastSyncTime;
    },

    // Register for background sync
    registerBackgroundSync: async function () {
        if ('serviceWorker' in navigator && 'SyncManager' in window) {
            try {
                const registration = await navigator.serviceWorker.ready;
                await registration.sync.register('sync-snippets');
                console.log('Background sync registered');
                return true;
            } catch (error) {
                console.error('Background sync registration failed:', error);
                return false;
            }
        }
        return false;
    },

    // Simulate sync with server (for mock purposes)
    syncWithServer: async function (snippet) {
        // Simulate API call
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                if (Math.random() < 0.9) {
                    resolve({ success: true, data: snippet });
                } else {
                    reject(new Error('Server error'));
                }
            }, 500);
        });
    }
};
