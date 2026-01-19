/**
 * Whisper Network - Content Script Simplifié
 * Version ultra-robuste qui fonctionne partout
 */

console.log('🔒 Whisper Network - Démarré !');

// Préférences d'apparence par défaut
const defaultAppearance = {
    buttonContent: 'both', // 'both', 'icon', 'text'
    buttonSize: 100,
    anonymizeBgColor: '#FF6B35',
    anonymizeTextColor: '#FFFFFF',
    deanonymizeBgColor: '#4CAF50',
    deanonymizeTextColor: '#FFFFFF',
    buttonRounded: true,
    buttonShadow: true,
    buttonGradient: true
};

// Préférences actuelles
let currentAppearance = { ...defaultAppearance };

// Charger les préférences d'apparence
async function loadAppearancePreferences() {
    try {
        const result = await chrome.storage.sync.get('buttonAppearance');
        if (result.buttonAppearance) {
            currentAppearance = { ...defaultAppearance, ...result.buttonAppearance };
            console.log('🎨 Préférences d\'apparence chargées:', currentAppearance);
        }
    } catch (e) {
        console.log('⚠️ Impossible de charger les préférences d\'apparence, utilisation des valeurs par défaut');
    }
}

// Générer le style du bouton
function generateButtonStyle(type) {
    const isAnonymize = type === 'anonymize';
    const bgColor = isAnonymize ? currentAppearance.anonymizeBgColor : currentAppearance.deanonymizeBgColor;
    const textColor = isAnonymize ? currentAppearance.anonymizeTextColor : currentAppearance.deanonymizeTextColor;
    const size = currentAppearance.buttonSize / 100;
    
    // Calculer une couleur plus claire pour le dégradé
    const lighterColor = lightenColor(bgColor, 20);
    
    // Background avec ou sans dégradé
    const background = currentAppearance.buttonGradient 
        ? `linear-gradient(135deg, ${bgColor} 0%, ${lighterColor} 100%)`
        : bgColor;
    
    // Border radius
    const borderRadius = currentAppearance.buttonRounded ? '25px' : '8px';
    
    // Box shadow
    const shadow = currentAppearance.buttonShadow 
        ? `0 4px 15px ${hexToRgba(bgColor, 0.4)}`
        : 'none';
    
    return `
        background: ${background} !important;
        color: ${textColor} !important;
        border: none !important;
        padding: ${12 * size}px ${20 * size}px !important;
        border-radius: ${borderRadius} !important;
        font-size: ${14 * size}px !important;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
        cursor: pointer !important;
        box-shadow: ${shadow} !important;
        display: flex !important;
        align-items: center !important;
        transition: all 0.3s ease !important;
        font-weight: bold !important;
    `;
}

// Générer le contenu du bouton (icône, texte ou les deux)
function generateButtonContent(type) {
    const isAnonymize = type === 'anonymize';
    const icon = isAnonymize ? '🔒' : '🔓';
    const text = isAnonymize ? 'ANONYMISER' : 'DÉ-ANONYMISER';
    const size = currentAppearance.buttonSize / 100;
    
    switch (currentAppearance.buttonContent) {
        case 'icon':
            return `<span style="font-size: ${18 * size}px;">${icon}</span>`;
        case 'text':
            return `<span style="font-weight: bold;">${text}</span>`;
        case 'both':
        default:
            return `
                <span style="font-size: ${18 * size}px;">${icon}</span>
                <span style="margin-left: 6px; font-weight: bold;">${text}</span>
            `;
    }
}

// Utilitaire: éclaircir une couleur hex
function lightenColor(hex, percent) {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min(255, (num >> 16) + amt);
    const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
    const B = Math.min(255, (num & 0x0000FF) + amt);
    return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
}

// Utilitaire: hex vers rgba
function hexToRgba(hex, alpha) {
    const num = parseInt(hex.replace('#', ''), 16);
    const R = (num >> 16) & 255;
    const G = (num >> 8) & 255;
    const B = num & 255;
    return `rgba(${R}, ${G}, ${B}, ${alpha})`;
}

// Créer l'interface immédiatement
async function createWhisperUI() {
    // Charger les préférences d'abord
    await loadAppearancePreferences();
    
    // Supprimer les anciens boutons si existent
    const oldBtn = document.getElementById('whisper-anonymize-btn-main');
    if (oldBtn) oldBtn.remove();
    const oldDeBtn = document.getElementById('whisper-deanonymize-btn-main');
    if (oldDeBtn) oldDeBtn.remove();
    const oldContainer = document.getElementById('whisper-buttons-container');
    if (oldContainer) oldContainer.remove();

    // Créer le conteneur des boutons
    const container = document.createElement('div');
    container.id = 'whisper-buttons-container';
    container.style.cssText = `
        position: fixed !important;
        top: 60px !important;
        right: 20px !important;
        z-index: 999999 !important;
        display: flex !important;
        flex-direction: column !important;
        gap: 10px !important;
    `;

    // Créer le bouton principal d'anonymisation
    const btn = document.createElement('button');
    btn.id = 'whisper-anonymize-btn-main';
    btn.innerHTML = generateButtonContent('anonymize');
    btn.style.cssText = generateButtonStyle('anonymize');

    // Créer le bouton de dé-anonymisation
    const deBtn = document.createElement('button');
    deBtn.id = 'whisper-deanonymize-btn-main';
    deBtn.innerHTML = generateButtonContent('deanonymize');
    deBtn.style.cssText = generateButtonStyle('deanonymize');

    // Événements bouton anonymiser
    const anonymizeBgColor = currentAppearance.anonymizeBgColor;
    btn.onmouseover = function() {
        this.style.transform = 'scale(1.05) translateY(-2px)';
        if (currentAppearance.buttonShadow) {
            this.style.boxShadow = `0 6px 20px ${hexToRgba(anonymizeBgColor, 0.6)}`;
        }
    };
    btn.onmouseout = function() {
        this.style.transform = 'scale(1)';
        if (currentAppearance.buttonShadow) {
            this.style.boxShadow = `0 4px 15px ${hexToRgba(anonymizeBgColor, 0.4)}`;
        }
    };
    btn.onclick = function() {
        anonymizeCurrentField();
    };

    // Événements bouton dé-anonymiser
    const deanonymizeBgColor = currentAppearance.deanonymizeBgColor;
    deBtn.onmouseover = function() {
        this.style.transform = 'scale(1.05) translateY(-2px)';
        if (currentAppearance.buttonShadow) {
            this.style.boxShadow = `0 6px 20px ${hexToRgba(deanonymizeBgColor, 0.6)}`;
        }
    };
    deBtn.onmouseout = function() {
        this.style.transform = 'scale(1)';
        if (currentAppearance.buttonShadow) {
            this.style.boxShadow = `0 4px 15px ${hexToRgba(deanonymizeBgColor, 0.4)}`;
        }
    };
    deBtn.onclick = function() {
        deanonymizeResponse();
    };

    // Ajouter les boutons au conteneur
    container.appendChild(btn);
    container.appendChild(deBtn);
    
    // Ajouter au body
    document.body.appendChild(container);
    console.log('✅ Boutons Whisper créés avec personnalisation !');
}

// Écouter les changements de préférences
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync' && changes.buttonAppearance) {
        console.log('🎨 Préférences d\'apparence mises à jour, rechargement des boutons...');
        currentAppearance = { ...defaultAppearance, ...changes.buttonAppearance.newValue };
        createWhisperUI();
    }
});

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
        // Vérifier que le contexte d'extension est valide
        if (!chrome.runtime?.id) {
            console.error('❌ Extension context invalidated - rechargement nécessaire');
            showNotification('❌ Extension rechargée. Rechargez la page (F5).', 'error');
            field.style.opacity = '1';
            return;
        }

        // Get session ID with timeout (max 500ms) to avoid blocking
        let sessionId = null;
        if (typeof sessionManager !== 'undefined') {
            try {
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Session timeout')), 500)
                );
                sessionId = await Promise.race([
                    sessionManager.getSessionId(0, window.location.href),
                    timeoutPromise
                ]);
                console.log(`📌 Using session ID: ${sessionId}`);
            } catch (error) {
                console.warn('⚠️ Session ID skipped (timeout or error):', error.message);
                // Continue without session ID - backend will create one
            }
        }

        // Timeout pour le sendMessage (10 secondes max)
        const messageTimeout = setTimeout(() => {
            field.style.opacity = '1';
            showNotification('❌ Timeout: le serveur ne répond pas. Vérifiez que Docker est lancé.', 'error');
        }, 10000);

        // Envoyer au background script avec session_id
        chrome.runtime.sendMessage({
            action: 'anonymize',
            text: text,
            session_id: sessionId,
            preserve_mapping: true
        }, function(response) {
            clearTimeout(messageTimeout);
            field.style.opacity = '1';

            if (chrome.runtime.lastError) {
                console.error('❌ Erreur:', chrome.runtime.lastError);
                const errorMsg = chrome.runtime.lastError.message;
                if (errorMsg.includes('Extension context invalidated')) {
                    showNotification('❌ Extension rechargée. Rechargez la page (F5).', 'error');
                } else {
                    showNotification('❌ Erreur: ' + errorMsg, 'error');
                }
                return;
            }

            if (response && response.success) {
                // Remplacer le texte selon le type de champ
                if (field.tagName === 'TEXTAREA' || field.tagName === 'INPUT') {
                    field.value = response.anonymized_text;
                } else if (field.contentEditable === 'true' || field.getAttribute('contenteditable') === 'true') {
                    // Pour contenteditable, préserver les sauts de ligne
                    // Remplacer \n par <br> pour respecter le format HTML
                    const formattedText = response.anonymized_text
                        .split('\n')
                        .map(line => line || '<br>') // Lignes vides = <br>
                        .join('<br>');
                    
                    if (field.querySelector('p')) {
                        // Si contient des paragraphes, remplacer le contenu du premier
                        const firstP = field.querySelector('p');
                        firstP.innerHTML = formattedText;
                        // Supprimer les autres paragraphes
                        const otherPs = Array.from(field.querySelectorAll('p')).slice(1);
                        otherPs.forEach(p => p.remove());
                    } else {
                        // Sinon, créer un paragraphe avec le texte formaté
                        field.innerHTML = `<p>${formattedText}</p>`;
                    }
                }

                // Déclencher les événements pour que la page détecte le changement
                field.dispatchEvent(new Event('input', { bubbles: true }));
                field.dispatchEvent(new Event('change', { bubbles: true }));
                field.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }));
                field.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));

                // 💾 Stocker le mapping localement pour fallback dé-anonymisation
                if (response.mapping_summary && sessionId && typeof sessionManager !== 'undefined') {
                    // Convertir mapping_summary en format { token: original }
                    // mapping_summary format: { "name": { "Jean Dupont": "***NAME_1***" }, ... }
                    const flatMapping = {};
                    console.log('📊 mapping_summary brut:', JSON.stringify(response.mapping_summary, null, 2));
                    
                    for (const category of Object.keys(response.mapping_summary)) {
                        const categoryMappings = response.mapping_summary[category];
                        for (const [original, token] of Object.entries(categoryMappings)) {
                            // token est "***NAME_1***", original est "Jean Dupont"
                            flatMapping[token] = original;
                            console.log(`  📝 ${token} → "${original}"`);
                        }
                    }
                    sessionManager.storeMapping(response.session_id || sessionId, flatMapping);
                    console.log('💾 Mapping stocké localement:', Object.keys(flatMapping).length, 'tokens');
                    console.log('💾 flatMapping final:', JSON.stringify(flatMapping, null, 2));
                }

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

// Fonction pour dé-anonymiser les réponses de l'IA
async function deanonymizeResponse() {
    console.log('🔓 Dé-anonymisation lancée...');
    
    showNotification('🔄 Dé-anonymisation en cours...', 'info');

    try {
        // Vérifier que le contexte d'extension est valide
        if (!chrome.runtime?.id) {
            console.error('❌ Extension context invalidated');
            showNotification('❌ Extension rechargée. Rechargez la page (F5).', 'error');
            return;
        }

        // Récupérer le session ID actuel
        let sessionId = null;
        if (typeof sessionManager !== 'undefined') {
            try {
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Session timeout')), 500)
                );
                sessionId = await Promise.race([
                    sessionManager.getSessionId(0, window.location.href),
                    timeoutPromise
                ]);
                console.log(`📌 Using session ID for deanonymization: ${sessionId}`);
            } catch (error) {
                console.warn('⚠️ Session ID not found:', error.message);
                showNotification('⚠️ Aucune session trouvée. Anonymisez d\'abord un texte.', 'warning');
                return;
            }
        }

        if (!sessionId) {
            showNotification('⚠️ Aucune session active. Anonymisez d\'abord un texte.', 'warning');
            return;
        }

        // Chercher les réponses de l'IA dans la page - sélecteurs PRÉCIS par plateforme
        // IMPORTANT: éviter les sidebars, menus, headers
        const aiResponseSelectors = [
            // ChatGPT - zone de conversation uniquement
            'main [data-message-author-role="assistant"] .markdown',
            'main [data-message-author-role="assistant"]',
            'main .agent-turn .markdown',
            'main article .prose',
            // Claude
            'main [data-testid="chat-message-content"]',
            '.font-claude-message',
            // Mistral
            'main .message-content.assistant',
            // Perplexity
            'main .prose',
            // Générique - dans main uniquement
            'main .ai-response',
            'main .assistant-message',
            'main [class*="response"]'
        ];

        let responseText = '';
        let responseElement = null;
        let foundWithTokens = false;
        
        // Pattern de détection des tokens : [TOKEN_N] (nouveau) ou ***TOKEN*** (ancien) ou TOKEN_N
        // IMPORTANT: Inclure DATE_NAISSANCE (pas juste DATE) et tous les tokens possibles
        const tokenPattern = /\[(NAME|EMAIL|PHONE|ADDRESS|LOCATION|ORG|IBAN|NIR|IP|URL|DATE_NAISSANCE|DATE|CREDIT_CARD|PRENOM|LIEU|CARTE|AGE|CNI|PASSEPORT|MATRICULE|SALAIRE|EVALUATION|PLANNING|MEDICAL|MEDREF|COMPTE_BANCAIRE|TRANSACTION|NOTE|DOSSIER_JURIDIQUE|COORDONNEES|BIOMETRIE|LOGIN|ID|IP_PUBLIQUE|IP_PRIVEE|INITIALES|COMM_INTERNE)_\d+\]/i;
        const oldTokenPattern = /\*\*\*(NAME|EMAIL|PHONE|ADDRESS|LOCATION|ORG|IBAN|NIR|IP|URL|DATE_NAISSANCE|DATE|CREDIT_CARD|AGE)_\d+\*\*\*/i;
        const bareTokenPattern = /\b(NAME|EMAIL|PHONE|ADDRESS|LOCATION|ORG|IBAN|NIR|IP|URL|DATE_NAISSANCE|DATE|CREDIT_CARD|PRENOM|LIEU|CARTE|AGE)_\d+\b/i;

        // ⭐ PRIORITÉ 1: Texte sélectionné par l'utilisateur
        const selection = window.getSelection();
        if (selection && selection.toString().trim().length > 10) {
            responseText = selection.toString();
            console.log('📋 Texte sélectionné trouvé:', responseText.substring(0, 100));
            // Vérifier si contient des tokens [TOKEN] ou ***TOKEN*** ou TOKEN_N
            foundWithTokens = tokenPattern.test(responseText) || 
                              oldTokenPattern.test(responseText) || 
                              bareTokenPattern.test(responseText);
            
            if (foundWithTokens) {
                console.log('✅ Tokens trouvés dans la sélection');
            }
        }
        
        // ⭐ PRIORITÉ 2: Chercher avec les sélecteurs spécifiques (dans main uniquement)
        if (!foundWithTokens) {
            for (const selector of aiResponseSelectors) {
                try {
                    const elements = document.querySelectorAll(selector);
                    // Parcourir du plus récent au plus ancien
                    for (let i = elements.length - 1; i >= 0; i--) {
                        const elem = elements[i];
                        const text = elem.innerText || elem.textContent || '';
                        
                        // Vérifier tokens avec les 3 formats
                        const hasTokens = tokenPattern.test(text) || 
                                          oldTokenPattern.test(text) || 
                                          bareTokenPattern.test(text);
                        
                        if (hasTokens && text.length > 50 && text.length < 20000) {
                            responseElement = elem;
                            responseText = text;
                            foundWithTokens = true;
                            console.log(`✅ Réponse IA trouvée via: ${selector}`);
                            break;
                        }
                    }
                    if (foundWithTokens) break;
                } catch (e) {
                    console.log('⚠️ Erreur sélecteur:', selector);
                }
            }
        }

        // ⭐ PRIORITÉ 3: Chercher dans main uniquement (évite sidebar)
        if (!foundWithTokens) {
            const mainContent = document.querySelector('main') || document.querySelector('[role="main"]');
            if (mainContent) {
                const text = mainContent.innerText || '';
                const hasTokens = tokenPattern.test(text) || bareTokenPattern.test(text);
                if (hasTokens) {
                    responseText = text;
                    foundWithTokens = true;
                    console.log('✅ Tokens trouvés dans main');
                }
            }
        }
        
        // Si toujours rien, demander à l'utilisateur de sélectionner
        if (!foundWithTokens || !responseText.trim()) {
            showNotification('⚠️ Sélectionnez le texte de la réponse IA avec votre souris, puis cliquez sur Dé-anonymiser.', 'warning');
            return;
        }

        console.log('📝 Texte à dé-anonymiser:', responseText.substring(0, 200));

        // Timeout pour le sendMessage
        const messageTimeout = setTimeout(() => {
            // Fallback local si timeout
            tryLocalDeanonymization(sessionId, responseText);
        }, 10000);

        // Envoyer au background script pour dé-anonymisation
        chrome.runtime.sendMessage({
            action: 'deanonymize',
            text: responseText,
            session_id: sessionId
        }, function(response) {
            clearTimeout(messageTimeout);

            if (chrome.runtime.lastError) {
                console.error('❌ Erreur:', chrome.runtime.lastError);
                // Essayer le fallback local
                tryLocalDeanonymization(sessionId, responseText);
                return;
            }

            if (response && response.success) {
                const deanonymizedText = response.deanonymized_text || response.text;
                
                // Afficher le résultat dans une modal ou copier dans le presse-papier
                showDeanonymizedResult(deanonymizedText, response.replacements_count || 0);
                
                console.log('✅ Dé-anonymisation réussie !');
            } else {
                // Serveur a échoué (session expirée, etc.) - essayer le fallback local
                console.warn('⚠️ Serveur a échoué, tentative locale...', response?.error);
                tryLocalDeanonymization(sessionId, responseText);
            }
        });
    } catch (error) {
        console.error('❌ Exception:', error);
        showNotification('❌ Erreur: ' + error.message, 'error');
    }
}

// Fallback: dé-anonymisation locale
function tryLocalDeanonymization(sessionId, text) {
    console.log('🔄 Tentative de dé-anonymisation locale...');
    
    if (typeof sessionManager === 'undefined') {
        showNotification('❌ Rechargez l\'extension et la page, puis ré-anonymisez.', 'error');
        return;
    }

    const result = sessionManager.deanonymizeLocally(sessionId, text);
    
    if (result && result.replacements > 0) {
        showDeanonymizedResult(result.text, result.replacements);
        showNotification(`✅ Dé-anonymisation locale: ${result.replacements} éléments restaurés`, 'success');
    } else {
        // Vérifier s'il y a des mappings stockés
        const allMappings = sessionManager.localMappings;
        if (allMappings && allMappings.size > 0) {
            // Il y a des mappings mais pas pour cette session - essayer avec le dernier
            console.log('🔍 Tentative avec les mappings disponibles...');
            for (const [sid, mapping] of allMappings.entries()) {
                const tryResult = sessionManager.deanonymizeLocally(sid, text);
                if (tryResult && tryResult.replacements > 0) {
                    showDeanonymizedResult(tryResult.text, tryResult.replacements);
                    showNotification(`✅ ${tryResult.replacements} éléments restaurés (session précédente)`, 'success');
                    return;
                }
            }
        }
        showNotification('❌ Ré-anonymisez le texte d\'abord (session expirée).', 'error');
    }
}

// Afficher le résultat dé-anonymisé dans une modal
function showDeanonymizedResult(text, replacementsCount) {
    // Supprimer ancienne modal si existe
    const oldModal = document.getElementById('whisper-deanonymize-modal');
    if (oldModal) oldModal.remove();

    // Créer l'overlay
    const overlay = document.createElement('div');
    overlay.id = 'whisper-deanonymize-modal';
    overlay.style.cssText = `
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100% !important;
        height: 100% !important;
        background: rgba(0, 0, 0, 0.7) !important;
        z-index: 9999999 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
    `;

    // Créer la modal
    const modal = document.createElement('div');
    modal.style.cssText = `
        background: white !important;
        border-radius: 16px !important;
        padding: 24px !important;
        max-width: 80% !important;
        max-height: 80% !important;
        overflow: auto !important;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3) !important;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
    `;

    modal.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <h2 style="margin: 0; color: #333; font-size: 20px;">
                🔓 Texte Dé-anonymisé
                <span style="font-size: 14px; color: #4CAF50; margin-left: 10px;">
                    (${replacementsCount} éléments restaurés)
                </span>
            </h2>
            <button id="whisper-close-modal" style="
                background: none;
                border: none;
                font-size: 24px;
                cursor: pointer;
                color: #666;
            ">✕</button>
        </div>
        <div id="whisper-deanonymized-content" style="
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 8px;
            padding: 16px;
            white-space: pre-wrap;
            font-size: 14px;
            line-height: 1.6;
            color: #333;
            max-height: 400px;
            overflow-y: auto;
        ">${escapeHtml(text)}</div>
        <div style="display: flex; gap: 12px; margin-top: 16px; justify-content: flex-end;">
            <button id="whisper-copy-btn" style="
                background: linear-gradient(135deg, #4CAF50 0%, #66BB6A 100%);
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 8px;
                cursor: pointer;
                font-weight: bold;
                font-size: 14px;
            ">📋 Copier</button>
            <button id="whisper-close-btn" style="
                background: #6c757d;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 8px;
                cursor: pointer;
                font-weight: bold;
                font-size: 14px;
            ">Fermer</button>
        </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Événements
    const closeModal = () => overlay.remove();
    
    document.getElementById('whisper-close-modal').onclick = closeModal;
    document.getElementById('whisper-close-btn').onclick = closeModal;
    overlay.onclick = (e) => { if (e.target === overlay) closeModal(); };

    document.getElementById('whisper-copy-btn').onclick = async () => {
        try {
            await navigator.clipboard.writeText(text);
            showNotification('✅ Texte copié dans le presse-papier !', 'success');
        } catch (err) {
            // Fallback pour les navigateurs sans clipboard API
            const textarea = document.createElement('textarea');
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            showNotification('✅ Texte copié !', 'success');
        }
    };
}

// Fonction d'échappement HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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
        top: 180px !important;
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
    if (document.body && !document.getElementById('whisper-buttons-container')) {
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