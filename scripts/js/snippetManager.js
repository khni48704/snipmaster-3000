export class SnippetManager {
    constructor() {
        this.currentSnippetId = null;
        this.codeEditor = document.getElementById('codeEditor');
        this.languageSelect = document.getElementById('languageSelect');
        this.categorySelect = this.initializeCategorySelect();
    }

    initializeCategorySelect() {
        const categories = ['General', 'Utils', 'Components', 'Scripts'];
        const categorySelect = document.createElement('select');
        categorySelect.innerHTML = categories.map(cat =>
            `<option value="${cat}">${cat}</option>`
        ).join('');
        document.querySelector('.toolbar').appendChild(categorySelect);
        return categorySelect;
    }

    saveSnippet() {
        const snippets = JSON.parse(localStorage.getItem('snippets') || '[]');
    
        const snippet = {
            code: this.codeEditor.value,
            language: this.languageSelect.value,
            category: this.categorySelect?.value || 'General',
            lastModified: new Date().toISOString()
        };

        if (this.currentSnippetId) {
            // Updating an existing snippet
            const index = snippets.findIndex(s => s.id === this.currentSnippetId);
            if (index !== -1) {
                snippet.id = this.currentSnippetId;
                snippet.created = snippets[index].created;
                snippets[index] = snippet;
            }
        } else {
            // Creating a new snippet
            snippet.id = Date.now().toString();
            snippet.created = snippet.lastModified;
            snippets.push(snippet);
        }

        localStorage.setItem('snippets', JSON.stringify(snippets));
        this.displaySnippets();
        this.showMessage('Snippet saved!');
    }

    loadSnippet(id) {
        const snippets = JSON.parse(localStorage.getItem('snippets') || '[]');
        const snippet = snippets.find(s => s.id === id);

        if (snippet) {
            this.currentSnippetId = snippet.id;
            this.codeEditor.value = snippet.code;
            this.languageSelect.value = snippet.language;
            document.getElementById('saveBtn').textContent = 'Update Snippet';
            this.highlightSelectedSnippet(id);
        }
    }

    displaySnippets() {
        const snippets = JSON.parse(localStorage.getItem('snippets') || '[]');
        const snippetList = document.getElementById('snippetList');

        snippetList.innerHTML = snippets.map(snippet => 
            `<div class="snippet-item ${snippet.id === this.currentSnippetId ? 'selected' : ''}" 
                 data-id="${snippet.id}">
                <div class="snippet-info">
                    <div class="snippet-header">
                        <strong>${snippet.language}</strong>
                        <span class="category-tag">${snippet.category}</span>
                    </div>
                    <div class="snippet-dates">
                        <small>Created: ${new Date(snippet.created).toLocaleDateString()}</small>
                        <small>Modified: ${new Date(snippet.lastModified).toLocaleDateString()}</small>
                    </div>
                </div>
                <pre><code>${snippet.code.substring(0, 50)}${snippet.code.length > 50 ? '...' : ''}</code></pre>
                <div class="snippet-actions">
                    <button class="delete-btn" data-id="${snippet.id}">Delete</button>
                </div>
            </div>`
        ).join('');

        this.attachSnippetEventListeners();
    }

    attachSnippetEventListeners() {
        const snippetList = document.getElementById('snippetList');

        snippetList.querySelectorAll('.snippet-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (!e.target.matches('.delete-btn')) {
                    this.loadSnippet(item.dataset.id);
                }
            });
        });

        snippetList.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteSnippet(btn.dataset.id);
            });
        });
    }

    deleteSnippet(id) {
        if (confirm('Are you sure you want to delete this snippet?')) {
            let snippets = JSON.parse(localStorage.getItem('snippets') || '[]');
            snippets = snippets.filter(s => s.id !== id);
            localStorage.setItem('snippets', JSON.stringify(snippets));

            if (this.currentSnippetId === id) {
                this.currentSnippetId = null;
                this.codeEditor.value = '';
                document.getElementById('saveBtn').textContent = 'Save Snippet';
            }

            this.displaySnippets();
            this.showMessage('Snippet deleted!');
        }
    }

    showMessage(text) {
        const message = document.createElement('div');
        message.className = 'status-message';
        message.textContent = text;
        document.body.appendChild(message);
        setTimeout(() => {
            message.remove();
        }, 2000);
    }

    highlightSelectedSnippet(id) {
        document.querySelectorAll('.snippet-item').forEach(item => {
            item.classList.toggle('selected', item.dataset.id === id);
        });
    }

    createNewSnippet() {
        this.currentSnippetId = null;
        this.codeEditor.value = '';
        this.languageSelect.value = 'javascript';
        document.getElementById('saveBtn').textContent = 'Save Snippet';
        this.highlightSelectedSnippet(null);
    }
}
