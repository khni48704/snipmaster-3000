/**
 * Protocol Handler Module
 * 
 * This module handles URL protocol and deep linking functionality:
 * - Loading snippets from URL parameters
 * - Creating new snippets from URL parameters
 * - Filtering snippets based on URL parameters
 * - Managing recent snippets display
 */

export class ProtocolHandler {
    /**
     * Creates a new ProtocolHandler instance
     * @param {SnippetManager} snippetManager - The SnippetManager instance for snippet operations
     */
    constructor(snippetManager) {
        this.snippetManager = snippetManager;
        this.setupProtocolHandling();
    }

    /**
     * Sets up protocol handling and URL parameter processing
     */
    setupProtocolHandling() {
        document.addEventListener('DOMContentLoaded', () => {
            const urlParams = new URLSearchParams(window.location.search);
            const snippetId = urlParams.get('snippet');
            
            if (snippetId) {
                this.loadSnippetById(snippetId);
            }
            
            if (urlParams.has('new') && urlParams.get('new') === 'true') {
                document.getElementById('newSnippetBtn')?.click();
            }
            
            if (urlParams.has('filter')) {
                const filter = urlParams.get('filter');
                if (filter === 'recent') {
                    this.displayRecentSnippets();
                }
            }
        });
    }

    /**
     * Loads a snippet by its ID
     * @param {string} id - The ID of the snippet to load
     */
    loadSnippetById(id) {
        const snippets = JSON.parse(localStorage.getItem('snippets') || '[]');
        const snippet = snippets.find(s => s.id === id);
        
        if (snippet) {
            this.snippetManager.loadSnippet(id);
        } else {
            this.showError(`Snippet not found: ${id}`);
        }
    }

    /**
     * Displays the most recent snippets
     */
    displayRecentSnippets() {
        const snippets = JSON.parse(localStorage.getItem('snippets') || '[]');
        const recentSnippets = [...snippets]
            .sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified))
            .slice(0, 5);
        
        this.highlightSnippets(recentSnippets.map(s => s.id));
    }

    /**
     * Highlights specific snippets in the list
     * @param {string[]} ids - Array of snippet IDs to highlight
     */
    highlightSnippets(ids) {
        document.querySelectorAll('.snippet-item').forEach(item => {
            if (ids.includes(item.dataset.id)) {
                item.classList.add('highlighted');
            } else {
                item.classList.remove('highlighted');
            }
        });
    }

    /**
     * Shows an error message
     * @param {string} message - The error message to display
     */
    showError(message) {
        const messageElement = document.createElement('div');
        messageElement.className = 'status-message error';
        messageElement.textContent = message;
        document.body.appendChild(messageElement);
        setTimeout(() => {
            messageElement.remove();
        }, 2000);
    }
} 