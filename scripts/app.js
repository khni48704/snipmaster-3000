// Import all modules
import { registerServiceWorker } from './js/serviceWorker.js';
import { SnippetManager } from './js/snippetManager.js';
import { CodePreview } from './js/preview.js';
import { ConnectionStatus } from './js/connectionStatus.js';
import { PWAInstallation } from './js/pwaInstall.js';
import { FileHandler } from './js/fileHandler.js';
import { ProtocolHandler } from './js/protocolHandler.js';

// Initialize service worker for offline functionality
registerServiceWorker();

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Get DOM elements
    const codeEditor = document.getElementById('codeEditor');
    const languageSelect = document.getElementById('languageSelect');
    const saveBtn = document.getElementById('saveBtn');
    const newSnippetBtn = document.getElementById('newSnippetBtn');

    // Initialize managers and handlers
    const snippetManager = new SnippetManager();
    const codePreview = new CodePreview(codeEditor, languageSelect);
    const connectionStatus = new ConnectionStatus();
    const pwaInstallation = new PWAInstallation();
    const fileHandler = new FileHandler(codePreview);
    const protocolHandler = new ProtocolHandler(snippetManager);

    // Set up event listeners
    saveBtn.addEventListener('click', () => snippetManager.saveSnippet());
    newSnippetBtn.addEventListener('click', () => snippetManager.createNewSnippet());

    // Initial display of snippets
    snippetManager.displaySnippets();
}); 