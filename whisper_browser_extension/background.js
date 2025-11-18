/**
 * Whisper Network - Background Service Worker
 * Handles extension lifecycle and statistics
 * 
 * Developed by Sylvain JOLY, NANO by NXO - MIT License
 */

chrome.runtime.onInstalled.addListener(() => {
    console.log('🛡️ Whisper Network File Anonymizer installed');
    
    // Initialize default settings (aligned with API)
    chrome.storage.sync.set({
        anonymize_names: true,
        anonymize_email: true,
        anonymize_phone: true,
        anonymize_address: true,
        anonymize_nir: true,
        anonymize_iban: true,
        anonymize_credit_card: false,
        anonymize_ip: false,
        anonymize_url: false
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
    console.log('Background received message:', message);
    
    // Handle file anonymization statistics
    if (message.type === 'FILE_ANONYMIZED') {
        updateStatistics(message.data);
        sendResponse({success: true});
        return true;
    }
    
    // Handle settings requests from popup
    if (message.action === 'getSettings') {
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
            sendResponse({success: true, settings: settings});
        });
        return true; // Keep message channel open for async response
    }
    
    // Handle settings save from popup
    if (message.action === 'saveSettings') {
        chrome.storage.sync.set(message.settings, () => {
            if (chrome.runtime.lastError) {
                console.error('Error saving settings:', chrome.runtime.lastError);
                sendResponse({success: false, error: chrome.runtime.lastError.message});
            } else {
                console.log('Settings saved successfully');
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
        anonymizeText(message.text, message.settings).then(result => {
            sendResponse(result);
        }).catch(error => {
            console.error('Anonymization failed:', error);
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
            anonymize_credit_card: false,
            anonymize_ip: false,
            anonymize_url: false
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
async function anonymizeText(text, customSettings) {
    try {
        const settings = await new Promise((resolve) => {
            chrome.storage.sync.get({
                apiUrl: 'http://localhost:8001',
                apiKey: '',
                processingMode: 'fast',
                anonymize_names: true,
                anonymize_email: true,
                anonymize_phone: true,
                anonymize_address: true,
                anonymize_nir: true,
                anonymize_iban: true,
                anonymize_credit_cards: false,
                anonymize_ip: false,
                anonymize_urls: false
            }, resolve);
        });
        
        // Fusionner les paramètres par défaut avec les paramètres personnalisés
        const finalSettings = { ...settings, ...customSettings };
        
        // Choisir l'endpoint basé sur le mode de traitement
        const endpoint = finalSettings.processingMode === 'fast' ? '/anonymize/fast' : '/anonymize';
        
        const requestData = {
            text: text,
            settings: {
                anonymize_names: finalSettings.anonymize_names,
                anonymize_email: finalSettings.anonymize_email,
                anonymize_phone: finalSettings.anonymize_phone,
                anonymize_address: finalSettings.anonymize_address,
                anonymize_nir: finalSettings.anonymize_nir,
                anonymize_iban: finalSettings.anonymize_iban,
                anonymize_credit_cards: finalSettings.anonymize_credit_cards,
                anonymize_ip: finalSettings.anonymize_ip,
                anonymize_urls: finalSettings.anonymize_urls
            }
        };
        
        // Préparer les headers
        const headers = {
            'Content-Type': 'application/json'
        };
        
        // Ajouter l'API Key si configurée
        if (finalSettings.apiKey && finalSettings.apiKey.trim() !== '') {
            headers['X-API-Key'] = finalSettings.apiKey;
        }
        
        const response = await fetch(`${finalSettings.apiUrl}${endpoint}`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(requestData)
        });
        
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
    } catch (error) {
        console.error('Anonymization failed:', error);
        return {
            success: false,
            error: error.message
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
        const count = changes.filesProcessed.newValue || 0;
        chrome.action.setBadgeText({
            text: count > 0 ? count.toString() : ''
        });
    }
});