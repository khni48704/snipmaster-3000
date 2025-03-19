/**
 * Code Preview Module
 * 
 * This module handles the live preview functionality of the code editor.
 * It provides syntax highlighting and real-time updates as the user types.
 * Uses highlight.js for syntax highlighting.
 */

export class CodePreview {
    /**
     * Creates a new CodePreview instance
     * @param {HTMLElement} codeEditor - The textarea element containing the code
     * @param {HTMLElement} languageSelect - The select element for choosing the language
     */
    constructor(codeEditor, languageSelect) {
        this.codeEditor = codeEditor;
        this.languageSelect = languageSelect;
        this.setupEventListeners();
    }

    /**
     * Sets up event listeners for code changes and language selection
     */
    setupEventListeners() {
        this.codeEditor.addEventListener('input', () => this.updatePreview());
        this.languageSelect.addEventListener('change', () => this.updatePreview());
    }

    /**
     * Updates the preview with syntax highlighting
     */
    updatePreview() {
        const code = this.codeEditor.value;
        const language = this.languageSelect.value;

        const previewDiv = document.getElementById('codePreview');
        previewDiv.innerHTML = `<pre><code class="language-${language}">${this.escapeHtml(code)}</code></pre>`;

        // Apply highlighting
        hljs.highlightElement(previewDiv.querySelector('code'));
    }

    /**
     * Escapes HTML special characters to prevent XSS
     * @param {string} text - The text to escape
     * @returns {string} The escaped text
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
} 