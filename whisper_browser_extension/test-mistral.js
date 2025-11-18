// Script de test pour Mistral AI - à coller dans la console (F12)
// Développé par Sylvain JOLY, NANO by NXO pour Whisper Network

console.log('🚀 WHISPER NETWORK - TEST MISTRAL AI');
console.log('====================================');

// 1. Vérifier le site
console.log('🌐 Site actuel:', window.location.hostname);
if (!window.location.hostname.includes('mistral.ai')) {
    console.warn('⚠️  Ce script est conçu pour Mistral AI');
}

// 2. Chercher les éléments d'upload spécifiques à Mistral
const mistralSelectors = [
    'input[type="file"]',
    'input[accept*="text"]',
    'input[accept*="application"]',
    'input[accept*="image"]',
    '[data-testid*="upload"]',
    '[data-testid*="file"]',
    'button[aria-label*="upload"]',
    'button[title*="upload"]',
    'button[aria-label*="file"]',
    '[role="button"][aria-label*="attach"]',
    'button[data-testid*="attach"]'
];

console.log('🔍 Recherche des éléments Mistral...');
let totalFound = 0;

mistralSelectors.forEach((selector, index) => {
    const elements = document.querySelectorAll(selector);
    if (elements.length > 0) {
        console.log(`  ${index + 1}. "${selector}": ${elements.length} élément(s)`);
        elements.forEach((el, i) => {
            console.log(`     - Élément ${i + 1}:`, {
                tagName: el.tagName,
                type: el.type,
                id: el.id,
                className: el.className,
                'aria-label': el.getAttribute('aria-label'),
                'data-testid': el.getAttribute('data-testid'),
                style: el.style.display === 'none' ? 'HIDDEN' : 'VISIBLE'
            });
        });
    }
    totalFound += elements.length;
});

console.log(`📊 Total des éléments trouvés: ${totalFound}`);

// 3. Surveiller les changements dynamiques
console.log('👀 Installation du surveillant DOM...');
const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === 1) {
                    const newFileInputs = node.querySelectorAll('input[type="file"]');
                    if (newFileInputs.length > 0) {
                        console.log('🆕 Nouveaux inputs file détectés:', newFileInputs.length);
                    }
                }
            });
        }
    });
});

observer.observe(document.body, { childList: true, subtree: true });

// 4. Écouter les changements de fichiers
document.addEventListener('change', (e) => {
    if (e.target.type === 'file' && e.target.files && e.target.files.length > 0) {
        console.log('🔥 FICHIER SÉLECTIONNÉ:', {
            nom: e.target.files[0].name,
            taille: e.target.files[0].size,
            type: e.target.files[0].type,
            input: e.target
        });
    }
}, true);

// 5. Instructions
console.log('');
console.log('📋 INSTRUCTIONS:');
console.log('1. Essayez d\'uploader un fichier sur Mistral');
console.log('2. Observez les logs qui apparaîtront');
console.log('3. Si aucun élément n\'est trouvé, inspectez manuellement l\'interface');
console.log('');
console.log('🔧 Si l\'extension ne fonctionne pas:');
console.log('1. Vérifiez que l\'extension est rechargée');
console.log('2. Vérifiez que Mistral est ajouté aux permissions');
console.log('3. Regardez les erreurs dans la console');

// 6. Test de l'API
console.log('');
console.log('🧪 Test de l\'API Whisper Network...');
fetch('http://localhost:8001/health')
    .then(response => response.json())
    .then(data => {
        console.log('✅ API Whisper Network disponible:', data);
    })
    .catch(error => {
        console.log('❌ API Whisper Network non disponible:', error.message);
        console.log('💡 Vérifiez que Docker est démarré');
    });

console.log('====================================');
console.log('🚀 Surveillance active - Essayez d\'uploader un fichier !');