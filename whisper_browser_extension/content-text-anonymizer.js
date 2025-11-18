/**
 * Whisper Network - Content Script pour Anonymisation de Texte
 * Anonymise le texte dans les champs de saisie des chats IA
 * 
 * Raccourci: Ctrl+Shift+A pour anonymiser le texte sélectionné ou dans le champ actif
 * 
 * Developed by Sylvain JOLY, NANO by NXO - MIT License
 */

console.log('🔒 Whisper Network Text Anonymizer - Chargé');

class TextAnonymizer {
    constructor() {
        this.isActive = false;
        this.settings = {};
        this.supportedSites = [
            'chat.openai.com',      // ChatGPT
            'claude.ai',            // Claude
            'copilot.microsoft.com', // Copilot
            'gemini.google.com',    // Gemini
            'poe.com',              // Poe
            'chat.mistral.ai',      // Mistral
            'bard.google.com'       // Bard
        ];
        this.init();
    }

    init() {
        if (this.isSupportedSite()) {
            this.loadSettings();
            this.setupKeyboardShortcuts();
            this.setupUI();
            this.setupAutoDetection();
            console.log('🔒 Anonymisation activée sur:', window.location.hostname);
        }
    }

    isSupportedSite() {
        return this.supportedSites.some(site => window.location.hostname.includes(site));
    }

    async loadSettings() {
        return new Promise((resolve) => {
            chrome.storage.sync.get({
                enabled: true,
                processingMode: 'fast',
                anonymize_names: true,
                anonymize_email: true,
                anonymize_phone: true,
                anonymize_address: true,
                anonymize_nir: true,
                anonymize_iban: true,
                anonymize_credit_cards: false,
                anonymize_ip: false,
                anonymize_urls: false,
                showPreview: true,
                autoAnonymize: false
            }, (settings) => {
                this.settings = settings;
                this.isActive = settings.enabled;
                resolve();
            });
        });
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+I : Anonymiser le texte sélectionné ou dans le champ actif
            if (e.ctrlKey && e.key === 'i' && !e.shiftKey && !e.altKey) {
                e.preventDefault();
                this.handleAnonymizeShortcut();
            }

            // Ctrl+Shift+I : Afficher/Masquer l'interface Whisper
            if (e.ctrlKey && e.shiftKey && e.key === 'I') {
                e.preventDefault();
                this.toggleWhisperUI();
            }
        });
    }

    setupUI() {
        // Créer le bouton flottant Whisper
        this.createFloatingButton();
        
        // Ajouter des indicateurs aux champs de texte
        this.enhanceTextAreas();
    }

    createFloatingButton() {
        // Supprimer boutons existants s'il y en a
        const existing = document.getElementById('whisper-float-btn');
        if (existing) existing.remove();
        const existingAnonymize = document.getElementById('whisper-anonymize-btn');
        if (existingAnonymize) existingAnonymize.remove();

        // Bouton principal (paramètres)
        const button = document.createElement('div');
        button.id = 'whisper-float-btn';
        button.innerHTML = '⚙️';
        button.title = 'Whisper Network - Paramètres';
        
        Object.assign(button.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            width: '45px',
            height: '45px',
            backgroundColor: this.isActive ? '#4CAF50' : '#ccc',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
            cursor: 'pointer',
            zIndex: '9999',
            boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
            transition: 'all 0.3s ease'
        });

        // Bouton d'anonymisation (plus gros et visible)
        const anonymizeButton = document.createElement('div');
        anonymizeButton.id = 'whisper-anonymize-btn';
        anonymizeButton.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 20px;">🔒</span>
                <span style="font-size: 14px; font-weight: bold;">ANONYMISER</span>
            </div>
        `;
        anonymizeButton.title = 'Cliquez pour anonymiser le texte dans le champ actif';
        
        Object.assign(anonymizeButton.style, {
            position: 'fixed',
            top: '20px',
            right: '80px',
            minWidth: '140px',
            height: '45px',
            backgroundColor: '#FF6B35',
            color: 'white',
            borderRadius: '25px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: '9999',
            boxShadow: '0 4px 12px rgba(255,107,53,0.4)',
            transition: 'all 0.3s ease',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        });

        // Events bouton paramètres
        button.addEventListener('click', () => {
            this.showWhisperPanel();
        });

        button.addEventListener('mouseenter', () => {
            button.style.transform = 'scale(1.1)';
        });

        button.addEventListener('mouseleave', () => {
            button.style.transform = 'scale(1)';
        });

        // Events bouton anonymisation
        anonymizeButton.addEventListener('click', async () => {
            await this.handleAnonymizeClick();
        });

        anonymizeButton.addEventListener('mouseenter', () => {
            anonymizeButton.style.transform = 'scale(1.05)';
            anonymizeButton.style.backgroundColor = '#E55A2B';
        });

        anonymizeButton.addEventListener('mouseleave', () => {
            anonymizeButton.style.transform = 'scale(1)';
            anonymizeButton.style.backgroundColor = '#FF6B35';
        });

        document.body.appendChild(button);
        document.body.appendChild(anonymizeButton);
    }

    async handleAnonymizeClick() {
        // Chercher le champ de texte actif ou le plus probable
        const activeField = document.activeElement;
        
        if (this.isTextField(activeField) && activeField.value?.trim()) {
            // Il y a un champ actif avec du texte
            await this.anonymizeField(activeField);
        } else {
            // Chercher automatiquement le champ principal
            await this.findAndAnonymizeMainField();
        }
    }

    async findAndAnonymizeMainField() {
        // Sélecteurs pour les champs principaux des différents sites
        const selectors = [
            // ChatGPT
            'textarea[placeholder*="Message"]',
            'textarea#prompt-textarea',
            'div[contenteditable="true"][data-id*="root"]',
            
            // Claude
            'div[contenteditable="true"].ProseMirror',
            'div[contenteditable="true"] p',
            
            // Gemini
            'rich-textarea textarea',
            'textarea[aria-label*="message"]',
            
            // Copilot
            'textarea[placeholder*="Ask me anything"]',
            'cib-text-input textarea',
            
            // Générique
            'textarea[placeholder*="question"]',
            'textarea[placeholder*="message"]',
            'textarea:not([readonly]):not([disabled])',
            'div[contenteditable="true"]:not([readonly])'
        ];

        for (const selector of selectors) {
            const fields = document.querySelectorAll(selector);
            
            for (const field of fields) {
                let text = '';
                if (field.tagName === 'TEXTAREA' || field.tagName === 'INPUT') {
                    text = field.value;
                } else if (field.contentEditable === 'true') {
                    text = field.textContent || field.innerText;
                }

                if (text?.trim()) {
                    // Mettre le focus sur ce champ et l'anonymiser
                    field.focus();
                    await this.anonymizeField(field);
                    return;
                }
            }
        }

        // Aucun champ trouvé avec du texte
        this.showNotification('⚠️ Aucun champ de texte trouvé. Cliquez dans un champ et réessayez.', 'warning');
    }

    enhanceTextAreas() {
        // Chercher tous les champs de texte (input, textarea, contenteditable)
        const textFields = document.querySelectorAll(`
            textarea:not([readonly]):not([disabled]),
            input[type="text"]:not([readonly]):not([disabled]),
            [contenteditable="true"]:not([data-whisper-enhanced]),
            div[role="textbox"]:not([data-whisper-enhanced])
        `);
        
        textFields.forEach(field => {
            // Vérifier si c'est vraiment un champ éditable et visible
            if (!field.hasAttribute('data-whisper-enhanced') && 
                field.offsetHeight > 0 && 
                field.offsetWidth > 0) {
                
                // Ajouter le bouton seulement si le champ semble être un champ de saisie principal
                if (this.isMainInputField(field)) {
                    this.addWhisperButton(field);
                    field.setAttribute('data-whisper-enhanced', 'true');
                }
            }
        });

        // Observer pour les nouveaux champs ajoutés dynamiquement
        if (!this.observer) {
            this.observer = new MutationObserver(() => {
                // Debounce pour éviter trop d'appels
                clearTimeout(this.enhanceTimeout);
                this.enhanceTimeout = setTimeout(() => {
                    this.enhanceTextAreas();
                }, 500);
            });

            this.observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        }
    }

    isMainInputField(field) {
        // Vérifier si c'est probablement un champ de saisie principal
        const rect = field.getBoundingClientRect();
        const hasSize = rect.width > 100 && rect.height > 30;
        
        // Vérifier les attributs qui indiquent un champ de saisie
        const hasInputAttrs = field.placeholder?.toLowerCase().includes('message') ||
                             field.placeholder?.toLowerCase().includes('question') ||
                             field.placeholder?.toLowerCase().includes('ask') ||
                             field.getAttribute('aria-label')?.toLowerCase().includes('message') ||
                             field.className?.toLowerCase().includes('input') ||
                             field.tagName === 'TEXTAREA';
        
        return hasSize && hasInputAttrs;
    }

    addWhisperButton(field) {
        // Ne pas ajouter si déjà présent
        if (field.parentNode.querySelector('.whisper-field-btn')) return;

        // Créer un conteneur pour le bouton overlay
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'whisper-field-btn';
        
        const whisperBtn = document.createElement('div');
        whisperBtn.innerHTML = `
            <span style="font-size: 14px;">🔒</span>
            <span style="font-size: 11px; margin-left: 4px;">Anonymiser</span>
        `;
        whisperBtn.title = 'Anonymiser le texte dans ce champ';
        
        Object.assign(buttonContainer.style, {
            position: 'absolute',
            top: '5px',
            right: '5px',
            zIndex: '1000',
            pointerEvents: 'auto'
        });
        
        Object.assign(whisperBtn.style, {
            display: 'flex',
            alignItems: 'center',
            padding: '4px 8px',
            fontSize: '12px',
            backgroundColor: '#FF6B35',
            color: 'white',
            border: 'none',
            borderRadius: '15px',
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(255,107,53,0.3)',
            transition: 'all 0.2s ease',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        });

        buttonContainer.appendChild(whisperBtn);

        // Positionner le conteneur parent en relatif si nécessaire
        const fieldParent = field.parentNode;
        if (getComputedStyle(fieldParent).position === 'static') {
            fieldParent.style.position = 'relative';
        }

        whisperBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Animation de clic
            whisperBtn.style.transform = 'scale(0.95)';
            setTimeout(() => {
                whisperBtn.style.transform = 'scale(1)';
            }, 150);
            
            await this.anonymizeField(field);
        });

        whisperBtn.addEventListener('mouseenter', () => {
            whisperBtn.style.backgroundColor = '#E55A2B';
            whisperBtn.style.transform = 'scale(1.05)';
        });

        whisperBtn.addEventListener('mouseleave', () => {
            whisperBtn.style.backgroundColor = '#FF6B35';
            whisperBtn.style.transform = 'scale(1)';
        });

        fieldParent.appendChild(buttonContainer);
    }

    async handleAnonymizeShortcut() {
        const selection = window.getSelection();
        
        if (selection.toString().trim()) {
            // Il y a du texte sélectionné
            await this.anonymizeSelection(selection);
        } else {
            // Chercher le champ actif
            const activeField = document.activeElement;
            if (this.isTextField(activeField)) {
                await this.anonymizeField(activeField);
            } else {
                this.showNotification('⚠️ Sélectionnez du texte ou placez le curseur dans un champ de texte', 'warning');
            }
        }
    }

    async anonymizeSelection(selection) {
        const text = selection.toString();
        if (!text.trim()) return;

        try {
            const result = await this.anonymizeText(text);
            if (result.success) {
                // Remplacer la sélection par le texte anonymisé
                const range = selection.getRangeAt(0);
                range.deleteContents();
                range.insertNode(document.createTextNode(result.anonymized_text));
                
                this.showNotification(`✅ ${result.anonymizations_count} éléments anonymisés en ${result.processing_time_ms.toFixed(1)}ms`, 'success');
            } else {
                this.showNotification('❌ Erreur lors de l\'anonymisation', 'error');
            }
        } catch (error) {
            console.error('Erreur anonymisation:', error);
            this.showNotification('❌ Erreur de connexion à l\'API', 'error');
        }
    }

    async anonymizeField(field) {
        let text = '';
        
        // Récupérer le texte selon le type de champ
        if (field.tagName === 'TEXTAREA' || field.tagName === 'INPUT') {
            text = field.value;
        } else if (field.contentEditable === 'true') {
            text = field.textContent || field.innerText;
        }

        if (!text.trim()) {
            this.showNotification('⚠️ Aucun texte à anonymiser', 'warning');
            return;
        }

        try {
            // Afficher indicateur de traitement
            const originalBg = field.style.backgroundColor;
            field.style.backgroundColor = '#fff3cd';
            field.style.transition = 'background-color 0.3s';

            const result = await this.anonymizeText(text);
            
            if (result.success) {
                // Remplacer le texte dans le champ
                if (field.tagName === 'TEXTAREA' || field.tagName === 'INPUT') {
                    field.value = result.anonymized_text;
                } else if (field.contentEditable === 'true') {
                    field.textContent = result.anonymized_text;
                }

                // Animation de succès
                field.style.backgroundColor = '#d4edda';
                setTimeout(() => {
                    field.style.backgroundColor = originalBg;
                }, 1000);

                this.showNotification(`✅ ${result.anonymizations_count} éléments anonymisés en ${result.processing_time_ms.toFixed(1)}ms`, 'success');
                
                // Déclencher événement change pour notifier la page
                field.dispatchEvent(new Event('input', { bubbles: true }));
                field.dispatchEvent(new Event('change', { bubbles: true }));
            } else {
                field.style.backgroundColor = originalBg;
                this.showNotification('❌ Erreur lors de l\'anonymisation', 'error');
            }
        } catch (error) {
            console.error('Erreur anonymisation:', error);
            field.style.backgroundColor = originalBg;
            this.showNotification('❌ Erreur de connexion à l\'API', 'error');
        }
    }

    async anonymizeText(text) {
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({
                action: 'anonymize',
                text: text,
                settings: this.settings
            }, (response) => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else if (response && response.success) {
                    resolve(response);
                } else {
                    reject(new Error(response?.error || 'Erreur inconnue'));
                }
            });
        });
    }

    isTextField(element) {
        if (!element) return false;
        
        return element.tagName === 'TEXTAREA' || 
               (element.tagName === 'INPUT' && element.type === 'text') ||
               element.contentEditable === 'true';
    }

    showNotification(message, type = 'info') {
        // Supprimer notification existante
        const existing = document.getElementById('whisper-notification');
        if (existing) existing.remove();

        const notification = document.createElement('div');
        notification.id = 'whisper-notification';
        notification.textContent = message;
        
        const colors = {
            success: '#4CAF50',
            error: '#f44336',
            warning: '#ff9800',
            info: '#2196F3'
        };

        Object.assign(notification.style, {
            position: 'fixed',
            top: '80px',
            right: '20px',
            padding: '12px 16px',
            backgroundColor: colors[type],
            color: 'white',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500',
            zIndex: '10000',
            maxWidth: '300px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            transform: 'translateX(100%)',
            transition: 'transform 0.3s ease'
        });

        document.body.appendChild(notification);

        // Animation d'entrée
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 10);

        // Auto-suppression après 4 secondes
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => notification.remove(), 300);
        }, 4000);
    }

    showWhisperPanel() {
        // Créer un mini-panneau de contrôle
        let panel = document.getElementById('whisper-panel');
        if (panel) {
            panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
            return;
        }

        panel = document.createElement('div');
        panel.id = 'whisper-panel';
        panel.innerHTML = `
            <div style="padding: 16px; background: white; border: 1px solid #ddd; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                <h3 style="margin: 0 0 12px 0; color: #333; font-size: 16px;">🔒 Whisper Network</h3>
                <div style="margin-bottom: 12px;">
                    <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                        <input type="checkbox" id="whisper-enabled" ${this.isActive ? 'checked' : ''}>
                        <span style="font-size: 14px;">Extension activée</span>
                    </label>
                </div>
                <div style="font-size: 12px; color: #666; line-height: 1.4; margin-bottom: 12px;">
                    <div>• <strong>Bouton orange ANONYMISER</strong> : Automatique</div>
                    <div>• <strong>Boutons 🔒</strong> : Par champ individuel</div>
                    <div>• <strong>Ctrl+I</strong> : Raccourci clavier</div>
                </div>
                <button id="whisper-anonymize-now" style="width: 100%; padding: 8px; background: #FF6B35; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">
                    🔒 Anonymiser Maintenant
                </button>
                <button id="whisper-close" style="position: absolute; top: 8px; right: 8px; background: none; border: none; font-size: 18px; cursor: pointer; color: #666;">×</button>
            </div>
        `;

        Object.assign(panel.style, {
            position: 'fixed',
            top: '80px',
            right: '20px',
            zIndex: '10001',
            transition: 'all 0.3s ease'
        });

        document.body.appendChild(panel);

        // Events
        panel.querySelector('#whisper-enabled').addEventListener('change', (e) => {
            this.isActive = e.target.checked;
            this.updateFloatingButton();
            chrome.storage.sync.set({ enabled: this.isActive });
        });

        panel.querySelector('#whisper-close').addEventListener('click', () => {
            panel.style.display = 'none';
        });

        panel.querySelector('#whisper-anonymize-now').addEventListener('click', async (e) => {
            e.preventDefault();
            panel.style.display = 'none';
            await this.handleAnonymizeClick();
        });
    }

    toggleWhisperUI() {
        this.showWhisperPanel();
    }

    updateFloatingButton() {
        const button = document.getElementById('whisper-float-btn');
        if (button) {
            button.style.backgroundColor = this.isActive ? '#4CAF50' : '#ccc';
        }
    }

    setupAutoDetection() {
        // Observer pour détecter quand l'utilisateur tape dans un champ
        document.addEventListener('input', (e) => {
            if (this.settings.autoAnonymize && this.isTextField(e.target)) {
                // Auto-anonymisation si activée (peut être implémentée plus tard)
            }
        });
    }
}

// Messages du background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'settingsChanged') {
        // Recharger les paramètres quand ils changent
        if (window.textAnonymizer) {
            window.textAnonymizer.loadSettings();
        }
        sendResponse({ success: true });
    }
});

// Initialiser quand la page est prête
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.textAnonymizer = new TextAnonymizer();
    });
} else {
    window.textAnonymizer = new TextAnonymizer();
}