// ============================================
// TEST DIRECT CHROME.STORAGE.LOCAL
// ============================================
// Copier-coller ce code dans la console du Service Worker
// chrome://extensions → "service worker" → Coller dans console

console.clear();
console.log('🧪 === TEST CHROME.STORAGE.LOCAL ===');

// Test 1: Vérifier permissions
console.log('📋 Permissions:', chrome.runtime.getManifest().permissions);

// Test 2: Effacer tout
chrome.storage.local.clear(() => {
  console.log('🧹 Storage effacé');
  
  // Test 3: Écrire données de test
  const testData = {
    test_timestamp: Date.now(),
    test_string: 'hello_world',
    anonymize_names: true,
    anonymize_email: true,
    apiUrl: 'http://localhost:8001'
  };
  
  console.log('📝 Écriture de:', testData);
  
  chrome.storage.local.set(testData, () => {
    if (chrome.runtime.lastError) {
      console.error('❌ ERREUR écriture:', chrome.runtime.lastError);
    } else {
      console.log('✅ Écriture réussie');
      
      // Test 4: Lire immédiatement
      chrome.storage.local.get(null, (all) => {
        if (chrome.runtime.lastError) {
          console.error('❌ ERREUR lecture:', chrome.runtime.lastError);
        } else {
          console.log('✅ Lecture immédiate:', all);
          console.log('🔍 Nombre de clés:', Object.keys(all).length);
          
          // Test 5: Vérifier getBytesInUse
          chrome.storage.local.getBytesInUse(null, (bytes) => {
            console.log('💾 Espace utilisé:', bytes, 'bytes');
          });
        }
      });
    }
  });
});

// Test 6: Attendre 2 secondes puis relire
setTimeout(() => {
  console.log('\n⏱️ Après 2 secondes:');
  chrome.storage.local.get(null, (all) => {
    console.log('📦 Données toujours présentes:', all);
    console.log('🔍 Clés:', Object.keys(all));
  });
}, 2000);
