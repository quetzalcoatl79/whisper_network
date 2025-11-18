// Script de diagnostic à coller dans la console (F12)
// pour diagnostiquer la détection des éléments d'upload

console.log('🔍 DIAGNOSTIC WHISPER NETWORK');
console.log('==============================');

// Vérifier le site
console.log('🌐 Site actuel:', window.location.hostname);

// Chercher les inputs file
const fileInputs = document.querySelectorAll('input[type="file"]');
console.log('📁 Inputs file trouvés:', fileInputs.length);
fileInputs.forEach((input, i) => {
    console.log(`  ${i+1}. ID: ${input.id}, Class: ${input.className}, Style: ${input.style.display}`);
});

// Chercher les boutons d'upload
const uploadSelectors = [
    '[data-testid*="attach"]',
    '[aria-label*="attach"]', 
    '[title*="attach"]',
    'button[aria-label*="file"]',
    'button[title*="file"]',
    '[data-testid="send-button"]',
    'button[aria-label*="Send"]'
];

uploadSelectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    if (elements.length > 0) {
        console.log(`🎯 "${selector}":`, elements.length, 'éléments');
    }
});

// Vérifier l'extension
if (typeof chrome !== 'undefined' && chrome.runtime) {
    console.log('✅ Extension Chrome détectée');
} else {
    console.log('❌ Extension Chrome non détectée');
}

console.log('==============================');