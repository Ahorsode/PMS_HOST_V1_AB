const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  /**
   * Securely send a data request to the main process for database operations.
   * @param {string} channel - The IPC channel name.
   * @param {any} data - The payload to send.
   */
  sendDataRequest: (channel, data) => {
    // Strict allow-listing of IPC channels
    const validChannels = ['db-query', 'db-execute', 'get-config', 'save-auth-data', 'get-sync-status', 'get-device-info', 'trigger-sync'];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    } else {
      console.warn(`Attempted to send to unauthorized IPC channel: ${channel}`);
    }
  },

  /**
   * Register a listener for responses from the main process.
   * @param {string} channel - The IPC channel to listen on.
   * @param {Function} func - The callback function.
   */
  onDataResponse: (channel, func) => {
    const validChannels = ['db-result', 'db-error', 'config-data', 'auth-saved', 'sync-status-update', 'get-device-info'];
    if (validChannels.includes(channel)) {
      // Strip event as it includes `sender` and other internal details
      const subscription = (event, ...args) => func(...args);
      ipcRenderer.on(channel, subscription);
      
      return () => {
        ipcRenderer.removeListener(channel, subscription);
      };
    }
  },

  /**
   * Securely invoke a method in the main process and await a promise-based response.
   * @param {string} channel - The IPC channel name.
   * @param {any} data - The payload to send.
   */
  invoke: async (channel, data) => {
    const validChannels = ['activate-terminal'];
    if (validChannels.includes(channel)) {
      return await ipcRenderer.invoke(channel, data);
    } else {
      console.warn(`Attempted to invoke unauthorized IPC channel: ${channel}`);
      throw new Error(`Unauthorized IPC channel: ${channel}`);
    }
  }
});
