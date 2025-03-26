// Import all modules
import { registerServiceWorker } from './js/serviceWorker.js';
import { SnippetManager } from './js/snippetManager.js';
import { CodePreview } from './js/preview.js';
import { ConnectionStatus } from './js/connectionStatus.js';
import { PWAInstallation } from './js/pwaInstall.js';
import { FileHandler } from './js/fileHandler.js';
import { ProtocolHandler } from './js/protocolHandler.js';

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', async function () {
    try {
        // First migrate data from localStorage to IndexedDB
        await SnippetStorage.migrateFromLocalStorage();

        // Then initialize the UI
await SnippetUI.init();
SyncUI.init();

        console.log('SnipMaster 3000 initialized successfully');
    } catch (error) {
        console.error('Error initializing application:', error);
    }
});


// Call the registration function
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