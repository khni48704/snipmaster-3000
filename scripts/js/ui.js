const SnippetUI = {
    elements: {
        codeEditor: document.getElementById('codeEditor'),
        languageSelect: document.getElementById('languageSelect'),
        saveBtn: document.getElementById('saveBtn'),
        newSnippetBtn: document.getElementById('newSnippetBtn'),
        snippetList: document.getElementById('snippetList'),
        connectionStatus: null
    },

    currentSnippetId: null,

    init: async function () {
        this.elements.saveBtn.addEventListener('click', this.handlers.saveButtonClick);
        this.elements.newSnippetBtn.addEventListener('click', this.handlers.newButtonClick);
        this.setupConnectionStatus();
        await this.renderSnippets();
    },

    setupConnectionStatus: function () {
        const statusElement = document.createElement('div');
        statusElement.id = 'connection-status';
        statusElement.className = 'connection-status';
        document.body.appendChild(statusElement);
        this.elements.connectionStatus = statusElement;
        window.addEventListener('online', this.handlers.onlineStatusChange);
        window.addEventListener('offline', this.handlers.onlineStatusChange);
        this.updateConnectionStatus();
    },

    updateConnectionStatus: function () {
        const statusElement = this.elements.connectionStatus;
        if (!statusElement) return;
        statusElement.textContent = navigator.onLine ? '🟢 Online' : '🔴 Offline';
        statusElement.classList.toggle('offline', !navigator.onLine);
        statusElement.classList.toggle('online', navigator.onLine);
    },

    renderSnippets: async function () {
        try {
            const snippets = await SnippetStorage.getAll();
            const snippetList = this.elements.snippetList;
            snippetList.innerHTML = snippets.map(snippet => {
                // Determine status icon and class
                let statusIcon = '';
                let statusClass = '';

                if (snippet.syncStatus === 'pending') {
                    statusIcon = '🔄 ';
                    statusClass = 'pending';
                } else if (snippet.syncStatus === 'error') {
                    statusIcon = '⚠ ';
                    statusClass = 'error';
                } else {
                    statusIcon = '✓';
                    statusClass = 'synced';
                }

                return `
                    <div class="snippet-item ${snippet.id === this.currentSnippetId ? 'selected' : ''}" data-id="${snippet.id}">
                        <div class="snippet-info">
                            <div class="snippet-header">
                                <strong>${snippet.language}</strong>
                                <span class="snippet-sync-status ${statusClass}" title="${statusClass === 'pending' ? 'Waiting to sync' : statusClass === 'error' ? 'Sync failed' : 'Synced'}">
                                    ${statusIcon}
                                </span>
                            </div>
                            <div class="snippet-dates">
                                <small>Created: ${new Date(snippet.created).toLocaleDateString()}</small>
                                <small>Modified: ${new Date(snippet.lastModified).toLocaleDateString()}</small>
                                ${snippet.syncStatus === 'pending' ? '<small class="sync-message">Will sync when online</small>' : ''}
                            </div>
                        </div>
                        <pre><code>${snippet.code.substring(0, 50)}${snippet.code.length > 50 ? '...' : ''}</code></pre>
                        <div class="snippet-actions">
                            <button class="delete-btn" data-id="${snippet.id}">Delete</button>
                            ${snippet.syncStatus === 'pending' && navigator.onLine ? `<button class="sync-item-btn" data-id="${snippet.id}">Sync Now</button>` : ''}
                        </div>
                    </div>
                `;
            }).join('');

            // Add event listeners
            this.addSnippetEventListeners();
        } catch (error) {
            console.error('Error displaying snippets:', error);
            this.showMessage('Failed to load snippets', true);
        }
    },

    addSnippetEventListeners: function () {
        // Snippet item click
        this.elements.snippetList.querySelectorAll('.snippet-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (!e.target.matches('.delete-btn') && !e.target.matches('.sync-item-btn')) {
                    const id = item.dataset.id;
                    this.handlers.snippetItemClick(id);
                }
            });
        });

        // Delete button click
        this.elements.snippetList.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                this.handlers.deleteButtonClick(id);
            });
        });

        // Sync item button click
        this.elements.snippetList.querySelectorAll('.sync-item-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                this.handlers.syncItemButtonClick(id);
            });
        });
    },

    showMessage: function (text, isError = false) {
        const message = document.createElement('div');
        message.className = `status-message ${isError ? 'error' : ''}`;
        message.textContent = text;
        document.body.appendChild(message);
        setTimeout(() => message.remove(), 2000);
    },

    highlightSelectedSnippet: function (id) {
        document.querySelectorAll('.snippet-item').forEach(item => {
            item.classList.toggle('selected', item.dataset.id === id);
        });
    },

    handlers: {
        saveButtonClick: async function () {
            try {
                const snippet = {
                    code: SnippetUI.elements.codeEditor.value,
                    language: SnippetUI.elements.languageSelect.value
                };
                if (SnippetUI.currentSnippetId) {
                    const existingSnippet = await SnippetStorage.getById(SnippetUI.currentSnippetId);
                    if (existingSnippet) {
                        snippet.id = SnippetUI.currentSnippetId;
                        snippet.created = existingSnippet.created;
                    }
                }
                await SnippetStorage.save(snippet);
                if (!SnippetUI.currentSnippetId) {
                    SnippetUI.currentSnippetId = snippet.id;
                }
                await SnippetUI.renderSnippets();
                SnippetUI.showMessage('Snippet saved!');
            } catch (error) {
                console.error('Error saving snippet:', error);
                SnippetUI.showMessage('Failed to save snippet', true);
            }
        },

        newButtonClick: function () {
            SnippetUI.currentSnippetId = null;
            SnippetUI.elements.codeEditor.value = '';
            SnippetUI.elements.languageSelect.value = 'javascript';
            SnippetUI.elements.saveBtn.textContent = 'Save Snippet';
            SnippetUI.highlightSelectedSnippet(null);
        },

        snippetItemClick: async function (id) {
            try {
                const snippet = await SnippetStorage.getById(id);
                if (snippet) {
                    SnippetUI.currentSnippetId = snippet.id;
                    SnippetUI.elements.codeEditor.value = snippet.code;
                    SnippetUI.elements.languageSelect.value = snippet.language;
                    SnippetUI.elements.saveBtn.textContent = 'Update Snippet';
                    SnippetUI.highlightSelectedSnippet(id);
                }
            } catch (error) {
                console.error('Error loading snippet:', error);
                SnippetUI.showMessage('Failed to load snippet', true);
            }
        },

        deleteButtonClick: async function (id) {
            if (confirm('Are you sure you want to delete this snippet?')) {
                try {
                    await SnippetStorage.delete(id);
                    if (SnippetUI.currentSnippetId === id) {
                        SnippetUI.currentSnippetId = null;
                        SnippetUI.elements.codeEditor.value = '';
                        SnippetUI.elements.saveBtn.textContent = 'Save Snippet';
                    }
                    await SnippetUI.renderSnippets();
                    SnippetUI.showMessage('Snippet deleted!');
                } catch (error) {
                    console.error('Error deleting snippet:', error);
                    SnippetUI.showMessage('Failed to delete snippet', true);
                }
            }
        },

        onlineStatusChange: function () {
            SnippetUI.updateConnectionStatus();
        },

        syncItemButtonClick: async function (id) {
            try {
                SyncUI.updateAppState(SyncUI.APP_STATES.SYNCING, 'Syncing single snippet...');
                const result = await SnippetStorage.syncSingleSnippet(id);

                if (result.success) {
                    SyncUI.updateAppState(SyncUI.APP_STATES.SYNC_SUCCESS, 'Snippet synced successfully');
                } else {
                    SyncUI.updateAppState(SyncUI.APP_STATES.SYNC_ERROR, 'Failed to sync snippet');
                }

                // Refresh the list
                await SnippetUI.renderSnippets();
            } catch (error) {
                console.error('Error syncing snippet:', error);
                SyncUI.updateAppState(SyncUI.APP_STATES.SYNC_ERROR, 'Error syncing snippet');
            }
        }
    }
};
