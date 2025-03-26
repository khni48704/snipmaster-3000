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
            snippetList.innerHTML = snippets.map(snippet => `
                <div class="snippet-item ${snippet.id === this.currentSnippetId ? 'selected' : ''}" data-id="${snippet.id}">
                    <div class="snippet-info">
                        <strong>${snippet.language}</strong>
                        <div class="snippet-dates">
                            <small>Created: ${new Date(snippet.created).toLocaleDateString()}</small>
                            <small>Modified: ${new Date(snippet.lastModified).toLocaleDateString()}</small>
                        </div>
                    </div>
                    <pre><code>${snippet.code.substring(0, 50)}${snippet.code.length > 50 ? '...' : ''}</code></pre>
                    <div class="snippet-actions">
                        <button class="delete-btn" data-id="${snippet.id}">Delete</button>
                    </div>
                </div>
            `).join('');
            this.addSnippetEventListeners();
        } catch (error) {
            console.error('Error displaying snippets:', error);
            this.showMessage('Failed to load snippets', true);
        }
    },

    addSnippetEventListeners: function () {
        this.elements.snippetList.querySelectorAll('.snippet-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (!e.target.matches('.delete-btn')) {
                    const id = item.dataset.id;
                    this.handlers.snippetItemClick(id);
                }
            });
        });

        this.elements.snippetList.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = e.target.dataset.id;
                if (id) {
                    this.handlers.deleteButtonClick(id);
                } else {
                    console.error('Delete button clicked, but no ID found');
                }
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
        }
    }
};