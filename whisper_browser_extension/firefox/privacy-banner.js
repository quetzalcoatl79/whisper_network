/**
 * Privacy Banner Management
 * Gestion du bandeau de confidentialité (première visite uniquement)
 */

(function() {
  const BANNER_KEY = 'whisper_privacy_banner_dismissed';
  const banner = document.getElementById('privacyBanner');
  const closeBtn = document.getElementById('closeBanner');
  
  // Vérifier si le bandeau a déjà été fermé
  function shouldShowBanner() {
    const dismissed = localStorage.getItem(BANNER_KEY);
    return dismissed !== 'true';
  }
  
  // Afficher le bandeau avec animation
  function showBanner() {
    if (banner && shouldShowBanner()) {
      banner.style.display = 'block';
      console.log('[Privacy Banner] Displayed on first visit');
    }
  }
  
  // Fermer définitivement le bandeau
  function dismissBanner() {
    if (banner) {
      banner.style.animation = 'slideUp 0.3s ease-out';
      setTimeout(() => {
        banner.style.display = 'none';
        localStorage.setItem(BANNER_KEY, 'true');
        console.log('[Privacy Banner] Dismissed permanently');
        
        // 🆕 Générer UUID lors de la première validation
        initializeUUID();
      }, 300);
    }
  }
  
  // 🆕 Initialiser UUID anonyme pour synchronisation cloud
  async function initializeUUID() {
    try {
      // Vérifier si UUID déjà existant
      const result = await chrome.storage.sync.get(['whisper_user_uuid']);
      
      if (result.whisper_user_uuid) {
        console.log('[UUID] ✅ Already exists:', result.whisper_user_uuid);
        return result.whisper_user_uuid;
      }
      
      // Générer nouveau UUID v4
      const newUuid = crypto.randomUUID();
      await chrome.storage.sync.set({ whisper_user_uuid: newUuid });
      console.log('[UUID] 🆕 Generated new UUID:', newUuid);
      
      // Déclencher sync initial des préférences vers backend
      window.postMessage({ type: 'WHISPER_SYNC_TO_BACKEND', uuid: newUuid }, '*');
      
      return newUuid;
    } catch (error) {
      console.error('[UUID] ❌ Error initializing:', error);
      return null;
    }
  }
  
  // Event listener pour le bouton de fermeture
  if (closeBtn) {
    closeBtn.addEventListener('click', dismissBanner);
    
    // Effet hover
    closeBtn.addEventListener('mouseenter', () => {
      closeBtn.style.opacity = '1';
      closeBtn.style.transform = 'scale(1.2)';
    });
    closeBtn.addEventListener('mouseleave', () => {
      closeBtn.style.opacity = '0.7';
      closeBtn.style.transform = 'scale(1)';
    });
  }
  
  // Afficher le bandeau au chargement
  showBanner();
  
  // Auto-dismiss après 30 secondes (optionnel)
  if (shouldShowBanner()) {
    setTimeout(() => {
      if (banner && banner.style.display !== 'none') {
        console.log('[Privacy Banner] Auto-dismissed after 30s');
        dismissBanner();
      }
    }, 30000);
  }
})();
