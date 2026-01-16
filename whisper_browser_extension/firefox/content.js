/**
 * Whisper Network - File Interceptor Content Script
 * Intercepts file uploads and anonymizes them before sending to AI chatbots
 * 
 * Developed by Sylvain JOLY, NANO by NXO - MIT License
 */

console.log('🛡️ Whisper Network File Anonymizer - Active');

class FileAnonymizer {
    constructor() {
        this.apiEndpoint = 'http://localhost:8001/anonymize-file';
        this.supportedSites = [
            'chat.openai.com',
            'claude.ai', 
            'copilot.microsoft.com',
            'gemini.google.com',
            'poe.com',
            'chat.mistral.ai',
            'mistral.ai'
        ];
        this.init();
    }

    init() {
        if (this.isSupportedSite()) {
            this.setupFileInterception();
            console.log('📁 File anonymization enabled for:', window.location.hostname);
        }
    }

    isSupportedSite() {
        return this.supportedSites.some(site => window.location.hostname.includes(site));
    }

    setupFileInterception() {
        console.log('🛡️ Setting up file interception for:', window.location.hostname);
        
        // Intercept file input changes with multiple event types
        document.addEventListener('change', this.handleFileChange.bind(this), true);
        document.addEventListener('input', this.handleFileChange.bind(this), true);
        
        // Intercept drag & drop
        document.addEventListener('drop', this.handleFileDrop.bind(this), true);
        document.addEventListener('dragover', (e) => e.preventDefault(), true);
        
        // Monitor for dynamically added file inputs
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) { // Element node
                        const fileInputs = node.querySelectorAll('input[type="file"]');
                        if (fileInputs.length > 0) {
                            console.log('📁 New file inputs detected:', fileInputs.length);
                        }
                        fileInputs.forEach(input => {
                            this.attachFileListener(input);
                        });
                    }
                });
            });
        });
        observer.observe(document.body, { childList: true, subtree: true });
        
        // Check for existing file inputs periodically
        this.checkForFileInputs();
        setInterval(() => this.checkForFileInputs(), 3000); // Check every 3 seconds
        
        // Special handling for ChatGPT
        if (window.location.hostname.includes('chat.openai.com')) {
            this.setupChatGPTSpecificHandling();
        }
        
        // Special handling for Mistral
        if (window.location.hostname.includes('mistral.ai')) {
            this.setupMistralSpecificHandling();
        }
    }

    attachFileListener(input) {
        if (!input.hasAttribute('whisper-listener')) {
            input.addEventListener('change', this.handleFileChange.bind(this), true);
            input.addEventListener('input', this.handleFileChange.bind(this), true);
            input.setAttribute('whisper-listener', 'true');
            console.log('📁 Added listener to file input:', input.id || input.className);
        }
    }

    setupChatGPTSpecificHandling() {
        console.log('🤖 Setting up ChatGPT specific handling');
        
        // Override FileReader to intercept file reading
        const originalFileReader = FileReader;
        const self = this;
        
        window.FileReader = function(...args) {
            const reader = new originalFileReader(...args);
            const originalReadAsText = reader.readAsText;
            const originalReadAsDataURL = reader.readAsDataURL;
            
            reader.readAsText = function(file) {
                console.log('📖 FileReader.readAsText intercepted:', file.name);
                if (self.shouldAnonymizeFile(file)) {
                    self.anonymizeAndReplaceFile(file, reader, 'text');
                    return;
                }
                return originalReadAsText.call(this, file);
            };
            
            reader.readAsDataURL = function(file) {
                console.log('📖 FileReader.readAsDataURL intercepted:', file.name);
                if (self.shouldAnonymizeFile(file)) {
                    self.anonymizeAndReplaceFile(file, reader, 'dataURL');
                    return;
                }
                return originalReadAsDataURL.call(this, file);
            };
            
            return reader;
        };
        
        // Copy static properties
        Object.setPrototypeOf(window.FileReader, originalFileReader);
        Object.getOwnPropertyNames(originalFileReader).forEach(prop => {
            if (typeof originalFileReader[prop] !== 'function') {
                window.FileReader[prop] = originalFileReader[prop];
            }
        });
    }

    async anonymizeAndReplaceFile(file, reader, readType) {
        try {
            console.log('🔒 Anonymizing file with FileReader override:', file.name);
            const anonymizedFile = await this.anonymizeFile(file);
            
            // Create new file content
            if (readType === 'text') {
                // For text files, trigger the onload with anonymized content
                setTimeout(() => {
                    reader.result = anonymizedFile.content || anonymizedFile.anonymized_content;
                    if (reader.onload) reader.onload({ target: reader });
                }, 10);
            } else if (readType === 'dataURL') {
                // For data URLs, create a blob and read it
                const blob = new Blob([anonymizedFile.content || anonymizedFile.anonymized_content], { type: file.type });
                const originalReader = new FileReader();
                originalReader.onload = (e) => {
                    reader.result = e.target.result;
                    if (reader.onload) reader.onload({ target: reader });
                };
                originalReader.readAsDataURL(blob);
            }
            
        } catch (error) {
            console.error('❌ Error in FileReader override:', error);
            // Fallback to original reading
            if (readType === 'text') {
                FileReader.prototype.readAsText.call(reader, file);
            } else {
                FileReader.prototype.readAsDataURL.call(reader, file);
            }
        }
    }

    checkForFileInputs() {
        const fileInputs = document.querySelectorAll('input[type="file"]');
        console.log('🔍 File inputs found:', fileInputs.length);
        
        // Add event listeners to any existing file inputs
        fileInputs.forEach(input => {
            this.attachFileListener(input);
        });
        
        // ChatGPT specific selectors
        const chatGPTSelectors = [
            '[data-testid*="attach"]',
            '[data-testid*="file"]', 
            'button[aria-label*="Attach"]',
            'button[title*="Attach"]',
            '[role="button"][aria-label*="file"]',
            'input[accept*="image"]',
            'input[accept*="text"]',
            'input[accept*="application"]'
        ];
        
        let totalElements = 0;
        chatGPTSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            totalElements += elements.length;
            if (elements.length > 0) {
                console.log(`🎯 Found ${elements.length} elements with selector: ${selector}`);
            }
        });
        
        console.log('🔍 Total upload-related elements found:', totalElements);
        
        // Check for any file inputs that might be hidden
        const allInputs = document.querySelectorAll('input');
        const hiddenFileInputs = Array.from(allInputs).filter(input => 
            input.type === 'file' || input.accept || input.hasAttribute('accept')
        );
        
        if (hiddenFileInputs.length > fileInputs.length) {
            console.log('� Found additional hidden file inputs:', hiddenFileInputs.length - fileInputs.length);
            hiddenFileInputs.forEach(input => this.attachFileListener(input));
        }
    }

    async handleFileChange(event) {
        const input = event.target;
        console.log('📁 File change detected, input type:', input.type, 'files:', input.files?.length || 0);
        
        if (input.type === 'file' && input.files && input.files.length > 0) {
            console.log('✅ Processing file:', input.files[0].name, 'size:', input.files[0].size);
            try {
                await this.processFiles(input.files, input);
            } catch (error) {
                console.error('❌ Error processing file:', error);
                this.showNotification(`Error processing file: ${error.message}`, 'error');
            }
        }
    }

    async handleFileDrop(event) {
        if (event.dataTransfer && event.dataTransfer.files.length > 0) {
            console.log('📁 File drop detected');
            event.preventDefault();
            event.stopPropagation();
            
            // Find the closest file input or create one
            const input = this.findOrCreateFileInput(event.target);
            await this.processFiles(event.dataTransfer.files, input);
        }
    }

    async processFiles(files, inputElement) {
        console.log('🔄 Processing files:', files.length, 'input element:', inputElement?.tagName);
        
        try {
            const processedFiles = [];
            
            for (let file of files) {
                console.log(`📋 Checking file: ${file.name} (${file.type}) - size: ${file.size}`);
                
                if (this.shouldAnonymizeFile(file)) {
                    console.log(`🔒 Anonymizing file: ${file.name}`);
                    const anonymizedFile = await this.anonymizeFile(file);
                    processedFiles.push(anonymizedFile);
                    
                    // Show notification
                    this.showNotification(`File "${file.name}" anonymized`, 'success');
                } else {
                    processedFiles.push(file);
                }
            }
            
            // Replace files in input
            if (processedFiles.length > 0) {
                this.replaceFilesInInput(inputElement, processedFiles);
            }
            
        } catch (error) {
            console.error('❌ File anonymization error:', error);
            this.showNotification('Error anonymizing file', 'error');
        }
    }

    setupMistralSpecificHandling() {
        console.log('🤖 Setting up Mistral AI specific handling');
        
        // Mistral utilise une interface différente, nous devons surveiller les changements DOM
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) {
                        // Chercher spécifiquement les éléments de Mistral
                        const mistralFileInputs = node.querySelectorAll(
                            'input[type="file"], input[accept*="text"], input[accept*="application"], input[accept*="image"]'
                        );
                        
                        mistralFileInputs.forEach(input => {
                            this.attachFileListener(input);
                        });

                        // Chercher les boutons de file upload de Mistral
                        const mistralUploadButtons = node.querySelectorAll(
                            'button[data-testid*="upload"], button[aria-label*="upload"], button[title*="upload"], button[aria-label*="file"], [role="button"][aria-label*="attach"]'
                        );
                        
                        if (mistralUploadButtons.length > 0) {
                            console.log('📎 Mistral upload buttons found:', mistralUploadButtons.length);
                        }
                    }
                });
            });
        });
        
        // Observer avec des options plus agressives pour Mistral
        observer.observe(document.body, { 
            childList: true, 
            subtree: true, 
            attributes: true,
            attributeFilter: ['type', 'accept', 'aria-label', 'data-testid']
        });

        // Intervalle plus fréquent pour Mistral (interface très dynamique)
        setInterval(() => {
            this.checkForMistralElements();
        }, 2000);
    }

    checkForMistralElements() {
        // Sélecteurs spécifiques à Mistral
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
            '[role="button"][aria-label*="attach"]'
        ];

        let totalFound = 0;
        mistralSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            totalFound += elements.length;
            
            elements.forEach(element => {
                if (element.type === 'file' || element.hasAttribute('accept')) {
                    this.attachFileListener(element);
                }
            });
        });

        if (totalFound > 0) {
            console.log('🔍 Mistral elements found:', totalFound);
        }
    }

    shouldAnonymizeFile(file) {
        // Extensions de fichiers texte supportées
        const textFileExtensions = [
            // Documents texte
            '.txt', '.md', '.rtf', '.tex', '.org',
            // Code source (multi-plateforme)
            '.py', '.js', '.ts', '.html', '.css', '.json', '.xml', '.csv', '.yaml', '.yml',
            '.java', '.cpp', '.c', '.h', '.hpp', '.php', '.rb', '.go', '.rs', '.swift',
            '.kt', '.scala', '.pl', '.sh', '.bash', '.zsh', '.fish', '.ps1', '.bat', '.cmd',
            // Configuration
            '.conf', '.config', '.cfg', '.ini', '.properties', '.env',
            // Documentation
            '.rst', '.adoc', '.wiki', '.textile',
            // Données
            '.sql', '.log', '.diff', '.patch'
        ];
        
        // Documents binaires maintenant supportés !
        const binaryDocuments = [
            '.pdf', '.docx', '.xlsx', '.pptx',        // Microsoft Office
            '.odt', '.ods', '.odp',                   // OpenDocument
            '.pages', '.numbers', '.key'              // Apple (support basique)
        ];
        
        const fileName = file.name.toLowerCase();
        
        // Vérifier les extensions de fichiers texte
        const isTextFile = textFileExtensions.some(ext => fileName.endsWith(ext));
        
        // Vérifier les documents binaires supportés
        const isBinaryDoc = binaryDocuments.some(ext => fileName.endsWith(ext));
        
        // Vérifier les types MIME texte (limite 10MB)
        const isSmallTextFile = file.type.startsWith('text/') && file.size < 10 * 1024 * 1024;
        
        if (isBinaryDoc) {
            console.log(`📄 Document binaire détecté: ${file.name}. Extraction de texte activée.`);
        }
        
        return isTextFile || isSmallTextFile || isBinaryDoc;
    }

    isBinaryDocument(file) {
        const binaryExtensions = ['.pdf', '.docx', '.xlsx', '.pptx', '.odt', '.ods', '.odp', '.pages', '.numbers', '.key'];
        const fileName = file.name.toLowerCase();
        return binaryExtensions.some(ext => fileName.endsWith(ext));
    }

    async anonymizeFile(file) {
        try {
            // Get anonymization settings
            const settings = await this.getAnonymizationSettings();
            
            // Determine if file is binary or text
            const isBinaryDocument = this.isBinaryDocument(file);
            let content;
            
            if (isBinaryDocument) {
                // Read as binary and convert to base64
                content = await this.readFileAsBase64(file);
            } else {
                // Read as text
                content = await this.readFileAsText(file);
            }
            
            // Call anonymization API
            const response = await fetch(this.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    filename: file.name,
                    content: content,
                    content_type: file.type || 'text/plain',
                    settings: settings
                })
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const result = await response.json();
            console.log(`✅ File anonymized: ${result.anonymizations_count} anonymizations`);
            
            // Create new file with anonymized content
            const anonymizedFile = new File(
                [result.anonymized_content],
                `anonymized_${file.name}`,
                { type: file.type }
            );

            // Store mapping for user reference
            this.storeMappingInfo(file.name, result.mapping_summary);

            // Show anonymization preview
            this.showAnonymizationPreview(file.name, result.mapping_summary, result.anonymizations_count);

            // Notify background script for statistics
            if (typeof chrome !== 'undefined' && chrome.runtime) {
                chrome.runtime.sendMessage({
                    type: 'FILE_ANONYMIZED',
                    data: {
                        filename: file.name,
                        anonymizations_count: result.anonymizations_count,
                        mapping_summary: result.mapping_summary
                    }
                });
            }

            return anonymizedFile;

        } catch (error) {
            console.error('❌ Anonymization failed:', error);
            throw error;
        }
    }

    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }

    readFileAsBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => {
                // Remove the data URL prefix (data:application/pdf;base64,)
                const base64 = e.target.result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    async getAnonymizationSettings() {
        // Get settings from extension storage or use defaults
        return new Promise((resolve) => {
            if (typeof chrome !== 'undefined' && chrome.storage) {
                chrome.storage.sync.get({
                    anonymize_names: true,
                    anonymize_email: true,
                    anonymize_phone: true,
                    anonymize_address: true,
                    anonymize_nir: true,
                    anonymize_iban: true,
                    anonymize_credit_card: true,
                    anonymize_ip: true,
                    anonymize_url: true
                }, resolve);
            } else {
                // Fallback for testing
                resolve({
                    anonymize_names: true,
                    anonymize_email: true,
                    anonymize_phone: true,
                    anonymize_address: true,
                    anonymize_nir: true,
                    anonymize_iban: true,
                    anonymize_credit_card: true,
                    anonymize_ip: true,
                    anonymize_url: true
                });
            }
        });
    }

    replaceFilesInInput(input, files) {
        try {
            // Create a new FileList-like object
            const dt = new DataTransfer();
            files.forEach(file => dt.items.add(file));
            input.files = dt.files;
            
            // Trigger change event
            input.dispatchEvent(new Event('change', { bubbles: true }));
            
        } catch (error) {
            console.error('❌ Error replacing files:', error);
        }
    }

    findOrCreateFileInput(target) {
        // Try to find existing file input
        let input = target.closest('form')?.querySelector('input[type="file"]');
        if (!input) {
            input = document.querySelector('input[type="file"]');
        }
        return input;
    }

    showAnonymizationPreview(filename, mappingSummary, anonymizationCount) {
        // Don't show preview if no anonymizations
        if (!mappingSummary || Object.keys(mappingSummary).length === 0) {
            return;
        }

        // Create preview dialog
        const preview = document.createElement('div');
        preview.id = 'whisper-anonymization-preview';
        preview.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
            z-index: 10001;
            min-width: 400px;
            max-width: 600px;
            max-height: 80vh;
            overflow: hidden;
            font-family: system-ui, sans-serif;
            color: #1f2937;
        `;

        // Create backdrop
        const backdrop = document.createElement('div');
        backdrop.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            z-index: 10000;
        `;

        // Create header
        const header = document.createElement('div');
        header.style.cssText = `
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            display: flex;
            align-items: center;
            justify-content: space-between;
        `;

        const title = document.createElement('h3');
        title.style.cssText = `
            margin: 0;
            font-size: 16px;
            font-weight: 600;
        `;
        title.textContent = `🛡️ Aperçu de l'anonymisation`;

        const closeBtn = document.createElement('button');
        closeBtn.style.cssText = `
            background: none;
            border: none;
            color: white;
            font-size: 20px;
            cursor: pointer;
            padding: 0;
            width: 30px;
            height: 30px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background 0.2s;
        `;
        closeBtn.textContent = '×';
        closeBtn.addEventListener('mouseover', () => closeBtn.style.background = 'rgba(255,255,255,0.2)');
        closeBtn.addEventListener('mouseout', () => closeBtn.style.background = 'none');

        header.appendChild(title);
        header.appendChild(closeBtn);

        // Create content
        const content = document.createElement('div');
        content.style.cssText = `
            padding: 20px;
            max-height: 60vh;
            overflow-y: auto;
        `;

        // File info
        const fileInfo = document.createElement('div');
        fileInfo.style.cssText = `
            background: #f3f4f6;
            border-radius: 8px;
            padding: 12px;
            margin-bottom: 16px;
            font-size: 14px;
        `;
        fileInfo.innerHTML = `
            <strong>Fichier:</strong> ${filename}<br>
            <strong>Anonymisations:</strong> ${anonymizationCount} éléments traités
        `;

        // Mappings container
        const mappingsContainer = document.createElement('div');
        mappingsContainer.style.cssText = `
            display: grid;
            gap: 12px;
        `;

        // Add each mapping
        Object.entries(mappingSummary).forEach(([original, anonymized]) => {
            const mappingItem = document.createElement('div');
            mappingItem.style.cssText = `
                background: #f9fafb;
                border: 1px solid #e5e7eb;
                border-radius: 8px;
                padding: 12px;
                position: relative;
            `;

            const originalDiv = document.createElement('div');
            originalDiv.style.cssText = `
                font-weight: 500;
                color: #dc2626;
                margin-bottom: 6px;
                font-size: 14px;
                word-break: break-all;
                overflow-wrap: break-word;
            `;
            originalDiv.innerHTML = `<strong>Original:</strong><br>${this.escapeHtml(original)}`;

            const anonymizedDiv = document.createElement('div');
            anonymizedDiv.style.cssText = `
                color: #059669;
                font-family: monospace;
                font-size: 13px;
                word-break: break-all;
                overflow-wrap: break-word;
            `;
            anonymizedDiv.innerHTML = `<strong>Anonymisé:</strong><br>${this.escapeHtml(anonymized)}`;

            // Add shield icon on the right
            const icon = document.createElement('div');
            icon.style.cssText = `
                position: absolute;
                top: 12px;
                right: 12px;
                font-size: 18px;
                color: #10B981;
            `;
            icon.textContent = '🛡️';

            mappingItem.appendChild(originalDiv);
            mappingItem.appendChild(anonymizedDiv);
            mappingItem.appendChild(icon);
            mappingsContainer.appendChild(mappingItem);
        });

        content.appendChild(fileInfo);
        content.appendChild(mappingsContainer);

        // Create footer
        const footer = document.createElement('div');
        footer.style.cssText = `
            background: #f9fafb;
            padding: 16px 20px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
        `;

        const okButton = document.createElement('button');
        okButton.style.cssText = `
            background: linear-gradient(135deg, #10B981, #059669);
            color: white;
            border: none;
            padding: 10px 24px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: transform 0.2s;
        `;
        okButton.textContent = 'Continuer';
        okButton.addEventListener('mouseover', () => okButton.style.transform = 'scale(1.05)');
        okButton.addEventListener('mouseout', () => okButton.style.transform = 'scale(1)');

        footer.appendChild(okButton);

        // Assemble dialog
        preview.appendChild(header);
        preview.appendChild(content);
        preview.appendChild(footer);

        // Close handlers
        const closePreview = () => {
            document.body.removeChild(backdrop);
            document.body.removeChild(preview);
        };

        closeBtn.addEventListener('click', closePreview);
        okButton.addEventListener('click', closePreview);
        backdrop.addEventListener('click', closePreview);

        // Add to DOM
        document.body.appendChild(backdrop);
        document.body.appendChild(preview);

        // Auto-close after 10 seconds
        setTimeout(closePreview, 10000);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 8px;
            color: white;
            font-family: system-ui, sans-serif;
            font-size: 14px;
            z-index: 10000;
            max-width: 300px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            background: ${type === 'success' ? '#10B981' : type === 'error' ? '#EF4444' : '#3B82F6'};
        `;
        notification.textContent = `🛡️ ${message}`;
        
        document.body.appendChild(notification);
        
        // Auto remove after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }

    storeMappingInfo(filename, mappings) {
        if (mappings && typeof chrome !== 'undefined' && chrome.storage) {
            const mappingData = {
                filename,
                timestamp: new Date().toISOString(),
                mappings
            };
            
            // Store in local storage for user reference
            chrome.storage.local.get({fileMappings: []}, (result) => {
                const fileMappings = result.fileMappings;
                fileMappings.unshift(mappingData); // Add to beginning
                
                // Keep only last 50 mappings
                if (fileMappings.length > 50) {
                    fileMappings.splice(50);
                }
                
                chrome.storage.local.set({fileMappings});
            });
        }
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new FileAnonymizer());
} else {
    new FileAnonymizer();
}