/**
 * File Handling Module
 * 
 * This module handles file operations in the application:
 * - Opening files through the File System Access API
 * - Detecting programming languages from file extensions
 * - Creating snippets from file contents
 * - Providing user feedback for file operations
 */

export class FileHandler {
    /**
     * Creates a new FileHandler instance
     * @param {CodePreview} codePreview - The CodePreview instance for updating the preview
     */
    constructor(codePreview) {
        this.codePreview = codePreview;
        this.setupFileHandling();
    }

    /**
     * Sets up file handling using the File System Access API
     * Configures the launch queue for handling files opened with the app
     */
    setupFileHandling() {
        if ('launchQueue' in window && 'files' in LaunchParams.prototype) {
            window.launchQueue.setConsumer(async (launchParams) => {
                if (!launchParams.files.length) {
                    return;
                }

                // Handle each file
                for (const fileHandle of launchParams.files) {
                    try {
                        const file = await fileHandle.getFile();
                        const content = await file.text();

                        // Create a new snippet from the file
                        this.createSnippetFromFile({
                            name: file.name,
                            language: this.detectLanguage(file.name),
                            code: content
                        });

                    } catch (error) {
                        console.error('Error handling file:', error);
                        this.showError('Failed to open file. ' + error.message);
                    }
                }
            });
        }
    }

    /**
     * Detects the programming language from a file extension
     * @param {string} filename - The name of the file
     * @returns {string} The detected programming language
     */
    detectLanguage(filename) {
        const extension = filename.split('.').pop().toLowerCase();
        const extensionMap = {
            'js': 'javascript',
            'html': 'html',
            'css': 'css',
            'py': 'python',
            'java': 'java',
            'php': 'php',
            'rb': 'ruby',
            'md': 'markdown',
            'json': 'json',
            'xml': 'xml',
            'sql': 'sql',
            'sh': 'bash',
            'c': 'c',
            'cpp': 'cpp',
            'cs': 'csharp',
            'ts': 'typescript'
        };
        return extensionMap[extension] || 'plaintext';
    }

    /**
     * Creates a new snippet from a file's contents
     * @param {Object} params - The parameters for creating the snippet
     * @param {string} params.name - The name of the file
     * @param {string} params.language - The programming language
     * @param {string} params.code - The file contents
     */
    createSnippetFromFile({ name, language, code }) {
        const codeEditor = document.getElementById('codeEditor');
        const languageSelect = document.getElementById('languageSelect');

        if (codeEditor && languageSelect) {
            codeEditor.value = code;

            if (Array.from(languageSelect.options).some(opt => opt.value === language)) {
                languageSelect.value = language;
            }

            // Update preview using the CodePreview instance
            this.codePreview.updatePreview();

            this.showMessage(`Opened file: ${name}`);
        }
    }

    /**
     * Shows a temporary status message
     * @param {string} text - The message to display
     */
    showMessage(text) {
        const message = document.createElement('div');
        message.className = 'status-message';
        message.textContent = text;
        document.body.appendChild(message);
        setTimeout(() => {
            message.remove();
        }, 2000);
    }

    /**
     * Shows an error message
     * @param {string} message - The error message to display
     */
    showError(message) {
        this.showMessage(message);
    }
} 