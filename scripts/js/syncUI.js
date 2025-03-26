const SyncUI = {
    // App states
    APP_STATES: {
        ONLINE: 'online',
        OFFLINE: 'offline',
        SYNCING: 'syncing',
        SYNC_ERROR: 'sync-error',
        SYNC_SUCCESS: 'sync-success'
    },

    // Elements
    elements: {
        statusContainer: null,
        syncButton: null,
        lastSyncTime: null,
        offlineBanner: null
    },

    // Current app state
    currentState: null,

    // Initialize sync UI
    init: function () {
        // Set up UI elements
        this.createStatusContainer();
        this.createSyncButton();
        this.createLastSyncTimeDisplay();
        this.createOfflineBanner();

        // Set up event listeners
        this.setupEventListeners();

        // Set initial state
        this.updateAppState(navigator.onLine ? this.APP_STATES.ONLINE : this.APP_STATES.OFFLINE);
    },

    // Create status container
    createStatusContainer: function () {
        let container = document.getElementById('app-status-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'app-status-container';
            document.body.appendChild(container);
        }
        this.elements.statusContainer = container;
    },

    // Create sync button
    createSyncButton: function () {
        const header = document.querySelector('.app-header');
        if (!header) return;

        const syncButton = document.createElement('button');
        syncButton.id = 'sync-button';
        syncButton.className = 'sync-button online-only';
        syncButton.innerHTML = '🔄 Sync Now';

        header.appendChild(syncButton);
        this.elements.syncButton = syncButton;
    },

    // Create last sync time display
    createLastSyncTimeDisplay: function () {
        const syncTimeElement = document.createElement('div');
        syncTimeElement.id = 'last-sync-time';
        syncTimeElement.className = 'last-sync-time';

        // Add it near your sync button
        const header = document.querySelector('.app-header');
        if (header) {
            header.appendChild(syncTimeElement);
        }

        this.elements.lastSyncTime = syncTimeElement;

        // Initial update
        this.updateLastSyncTimeDisplay();
    },

    // Create offline banner
    createOfflineBanner: function () {
        const banner = document.createElement('div');
        banner.id = 'offline-banner';
        banner.className = 'offline-banner show-when-offline';
        banner.innerHTML = `
            <div class="offline-content">
                <div class="offline-icon">📴</div>
                <div class="offline-message">
                    <h3>You're working offline</h3>
                    <p>Changes will be saved and synced when you reconnect.</p>
                </div>
            </div>
        `;

        document.body.insertBefore(banner, document.body.firstChild);
        this.elements.offlineBanner = banner;
    },

    // Set up event listeners
    setupEventListeners: function () {
        // Network status events
        window.addEventListener('online', this.handlers.onlineStatusChange.bind(this));
        window.addEventListener('offline', this.handlers.offlineStatusChange.bind(this));

        // Sync button click
        if (this.elements.syncButton) {
            this.elements.syncButton.addEventListener('click', this.handlers.syncButtonClick.bind(this));
        }

        // Sync status change event
        document.addEventListener('sync-status-change', this.handlers.syncStatusChange.bind(this));
        
        // Last sync time update
        document.addEventListener('last-sync-updated', this.handlers.lastSyncUpdated.bind(this));
    },

    // Update app state
    updateAppState: function (newState, message = '') {
        const statusContainer = this.elements.statusContainer;
        if (!statusContainer) return;

        // Update current state
        this.currentState = newState;

        // Clear previous status
        statusContainer.innerHTML = '';

        // Create new status element
        const statusElement = document.createElement('div');
        statusElement.className = `app-status ${newState}`;

        // Set icon and message based on state
        let icon = '', defaultMessage = '';

        switch (newState) {
            case this.APP_STATES.ONLINE:
                icon = '🟢 ';
                defaultMessage = 'Online - All changes saved';
                break;
            case this.APP_STATES.OFFLINE:
                icon = '🔴 ';
                defaultMessage = 'Offline - Changes will sync when online';
                break;
            case this.APP_STATES.SYNCING:
                icon = '🔄 ';
                defaultMessage = 'Syncing changes...';
                break;
            case this.APP_STATES.SYNC_ERROR:
                icon = '⚠ ';
                defaultMessage = 'Sync error - Will retry later';
                break;
            case this.APP_STATES.SYNC_SUCCESS:
                icon = '✅ ';
                defaultMessage = 'All changes synced successfully';
                break;
        }

        statusElement.innerHTML = `
            <span class="status-icon">${icon}</span>
            <span class="status-message">${message || defaultMessage}</span>
        `;

        // Add to container
        statusContainer.appendChild(statusElement);

        // If sync success, auto-revert to online after 3 seconds
        if (newState === this.APP_STATES.SYNC_SUCCESS) {
            setTimeout(() => {
                this.updateAppState(this.APP_STATES.ONLINE);
            }, 3000);
        }

        // Update body class for CSS targeting
        document.body.className = `app-state-${newState}`;
    },

    // Update last sync time display
    updateLastSyncTimeDisplay: function () {
        const timeElement = this.elements.lastSyncTime;
        if (!timeElement) return;

        const lastSyncTime = SnippetStorage.getLastSyncTime();

        if (lastSyncTime) {
            const syncDate = new Date(lastSyncTime);
            const now = new Date();
            const diffMinutes = Math.floor((now - syncDate) / (1000 * 60));

            let timeText = '';
            if (diffMinutes < 1) {
                timeText = 'just now';
            } else if (diffMinutes < 60) {
                timeText = `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
            } else if (diffMinutes < 1440) {
                const hours = Math.floor(diffMinutes / 60);
                timeText = `${hours} hour${hours === 1 ? '' : 's'} ago`;
            } else {
                timeText = syncDate.toLocaleDateString() + ' ' +
                    syncDate.toLocaleTimeString([], {
                        hour: '2-digit', minute: '2-digit' });
            }

            timeElement.textContent = `Last synced: ${timeText}`;
            timeElement.style.display = 'block';
        } else {
            timeElement.textContent = 'Never synced';
            timeElement.style.display = 'block';
        }
    },

    // Event handlers
    handlers: {
        onlineStatusChange: function () {
            if (navigator.onLine) {
                this.updateAppState(this.APP_STATES.ONLINE);

                // Try background sync first
                SnippetStorage.registerBackgroundSync().then(registered => {
                    // If background sync is not supported or registration failed, try manual sync
                    if (!registered) {
                        this.handlers.syncButtonClick.call(this);
                    }
                }).catch(error => {
                    console.error('Background sync failed:', error);
                    this.handlers.syncButtonClick.call(this); // fallback to manual sync
                });
            }
        },

        offlineStatusChange: function () {
            if (!navigator.onLine) {
                this.updateAppState(this.APP_STATES.OFFLINE);
            }
        },

        syncButtonClick: async function () {
            this.updateAppState(this.APP_STATES.SYNCING, 'Starting sync...');

            try {
                const result = await SnippetStorage.syncAll();

                // Refresh snippets display after sync
                await SnippetUI.renderSnippets();

            } catch (error) {
                console.error('Error during manual sync:', error);
                this.updateAppState(this.APP_STATES.SYNC_ERROR, 'Sync failed');
            }
        },

        syncStatusChange: function (event) {
            const { status, message } = event.detail;
            this.updateAppState(status, message);
        },

        lastSyncUpdated: function (event) {
            this.updateLastSyncTimeDisplay();
        }
    }
};
