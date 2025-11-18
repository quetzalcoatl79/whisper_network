/**
 * Whisper Network - Content Script Simplifié
 * Version ultra-robuste qui fonctionne partout
 */

console.log('🔒 Whisper Network - Démarré !');

// Créer l'interface immédiatement
function createWhisperUI() {
    // Supprimer l'ancien si existe
    const oldBtn = document.getElementById('whisper-anonymize-btn-main');
    if (oldBtn) oldBtn.remove();

    // Créer le bouton principal d'anonymisation
    const btn = document.createElement('button');
    btn.id = 'whisper-anonymize-btn-main';
    btn.innerHTML = `
        <span style="font-size: 18px;">🔒</span>
        <span style="margin-left: 6px; font-weight: bold;">ANONYMISER</span>
    `;
    
    // Styles du bouton
    btn.style.cssText = `
        position: fixed !important;
        top: 60px !important;
        right: 20px !important;
        z-index: 999999 !important;
        background: linear-gradient(135deg, #FF6B35 0%, #FF8C42 100%) !important;
        color: white !important;
        border: none !important;
        padding: 12px 20px !important;
        border-radius: 25px !important;
        font-size: 14px !important;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
        cursor: pointer !important;
        box-shadow: 0 4px 15px rgba(255, 107, 53, 0.4) !important;
        display: flex !important;
        align-items: center !important;
        transition: all 0.3s ease !important;
        font-weight: bold !important;
    `;

    // Événements
    btn.onmouseover = function() {
        this.style.transform = 'scale(1.05) translateY(-2px)';
        this.style.boxShadow = '0 6px 20px rgba(255, 107, 53, 0.6)';
    };

    btn.onmouseout = function() {
        this.style.transform = 'scale(1)';
        this.style.boxShadow = '0 4px 15px rgba(255, 107, 53, 0.4)';
    };

    btn.onclick = function() {
        anonymizeCurrentField();
    };

    // Ajouter au body
    document.body.appendChild(btn);
    console.log('✅ Bouton Whisper créé !');
}

// Fonction pour anonymiser le champ actif
async function anonymizeCurrentField() {
    console.log('🔄 Anonymisation lancée...');
    
    // Chercher le champ actif ou le champ principal
    let field = document.activeElement;
    let text = '';

    // Si pas de champ actif, chercher le champ principal
    if (!isTextField(field)) {
        console.log('🔍 Aucun champ actif, recherche du champ principal...');
        field = findMainTextField();
    }

    if (!field) {
        console.log('❌ Aucun champ trouvé');
        showNotification('⚠️ Aucun champ de texte trouvé. Cliquez dans un champ de saisie.', 'warning');
        return;
    }

    console.log('✅ Champ trouvé:', field.tagName, field.className);

    // Récupérer le texte selon le type de champ
    if (field.tagName === 'TEXTAREA' || field.tagName === 'INPUT') {
        text = field.value;
        console.log('📝 Texte (textarea/input):', text.substring(0, 100));
    } else if (field.contentEditable === 'true' || field.getAttribute('contenteditable') === 'true') {
        // Pour contenteditable, essayer plusieurs méthodes
        text = field.innerText || field.textContent || '';
        
        console.log('📝 Texte (contenteditable) innerText:', text.substring(0, 100));
        
        // Si toujours vide, chercher dans les paragraphes enfants
        if (!text.trim()) {
            const paragraphs = field.querySelectorAll('p');
            text = Array.from(paragraphs).map(p => p.textContent).join('\n');
            console.log('📝 Texte (paragraphes):', text.substring(0, 100));
        }
    }

    if (!text || text.trim() === '') {
        showNotification('⚠️ Le champ est vide. Écrivez du texte d\'abord.', 'warning');
        return;
    }

    console.log('📝 Texte trouvé:', text.substring(0, 50) + '...');

    // Afficher l'indicateur de chargement
    field.style.opacity = '0.6';
    showNotification('🔄 Anonymisation en cours...', 'info');

    try {
        // Envoyer au background script
        chrome.runtime.sendMessage({
            action: 'anonymize',
            text: text
        }, function(response) {
            field.style.opacity = '1';

            if (chrome.runtime.lastError) {
                console.error('❌ Erreur:', chrome.runtime.lastError);
                showNotification('❌ Erreur de connexion', 'error');
                return;
            }

            if (response && response.success) {
                // Remplacer le texte selon le type de champ
                if (field.tagName === 'TEXTAREA' || field.tagName === 'INPUT') {
                    field.value = response.anonymized_text;
                } else if (field.contentEditable === 'true' || field.getAttribute('contenteditable') === 'true') {
                    // Pour contenteditable, remplacer intelligemment
                    if (field.querySelector('p')) {
                        // Si contient des paragraphes, mettre le texte dans le premier
                        const firstP = field.querySelector('p');
                        firstP.textContent = response.anonymized_text;
                        // Supprimer les autres paragraphes
                        const otherPs = Array.from(field.querySelectorAll('p')).slice(1);
                        otherPs.forEach(p => p.remove());
                    } else {
                        // Sinon, remplacer directement
                        field.innerHTML = `<p>${response.anonymized_text}</p>`;
                    }
                }

                // Déclencher les événements pour que la page détecte le changement
                field.dispatchEvent(new Event('input', { bubbles: true }));
                field.dispatchEvent(new Event('change', { bubbles: true }));
                field.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }));
                field.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));

                showNotification(
                    `✅ ${response.anonymizations_count} éléments anonymisés en ${response.processing_time_ms.toFixed(1)}ms`, 
                    'success'
                );
                
                console.log('✅ Anonymisation réussie !');
            } else {
                showNotification('❌ Erreur: ' + (response?.error || 'Échec'), 'error');
            }
        });
    } catch (error) {
        field.style.opacity = '1';
        console.error('❌ Exception:', error);
        showNotification('❌ Erreur: ' + error.message, 'error');
    }
}

// Vérifier si c'est un champ de texte
function isTextField(element) {
    if (!element) return false;
    
    return element.tagName === 'TEXTAREA' || 
           (element.tagName === 'INPUT' && element.type === 'text') ||
           element.contentEditable === 'true' ||
           element.getAttribute('contenteditable') === 'true';
}

// Trouver le champ de texte principal
function findMainTextField() {
    console.log('🔍 Recherche du champ principal...');
    
    // Sélecteurs optimisés par site
    const siteSpecificSelectors = {
        // ChatGPT (chat.openai.com, chatgpt.com)
        'openai.com': [
            '#prompt-textarea',
            'textarea[data-id]',
            'div[contenteditable="true"][data-id]',
            'textarea[placeholder*="Message"]'
        ],
        
        // Claude (claude.ai)
        'claude.ai': [
            'div[contenteditable="true"].ProseMirror',
            'div.ProseMirror[contenteditable="true"]',
            '[contenteditable="true"] p',
            'fieldset div[contenteditable="true"]'
        ],
        
        // Mistral (chat.mistral.ai)
        'mistral.ai': [
            'textarea[placeholder*="Ask"]',
            'textarea[placeholder*="question"]',
            'div[contenteditable="true"]'
        ],
        
        // Copilot (copilot.microsoft.com)
        'microsoft.com': [
            'textarea[placeholder*="Ask me anything"]',
            'cib-text-input textarea',
            'textarea.cib-serp-main',
            '#userInput'
        ],
        
        // Gemini (gemini.google.com, bard.google.com)
        'google.com': [
            'rich-textarea textarea',
            'textarea[aria-label*="message"]',
            'div[contenteditable="true"][role="textbox"]',
            '.ql-editor[contenteditable="true"]'
        ],
        
        // Perplexity (perplexity.ai)
        'perplexity.ai': [
            'textarea[placeholder*="Ask"]',
            'textarea[placeholder*="Follow"]',
            'textarea.w-full'
        ],
        
        // Poe (poe.com)
        'poe.com': [
            'textarea[class*="GrowingTextArea"]',
            'textarea[placeholder*="Talk"]',
            'footer textarea'
        ],
        
        // You.com
        'you.com': [
            'textarea[placeholder*="Ask"]',
            '#search-input-textarea'
        ],
        
        // Character.AI
        'character.ai': [
            'textarea[placeholder*="message"]',
            'div[contenteditable="true"][role="textbox"]'
        ],
        
        // HuggingChat
        'huggingface.co': [
            'textarea[placeholder*="Ask"]',
            'form textarea'
        ],
        
        // Pi.ai
        'pi.ai': [
            'textarea[placeholder*="Talk"]',
            'div[contenteditable="true"]'
        ]
    };
    
    // Déterminer les sélecteurs à utiliser selon le site
    let selectorsToTry = [];
    const hostname = window.location.hostname;
    
    // Chercher les sélecteurs spécifiques au site
    for (let [domain, selectors] of Object.entries(siteSpecificSelectors)) {
        if (hostname.includes(domain)) {
            console.log('🎯 Site détecté:', domain);
            selectorsToTry = selectors;
            break;
        }
    }
    
    // Sélecteurs génériques (toujours essayés après les spécifiques)
    const genericSelectors = [
        // Patterns communs pour tous les chats
        'textarea[placeholder*="message" i]',
        'textarea[placeholder*="Message" i]',
        'textarea[placeholder*="ask" i]',
        'textarea[placeholder*="question" i]',
        'textarea[placeholder*="chat" i]',
        'textarea[aria-label*="message" i]',
        
        // ContentEditable communs
        'div[contenteditable="true"][role="textbox"]',
        '[contenteditable="true"][data-slate-editor="true"]',
        'div[contenteditable="true"]:not([role="presentation"])',
        
        // Textarea génériques (doivent être éditables et visibles)
        'textarea:not([readonly]):not([disabled]):not([aria-hidden="true"])',
        
        // Dernier recours - n'importe quel contenteditable ou textarea
        '[contenteditable="true"]',
        'textarea'
    ];
    
    // Combiner les sélecteurs spécifiques et génériques
    const allSelectors = [...selectorsToTry, ...genericSelectors];

    for (let selector of allSelectors) {
        try {
            console.log('🔍 Essai sélecteur:', selector);
            const elements = document.querySelectorAll(selector);
            
            for (let elem of elements) {
                // Vérifier que l'élément est visible et éditable
                if (elem.offsetHeight > 0 && 
                    elem.offsetWidth > 0 && 
                    !elem.disabled && 
                    !elem.readOnly) {
                    
                    const rect = elem.getBoundingClientRect();
                    const style = window.getComputedStyle(elem);
                    
                    // Doit être dans le viewport ou proche
                    // Ne doit pas être caché
                    if (rect.top < window.innerHeight * 1.5 && 
                        rect.bottom > -100 &&
                        style.display !== 'none' &&
                        style.visibility !== 'hidden' &&
                        style.opacity !== '0') {
                        
                        console.log('✅ Champ trouvé:', {
                            selector: selector,
                            tag: elem.tagName,
                            id: elem.id,
                            className: elem.className
                        });
                        
                        return elem;
                    }
                }
            }
        } catch (e) {
            console.log('⚠️ Erreur avec sélecteur', selector, ':', e.message);
        }
    }

    console.log('❌ Aucun champ trouvé avec les sélecteurs');
    return null;
}

// Afficher une notification
function showNotification(message, type = 'info') {
    // Supprimer ancienne notification
    const old = document.getElementById('whisper-notification');
    if (old) old.remove();

    const notif = document.createElement('div');
    notif.id = 'whisper-notification';
    notif.textContent = message;

    const colors = {
        success: '#4CAF50',
        error: '#f44336',
        warning: '#ff9800',
        info: '#2196F3'
    };

    notif.style.cssText = `
        position: fixed !important;
        top: 120px !important;
        right: 20px !important;
        z-index: 999999 !important;
        background: ${colors[type]} !important;
        color: white !important;
        padding: 12px 20px !important;
        border-radius: 8px !important;
        font-size: 14px !important;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2) !important;
        max-width: 300px !important;
        animation: slideIn 0.3s ease !important;
    `;

    document.body.appendChild(notif);

    // Auto-suppression
    setTimeout(() => {
        notif.style.opacity = '0';
        notif.style.transform = 'translateX(100%)';
        setTimeout(() => notif.remove(), 300);
    }, 4000);
}

// Initialiser quand la page est prête
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createWhisperUI);
} else {
    createWhisperUI();
}

// Réessayer après un délai si le body n'est pas encore prêt
setTimeout(() => {
    if (document.body && !document.getElementById('whisper-anonymize-btn-main')) {
        createWhisperUI();
    }
}, 1000);

// Écouter les messages du background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'settingsChanged') {
        console.log('⚙️ Paramètres mis à jour');
        sendResponse({ success: true });
    }
});

console.log('🔒 Whisper Network - Prêt !');