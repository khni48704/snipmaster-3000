/**
 * Connection Status Module
 * 
 * This module handles the display of the application's online/offline status.
 * It provides visual feedback to users about their connection state and
 * automatically updates when the connection status changes.
 */

export class ConnectionStatus {
    /**
     * Creates a new ConnectionStatus instance
     * Initializes the status display and sets up event listeners
     */
    constructor() {
        this.statusElement = document.getElementById('connection-status');
        this.setupEventListeners();
        this.updateStatus();
    }

    /**
     * Sets up event listeners for online/offline events
     */
    setupEventListeners() {
        window.addEventListener('online', () => this.updateStatus());
        window.addEventListener('offline', () => this.updateStatus());
    }

    /**
     * Updates the visual status indicator based on connection state
     */
    updateStatus() {
        if (!this.statusElement) return;
        
        if (navigator.onLine) {
            this.statusElement.innerHTML = "🟢 Online";
            this.statusElement.style.backgroundColor = "#f1fff0";
        } else {
            this.statusElement.innerHTML = "🔴 Offline";
            this.statusElement.style.backgroundColor = "#fff0f0";
        }
    }
} 