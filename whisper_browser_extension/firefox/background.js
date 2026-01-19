/**
 * Whisper Network - Background Service Worker
 * Handles extension lifecycle and statistics
 * 
 * Developed by Sylvain JOLY, NANO by NXO - MIT License
 */

chrome.runtime.onInstalled.addListener(() => {
    console.log('🛡️ Whisper Network File Anonymizer installed');
    
    // Initialize default settings in SYNC storage (persists across devices via Google account)
    chrome.storage.sync.set({
        enabled: true,
        apiUrl: 'http://localhost:8001',
        anonymize_names: true,
        anonymize_email: true,
        anonymize_phone: true,
        anonymize_address: true,
        anonymize_nir: true,
        anonymize_iban: true,
        anonymize_credit_cards: true,
        anonymize_ip: true,
        anonymize_urls: true,
        anonymize_matricule: true,
        anonymize_salaire: true,
        anonymize_evaluation: true,
        anonymize_planning: true,
        showPreview: true,
        autoAnonymize: false
    });

    // Initialize statistics
    chrome.storage.local.set({
        totalFiles: 0,
        totalAnonymizations: 0,
        lastActivity: null,
        fileMappings: []
    });
});

// Listen for messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('[background.js] 📨 Message received:', message);
    console.log('[background.js] 📍 Sender:', sender.tab ? 'content script' : 'popup');
    
    // Handle file anonymization statistics
    if (message.type === 'FILE_ANONYMIZED') {
        updateStatistics(message.data);
        sendResponse({success: true});
        return true;
    }
    
    // Handle settings requests from popup
    if (message.action === 'getSettings') {
        console.log('[background.js] 🔍 getSettings request received');
        chrome.storage.sync.get({
            enabled: true,
            apiUrl: 'http://localhost:8001',
            processingMode: 'fast',
            anonymize_names: true,
            anonymize_email: true,
            anonymize_phone: true,
            anonymize_address: true,
            anonymize_nir: true,
            anonymize_iban: true,
            anonymize_credit_cards: true,
            anonymize_ip: true,
            anonymize_urls: true,
            showPreview: true,
            autoAnonymize: false
        }, (settings) => {
            console.log('[background.js] 📦 Settings loaded from storage.sync:', settings);
            const response = {success: true, settings: settings};
            console.log('[background.js] ✉️ Sending response:', response);
            sendResponse(response);
        });
        return true; // Keep message channel open for async response
    }
    
    // Handle settings save from popup
    if (message.action === 'saveSettings') {
        console.log('[background.js] Saving settings to chrome.storage.sync:', message.settings);
        chrome.storage.sync.set(message.settings, () => {
            if (chrome.runtime.lastError) {
                console.error('[background.js] ❌ Error saving settings:', chrome.runtime.lastError);
                sendResponse({success: false, error: chrome.runtime.lastError.message});
            } else {
                console.log('[background.js] ✅ Settings saved successfully to chrome.storage.sync');
                // Verify save by reading back
                chrome.storage.sync.get(null, (all) => {
                    console.log('[background.js] 🔍 All sync storage after save:', all);
                });
                sendResponse({success: true});
            }
        });
        return true;
    }
    
    // Handle API test from popup
    if (message.action === 'testApi') {
        testApiConnection().then(result => {
            sendResponse(result);
        }).catch(error => {
            console.error('API test failed:', error);
            sendResponse({success: false, error: error.message});
        });
        return true;
    }
    
    // Handle text anonymization from popup
    if (message.action === 'anonymize') {
        anonymizeText(
            message.text, 
            message.settings,
            message.session_id,
            message.preserve_mapping
        ).then(result => {
            sendResponse(result);
        }).catch(error => {
            console.error('Anonymization failed:', error);
            sendResponse({success: false, error: error.message});
        });
        return true;
    }
    
    // Handle text deanonymization
    if (message.action === 'deanonymize') {
        deanonymizeText(
            message.text,
            message.session_id
        ).then(result => {
            sendResponse(result);
        }).catch(error => {
            console.error('Deanonymization failed:', error);
            sendResponse({success: false, error: error.message});
        });
        return true;
    }
    
    // Legacy support
    if (message.type === 'GET_SETTINGS') {
        chrome.storage.sync.get({
            anonymize_names: true,
            anonymize_email: true,
            anonymize_phone: true,
            anonymize_address: true,
            anonymize_nir: true,
            anonymize_iban: true,
            anonymize_credit_cards: true,
            anonymize_ip: true,
            anonymize_urls: true
        }, (settings) => {
            sendResponse(settings);
        });
        return true;
    }
});

// API connection test function
async function testApiConnection() {
    try {
        const settings = await new Promise((resolve) => {
            chrome.storage.sync.get({apiUrl: 'http://localhost:8001'}, resolve);
        });
        
        const response = await fetch(`${settings.apiUrl}/health`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.ok) {
            const data = await response.json();
            return {
                success: true,
                service: data.service || 'whisper-network-api',
                status: data.status || 'healthy'
            };
        } else {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
    } catch (error) {
        console.error('API test failed:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Text anonymization function
async function anonymizeText(text, customSettings, sessionId = null, preserveMapping = true) {
    // Déclarer finalSettings en dehors du try pour qu'il soit accessible dans le catch
    let finalSettings = { apiUrl: 'http://localhost:8001' };
    
    try {
        const settings = await new Promise((resolve) => {
            chrome.storage.sync.get({
                apiUrl: 'http://localhost:8001',
                apiKey: '',
                processingMode: 'fast',
                // Données personnelles
                anonymize_names: true,
                anonymize_first_names: true,
                anonymize_initials: false,
                anonymize_addresses: true,
                anonymize_address: true, // alias backward compatible
                anonymize_phone: true,
                anonymize_email: true,
                anonymize_birth_dates: true,
                anonymize_age: true,
                anonymize_nir: true,
                anonymize_id_cards: true,
                anonymize_passports: true,
                anonymize_ip: true,
                anonymize_ip_public: true,
                anonymize_ip_private: true,
                anonymize_logins: true,
                // Données professionnelles
                anonymize_employee_ids: true,
                anonymize_performance_data: true,
                anonymize_salary_data: true,
                anonymize_schedules: true,
                anonymize_internal_comm: true,
                // Données sensibles
                anonymize_medical_data: true,
                anonymize_bank_accounts: true,
                anonymize_credit_cards: true,
                anonymize_iban: true,
                anonymize_transactions: true,
                anonymize_grades: true,
                anonymize_legal_cases: true,
                // Données contextuelles
                anonymize_locations: true,
                anonymize_geolocations: true,
                anonymize_biometric: true,
                anonymize_urls: true
            }, resolve);
        });
        
        // Fusionner les paramètres par défaut avec les paramètres personnalisés
        finalSettings = { ...settings, ...customSettings };
        
        // Choisir l'endpoint basé sur le mode de traitement
        const endpoint = '/anonymize'; // Force full anonymization with CamemBERT
        
        // Extraire TOUS les paramètres d'anonymisation dynamiquement
        const anonymizationSettings = {};
        for (const key in finalSettings) {
            if (key.startsWith('anonymize_')) {
                anonymizationSettings[key] = finalSettings[key];
            }
        }
        
        const requestData = {
            text: text,
            settings: anonymizationSettings,
            // Add session management fields
            session_id: sessionId,
            preserve_mapping: preserveMapping,
            ttl: 7200 // 2 hours
        };
        
        // Préparer les headers
        const headers = {
            'Content-Type': 'application/json'
        };
        
        // Ajouter l'API Key si configurée
        if (finalSettings.apiKey && finalSettings.apiKey.trim() !== '') {
            headers['X-API-Key'] = finalSettings.apiKey;
        }
        
        // Ajouter un timeout de 15 secondes pour éviter les blocages
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        
        try {
            const response = await fetch(`${finalSettings.apiUrl}${endpoint}`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(requestData),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
                const data = await response.json();
                return {
                    success: true,
                    ...data
                };
            } else {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }
        } catch (fetchError) {
            clearTimeout(timeoutId);
            if (fetchError.name === 'AbortError') {
                throw new Error('Timeout: le serveur ne répond pas après 15 secondes');
            }
            throw fetchError;
        }
    } catch (error) {
        console.error('Anonymization failed:', error);
        
        // Message d'erreur plus explicite selon le type d'erreur
        let userMessage = error.message;
        if (error.message.includes('Failed to fetch')) {
            userMessage = `Impossible de contacter l'API (${finalSettings.apiUrl}). Vérifiez que le serveur est démarré.`;
        } else if (error.message.includes('NetworkError')) {
            userMessage = 'Erreur réseau. Vérifiez votre connexion.';
        } else if (error.message.includes('CORS')) {
            userMessage = 'Erreur CORS. Vérifiez la configuration du serveur.';
        }
        
        return {
            success: false,
            error: userMessage
        };
    }
}

// Text deanonymization function
async function deanonymizeText(text, sessionId) {
    let apiUrl = 'http://localhost:8001';
    
    try {
        const settings = await new Promise((resolve) => {
            chrome.storage.sync.get({
                apiUrl: 'http://localhost:8001',
                apiKey: ''
            }, resolve);
        });
        
        apiUrl = settings.apiUrl;
        
        if (!sessionId) {
            return {
                success: false,
                error: 'Aucun session_id fourni. Anonymisez d\'abord un texte.'
            };
        }
        
        const requestData = {
            text: text,
            session_id: sessionId
        };
        
        // Préparer les headers
        const headers = {
            'Content-Type': 'application/json'
        };
        
        // Ajouter l'API Key si configurée
        if (settings.apiKey && settings.apiKey.trim() !== '') {
            headers['X-API-Key'] = settings.apiKey;
        }
        
        // Ajouter un timeout de 15 secondes
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        
        try {
            const response = await fetch(`${apiUrl}/deanonymize`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(requestData),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
                const data = await response.json();
                return {
                    success: true,
                    deanonymized_text: data.deanonymized_text || data.text,
                    replacements_count: data.replacements_count || 0,
                    ...data
                };
            } else {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }
        } catch (fetchError) {
            clearTimeout(timeoutId);
            if (fetchError.name === 'AbortError') {
                throw new Error('Timeout: le serveur ne répond pas après 15 secondes');
            }
            throw fetchError;
        }
    } catch (error) {
        console.error('Deanonymization failed:', error);
        
        let userMessage = error.message;
        if (error.message.includes('Failed to fetch')) {
            userMessage = `Impossible de contacter l'API (${apiUrl}). Vérifiez que le serveur est démarré.`;
        } else if (error.message.includes('404')) {
            userMessage = 'Session expirée ou introuvable. Ré-anonymisez le texte.';
        }
        
        return {
            success: false,
            error: userMessage
        };
    }
}

function updateStatistics(data) {
    chrome.storage.local.get({
        totalFiles: 0,
        totalAnonymizations: 0,
        fileMappings: []
    }, (current) => {
        const updated = {
            totalFiles: current.totalFiles + 1,
            totalAnonymizations: current.totalAnonymizations + (data.anonymizations_count || 0),
            lastActivity: new Date().toISOString(),
            fileMappings: current.fileMappings
        };

        // Add mapping data if provided
        if (data.filename && data.mapping_summary) {
            const mappingData = {
                filename: data.filename,
                timestamp: new Date().toISOString(),
                mappings: data.mapping_summary
            };
            
            updated.fileMappings.unshift(mappingData);
            
            // Keep only last 50 mappings
            if (updated.fileMappings.length > 50) {
                updated.fileMappings.splice(50);
            }
        }

        chrome.storage.local.set(updated);
    });
}

// Handle tab updates to inject content script on supported sites
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
        const supportedSites = [
            'chat.openai.com',
            'claude.ai',
            'copilot.microsoft.com',
            'gemini.google.com',
            'poe.com'
        ];
        
        const isSupported = supportedSites.some(site => tab.url.includes(site));
        
        if (isSupported) {
            chrome.scripting.executeScript({
                target: { tabId: tabId },
                files: ['content-file-interceptor.js']
            }).catch(err => {
                console.log('Script injection failed:', err);
            });
        }
    }
});

// Badge text to show activity
chrome.storage.local.get({totalFiles: 0}, (data) => {
    if (data.totalFiles > 0) {
        chrome.action.setBadgeText({
            text: data.totalFiles.toString()
        });
        chrome.action.setBadgeBackgroundColor({color: '#10B981'});
    }
});

// Update badge when statistics change
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.totalFiles) {
        // Vérifier que filesProcessed existe avant d'accéder à newValue
        const count = changes.filesProcessed?.newValue || 0;
        chrome.action.setBadgeText({
            text: count > 0 ? count.toString() : ''
        });
    }
});