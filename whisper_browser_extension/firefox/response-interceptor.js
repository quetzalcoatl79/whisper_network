/**
 * Response Interceptor for Whisper Network Extension
 * Detects and de-anonymizes ChatGPT/Claude responses containing ***XXX_N*** tokens
 */

class ResponseInterceptor {
    constructor() {
        this.ANONYMIZED_TOKEN_PATTERN = /\*\*\*[A-Z_]+_\d+\*\*\*/g;
        this.observer = null;
        this.processedNodes = new WeakSet();
        this.apiUrl = 'http://localhost:8001';
        this.apiKey = '';
        this.autoDeanonymize = true; // Auto mode by default
        
        // Load settings
        this.loadSettings();
    }

    /**
     * Load settings from storage
     */
    async loadSettings() {
        const result = await chrome.storage.local.get(['apiUrl', 'apiKey', 'autoDeanonymize']);
        this.apiUrl = result.apiUrl || 'http://localhost:8001';
        this.apiKey = result.apiKey || '';
        this.autoDeanonymize = result.autoDeanonymize !== false; // true by default
        
        console.log(`[ResponseInterceptor] Settings loaded - Auto: ${this.autoDeanonymize}`);
    }

    /**
     * Initialize observer for ChatGPT/Claude responses
     */
    init() {
        console.log('[ResponseInterceptor] Initializing...');
        
        // Detect platform and start observing
        const platform = this.detectPlatform();
        
        if (platform) {
            this.startObserving(platform);
        } else {
            console.warn('[ResponseInterceptor] Platform not detected');
        }
    }

    /**
     * Detect which platform we're on
     */
    detectPlatform() {
        const hostname = window.location.hostname;
        
        if (hostname.includes('chat.openai.com') || hostname.includes('chatgpt.com')) {
            return 'chatgpt';
        } else if (hostname.includes('claude.ai')) {
            return 'claude';
        }
        
        return null;
    }

    /**
     * Start observing DOM for new responses
     */
    startObserving(platform) {
        const config = {
            childList: true,
            subtree: true,
            characterData: true
        };

        this.observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                // Check added nodes
                if (mutation.addedNodes.length > 0) {
                    mutation.addedNodes.forEach(node => {
                        this.processNode(node, platform);
                    });
                }
                
                // Check text changes
                if (mutation.type === 'characterData') {
                    this.processNode(mutation.target.parentElement, platform);
                }
            }
        });

        // Start observing
        this.observer.observe(document.body, config);
        
        // Process existing content
        this.processExistingContent(platform);
        
        console.log(`[ResponseInterceptor] Started observing ${platform}`);
    }

    /**
     * Process existing content on page
     */
    processExistingContent(platform) {
        const selector = this.getResponseSelector(platform);
        const responses = document.querySelectorAll(selector);
        
        responses.forEach(response => {
            this.processNode(response, platform);
        });
    }

    /**
     * Get CSS selector for responses based on platform
     */
    getResponseSelector(platform) {
        if (platform === 'chatgpt') {
            // ChatGPT response containers
            return '[data-message-author-role="assistant"]';
        } else if (platform === 'claude') {
            // Claude response containers
            return '.font-claude-message';
        }
        return '';
    }

    /**
     * Process a DOM node to check for anonymized tokens
     */
    async processNode(node, platform) {
        if (!node || this.processedNodes.has(node)) {
            return;
        }

        // Only process element nodes
        if (node.nodeType !== Node.ELEMENT_NODE) {
            return;
        }

        const text = node.textContent || '';
        
        // Check if contains anonymized tokens
        if (!this.ANONYMIZED_TOKEN_PATTERN.test(text)) {
            return;
        }

        // Mark as processed
        this.processedNodes.add(node);

        console.log('[ResponseInterceptor] Detected anonymized tokens in response');

        // Add deanonymize button
        this.addDeanonymizeButton(node, text);

        // Auto-deanonymize if enabled
        if (this.autoDeanonymize) {
            await this.deanonymizeNode(node, text);
        }
    }

    /**
     * Add deanonymize button to response
     */
    addDeanonymizeButton(node, text) {
        // Check if button already exists
        if (node.querySelector('.whisper-deanonymize-btn')) {
            return;
        }

        const button = document.createElement('button');
        button.className = 'whisper-deanonymize-btn';
        button.innerHTML = '🔓 Dé-anonymiser';
        button.title = 'Restaurer les données originales';
        
        // Styling
        Object.assign(button.style, {
            position: 'absolute',
            top: '8px',
            right: '8px',
            padding: '6px 12px',
            fontSize: '12px',
            fontWeight: '500',
            color: '#10b981',
            backgroundColor: '#ecfdf5',
            border: '1px solid #10b981',
            borderRadius: '6px',
            cursor: 'pointer',
            zIndex: '1000',
            transition: 'all 0.2s ease',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        });

        // Hover effect
        button.addEventListener('mouseenter', () => {
            button.style.backgroundColor = '#d1fae5';
            button.style.transform = 'scale(1.05)';
        });

        button.addEventListener('mouseleave', () => {
            button.style.backgroundColor = '#ecfdf5';
            button.style.transform = 'scale(1)';
        });

        // Click handler
        button.addEventListener('click', async (e) => {
            e.stopPropagation();
            e.preventDefault();
            
            button.disabled = true;
            button.innerHTML = '⏳ Traitement...';
            
            await this.deanonymizeNode(node, text);
            
            button.innerHTML = '✓ Dé-anonymisé';
            button.style.backgroundColor = '#d1fae5';
            button.style.borderColor = '#059669';
            
            setTimeout(() => {
                button.remove();
            }, 2000);
        });

        // Make parent position relative
        if (window.getComputedStyle(node).position === 'static') {
            node.style.position = 'relative';
        }

        node.appendChild(button);
    }

    /**
     * Deanonymize a node by calling backend
     */
    async deanonymizeNode(node, text) {
        try {
            // Get session ID from sessionManager (already has tab context)
            // Use a simple key for now (can be enhanced with conversation detection)
            const sessionId = await sessionManager.getSessionId(0, window.location.href);

            console.log(`[ResponseInterceptor] Deanonymizing with session: ${sessionId}`);

            // Call deanonymize API
            const response = await fetch(`${this.apiUrl}/deanonymize`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': this.apiKey
                },
                body: JSON.stringify({
                    text: text,
                    session_id: sessionId
                })
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const result = await response.json();

            if (result.success && result.deanonymized_text) {
                // Replace text in node
                this.replaceTextInNode(node, result.deanonymized_text);
                
                // Add visual indicator
                this.addDeanonymizedIndicator(node);
                
                console.log(`[ResponseInterceptor] Deanonymized successfully: ${result.replacements_count} replacements`);
            }

        } catch (error) {
            console.error('[ResponseInterceptor] Deanonymization failed:', error);
            
            // Show error button
            const errorBtn = node.querySelector('.whisper-deanonymize-btn');
            if (errorBtn) {
                errorBtn.innerHTML = '❌ Échec';
                errorBtn.style.backgroundColor = '#fee2e2';
                errorBtn.style.borderColor = '#ef4444';
                errorBtn.style.color = '#dc2626';
            }
        }
    }

    /**
     * Replace text content in node while preserving structure
     */
    replaceTextInNode(node, newText) {
        // Find all text nodes
        const walker = document.createTreeWalker(
            node,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );

        const textNodes = [];
        let currentNode;
        
        while (currentNode = walker.nextNode()) {
            textNodes.push(currentNode);
        }

        // Combine all text
        const fullText = textNodes.map(n => n.textContent).join('');
        
        // Replace only if pattern matches
        if (this.ANONYMIZED_TOKEN_PATTERN.test(fullText)) {
            // Simple approach: replace in first text node
            if (textNodes.length > 0) {
                textNodes[0].textContent = newText;
                // Remove other text nodes
                for (let i = 1; i < textNodes.length; i++) {
                    textNodes[i].textContent = '';
                }
            }
        }
    }

    /**
     * Add visual indicator that text was deanonymized
     */
    addDeanonymizedIndicator(node) {
        // Add subtle border and badge
        Object.assign(node.style, {
            borderLeft: '3px solid #10b981',
            paddingLeft: '12px',
            backgroundColor: 'rgba(16, 185, 129, 0.05)'
        });

        // Add badge
        const badge = document.createElement('div');
        badge.className = 'whisper-deanonymized-badge';
        badge.innerHTML = '✓ Dé-anonymisé';
        
        Object.assign(badge.style, {
            position: 'absolute',
            top: '8px',
            right: '8px',
            padding: '4px 8px',
            fontSize: '11px',
            fontWeight: '600',
            color: '#059669',
            backgroundColor: '#d1fae5',
            borderRadius: '4px',
            zIndex: '999'
        });

        node.appendChild(badge);
    }
}

// Initialize on content script load
if (typeof sessionManager !== 'undefined') {
    const responseInterceptor = new ResponseInterceptor();
    responseInterceptor.init();
    
    console.log('[Whisper Network] Response interceptor initialized');
} else {
    console.warn('[Whisper Network] SessionManager not loaded, interceptor disabled');
}
