// ui.js - Responsible for user interface
const SnippetUI = {
    // Store DOM elements
    elements: {
        codeEditor: document.getElementById('codeEditor'),
        languageSelect: document.getElementById('languageSelect'),
        saveBtn: document.getElementById('saveBtn'),
        newSnippetBtn: document.getElementById('newSnippetBtn'),
        snippetList: document.getElementById('snippetList'),
        connectionStatus: null
    },

    // Track current snippet
    currentSnippetId: null,

    // Initialize UI
    init: async function () {
        // Set up event listeners
        this.elements.saveBtn.addEventListener('click',
            this.handlers.saveButtonClick);
        this.elements.newSnippetBtn.addEventListener('click',
            this.handlers.newButtonClick);

        // Set up connection status
        this.setupConnectionStatus();

        // Display existing snippets
        await this.renderSnippets();
    },

    // Set up connection status indicator
    setupConnectionStatus: function () {
        // Create status element if it doesn't exist
        const statusElement = document.createElement('div');
        statusElement.id = 'connection-status';
        statusElement.className = 'connection-status';
        document.body.appendChild(statusElement);

        // Save reference
        this.elements.connectionStatus = statusElement;

        // Set up event listeners
        window.addEventListener('online',
            this.handlers.onlineStatusChange);
        window.addEventListener('offline',
            this.handlers.onlineStatusChange);

        // Initial update
        this.updateConnectionStatus();
    },

    // Update connection status display
    updateConnectionStatus: function () {
        const statusElement = this.elements.connectionStatus;
        if (!statusElement) return;

        if (navigator.onLine) {
            statusElement.textContent = '🟢 Online';
            statusElement.classList.remove('offline');
            statusElement.classList.add('online');
        } else {
            statusElement.textContent = '🔴 Offline';
            statusElement.classList.remove('online');
            statusElement.classList.add('offline');
        }
    },

    // Render all snippets
    renderSnippets: async function () {
        try {
            const snippets = await SnippetStorage.getAll();
            const snippetList = this.elements.snippetList;

            snippetList.innerHTML = snippets.map(snippet => `
            <div class="snippet-item ${snippet.id ===
                    this.currentSnippetId ? 'selected' : ''}"
            data-id="${snippet.id}">
            <div class="snippet-info">
            <strong>${snippet.language}</strong>
            <div class="snippet-dates">
            <small>Created: ${new
                    Date(snippet.created).toLocaleDateString()}</small>
            <small>Modified: ${new
                    Date(snippet.lastModified).toLocaleDateString()}</small>
            </div>
            </div>
            <pre><code>${snippet.code.substring(0,
                        50)}${snippet.code.length > 50 ? '...' : ''}</code></pre>
            <div class="snippet-actions">
            <button class="delete-btn" dataid="${snippet.id}">Delete</button>
            </div>
            </div>
            `).join('');

            // Add event listeners
            this.addSnippetEventListeners();

        } catch (error) {
            console.error('Error displaying snippets:', error);
            this.showMessage('Failed to load snippets', true);
        }
    },

    // Add event listeners to snippet items
    addSnippetEventListeners: function () {
        // Snippet item click
        this.elements.snippetList.querySelectorAll('.snippetitem').forEach(item => {
            item.addEventListener('click', (e) => {
                if (!e.target.matches('.delete-btn')) {
                    const id = item.dataset.id;
                    this.handlers.snippetItemClick(id);
                }
            });
        });

        // Delete button click
        this.elements.snippetList.querySelectorAll('.deletebtn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                this.handlers.deleteButtonClick(id);
            });
        });
    },

    // Show status message
    showMessage: function (text, isError = false) {
        const message = document.createElement('div');
        message.className = `status-message ${isError ? 'error' : ''}`;
        message.textContent = text;
        document.body.appendChild(message);

        setTimeout(() => {
            message.remove();
        }, 2000);
    },

    // Highlight selected snippet
    highlightSelectedSnippet: function (id) {
        document.querySelectorAll('.snippet-item').forEach(item => {
            item.classList.toggle('selected', item.dataset.id === id);
        });
    },

    // Event handlers
    handlers: {
        saveButtonClick: async function () {
            try {
                const snippet = {
                    code: SnippetUI.elements.codeEditor.value,
                    language: SnippetUI.elements.languageSelect.value
                };

                if (SnippetUI.currentSnippetId) {
                    // Update existing snippet
                    const existingSnippet = await
                        SnippetStorage.getById(SnippetUI.currentSnippetId);
                    if (existingSnippet) {
                        snippet.id = SnippetUI.currentSnippetId;
                        snippet.created = existingSnippet.created;
                    }
                }

                await SnippetStorage.save(snippet);

                // If this was a new snippet, update currentSnippetId
                if (!SnippetUI.currentSnippetId) {
                    SnippetUI.currentSnippetId = snippet.id;
                }

                // Update UI
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
                    SnippetUI.elements.languageSelect.value =
                        snippet.language;

                    // Update UI
                    SnippetUI.elements.saveBtn.textContent = 'UpdateSnippet';
                    SnippetUI.highlightSelectedSnippet(id);

                    // If you have a preview feature
                    if (typeof updatePreview === 'function') {
                        updatePreview();
                    }
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
                    // Update UI
                    if (SnippetUI.currentSnippetId === id) {
                        SnippetUI.currentSnippetId = null;
                        SnippetUI.elements.codeEditor.value = '';
                        SnippetUI.elements.saveBtn.textContent = 'SaveSnippet';
                    }
                    await SnippetUI.renderSnippets();
                    SnippetUI.showMessage('Snippet deleted!');

                } catch (error) {
                    console.error('Error deleting snippet:', error);
                    SnippetUI.showMessage('Failed to delete snippet',
                        true);
                }
            }
        },

        onlineStatusChange: function () {
            SnippetUI.updateConnectionStatus();
        }
    }
};