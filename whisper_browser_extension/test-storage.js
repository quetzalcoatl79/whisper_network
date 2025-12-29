/**
 * Script de test pour vérifier chrome.storage.local
 * À exécuter dans la console du Service Worker (background)
 * 
 * chrome://extensions → Whisper Network → "service worker" → Coller ce code
 */

console.log('=== TEST CHROME.STORAGE.LOCAL ===');

// Test 1: Écrire des données
console.log('📝 Test 1: Écriture...');
chrome.storage.local.set({
  test_key: 'test_value',
  anonymize_names: true,
  anonymize_email: true,
  apiUrl: 'http://localhost:8001'
}, () => {
  if (chrome.runtime.lastError) {
    console.error('❌ Erreur écriture:', chrome.runtime.lastError);
  } else {
    console.log('✅ Écriture OK');
    
    // Test 2: Lire les données
    console.log('📖 Test 2: Lecture...');
    chrome.storage.local.get(null, (all) => {
      if (chrome.runtime.lastError) {
        console.error('❌ Erreur lecture:', chrome.runtime.lastError);
      } else {
        console.log('✅ Données stockées:', all);
        
        // Test 3: Vérifier persistence
        console.log('🔍 Test 3: Keys présentes:', Object.keys(all));
      }
    });
  }
});

// Test 4: Vérifier les permissions
console.log('🔐 Permissions manifest:', chrome.runtime.getManifest().permissions);
