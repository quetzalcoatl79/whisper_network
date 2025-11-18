/**
 * Popup Script - Interface de configuration de l'extension
 */

class WhisperPopup {
  constructor() {
    this.settings = {};
    this.init();
  }

  async init() {
    await this.loadSettings();
    this.bindEvents();
    this.updateUI();
    this.checkApiStatus();
  }

  async loadSettings() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'getSettings' }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Error loading settings:', chrome.runtime.lastError);
          // Use default settings if communication fails
          this.settings = this.getDefaultSettings();
        } else if (response && response.success) {
          this.settings = response.settings;
        } else {
          console.error('Invalid response from background:', response);
          this.settings = this.getDefaultSettings();
        }
        resolve();
      });
    });
  }

  getDefaultSettings() {
    return {
      enabled: true,
      apiUrl: 'http://localhost:8001',
      processingMode: 'fast', // 'fast' ou 'complete'
      anonymize_names: true,
      anonymize_email: true,
      anonymize_phone: true,
      anonymize_address: true,
      anonymize_nir: true,
      anonymize_iban: true,
      anonymize_credit_cards: true,
      anonymize_ip: true,
      anonymize_urls: true,
      showPreview: true,
      autoAnonymize: false,
      // Statistiques de performance
      totalProcessed: 0,
      processingTimes: [],
      lastProcessingTime: null
    };
  }

  async saveSettings() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { action: 'saveSettings', settings: this.settings },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error('Error saving settings:', chrome.runtime.lastError);
            resolve(false);
          } else {
            resolve(response && response.success);
          }
        }
      );
    });
  }

  updateUI() {
    // Activation principale
    document.getElementById('enabledToggle').checked = this.settings.enabled;
    
    // Configuration API
    document.getElementById('apiUrl').value = this.settings.apiUrl || 'http://localhost:8001';
    
    // Mode de traitement
    const modeRadio = document.querySelector(`input[name="processingMode"][value="${this.settings.processingMode || 'fast'}"]`);
    if (modeRadio) modeRadio.checked = true;
    
    // Paramètres d'anonymisation
    const anonymizationTypes = [
      'anonymize_ip', 'anonymize_email', 'anonymize_phone', 'anonymize_nir',
      'anonymize_names', 'anonymize_address', 'anonymize_urls', 
      'anonymize_credit_cards', 'anonymize_iban'
    ];
    
    anonymizationTypes.forEach(type => {
      const element = document.getElementById(type);
      if (element) {
        element.checked = this.settings[type] || false;
      }
    });
    
    // Options comportementales
    document.getElementById('showPreview').checked = this.settings.showPreview;
    document.getElementById('autoAnonymize').checked = this.settings.autoAnonymize;
    
    // Statistiques de performance
    this.updatePerformanceStats();
  }

  collectSettings() {
    // Activation principale
    this.settings.enabled = document.getElementById('enabledToggle').checked;
    
    // Configuration API
    this.settings.apiUrl = document.getElementById('apiUrl').value;
    
    // Mode de traitement
    const checkedMode = document.querySelector('input[name="processingMode"]:checked');
    this.settings.processingMode = checkedMode ? checkedMode.value : 'fast';
    
    // Paramètres d'anonymisation
    const anonymizationTypes = [
      'anonymize_ip', 'anonymize_email', 'anonymize_phone', 'anonymize_nir',
      'anonymize_names', 'anonymize_address', 'anonymize_urls', 
      'anonymize_credit_cards', 'anonymize_iban'
    ];
    
    anonymizationTypes.forEach(type => {
      const element = document.getElementById(type);
      if (element) {
        this.settings[type] = element.checked;
      }
    });
    
    // Options comportementales
    this.settings.showPreview = document.getElementById('showPreview').checked;
    this.settings.autoAnonymize = document.getElementById('autoAnonymize').checked;
  }

  updatePerformanceStats() {
    // Mettre à jour les statistiques de performance
    const totalProcessed = this.settings.totalProcessed || 0;
    const processingTimes = this.settings.processingTimes || [];
    const lastTime = this.settings.lastProcessingTime;

    document.getElementById('totalProcessed').textContent = totalProcessed;
    document.getElementById('lastProcessingTime').textContent = 
      lastTime ? `${lastTime.toFixed(1)}ms` : '-';

    if (processingTimes.length > 0) {
      const average = processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length;
      document.getElementById('averageTime').textContent = `${average.toFixed(1)}ms`;
    } else {
      document.getElementById('averageTime').textContent = '-';
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
    // Bouton sauvegarder
    document.getElementById('saveBtn').addEventListener('click', async () => {
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

    // Bouton réinitialiser
    document.getElementById('resetBtn').addEventListener('click', () => {
      if (confirm('Voulez-vous vraiment réinitialiser tous les paramètres ?')) {
        this.resetToDefaults();
      }
    });

    // Test API
    document.getElementById('testApiBtn').addEventListener('click', () => {
      this.testApiConnection();
    });

    // Test d'anonymisation
    document.getElementById('testAnonymizeBtn').addEventListener('click', () => {
      this.testAnonymization();
    });

    // Auto-sauvegarde sur changement d'activation
    document.getElementById('enabledToggle').addEventListener('change', async () => {
      this.collectSettings();
      await this.saveSettings();
      this.updateStatusIndicator();
    });
  }

  async checkApiStatus() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'testApi' }, (response) => {
        const statusIndicator = document.getElementById('statusIndicator');
        const statusText = document.getElementById('statusText');
        
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
    const originalText = button.textContent;
    
    console.log('🔧 Test API - Début');
    button.textContent = 'Test...';
    button.disabled = true;
    
    // Mettre à jour l'URL API
    this.settings.apiUrl = document.getElementById('apiUrl').value;
    console.log('🔧 URL API:', this.settings.apiUrl);
    await this.saveSettings();
    
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
}

// Initialiser la popup quand le DOM est prêt
document.addEventListener('DOMContentLoaded', () => {
  new WhisperPopup();
});