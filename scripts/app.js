document.addEventListener('DOMContentLoaded', () => {
    // Get DOM elements
    const codeEditor = document.getElementById('codeEditor');
    const languageSelect = document.getElementById('languageSelect');
    const saveBtn = document.getElementById('saveBtn');
    const newSnippetBtn = document.getElementById('newSnippetBtn');
    const snippetList = document.getElementById('snippetList');

    // Register the Service Worker
    function registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js')
                    .then(registration => {
                        console.log('ServiceWorker registration successful with scope:',
                            registration.scope);

                        // Optional: Add UI indicator
                        showServiceWorkerStatus('Service Worker registered successfully!');
                    })
                    .catch(error => {
                        console.error('ServiceWorker registration failed:', error);

                        // Optional: Add UI indicator
                        showServiceWorkerStatus('Service Worker registration failed!', true);
                    });
            });
        } else {
            console.log('Service Workers not supported in this browser.');
            showServiceWorkerStatus('Service Workers not supported in this browser.', true);
        }
    }

    // Optional: Add a status display function
    function showServiceWorkerStatus(message, isError = false) {
        // Create a status element if it doesn't exist
        let statusElement = document.getElementById('sw-status');
        if (!statusElement) {
            statusElement = document.createElement('div');
            statusElement.id = 'sw-status';
            document.body.appendChild(statusElement);
        }

        // Style based on status
        statusElement.className = isError ? 'sw-status error' : 'sw-status success';
        statusElement.textContent = message;

        // Auto-hide after 3 seconds
        setTimeout(() => {
            statusElement.style.opacity = '0';
        }, 3000);
    }

    // Call the registration function
    registerServiceWorker();

    // Track current snippet
    let currentSnippetId = null;
    // First add this to your HTML in the toolbar
    const categories = ['General', 'Utils', 'Components', 'Scripts'];
    const categorySelect = document.createElement('select');
    categorySelect.innerHTML = categories.map(cat =>
        `<option value="${cat}">${cat}</option>`
    ).join('');
    document.querySelector('.toolbar').appendChild(categorySelect);

    // Then the complete saveSnippet function
    function saveSnippet() {
        const snippets = JSON.parse(localStorage.getItem('snippets') || '[]');

        const snippet = {
            code: codeEditor.value,
            language: languageSelect.value,
            category: categorySelect.value || 'General',  // This is the new part
            lastModified: new Date().toISOString()
        };

        if (currentSnippetId) {
            // Update existing snippet
            const index = snippets.findIndex(s => s.id === currentSnippetId);
            if (index !== -1) {
                snippet.id = currentSnippetId;
                snippet.created = snippets[index].created;
                snippets[index] = snippet;
            }
        } else {
            // Create new snippet
            snippet.id = Date.now().toString();
            snippet.created = snippet.lastModified;
            snippets.push(snippet);
        }

        localStorage.setItem('snippets', JSON.stringify(snippets));
        displaySnippets();

        showMessage('Snippet saved!');
    }

    // Load snippet for editing
    function loadSnippet(id) {
        const snippets = JSON.parse(localStorage.getItem('snippets') || '[]');
        const snippet = snippets.find(s => s.id === id);

        if (snippet) {
            currentSnippetId = snippet.id;
            codeEditor.value = snippet.code;
            languageSelect.value = snippet.language;

            // Update UI to show we're editing
            saveBtn.textContent = 'Update Snippet';
            highlightSelectedSnippet(id);
        }
    }

    // Display snippets with improved UI
    function displaySnippets() {
        const snippets = JSON.parse(localStorage.getItem('snippets') || '[]');
        snippetList.innerHTML = snippets.map(snippet => `
        <div class="snippet-item ${snippet.id === currentSnippetId ? 'selected' : ''}" 
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
        </div>
    `).join('');

        // Add click handlers
        snippetList.querySelectorAll('.snippet-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (!e.target.matches('.delete-btn')) {
                    loadSnippet(item.dataset.id);
                }
            });
        });

        // Add delete handlers
        snippetList.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteSnippet(btn.dataset.id);
            });
        });
    }

    // Delete snippet
    function deleteSnippet(id) {
        if (confirm('Are you sure you want to delete this snippet?')) {
            let snippets = JSON.parse(localStorage.getItem('snippets') || '[]');
            snippets = snippets.filter(s => s.id !== id);
            localStorage.setItem('snippets', JSON.stringify(snippets));

            if (currentSnippetId === id) {
                currentSnippetId = null;
                codeEditor.value = '';
                saveBtn.textContent = 'Save Snippet';
            }

            displaySnippets();
            showMessage('Snippet deleted!');
        }
    }

    // Show status message
    function showMessage(text) {
        const message = document.createElement('div');
        message.className = 'status-message';
        message.textContent = text;
        document.body.appendChild(message);

        setTimeout(() => {
            message.remove();
        }, 2000);
    }

    // Highlight selected snippet
    function highlightSelectedSnippet(id) {
        document.querySelectorAll('.snippet-item').forEach(item => {
            item.classList.toggle('selected', item.dataset.id === id);
        });
    }

    // Event listeners
    saveBtn.addEventListener('click', saveSnippet);

    newSnippetBtn.addEventListener('click', () => {
        currentSnippetId = null;
        codeEditor.value = '';
        languageSelect.value = 'javascript';
        saveBtn.textContent = 'Save Snippet';
        highlightSelectedSnippet(null);
    });

    // Initial load
    displaySnippets();
});
// Add to your existing JavaScript
function updatePreview() {
    const code = codeEditor.value;
    const language = languageSelect.value;

    const previewDiv = document.getElementById('codePreview');
    previewDiv.innerHTML = `<pre><code class="language-${language}">${escapeHtml(code)}</code></pre>`;

    // Apply highlighting
    hljs.highlightElement(previewDiv.querySelector('code'));
}

// Helper function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Add to your event listeners
codeEditor.addEventListener('input', updatePreview);
languageSelect.addEventListener('change', updatePreview);

// Call after loading a snippet
function loadSnippet(id) {
    // ... existing loadSnippet code ...
    updatePreview();
}
// Add simple connection status indicator
function updateConnectionStatus() {
    const statusElement = document.getElementById('connection-status');
    if (!statusElement) return;

    if (navigator.onLine) {
        statusElement.innerHTML = "🟢 Online";
        statusElement.style.backgroundColor = "#f1fff0";
    } else {
        statusElement.innerHTML = "🔴 Offline";
        statusElement.style.backgroundColor = "#fff0f0";
    }
}

// Update status when online/offline events occur
window.addEventListener('online', updateConnectionStatus);
window.addEventListener('offline', updateConnectionStatus);

// Initial check
document.addEventListener('DOMContentLoaded', updateConnectionStatus);

// Add this to your app.js to allow manual cache updates if needed
function updateCaches() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistration()
            .then(registration => {
                if (registration) {
                    // Force the service worker to update
                    registration.update();
                }
            });
    }
}
// Add a refresh button to your app UI if you want
const refreshButton = document.getElementById('refresh-app');
if (refreshButton) {
    refreshButton.addEventListener('click', updateCaches);
}

// PWA Installation
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent Chrome from automatically showing the prompt
    e.preventDefault();
    // Stash the event so it can be triggered later
    deferredPrompt = e;

    // Show the install button
    const installButton = document.getElementById('install-button');
    if (installButton) {
        installButton.style.display = 'block';

        installButton.addEventListener('click', () => {
            // Show the install prompt
            deferredPrompt.prompt();

            // Wait for the user to respond to the prompt
            deferredPrompt.userChoice.then((choiceResult) => {
                if (choiceResult.outcome === 'accepted') {
                    console.log('User accepted the installation');
                    installButton.style.display = 'none';
                }
                deferredPrompt = null;
            });
        });
    }
});
// Hide button when app is installed
window.addEventListener('appinstalled', () => {
    console.log('Application installed');
    const installButton = document.getElementById('install-button');
    if (installButton) {
        installButton.style.display = 'none';
    }
});