// Import all modules
import { registerServiceWorker } from './js/serviceWorker.js';
import { SnippetManager } from './js/snippetManager.js';
import { CodePreview } from './js/preview.js';
import { ConnectionStatus } from './js/connectionStatus.js';
import { PWAInstallation } from './js/pwaInstall.js';
import { FileSystem } from './js/file-system.js';  // Ensure FileSystem is imported
import { ProtocolHandler } from './js/protocolHandler.js';

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', async function () {
    try {
        // First migrate data from localStorage to IndexedDB
        if (window.SnippetStorage) {
            await SnippetStorage.migrateFromLocalStorage();
        }

        // Then initialize the UI
        if (window.SnippetUI && window.SyncUI) {
            await SnippetUI.init();
            SyncUI.init();
        }

        console.log('SnipMaster 3000 initialized successfully');
    } catch (error) {
        console.error('Error initializing application:', error);
    }

    // Initialize app components
    initApp();
    FileSystem.initFileHandlers();  // Ensure file handlers are initialized
});

// Call the registration function
registerServiceWorker();

function initApp() {
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
    const protocolHandler = new ProtocolHandler(snippetManager);

    // Set up event listeners
    if (saveBtn) saveBtn.addEventListener('click', () => snippetManager.saveSnippet());
    if (newSnippetBtn) newSnippetBtn.addEventListener('click', () => snippetManager.createNewSnippet());

    // Initial display of snippets
    snippetManager.displaySnippets();

    // Initialize file handlers
    initFileHandlers();
}

function initFileHandlers() {
    if (!FileSystem.isSupported) {
        console.warn('File System Access API is not supported in this browser');
        return;
    }

    const loadFileBtn = document.getElementById('loadFileBtn');
    if (loadFileBtn) {
        loadFileBtn.addEventListener('click', handleLoadFile);
        if (!FileSystem.isSupported) {
            loadFileBtn.classList.add('disabled');
            loadFileBtn.title = 'Not supported in this browser';
        }
    }

    const saveFileBtn = document.getElementById('saveFileBtn');
    if (saveFileBtn) {
        saveFileBtn.addEventListener('click', handleSaveFile);
        if (!FileSystem.isSupported) {
            saveFileBtn.classList.add('disabled');
            saveFileBtn.title = 'Not supported in this browser';
        }
    }

    // Listen for file open events
    window.addEventListener('file-system:file-opened', (event) => {
        const fileData = event.detail;
        document.getElementById('newSnippetBtn')?.click();

        const codeEditor = document.getElementById('codeEditor');
        const languageSelect = document.getElementById('languageSelect');

        if (codeEditor && languageSelect) {
            codeEditor.value = fileData.content;

            if ([...languageSelect.options].some(opt => opt.value === fileData.language)) {
                languageSelect.value = fileData.language;
            }

            if (typeof updatePreview === 'function') {
                updatePreview();
            }

            showMessage(`Opened ${fileData.name} successfully!`);
        }
    });

    // Listen for errors
    window.addEventListener('file-system:error', (event) => {
        showMessage(`Error: ${event.detail.message}`, true);
    });
}

// Handler for load file button
function handleLoadFile() {
    // Check if FileSystem is supported before proceeding
    if (!FileSystem.isSupported) {
        showMessage('File System Access API not supported in this browser', true);
        return;
    }

    FileSystem.loadFromFile({
        onSuccess: (fileData) => {
            const codeEditor = document.getElementById('codeEditor');
            const languageSelect = document.getElementById('languageSelect');

            if (codeEditor && languageSelect) {
                document.getElementById('newSnippetBtn')?.click();
                codeEditor.value = fileData.content;

                if ([...languageSelect.options].some(opt => opt.value === fileData.language)) {
                    languageSelect.value = fileData.language;
                }

                if (typeof updatePreview === 'function') {
                    updatePreview();
                }

                showMessage(`Loaded ${fileData.name} successfully!`);
            }
        },
        onError: (error) => {
            showMessage(`Error: ${error}`, true);
        }
    });
}

// Handler for save file button
function handleSaveFile() {
    const codeEditor = document.getElementById('codeEditor');
    const languageSelect = document.getElementById('languageSelect');

    if (!codeEditor || !languageSelect) {
        showMessage('Editor not found', true);
        return;
    }

    const content = codeEditor.value;
    const language = languageSelect.value;
    let suggestedName = 'snippet';

    // Check if a current snippet exists
    if (typeof currentSnippetId !== 'undefined' && currentSnippetId) {
        const snippets = JSON.parse(localStorage.getItem('snippets') || '[]');
        const currentSnippet = snippets.find(s => s.id === currentSnippetId);
        if (currentSnippet?.name) {
            suggestedName = currentSnippet.name;
        }
    }

    // Map language to file extension
    const languageToExtension = {
        javascript: '.js',
        html: '.html',
        css: '.css',
        plaintext: '.txt'
    };

    const extension = languageToExtension[language] || '.txt';

    if (!suggestedName.endsWith(extension)) {
        suggestedName += extension;
    }

    // Check if FileSystem is supported before proceeding
    if (!FileSystem.isSupported) {
        showMessage('File System Access API not supported in this browser', true);
        return;
    }

    FileSystem.saveToFile({
        content,
        language,
        suggestedName,
        onSuccess: (fileName) => showMessage(`Saved to ${fileName} successfully!`),
        onError: (error) => showMessage(`Error: ${error}`, true)
    });
}

// Function to show messages on the UI
function showMessage(message, isError = false) {
    const messageBox = document.getElementById('messageBox');
    if (messageBox) {
        messageBox.textContent = message;
        messageBox.style.color = isError ? 'red' : 'green';
    }
}
