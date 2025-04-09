// file-system.js - File System integration for SnipMaster 3000

// Check if File System Access API is supported
const isFileSystemSupported = 'showOpenFilePicker' in window && 'showSaveFilePicker' in window;

// Export our module functions
export const FileSystem = {
    isSupported: isFileSystemSupported,

    // Function to show support status in UI
    checkSupport() {
        if (!this.isSupported) {
            console.warn('File System Access API not supported');
            // Optional: Show UI indication that file system features aren't available
        }
        return this.isSupported;
    },

    /**
     * Opens a file picker and reads the selected file
     * @param {Object} options - Config options
     * @param {Array} options.extensions - File extensions to accept
     * @param {Function} options.onSuccess - Callback with file content
     * @param {Function} options.onError - Error callback
     */
    async loadFromFile(options = {}) {
        if (!this.checkSupport()) {
            options.onError?.('File System Access API not supported');
            return;
        }

        try {
            // Default extensions if not provided
            const extensions = options.extensions || ['.js', '.html', '.css', '.txt'];

            // Prepare accept object for file picker
            const accept = {};
            if (extensions.includes('.js')) accept['text/javascript'] = ['.js'];
            if (extensions.includes('.html')) accept['text/html'] = ['.html', '.htm'];
            if (extensions.includes('.css')) accept['text/css'] = ['.css'];
            if (extensions.includes('.txt')) accept['text/plain'] = ['.txt'];

            // Show file picker
            const [fileHandle] = await window.showOpenFilePicker({
                types: [{ description: 'Code Files', accept }],
                multiple: false
            });

            // Get the file
            const file = await fileHandle.getFile();

            // Read content
            const content = await file.text();

            // Determine language based on file extension
            const fileName = file.name;
            const fileExtension = fileName.split('.').pop().toLowerCase();

            // Map file extensions to language options
            const extensionToLanguage = {
                'js': 'javascript',
                'html': 'html',
                'htm': 'html',
                'css': 'css',
                'txt': 'plaintext'
            };
            const language = extensionToLanguage[fileExtension] || 'javascript';

            // Call success callback
            options.onSuccess?.({ name: fileName, content, language, extension: fileExtension });

            return { name: fileName, content, language };
        } catch (error) {
            console.error('Error loading file:', error);
            options.onError?.(error.message || 'Failed to load file');
        }
    },

    /**
     * Opens a save dialog and writes content to the selected file
     * @param {Object} options - Config options
     * @param {string} options.content - Content to save
     * @param {string} options.language - Language of the content
     * @param {string} options.suggestedName - Suggested filename
     * @param {Function} options.onSuccess - Success callback
     * @param {Function} options.onError - Error callback
     */
    async saveToFile(options = {}) {
        if (!this.checkSupport()) {
            options.onError?.('File System Access API not supported');
            return;
        }

        try {
            if (!options.content) {
                options.onError?.('No content to save');
                return;
            }

            // Determine file extension based on language
            const languageToExtension = {
                'javascript': '.js',
                'html': '.html',
                'css': '.css',
                'plaintext': '.txt'
            };
            const extension = languageToExtension[options.language] || '.txt';
            const suggestedName = options.suggestedName || `snippet${extension}`;

            // Show save file picker
            const fileHandle = await window.showSaveFilePicker({
                suggestedName,
                types: [{ description: 'Code File', accept: { 'text/plain': [extension] } }]
            });

            // Create a writable stream
            const writable = await fileHandle.createWritable();
            await writable.write(options.content);
            await writable.close();

            options.onSuccess?.(fileHandle.name || suggestedName);
            return fileHandle.name || suggestedName;
        } catch (error) {
            console.error('Error saving file:', error);
            options.onError?.(error.message || 'Failed to save file');
        }
    },

    /**
     * Set up handlers for files opened from the OS
     */
    initFileHandlers() {
        if (!('launchQueue' in window)) return;

        window.launchQueue.setConsumer(async (launchParams) => {
            if (!launchParams?.files?.length) return;

            const fileHandle = launchParams.files[0];

            try {
                const file = await fileHandle.getFile();
                const content = await file.text();

                const fileName = file.name;
                const fileExtension = fileName.split('.').pop().toLowerCase();
                const extensionToLanguage = {
                    'js': 'javascript',
                    'html': 'html',
                    'htm': 'html',
                    'css': 'css',
                    'txt': 'plaintext'
                };

                const event = new CustomEvent('file-system:file-opened', {
                    detail: {
                        name: fileName,
                        content,
                        language: extensionToLanguage[fileExtension] || 'plaintext',
                        extension: fileExtension
                    }
                });

                window.dispatchEvent(event);
            } catch (error) {
                console.error('Error handling file:', error);
                const errorEvent = new CustomEvent('file-system:error', {
                    detail: { message: 'Failed to open file', error }
                });
                window.dispatchEvent(errorEvent);
            }
        });
    }
};

// If using in a global context for now
// For production environments, consider using modules with `import`/`export` as shown above
// This is for backward compatibility, and it's best to use modular imports in production.
window.FileSystem = FileSystem;
