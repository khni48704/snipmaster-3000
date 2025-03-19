/**
 * Service Worker Registration Module
 * 
 * This module handles the registration and management of the service worker,
 * which enables offline functionality and caching for the application.
 * It also provides visual feedback about the service worker's status to the user.
 */

// Service Worker Registration
export function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('ServiceWorker registration successful with scope:', registration.scope);
                    showServiceWorkerStatus('Service Worker registered successfully!');
                })
                .catch(error => {
                    console.error('ServiceWorker registration failed:', error);
                    showServiceWorkerStatus('Service Worker registration failed!', true);
                });
        });
    } else {
        console.log('Service Workers not supported in this browser.');
        showServiceWorkerStatus('Service Workers not supported in this browser.', true);
    }
}

/**
 * Displays a status message about the service worker's state
 * @param {string} message - The message to display
 * @param {boolean} isError - Whether the message is an error
 */
function showServiceWorkerStatus(message, isError = false) {
    let statusElement = document.getElementById('sw-status');
    if (!statusElement) {
        statusElement = document.createElement('div');
        statusElement.id = 'sw-status';
        document.body.appendChild(statusElement);
    }
    statusElement.className = isError ? 'sw-status error' : 'sw-status-success';
    statusElement.textContent = message;
    setTimeout(() => { statusElement.style.opacity = '0'; }, 3000);
} 