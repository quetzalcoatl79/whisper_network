/**
 * StorageSync - Wrapper autour de chrome.storage.local avec fallback localStorage
 * Garantit la persistence même si chrome.storage.local échoue
 */

class StorageSync {
  constructor() {
    this.storageKey = 'whisper_network_settings';
  }

  /**
   * Sauvegarder settings (chrome.storage.local + localStorage fallback)
   */
  async save(settings) {
    console.log('[StorageSync] Saving settings:', settings);
    
    try {
      // Tentative 1: chrome.storage.local (prioritaire)
      await new Promise((resolve, reject) => {
        chrome.storage.local.set(settings, () => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            console.log('[StorageSync] ✅ Saved to chrome.storage.local');
            resolve();
          }
        });
      });
      
      // Tentative 2: localStorage (fallback)
      try {
        localStorage.setItem(this.storageKey, JSON.stringify(settings));
        console.log('[StorageSync] ✅ Backup to localStorage');
      } catch (e) {
        console.warn('[StorageSync] ⚠️ localStorage backup failed:', e);
      }
      
      return true;
    } catch (error) {
      console.error('[StorageSync] ❌ Failed to save to chrome.storage.local:', error);
      
      // Fallback: localStorage uniquement
      try {
        localStorage.setItem(this.storageKey, JSON.stringify(settings));
        console.log('[StorageSync] ✅ Saved to localStorage (fallback only)');
        return true;
      } catch (e) {
        console.error('[StorageSync] ❌ All storage methods failed:', e);
        return false;
      }
    }
  }

  /**
   * Charger settings (chrome.storage.local avec fallback localStorage)
   */
  async load(defaults = {}) {
    console.log('[StorageSync] Loading settings...');
    
    try {
      // Tentative 1: chrome.storage.local
      const chromeSettings = await new Promise((resolve, reject) => {
        chrome.storage.local.get(defaults, (settings) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(settings);
          }
        });
      });
      
      console.log('[StorageSync] ✅ Loaded from chrome.storage.local:', chromeSettings);
      
      // Vérifier si les settings ne sont pas vides (au-delà des defaults)
      const hasRealData = Object.keys(chromeSettings).some(
        key => chromeSettings[key] !== defaults[key]
      );
      
      if (hasRealData) {
        return chromeSettings;
      } else {
        console.warn('[StorageSync] ⚠️ chrome.storage.local empty, trying localStorage...');
        throw new Error('No data in chrome.storage.local');
      }
    } catch (error) {
      console.warn('[StorageSync] Failed to load from chrome.storage.local:', error);
      
      // Fallback: localStorage
      try {
        const stored = localStorage.getItem(this.storageKey);
        if (stored) {
          const settings = JSON.parse(stored);
          console.log('[StorageSync] ✅ Loaded from localStorage (fallback):', settings);
          
          // Re-synchroniser vers chrome.storage.local
          try {
            await this.save(settings);
            console.log('[StorageSync] 🔄 Re-synced to chrome.storage.local');
          } catch (e) {
            console.warn('[StorageSync] Could not re-sync to chrome.storage.local');
          }
          
          return settings;
        }
      } catch (e) {
        console.warn('[StorageSync] localStorage also failed:', e);
      }
      
      // Dernier recours: defaults
      console.log('[StorageSync] ⚠️ Using defaults');
      return defaults;
    }
  }

  /**
   * Effacer toutes les données
   */
  async clear() {
    try {
      await new Promise((resolve) => {
        chrome.storage.local.clear(resolve);
      });
      localStorage.removeItem(this.storageKey);
      console.log('[StorageSync] ✅ All storage cleared');
      return true;
    } catch (error) {
      console.error('[StorageSync] Failed to clear:', error);
      return false;
    }
  }
}

// Export global instance
if (typeof window !== 'undefined') {
  window.storageSync = new StorageSync();
}
