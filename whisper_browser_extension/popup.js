/**
 * Popup Script - Interface de configuration de l'extension
 * Utilise PreferencesManager pour persistance avec consentement RGPD
 */

class WhisperPopup {
  constructor() {
    this.settings = {};
    // Ne plus utiliser prefsManager dans la popup
    this.prefsManager = null;
    this.init();
  }

  async init() {
    // Plus besoin d'initialiser PreferencesManager
    await this.loadSettings();
    this.bindEvents();
    this.updateUI();
    this.checkApiStatus();
  }

  async loadSettings() {
    console.log('[WhisperPopup] 🔄 Loading settings...');
    
    const defaults = this.getDefaultSettings();
    
    try {
      // PRIORITÉ 1: Charger depuis backend PostgreSQL (multi-device sync)
      const backendPrefs = await this.loadFromBackend();
      if (backendPrefs && Object.keys(backendPrefs).length > 0) {
        console.log('[WhisperPopup] ☁️ Loaded from backend:', backendPrefs);
        this.settings = { ...defaults, ...backendPrefs };
        
        // Sync vers chrome.storage.sync et localStorage
        await chrome.storage.sync.set(this.settings);
        this.saveToLocalStorage(this.settings);
        this.updateBackupStatus();
        
        return;
      }
      
      console.log('[WhisperPopup] ⚠️ Backend empty, trying chrome.storage.sync...');
    } catch (error) {
      console.warn('[WhisperPopup] ⚠️ Backend load failed:', error);
    }
    
    try {
      // PRIORITÉ 2: Essayer chrome.storage.sync (persiste en production)
      const syncSettings = await new Promise((resolve) => {
        // NE PAS passer defaults ici, sinon ça fusionne avec les valeurs par défaut !
        chrome.storage.sync.get(null, (items) => {
          if (chrome.runtime.lastError) {
            console.error('[WhisperPopup] ❌ chrome.storage.sync error:', chrome.runtime.lastError);
            resolve(null);
          } else {
            resolve(items);
          }
        });
      });
      
      // Vérifier si on a vraiment des préférences (pas juste whisper_user_uuid)
      const hasPreferences = syncSettings && Object.keys(syncSettings).filter(k => k !== 'whisper_user_uuid').length > 0;
      
      if (hasPreferences) {
        console.log('[WhisperPopup] ✅ Loaded from chrome.storage.sync:', syncSettings);
        this.settings = { ...defaults, ...syncSettings };
        
        // Backup automatique dans localStorage
        this.saveToLocalStorage(this.settings);
        this.updateBackupStatus();
        
        return;
      }
      
      console.log('[WhisperPopup] ⚠️ chrome.storage.sync vide, trying localStorage...');
    } catch (error) {
      console.warn('[WhisperPopup] ⚠️ chrome.storage.sync failed:', error);
    }
    
    // PRIORITÉ 3: localStorage backup
    try {
      const localBackup = this.loadFromLocalStorage();
      if (localBackup && Object.keys(localBackup).length > 0) {
        console.log('[WhisperPopup] 💾 Loaded from localStorage backup:', localBackup);
        this.settings = localBackup;
        return;
      }
    } catch (error) {
      console.warn('[WhisperPopup] ⚠️ localStorage backup failed:', error);
    }
    
    // PRIORITÉ 4: Utiliser defaults en dernier recours
    console.error('[WhisperPopup] ❌ All loading methods failed, using defaults');
    this.settings = this.getDefaultSettings();
  }

  getDefaultSettings() {
    
    // Fallback: defaults locaux
    return {
      enabled: true,
      apiUrl: 'http://localhost:8001',
      apiKey: '',
      processingMode: 'fast', // 'fast' ou 'complete'
      
      // === Données personnelles ===
      anonymize_names: true,
      anonymize_addresses: true,
      anonymize_phone: true,
      anonymize_email: true,
      anonymize_birth_dates: true,
      anonymize_nir: true,
      anonymize_id_cards: true,
      anonymize_passports: true,
      anonymize_ip: true,
      anonymize_logins: true,
      
      // === Données professionnelles ===
      anonymize_employee_ids: true,
      anonymize_performance_data: true,
      anonymize_salary_data: true,
      anonymize_schedules: true,
      anonymize_internal_comm: true,
      
      // === Données sensibles spécifiques ===
      anonymize_medical_data: true,
      anonymize_bank_accounts: true,
      anonymize_credit_cards: true,
      anonymize_iban: true,
      anonymize_transactions: true,
      anonymize_grades: true,
      anonymize_legal_cases: true,
      
      // === Données contextuelles ===
      anonymize_locations: true,
      anonymize_geolocations: true,
      anonymize_access_badges: true,
      anonymize_photo_references: true,
      anonymize_biometric: true,
      anonymize_urls: true,
      
      // === Anciens noms (compatibilité backward) ===
      anonymize_address: true,
      anonymize_matricule: true,
      anonymize_salaire: true,
      anonymize_evaluation: true,
      anonymize_planning: true,
      
      // Options UI
      showPreview: true,
      autoAnonymize: false,
      autoDeanonymize: true, // NOUVEAU: dé-anonymisation automatique
      preserveMapping: true, // NOUVEAU: conserver les mappings
      
      // Statistiques de performance
      totalProcessed: 0,
      processingTimes: [],
      lastProcessingTime: null
    };
  }

  async saveSettings() {
    console.log('[WhisperPopup] 💾 Saving settings:', this.settings);
    
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { action: 'saveSettings', settings: this.settings },
        async (response) => {
          if (chrome.runtime.lastError) {
            console.error('[WhisperPopup] ❌ Error saving settings:', chrome.runtime.lastError);
            this.showNotification('❌ Erreur de sauvegarde', 'error');
            resolve(false);
          } else if (response && response.success) {
            console.log('[WhisperPopup] ✅ Settings saved to chrome.storage.sync');
            
            // 💾 Backup automatique dans localStorage
            this.saveToLocalStorage(this.settings);
            this.updateBackupStatus();
            
            // ☁️ Sync automatique vers backend PostgreSQL
            await this.saveToBackend(this.settings);
            
            this.showNotification('✅ Paramètres sauvegardés', 'success');
            resolve(true);
          } else {
            console.warn('[WhisperPopup] ⚠️ Failed to save settings');
            this.showNotification('⚠️ Échec de la sauvegarde', 'warning');
            resolve(false);
          }
        }
      );
    });
  }

  updateUI() {
    // Activation principale
    const enabledToggle = document.getElementById('enabledToggle');
    if (enabledToggle) {
      enabledToggle.checked = this.settings.enabled;
    }
    
    // Configuration API
    const apiUrl = document.getElementById('apiUrl');
    if (apiUrl) {
      apiUrl.value = this.settings.apiUrl || 'http://localhost:8001';
    }
    
    const apiKey = document.getElementById('apiKey');
    if (apiKey) {
      apiKey.value = this.settings.apiKey || '';
    }
    
    // Mode de traitement
    const modeRadio = document.querySelector(`input[name="processingMode"][value="${this.settings.processingMode || 'fast'}"]`);
    if (modeRadio) modeRadio.checked = true;
    
    // 🆕 TOUS les paramètres d'anonymisation (mise à jour automatique)
    const allAnonymizationCheckboxes = document.querySelectorAll('input[type="checkbox"][id^="anonymize_"]');
    allAnonymizationCheckboxes.forEach(checkbox => {
      // Utiliser la valeur sauvegardée, ou true par défaut si non défini
      checkbox.checked = this.settings[checkbox.id] !== undefined ? this.settings[checkbox.id] : true;
    });
    
    // Options comportementales
    const showPreview = document.getElementById('showPreview');
    if (showPreview) {
      showPreview.checked = this.settings.showPreview;
    }
    
    const autoAnonymize = document.getElementById('autoAnonymize');
    if (autoAnonymize) {
      autoAnonymize.checked = this.settings.autoAnonymize;
    }
    
    // Statistiques de performance
    this.updatePerformanceStats();
  }

  collectSettings() {
    // Activation principale
    const enabledToggle = document.getElementById('enabledToggle');
    if (enabledToggle) {
      this.settings.enabled = enabledToggle.checked;
    }
    
    // Configuration API
    const apiUrl = document.getElementById('apiUrl');
    if (apiUrl) {
      this.settings.apiUrl = apiUrl.value;
    }
    
    const apiKey = document.getElementById('apiKey');
    if (apiKey) {
      this.settings.apiKey = apiKey.value;
    }
    
    // Mode de traitement
    const checkedMode = document.querySelector('input[name="processingMode"]:checked');
    this.settings.processingMode = checkedMode ? checkedMode.value : 'fast';
    
    // 🆕 TOUS les paramètres d'anonymisation (collecte automatique)
    const allAnonymizationCheckboxes = document.querySelectorAll('input[type="checkbox"][id^="anonymize_"]');
    allAnonymizationCheckboxes.forEach(checkbox => {
      this.settings[checkbox.id] = checkbox.checked;
    });
    
    // Options comportementales
    const showPreview = document.getElementById('showPreview');
    if (showPreview) {
      this.settings.showPreview = showPreview.checked;
    }
    
    const autoAnonymize = document.getElementById('autoAnonymize');
    if (autoAnonymize) {
      this.settings.autoAnonymize = autoAnonymize.checked;
    }
  }

  updatePerformanceStats() {
    // Mettre à jour les statistiques de performance (optionnel si les éléments existent)
    const totalProcessed = this.settings.totalProcessed || 0;
    const processingTimes = this.settings.processingTimes || [];
    const lastTime = this.settings.lastProcessingTime;

    const totalProcessedElem = document.getElementById('totalProcessed');
    if (totalProcessedElem) {
      totalProcessedElem.textContent = totalProcessed;
    }
    
    const lastProcessingTimeElem = document.getElementById('lastProcessingTime');
    if (lastProcessingTimeElem) {
      lastProcessingTimeElem.textContent = lastTime ? `${lastTime.toFixed(1)}ms` : '-';
    }

    const averageTimeElem = document.getElementById('averageTime');
    if (averageTimeElem) {
      if (processingTimes.length > 0) {
        const average = processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length;
        averageTimeElem.textContent = `${average.toFixed(1)}ms`;
      } else {
        averageTimeElem.textContent = '-';
      }
    }
  }

  recordProcessingTime(timeMs) {
    // Enregistrer le temps de traitement pour les statistiques
    if (!this.settings.processingTimes) this.settings.processingTimes = [];
    if (!this.settings.totalProcessed) this.settings.totalProcessed = 0;

    this.settings.processingTimes.push(timeMs);
    this.settings.totalProcessed += 1;
    this.settings.lastProcessingTime = timeMs;

    // Garder seulement les 50 derniers temps pour limiter la mémoire
    if (this.settings.processingTimes.length > 50) {
      this.settings.processingTimes.shift();
    }

    this.updatePerformanceStats();
    this.saveSettings();
  }

  bindEvents() {
    // Gestion des onglets
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        const targetTab = button.dataset.tab;
        
        // Mettre à jour les boutons
        tabButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        
        // Mettre à jour les contenus
        tabContents.forEach(content => {
          if (content.id === targetTab) {
            content.classList.add('active');
          } else {
            content.classList.remove('active');
          }
        });
      });
    });
    
    // Bouton sauvegarder
    const saveBtn = document.getElementById('saveBtn');
    if (saveBtn) {
      saveBtn.addEventListener('click', async () => {
        this.collectSettings();
        const success = await this.saveSettings();
        
        if (success) {
          this.showNotification('✅ Paramètres sauvegardés', 'success');
          
          // Notifier les content scripts (si disponibles)
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
              chrome.tabs.sendMessage(tabs[0].id, { action: 'settingsChanged' }, (response) => {
                if (chrome.runtime.lastError) {
                  // Content script pas disponible - pas grave, on continue
                  console.log('Content script not available:', chrome.runtime.lastError.message);
                } else {
                  console.log('Settings updated in content script');
                }
              });
            }
          });
        } else {
          this.showNotification('❌ Erreur lors de la sauvegarde', 'error');
        }
      });
    }

    // Bouton réinitialiser
    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (confirm('Voulez-vous vraiment réinitialiser tous les paramètres ?')) {
          this.resetToDefaults();
        }
      });
    }

    // 💾 Boutons Export/Import configuration
    const exportBtn = document.getElementById('exportConfigBtn');
    const importBtn = document.getElementById('importConfigBtn');
    const importFile = document.getElementById('importConfigFile');
    
    if (exportBtn) {
      exportBtn.addEventListener('click', async () => {
        await this.exportConfig();
      });
    }
    
    if (importBtn && importFile) {
      importBtn.addEventListener('click', () => {
        importFile.click();
      });
      
      importFile.addEventListener('change', async (e) => {
        if (e.target.files.length > 0) {
          await this.importConfigFromFile(e.target.files[0]);
          e.target.value = ''; // Reset file input
        }
      });
    }

    // Test API
    const testApiBtn = document.getElementById('testApiBtn');
    if (testApiBtn) {
      testApiBtn.addEventListener('click', () => {
        this.testApiConnection();
      });
    }

    // Test d'anonymisation
    const testAnonymizeBtn = document.getElementById('testAnonymizeBtn');
    if (testAnonymizeBtn) {
      testAnonymizeBtn.addEventListener('click', () => {
        this.testAnonymization();
      });
    }

    // Auto-sauvegarde sur changement d'activation
    const enabledToggle = document.getElementById('enabledToggle');
    if (enabledToggle) {
      enabledToggle.addEventListener('change', async () => {
        this.collectSettings();
        await this.saveSettings();
        this.updateStatusIndicator();
      });
    }
    
    // Boutons Tout activer / Tout désactiver
    const enableAllBtn = document.getElementById('enableAllBtn');
    if (enableAllBtn) {
      enableAllBtn.addEventListener('click', () => {
        document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
          checkbox.checked = true;
        });
      });
    }
    
    const disableAllBtn = document.getElementById('disableAllBtn');
    if (disableAllBtn) {
      disableAllBtn.addEventListener('click', () => {
        document.querySelectorAll('input[type="checkbox"]:not(#enabledToggle)').forEach(checkbox => {
          checkbox.checked = false;
        });
      });
    }
    
    // Boutons de configuration persistante (mode dev)
    const exportConfigBtn = document.getElementById('exportConfigBtn');
    if (exportConfigBtn) {
      exportConfigBtn.addEventListener('click', async () => {
        this.collectSettings();
        const success = await window.configPersistence.exportConfig(this.settings);
        if (success) {
          this.showNotification('✅ Config exportée !', 'success');
        }
      });
    }
    
    const importConfigBtn = document.getElementById('importConfigBtn');
    if (importConfigBtn) {
      importConfigBtn.addEventListener('click', async () => {
        try {
          const settings = await window.configPersistence.importConfig();
          this.settings = settings;
          this.updateUI();
          await this.saveSettings();
          this.showNotification('✅ Config importée et sauvegardée !', 'success');
        } catch (error) {
          this.showNotification('❌ Erreur d\'import', 'error');
          console.error('Import failed:', error);
        }
      });
    }
    
    const copyConfigBtn = document.getElementById('copyConfigBtn');
    if (copyConfigBtn) {
      copyConfigBtn.addEventListener('click', async () => {
        this.collectSettings();
        const success = await window.configPersistence.copyToClipboard(this.settings);
        if (success) {
          this.showNotification('✅ Config copiée dans le presse-papier !', 'success');
        } else {
          this.showNotification('❌ Erreur de copie', 'error');
        }
      });
    }
    
    const helpConfigBtn = document.getElementById('helpConfigBtn');
    if (helpConfigBtn) {
      helpConfigBtn.addEventListener('click', () => {
        window.configPersistence.showInstructions();
      });
    }
  }

  async checkApiStatus() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'testApi' }, (response) => {
        const statusIndicator = document.getElementById('statusIndicator');
        const statusText = document.getElementById('statusText');
        
        if (!statusIndicator || !statusText) {
          console.warn('Status elements not found in DOM');
          resolve();
          return;
        }
        
        if (chrome.runtime.lastError) {
          console.error('Error testing API:', chrome.runtime.lastError);
          statusIndicator.className = 'status-indicator offline';
          statusText.textContent = 'Erreur de communication';
        } else if (response && response.success) {
          statusIndicator.className = 'status-indicator online';
          statusText.textContent = `API connectée (${response.service || 'whisper-network'})`;
        } else {
          statusIndicator.className = 'status-indicator offline';
          statusText.textContent = response?.error || 'API non disponible';
        }
        resolve();
      });
    });
  }

  async testApiConnection() {
    const button = document.getElementById('testApiBtn');
    if (!button) return;
    
    const originalText = button.textContent;
    
    console.log('🔧 Test API - Début');
    button.textContent = 'Test...';
    button.disabled = true;
    
    // Mettre à jour l'URL API
    const apiUrlInput = document.getElementById('apiUrl');
    if (apiUrlInput) {
      this.settings.apiUrl = apiUrlInput.value;
      console.log('🔧 URL API:', this.settings.apiUrl);
      await this.saveSettings();
    }
    
    // Tester la connexion
    chrome.runtime.sendMessage({ action: 'testApi' }, (response) => {
      console.log('🔧 Réponse API:', response);
      
      if (chrome.runtime.lastError) {
        console.error('🔧 Erreur runtime:', chrome.runtime.lastError);
        this.showNotification(`❌ Erreur runtime: ${chrome.runtime.lastError.message}`, 'error');
      } else if (response && response.success) {
        this.showNotification('✅ API connectée avec succès!', 'success');
        this.checkApiStatus();
      } else {
        const errorMsg = response ? response.error : 'Pas de réponse';
        this.showNotification(`❌ Erreur: ${errorMsg}`, 'error');
      }
      
      button.textContent = originalText;
      button.disabled = false;
    });
  }

  async testAnonymization() {
    const testInput = document.getElementById('testInput');
    const testResult = document.getElementById('testResult');
    const button = document.getElementById('testAnonymizeBtn');
    
    if (!testInput || !testResult || !button) {
      console.warn('Test anonymization elements not found in DOM');
      return;
    }
    
    const text = testInput.value.trim();
    console.log('🔧 Test anonymisation - Texte:', text);
    
    if (!text) {
      this.showNotification('Veuillez saisir du texte à tester', 'warning');
      return;
    }
    
    const processingIndicator = document.getElementById('processingIndicator');
    const processingStatus = document.getElementById('processingStatus');
    
    button.textContent = 'Traitement...';
    button.disabled = true;
    processingIndicator.style.display = 'flex';
    processingStatus.textContent = `Mode ${this.settings.processingMode || 'fast'}...`;
    testResult.innerHTML = '';
    
    // Collecter les paramètres actuels
    this.collectSettings();
    console.log('🔧 Paramètres:', this.settings);
    
    chrome.runtime.sendMessage({ 
      action: 'anonymize', 
      text: text, 
      settings: this.settings 
    }, (response) => {
      console.log('🔧 Réponse anonymisation:', response);
      
      if (chrome.runtime.lastError) {
        console.error('🔧 Erreur runtime:', chrome.runtime.lastError);
        testResult.innerHTML = `<div class="error">❌ Erreur runtime: ${chrome.runtime.lastError.message}</div>`;
      } else if (response && response.success) {
        // Enregistrer les statistiques de performance
        if (response.processing_time_ms) {
          this.recordProcessingTime(response.processing_time_ms);
        }
        
        testResult.innerHTML = `
          <div class="result-section">
            <h4>Original:</h4>
            <div class="original-text">${this.escapeHtml(text)}</div>
          </div>
          <div class="result-section">
            <h4>Anonymisé:</h4>
            <div class="anonymized-text">${this.escapeHtml(response.anonymized_text || response.anonymizedText)}</div>
          </div>
          <div class="stats">
            <span>✅ Éléments anonymisés: ${response.anonymizations_count || 0}</span>
            <span>⚡ Temps: ${(response.processing_time_ms || 0).toFixed(1)}ms</span>
            <span>🔧 Mode: ${this.settings.processingMode || 'fast'}</span>
          </div>
        `;
      } else {
        const errorMsg = response ? response.error : 'Pas de réponse du service worker';
        testResult.innerHTML = `<div class="error">❌ Erreur: ${errorMsg}</div>`;
      }
      
      // Remettre l'interface à l'état normal
      button.textContent = 'Tester l\'anonymisation';
      button.disabled = false;
      processingIndicator.style.display = 'none';
    });
  }

  resetToDefaults() {
    // Valeurs par défaut
    this.settings = {
      enabled: true,
      apiUrl: 'http://localhost:8001',
      anonymize_ip: true,
      anonymize_email: true,
      anonymize_phone: true,
      anonymize_nir: true,
      anonymize_names: false,
      anonymize_address: false,
      anonymize_urls: true,
      anonymize_credit_cards: true,
      anonymize_iban: true,
      showPreview: true,
      autoAnonymize: false
    };
    
    this.updateUI();
    this.showNotification('🔄 Paramètres réinitialisés', 'info');
  }

  updateStatusIndicator() {
    const indicator = document.getElementById('statusIndicator');
    const text = document.getElementById('statusText');
    
    if (!indicator || !text) {
      console.warn('Status indicator elements not found in DOM');
      return;
    }
    
    if (this.settings.enabled) {
      indicator.className = 'status-indicator enabled';
      text.textContent = 'Extension activée';
    } else {
      indicator.className = 'status-indicator disabled';
      text.textContent = 'Extension désactivée';
    }
  }

  showNotification(message, type = 'info') {
    // Créer ou réutiliser la zone de notification
    let notification = document.getElementById('notification');
    if (!notification) {
      notification = document.createElement('div');
      notification.id = 'notification';
      document.body.appendChild(notification);
    }
    
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.display = 'block';
    
    // Masquer après 3 secondes
    setTimeout(() => {
      notification.style.display = 'none';
    }, 3000);
  }



  /**
   * 🆕 Export des préférences (backup)
   */
  async exportPreferences() {
    if (!this.prefsManager) return;
    
    const json = await this.prefsManager.export();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `whisper-network-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
    this.showNotification('✅ Backup exporté', 'success');
  }

  /**
   * 🆕 Import des préférences (restore)
   */
  async importPreferences() {
    if (!this.prefsManager) return;
    
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const success = await this.prefsManager.import(event.target.result);
          
          if (success) {
            this.showNotification('✅ Backup restauré', 'success');
            await this.loadSettings();
            this.updateUI();
          } else {
            this.showNotification('❌ Fichier invalide', 'error');
          }
        } catch (error) {
          console.error('[WhisperPopup] Import error:', error);
          this.showNotification('❌ Erreur d\'import', 'error');
        }
      };
      reader.readAsText(file);
    };
    
    input.click();
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  countDifferences(original, anonymized) {
    // Compter approximativement les éléments anonymisés
    const patterns = [
      /\*\*\*IP\*\*\*/g,
      /\*\*\*EMAIL\*\*\*/g,
      /\*\*\*PHONE\*\*\*/g,
      /\*\*\*NIR\*\*\*/g,
      /\*\*\*NAME\*\*\*/g,
      /\*\*\*ADDRESS\*\*\*/g,
      /\*\*\*URL\*\*\*/g,
      /\*\*\*CARD\*\*\*/g,
      /\*\*\*IBAN\*\*\*/g
    ];
    
    let count = 0;
    patterns.forEach(pattern => {
      const matches = anonymized.match(pattern);
      if (matches) count += matches.length;
    });
    
    return count;
  }

  /**
   * 💾 Sauvegarder dans localStorage (backup automatique)
   */
  saveToLocalStorage(settings) {
    try {
      const backup = {
        settings: settings,
        timestamp: Date.now(),
        version: '1.0'
      };
      localStorage.setItem('whisper_preferences_backup', JSON.stringify(backup));
      console.log('[WhisperPopup] 💾 Backup saved to localStorage');
    } catch (error) {
      console.error('[WhisperPopup] ❌ localStorage save failed:', error);
    }
  }

  /**
   * 📂 Charger depuis localStorage
   */
  loadFromLocalStorage() {
    try {
      const backup = localStorage.getItem('whisper_preferences_backup');
      if (!backup) return null;
      
      const parsed = JSON.parse(backup);
      console.log('[WhisperPopup] 📂 Found localStorage backup from:', new Date(parsed.timestamp).toLocaleString());
      
      return parsed.settings;
    } catch (error) {
      console.error('[WhisperPopup] ❌ localStorage load failed:', error);
      return null;
    }
  }

  /**
   * 📥 Exporter la configuration vers fichier JSON
   */
  async exportConfig() {
    try {
      const exportData = {
        settings: this.settings,
        exportDate: new Date().toISOString(),
        version: '1.0'
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `whisper-config-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      this.showNotification('📥 Configuration exportée !', 'success');
      console.log('[WhisperPopup] 📥 Config exported');
    } catch (error) {
      console.error('[WhisperPopup] ❌ Export failed:', error);
      this.showNotification('❌ Erreur d\'export', 'error');
    }
  }

  /**
   * 📤 Importer la configuration depuis fichier JSON
   */
  async importConfigFromFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const data = JSON.parse(e.target.result);
          
          if (!data.settings) {
            throw new Error('Format de fichier invalide');
          }
          
          // Appliquer les settings importés
          this.settings = data.settings;
          this.updateUI();
          await this.saveSettings();
          
          this.showNotification('✅ Configuration importée !', 'success');
          console.log('[WhisperPopup] 📤 Config imported');
          resolve(data.settings);
        } catch (error) {
          console.error('[WhisperPopup] ❌ Import failed:', error);
          this.showNotification('❌ Erreur d\'import : ' + error.message, 'error');
          reject(error);
        }
      };
      
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  /**
   * 🕐 Mettre à jour le statut de backup
   */
  updateBackupStatus() {
    try {
      const backup = localStorage.getItem('whisper_preferences_backup');
      const statusEl = document.getElementById('lastBackupTime');
      
      if (backup && statusEl) {
        const parsed = JSON.parse(backup);
        const date = new Date(parsed.timestamp);
        const timeStr = date.toLocaleString('fr-FR', { 
          hour: '2-digit', 
          minute: '2-digit',
          day: '2-digit',
          month: '2-digit'
        });
        statusEl.textContent = timeStr;
      }
    } catch (error) {
      console.warn('[WhisperPopup] Could not update backup status:', error);
    }
  }

  // ============================================
  // 🔐 UUID + Backend Sync (PostgreSQL)
  // ============================================
  
  /**
   * 🆔 Obtenir ou générer UUID utilisateur
   */
  async getUserUUID() {
    try {
      const result = await chrome.storage.sync.get(['whisper_user_uuid']);
      
      if (result.whisper_user_uuid) {
        console.log('[UUID] ✅ Existing UUID:', result.whisper_user_uuid);
        return result.whisper_user_uuid;
      }
      
      // Générer nouveau UUID
      const newUuid = crypto.randomUUID();
      await chrome.storage.sync.set({ whisper_user_uuid: newUuid });
      console.log('[UUID] 🆕 Generated new UUID:', newUuid);
      
      return newUuid;
    } catch (error) {
      console.error('[UUID] ❌ Error:', error);
      return null;
    }
  }
  
  /**
   * ☁️ Sauvegarder préférences vers backend PostgreSQL
   */
  async saveToBackend(preferences) {
    try {
      const uuid = await this.getUserUUID();
      if (!uuid) {
        console.warn('[Backend Sync] ⚠️ No UUID, skipping backend save');
        return false;
      }
      
      const apiUrl = this.settings.apiUrl || 'http://localhost:8001';
      const apiKey = this.settings.apiKey || '';
      
      // Filtrer UNIQUEMENT les préférences UI (pas de mappings!)
      const safePreferences = this.filterSafePreferences(preferences);
      
      console.log('[Backend Sync] 📤 Saving to backend...', { uuid, preferences: safePreferences });
      
      const response = await fetch(`${apiUrl}/api/preferences/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey
        },
        body: JSON.stringify({
          uuid: uuid,
          preferences: safePreferences
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('[Backend Sync] ✅ Saved successfully:', data);
      
      return true;
    } catch (error) {
      console.error('[Backend Sync] ❌ Save failed:', error);
      // Ne pas bloquer l'application si le backend est down
      return false;
    }
  }
  
  /**
   * ☁️ Charger préférences depuis backend PostgreSQL
   */
  async loadFromBackend() {
    try {
      const uuid = await this.getUserUUID();
      if (!uuid) {
        console.warn('[Backend Sync] ⚠️ No UUID, skipping backend load');
        return null;
      }
      
      // Utiliser valeur par défaut si this.settings n'est pas encore défini
      const apiUrl = (this.settings && this.settings.apiUrl) || 'http://localhost:8001';
      const apiKey = (this.settings && this.settings.apiKey) || '';
      
      console.log('[Backend Sync] 📥 Loading from backend...', { uuid, apiUrl });
      
      const response = await fetch(`${apiUrl}/api/preferences/load`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey
        },
        body: JSON.stringify({ uuid: uuid })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.preferences && Object.keys(data.preferences).length > 0) {
        console.log('[Backend Sync] ✅ Loaded successfully:', data.preferences);
        return data.preferences;
      } else {
        console.log('[Backend Sync] ⚠️ No preferences found in backend');
        return null;
      }
    } catch (error) {
      console.error('[Backend Sync] ❌ Load failed:', error);
      return null;
    }
  }
  
  /**
   * 🔒 Filtrer les préférences sûres (UNIQUEMENT UI, pas de données confidentielles)
   */
  filterSafePreferences(preferences) {
    const allowedKeys = [
      // Configuration API
      'enabled', 'apiUrl', 'apiKey', 'processingMode',
      
      // === Données personnelles ===
      'anonymize_names', 'anonymize_addresses', 'anonymize_phone',
      'anonymize_email', 'anonymize_birth_dates', 'anonymize_nir',
      'anonymize_id_cards', 'anonymize_passports', 'anonymize_ip',
      'anonymize_logins',
      
      // === Données professionnelles ===
      'anonymize_employee_ids', 'anonymize_performance_data',
      'anonymize_salary_data', 'anonymize_schedules', 'anonymize_internal_comm',
      
      // === Données sensibles spécifiques ===
      'anonymize_medical_data', 'anonymize_bank_accounts',
      'anonymize_credit_cards', 'anonymize_iban', 'anonymize_transactions',
      'anonymize_grades', 'anonymize_legal_cases',
      
      // === Données contextuelles ===
      'anonymize_locations', 'anonymize_geolocations',
      'anonymize_access_badges', 'anonymize_photo_references',
      'anonymize_biometric', 'anonymize_urls',
      
      // === Anciens noms (compatibilité) ===
      'anonymize_address', 'anonymize_matricule', 'anonymize_salaire',
      'anonymize_evaluation', 'anonymize_planning',
      
      // Options comportementales
      'showPreview', 'autoAnonymize', 'autoDeanonymize', 'preserveMapping'
    ];
    
    const safe = {};
    for (const key of allowedKeys) {
      if (key in preferences) {
        safe[key] = preferences[key];
      }
    }
    
    console.log('[Backend Sync] 🔒 Filtered preferences:', safe);
    return safe;
  }
}

// Initialiser la popup quand le DOM est prêt
document.addEventListener('DOMContentLoaded', () => {
  new WhisperPopup();
});

// 🆕 Écouter les messages de popup-advanced.html pour sync
window.addEventListener('message', async (event) => {
  if (event.source !== window) return;
  
  if (event.data.type === 'WHISPER_SYNC_TO_BACKEND') {
    console.log('[Message Handler] 📨 Received sync request with UUID:', event.data.uuid);
    
    // Créer instance temporaire pour accéder aux méthodes
    const popup = new WhisperPopup();
    await popup.loadSettings();
    await popup.saveToBackend(popup.settings);
  }
});