/**
 * 🍪 ConsentBanner - Banner RGPD pour consentement cookies
 * 
 * Affiche un modal de consentement conforme RGPD à la première utilisation
 */

class ConsentBanner {
  constructor() {
    this.bannerId = 'whisper-consent-banner';
    this.shown = false;
  }

  /**
   * Vérifie si le banner doit être affiché
   */
  async shouldShow() {
    const hasConsent = await preferencesManager.hasConsent();
    const isFirstRun = await preferencesManager.isFirstRun();
    return isFirstRun || !hasConsent;
  }

  /**
   * Crée le HTML du banner
   */
  createBannerHTML() {
    return `
      <div id="${this.bannerId}" class="whisper-consent-banner">
        <div class="whisper-consent-overlay"></div>
        <div class="whisper-consent-modal">
          <div class="whisper-consent-header">
            <h2>🔒 Bienvenue sur Whisper Network</h2>
            <p class="whisper-consent-version">v1.0.0</p>
          </div>
          
          <div class="whisper-consent-body">
            <div class="whisper-consent-icon">🍪</div>
            
            <h3>Protection de vos données personnelles</h3>
            
            <p>
              Whisper Network utilise le <strong>stockage local de votre navigateur</strong> 
              pour sauvegarder vos préférences :
            </p>
            
            <ul class="whisper-consent-list">
              <li>✅ <strong>Clé API</strong> (pour communiquer avec le serveur)</li>
              <li>✅ <strong>URL du serveur</strong> (http://localhost:8001 par défaut)</li>
              <li>✅ <strong>Préférences d'anonymisation</strong> (auto-dé-anonymisation, formatage)</li>
              <li>✅ <strong>Identifiants de session</strong> (pour garder le contexte conversationnel)</li>
            </ul>
            
            <div class="whisper-consent-info">
              <strong>🔐 Garanties de confidentialité :</strong>
              <ul>
                <li>❌ <strong>Aucune donnée envoyée à des tiers</strong></li>
                <li>❌ <strong>Aucun tracking publicitaire</strong></li>
                <li>❌ <strong>Aucune collecte de statistiques externes</strong></li>
                <li>✅ <strong>Données stockées uniquement en local</strong></li>
                <li>✅ <strong>Vous gardez le contrôle total</strong></li>
              </ul>
            </div>
            
            <div class="whisper-consent-technical">
              <details>
                <summary>📋 Détails techniques (optionnel)</summary>
                <p>
                  Les données sont stockées via <code>chrome.storage.local</code>, 
                  une API navigateur qui stocke les informations sur votre ordinateur uniquement.
                  Vous pouvez à tout moment :
                </p>
                <ul>
                  <li>Consulter vos données stockées</li>
                  <li>Exporter vos préférences (backup)</li>
                  <li>Réinitialiser toutes les données</li>
                  <li>Désinstaller l'extension (efface tout)</li>
                </ul>
              </details>
            </div>
            
            <p class="whisper-consent-required">
              <strong>⚠️ Requis pour le fonctionnement :</strong><br>
              Sans stockage local, vos préférences seront perdues à chaque rafraîchissement de page.
            </p>
          </div>
          
          <div class="whisper-consent-footer">
            <button id="whisper-consent-accept" class="whisper-btn whisper-btn-primary">
              ✅ J'accepte le stockage local
            </button>
            <button id="whisper-consent-refuse" class="whisper-btn whisper-btn-secondary">
              ❌ Refuser (mode session uniquement)
            </button>
          </div>
          
          <div class="whisper-consent-links">
            <a href="https://github.com/quetzalcoatl79/whisper_network" target="_blank">📖 Documentation</a>
            <a href="https://github.com/quetzalcoatl79/whisper_network/blob/main/LICENSE" target="_blank">⚖️ Licence MIT</a>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Crée les styles CSS du banner
   */
  createStyles() {
    const styleId = 'whisper-consent-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .whisper-consent-banner {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 999999;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        animation: whisperFadeIn 0.3s ease-out;
      }

      .whisper-consent-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(5px);
      }

      .whisper-consent-modal {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 20px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        max-width: 650px;
        width: 90%;
        max-height: 90vh;
        overflow-y: auto;
        animation: whisperSlideUp 0.4s ease-out;
      }

      @keyframes whisperFadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      @keyframes whisperSlideUp {
        from {
          transform: translate(-50%, -40%);
          opacity: 0;
        }
        to {
          transform: translate(-50%, -50%);
          opacity: 1;
        }
      }

      .whisper-consent-header {
        background: rgba(255, 255, 255, 0.15);
        backdrop-filter: blur(10px);
        padding: 24px 32px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.2);
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .whisper-consent-header h2 {
        margin: 0;
        font-size: 24px;
        font-weight: 700;
        color: white;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
      }

      .whisper-consent-version {
        background: rgba(255, 255, 255, 0.2);
        color: white;
        padding: 4px 12px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 600;
        margin: 0;
      }

      .whisper-consent-body {
        padding: 32px;
        background: white;
        color: #333;
        line-height: 1.6;
      }

      .whisper-consent-icon {
        font-size: 48px;
        text-align: center;
        margin-bottom: 16px;
        animation: whisperBounce 1s infinite;
      }

      @keyframes whisperBounce {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-10px); }
      }

      .whisper-consent-body h3 {
        margin: 0 0 16px 0;
        font-size: 20px;
        font-weight: 700;
        color: #667eea;
        text-align: center;
      }

      .whisper-consent-body p {
        margin: 12px 0;
        font-size: 15px;
      }

      .whisper-consent-list {
        list-style: none;
        padding: 0;
        margin: 16px 0;
        background: #f8f9ff;
        border-radius: 12px;
        padding: 16px 20px;
      }

      .whisper-consent-list li {
        margin: 8px 0;
        font-size: 14px;
        padding-left: 8px;
      }

      .whisper-consent-info {
        background: #e8f5e9;
        border-left: 4px solid #4caf50;
        padding: 16px;
        border-radius: 8px;
        margin: 20px 0;
        font-size: 14px;
      }

      .whisper-consent-info strong {
        color: #2e7d32;
        display: block;
        margin-bottom: 8px;
        font-size: 15px;
      }

      .whisper-consent-info ul {
        margin: 8px 0 0 0;
        padding-left: 20px;
        list-style: none;
      }

      .whisper-consent-info li {
        margin: 6px 0;
      }

      .whisper-consent-technical {
        margin: 20px 0;
      }

      .whisper-consent-technical details {
        background: #fff3e0;
        border-radius: 8px;
        padding: 12px 16px;
        border: 1px solid #ffb74d;
      }

      .whisper-consent-technical summary {
        cursor: pointer;
        font-weight: 600;
        color: #f57c00;
        user-select: none;
      }

      .whisper-consent-technical summary:hover {
        color: #e65100;
      }

      .whisper-consent-technical p, .whisper-consent-technical ul {
        margin-top: 12px;
        font-size: 13px;
        color: #666;
      }

      .whisper-consent-technical code {
        background: rgba(0, 0, 0, 0.05);
        padding: 2px 6px;
        border-radius: 4px;
        font-family: monospace;
        font-size: 12px;
      }

      .whisper-consent-required {
        background: #fff3cd;
        border-left: 4px solid #ffc107;
        padding: 12px;
        border-radius: 8px;
        margin: 20px 0 0 0;
        font-size: 14px;
      }

      .whisper-consent-footer {
        padding: 24px 32px;
        background: white;
        display: flex;
        gap: 12px;
        justify-content: center;
      }

      .whisper-btn {
        padding: 14px 32px;
        border: none;
        border-radius: 12px;
        font-size: 15px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }

      .whisper-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
      }

      .whisper-btn:active {
        transform: translateY(0);
      }

      .whisper-btn-primary {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
      }

      .whisper-btn-secondary {
        background: #e0e0e0;
        color: #666;
      }

      .whisper-consent-links {
        padding: 16px 32px 24px;
        background: white;
        display: flex;
        gap: 24px;
        justify-content: center;
        border-top: 1px solid #eee;
      }

      .whisper-consent-links a {
        color: #667eea;
        text-decoration: none;
        font-size: 13px;
        font-weight: 500;
        transition: color 0.2s;
      }

      .whisper-consent-links a:hover {
        color: #764ba2;
        text-decoration: underline;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Affiche le banner
   */
  async show() {
    if (this.shown) return;
    
    const shouldShow = await this.shouldShow();
    if (!shouldShow) return;

    this.shown = true;
    
    // Créer les styles
    this.createStyles();
    
    // Créer le banner
    const banner = document.createElement('div');
    banner.innerHTML = this.createBannerHTML();
    document.body.appendChild(banner);

    // Event listeners
    document.getElementById('whisper-consent-accept').addEventListener('click', () => {
      this.accept();
    });

    document.getElementById('whisper-consent-refuse').addEventListener('click', () => {
      this.refuse();
    });

    console.log('[ConsentBanner] Displayed');
  }

  /**
   * Accepter le consentement
   */
  async accept() {
    await preferencesManager.setConsent(true);
    await preferencesManager.markFirstRunComplete();
    
    // Sauvegarder les préférences par défaut
    await preferencesManager.save(preferencesManager.defaults);
    
    this.hide();
    
    console.log('[ConsentBanner] Consent accepted ✅');
    
    // Notification
    this.showNotification('✅ Préférences sauvegardées !', 'Vos paramètres seront conservés.', 'success');
  }

  /**
   * Refuser le consentement
   */
  async refuse() {
    await preferencesManager.setConsent(false);
    await preferencesManager.markFirstRunComplete();
    
    this.hide();
    
    console.log('[ConsentBanner] Consent refused ❌');
    
    // Notification
    this.showNotification(
      '⚠️ Mode session uniquement', 
      'Vos préférences seront perdues à chaque rafraîchissement.', 
      'warning'
    );
  }

  /**
   * Cache le banner
   */
  hide() {
    const banner = document.getElementById(this.bannerId);
    if (banner) {
      banner.style.animation = 'whisperFadeOut 0.3s ease-out';
      setTimeout(() => banner.remove(), 300);
    }
    this.shown = false;
  }

  /**
   * Affiche une notification
   */
  showNotification(title, message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'success' ? '#4caf50' : type === 'warning' ? '#ff9800' : '#2196f3'};
      color: white;
      padding: 16px 24px;
      border-radius: 12px;
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
      z-index: 999999;
      max-width: 350px;
      animation: whisperSlideIn 0.3s ease-out;
    `;
    notification.innerHTML = `
      <strong style="display: block; margin-bottom: 4px;">${title}</strong>
      <span style="font-size: 14px;">${message}</span>
    `;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = 'whisperSlideOut 0.3s ease-out';
      setTimeout(() => notification.remove(), 300);
    }, 4000);
  }
}

// Créer une instance globale
const consentBanner = new ConsentBanner();

// Afficher le banner au chargement de la page
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => consentBanner.show(), 500);
  });
} else {
  setTimeout(() => consentBanner.show(), 500);
}

console.log('🍪 ConsentBanner loaded');
