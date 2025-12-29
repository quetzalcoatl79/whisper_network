/**
 * ConfigPersistence - Sauvegarde persistante des préférences
 * Permet d'exporter/importer la config pour contourner l'effacement de chrome.storage en dev
 */

class ConfigPersistence {
  constructor() {
    this.configFileName = 'user-config.json';
  }

  /**
   * Télécharger la config actuelle en fichier JSON
   */
  async exportConfig(settings) {
    const config = {
      version: '1.0.0',
      lastSaved: new Date().toISOString(),
      settings: settings
    };
    
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `whisper-config-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log('[ConfigPersistence] ✅ Config exported:', config);
    return true;
  }

  /**
   * Importer une config depuis un fichier JSON
   */
  async importConfig() {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) {
          reject(new Error('No file selected'));
          return;
        }
        
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const config = JSON.parse(event.target.result);
            console.log('[ConfigPersistence] ✅ Config imported:', config);
            resolve(config.settings);
          } catch (error) {
            console.error('[ConfigPersistence] ❌ Invalid JSON:', error);
            reject(error);
          }
        };
        reader.onerror = reject;
        reader.readAsText(file);
      };
      
      input.click();
    });
  }

  /**
   * Charger la config par défaut depuis user-config.json
   */
  async loadDefaultConfig() {
    try {
      const response = await fetch(chrome.runtime.getURL('user-config.json'));
      const config = await response.json();
      console.log('[ConfigPersistence] ✅ Default config loaded:', config);
      return config.settings;
    } catch (error) {
      console.error('[ConfigPersistence] ❌ Failed to load default config:', error);
      return null;
    }
  }

  /**
   * Afficher les instructions pour éditer user-config.json
   */
  showInstructions() {
    const message = `
🔧 CONFIGURATION PERSISTANTE - MODE DÉVELOPPEUR

Chrome efface chrome.storage.sync/local à chaque rechargement en mode dev.

📁 SOLUTION: Éditer manuellement le fichier user-config.json

1️⃣ Ouvrir le dossier de l'extension:
   whisper_browser_extension/user-config.json

2️⃣ Modifier les valeurs dans "settings":
   {
     "apiUrl": "http://localhost:8001",
     "anonymize_names": true,
     ...
   }

3️⃣ Sauvegarder le fichier

4️⃣ Recharger l'extension (chrome://extensions)

✅ Les settings seront chargés depuis user-config.json à chaque démarrage

💡 Alternative: Utiliser Export/Import pour sauvegarder/restaurer rapidement
    `;
    
    console.log(message);
    alert(message);
  }

  /**
   * Copier les settings actuels dans le presse-papier (pour coller dans user-config.json)
   */
  async copyToClipboard(settings) {
    const config = {
      version: '1.0.0',
      lastSaved: new Date().toISOString(),
      settings: settings
    };
    
    try {
      await navigator.clipboard.writeText(JSON.stringify(config, null, 2));
      console.log('[ConfigPersistence] ✅ Config copied to clipboard');
      return true;
    } catch (error) {
      console.error('[ConfigPersistence] ❌ Failed to copy:', error);
      return false;
    }
  }
}

// Export global instance
if (typeof window !== 'undefined') {
  window.configPersistence = new ConfigPersistence();
}
