/**
 * 🍪 PreferencesManager - Gestionnaire de préférences avec consentement RGPD
 * 
 * Sauvegarde persistante des préférences utilisateur dans localStorage
 * avec demande de consentement conforme RGPD/CNIL
 */

console.log('[preferences-manager.js] Script started loading...');

class PreferencesManager {
  constructor() {
    console.log('[PreferencesManager] Constructor called');
    this.STORAGE_KEY = 'whisper_network_preferences';
    this.CONSENT_KEY = 'whisper_network_consent';
    this.VERSION = '1.0.0';
    
    // Préférences par défaut
    this.defaults = {
      // Configuration API
      enabled: true,
      apiKey: '',
      apiUrl: 'http://localhost:8001',
      processingMode: 'fast', // 'fast' ou 'complete'
      
      // Paramètres d'anonymisation (types d'entités)
      anonymize_names: true,
      anonymize_email: true,
      anonymize_phone: true,
      anonymize_address: true,
      anonymize_nir: true,
      anonymize_iban: true,
      anonymize_credit_cards: true,
      anonymize_ip: true,
      anonymize_urls: true,
      
      // Options comportementales
      showPreview: true,
      autoAnonymize: false,
      autoDeanonymize: true,
      preserveMapping: true,
      showNotifications: true,
      preserveFormatting: true,
      
      // Interface
      anonymizationLevel: 'standard', // standard, strict, relaxed
      theme: 'auto', // auto, light, dark
      language: 'fr',
      
      // Statistiques de performance
      totalProcessed: 0,
      processingTimes: [],
      lastProcessingTime: null,
      
      // Métadonnées
      version: this.VERSION
    };
  }

  /**
   * Vérifie si l'utilisateur a consenti aux cookies
   */
  async hasConsent() {
    try {
      const result = await chrome.storage.local.get(this.CONSENT_KEY);
      return result[this.CONSENT_KEY] === true;
    } catch (error) {
      console.warn('[PreferencesManager] Error checking consent:', error);
      return false;
    }
  }

  /**
   * Enregistre le consentement de l'utilisateur
   */
  async setConsent(consent) {
    try {
      await chrome.storage.local.set({ 
        [this.CONSENT_KEY]: consent,
        consent_date: new Date().toISOString()
      });
      console.log('[PreferencesManager] Consent saved:', consent);
      return true;
    } catch (error) {
      console.error('[PreferencesManager] Error saving consent:', error);
      return false;
    }
  }

  /**
   * Vérifie si c'est la première utilisation
   */
  async isFirstRun() {
    try {
      const result = await chrome.storage.local.get('first_run_complete');
      return !result.first_run_complete;
    } catch (error) {
      return true;
    }
  }

  /**
   * Marque la première utilisation comme complétée
   */
  async markFirstRunComplete() {
    try {
      await chrome.storage.local.set({ 
        first_run_complete: true,
        installation_date: new Date().toISOString()
      });
    } catch (error) {
      console.error('[PreferencesManager] Error marking first run:', error);
    }
  }

  /**
   * Charge toutes les préférences
   */
  async load() {
    try {
      const hasConsent = await this.hasConsent();
      
      if (!hasConsent) {
        console.log('[PreferencesManager] No consent - using defaults');
        return { ...this.defaults };
      }

      const result = await chrome.storage.local.get(this.STORAGE_KEY);
      const stored = result[this.STORAGE_KEY] || {};
      
      // Merge avec les defaults pour gérer nouvelles options
      const preferences = { ...this.defaults, ...stored };
      
      console.log('[PreferencesManager] Loaded preferences:', preferences);
      return preferences;
    } catch (error) {
      console.error('[PreferencesManager] Error loading preferences:', error);
      return { ...this.defaults };
    }
  }

  /**
   * Sauvegarde toutes les préférences
   */
  async save(preferences) {
    try {
      const hasConsent = await this.hasConsent();
      
      if (!hasConsent) {
        console.warn('[PreferencesManager] No consent - preferences not saved');
        return false;
      }

      preferences.version = this.VERSION;
      preferences.last_updated = new Date().toISOString();
      
      await chrome.storage.local.set({ [this.STORAGE_KEY]: preferences });
      console.log('[PreferencesManager] Preferences saved:', preferences);
      return true;
    } catch (error) {
      console.error('[PreferencesManager] Error saving preferences:', error);
      return false;
    }
  }

  /**
   * Charge une préférence spécifique
   */
  async get(key) {
    const preferences = await this.load();
    return preferences[key];
  }

  /**
   * Sauvegarde une préférence spécifique
   */
  async set(key, value) {
    const preferences = await this.load();
    preferences[key] = value;
    return await this.save(preferences);
  }

  /**
   * Réinitialise toutes les préférences
   */
  async reset() {
    try {
      const hasConsent = await this.hasConsent();
      
      if (!hasConsent) {
        console.log('[PreferencesManager] No consent - nothing to reset');
        return true;
      }

      await chrome.storage.local.remove(this.STORAGE_KEY);
      console.log('[PreferencesManager] Preferences reset to defaults');
      return true;
    } catch (error) {
      console.error('[PreferencesManager] Error resetting preferences:', error);
      return false;
    }
  }

  /**
   * Efface TOUTES les données (y compris consentement)
   */
  async clearAll() {
    try {
      await chrome.storage.local.clear();
      console.log('[PreferencesManager] All data cleared');
      return true;
    } catch (error) {
      console.error('[PreferencesManager] Error clearing data:', error);
      return false;
    }
  }

  /**
   * Export des préférences (pour backup)
   */
  async export() {
    const preferences = await this.load();
    const data = {
      preferences,
      exported_at: new Date().toISOString(),
      version: this.VERSION
    };
    return JSON.stringify(data, null, 2);
  }

  /**
   * Import des préférences (restore backup)
   */
  async import(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      
      if (!data.preferences || !data.version) {
        throw new Error('Invalid backup format');
      }

      await this.save(data.preferences);
      console.log('[PreferencesManager] Preferences imported successfully');
      return true;
    } catch (error) {
      console.error('[PreferencesManager] Error importing preferences:', error);
      return false;
    }
  }

  /**
   * Obtient les statistiques d'utilisation
   */
  async getStats() {
    try {
      const result = await chrome.storage.local.get([
        'installation_date',
        'consent_date',
        'first_run_complete'
      ]);
      return {
        installed: result.installation_date || 'Unknown',
        consent_given: result.consent_date || 'Unknown',
        first_run_complete: result.first_run_complete || false
      };
    } catch (error) {
      console.error('[PreferencesManager] Error getting stats:', error);
      return {};
    }
  }
}

console.log('[preferences-manager.js] PreferencesManager class defined');

// Instance globale
console.log('[preferences-manager.js] Creating global instance...');
const preferencesManager = new PreferencesManager();
console.log('[preferences-manager.js] Instance created:', preferencesManager);

// Vérifier que l'export est bien accessible
if (typeof window !== 'undefined') {
  console.log('[preferences-manager.js] window is defined, attaching to window.preferencesManager');
  window.preferencesManager = preferencesManager;
} else {
  console.warn('[preferences-manager.js] window is undefined!');
}

console.log('🍪 PreferencesManager loaded', preferencesManager);
console.log('[preferences-manager.js] Script loading complete');
