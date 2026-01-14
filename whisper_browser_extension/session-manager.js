/**
 * Session Manager for Whisper Network Extension
 * Manages anonymization sessions per tab/conversation
 * Stores mappings locally as fallback when Redis expires
 */

class SessionManager {
    constructor() {
        this.sessions = new Map(); // tabId -> sessionId
        this.localMappings = new Map(); // sessionId -> { token: originalValue }
        this.STORAGE_KEY = 'whisper_sessions';
        this.MAPPINGS_KEY = 'whisper_mappings';
        this.SESSION_TTL = 2 * 60 * 60 * 1000; // 2 hours
        this.isLoaded = false;
        
        // Load sessions and mappings from storage on init (non-blocking)
        Promise.all([
            this.loadSessions(),
            this.loadMappings()
        ]).then(() => {
            this.isLoaded = true;
            console.log('[SessionManager] Loaded sessions and mappings');
        }).catch(err => {
            console.warn('[SessionManager] Init load failed:', err);
            this.isLoaded = true; // Continue anyway
        });
    }

    /**
     * Generate a new session ID (UUID v4)
     */
    generateSessionId() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    /**
     * Store mapping locally for fallback deanonymization
     */
    storeMapping(sessionId, mapping) {
        if (!sessionId || !mapping) return;
        
        // Merge with existing mappings for this session
        const existing = this.localMappings.get(sessionId) || {};
        const merged = { ...existing, ...mapping };
        this.localMappings.set(sessionId, merged);
        this.saveMappings();
        console.log(`[SessionManager] Stored ${Object.keys(mapping).length} mappings locally for session: ${sessionId}`);
    }

    /**
     * Get local mapping for fallback deanonymization
     */
    getLocalMapping(sessionId) {
        return this.localMappings.get(sessionId) || null;
    }

    /**
     * Deanonymize text locally using stored mappings
     * Handles various formatting: [TOKEN] (new), ***TOKEN*** (old), TOKEN, (TOKEN), etc.
     */
    deanonymizeLocally(sessionId, text) {
        const mapping = this.getLocalMapping(sessionId);
        if (!mapping) {
            console.log('[SessionManager] No local mapping found for session:', sessionId);
            return null;
        }

        let result = text;
        let replacements = 0;

        console.log('[SessionManager] Available mappings:', Object.keys(mapping).join(', '));

        // Trier les tokens par longueur décroissante pour éviter les remplacements partiels
        // Ex: NAME_10 doit être traité avant NAME_1
        const sortedTokens = Object.keys(mapping).sort((a, b) => b.length - a.length);

        for (const token of sortedTokens) {
            const original = mapping[token];
            
            // Extraire le cœur du token (sans les [] ou ***)
            // "[NAME_1]" -> "NAME_1", "***NAME_1***" -> "NAME_1"
            const coreToken = token.replace(/[\[\]]/g, '').replace(/\*\*\*/g, '').replace(/\*/g, '').trim();
            
            if (!coreToken) continue;

            // Échapper les caractères spéciaux regex
            const escapedCore = coreToken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            
            // Pattern PRÉCIS pour matcher le token avec différents formatages
            // Priorité: [TOKEN] (nouveau format), puis *** (ancien format)
            const pattern = new RegExp(
                '(' +
                    '\\[' + escapedCore + '\\]' +            // [TOKEN] - NOUVEAU format principal
                    '|' +
                    '\\*{1,3}' + escapedCore + '\\*{1,3}' +  // ***TOKEN*** - ANCIEN format
                    '|' +
                    '\\(' + escapedCore + '\\)' +            // (TOKEN)
                    '|' +
                    '«' + escapedCore + '»' +                // «TOKEN»
                    '|' +
                    '"' + escapedCore + '"' +                // "TOKEN"
                    '|' +
                    "'" + escapedCore + "'" +                // 'TOKEN'
                    '|' +
                    '\\b' + escapedCore + '\\b' +            // TOKEN seul (word boundary)
                ')',
                'gi'
            );

            const before = result;
            result = result.replace(pattern, (match) => {
                replacements++;
                return original;
            });
            
            if (before !== result) {
                console.log(`[SessionManager] Replaced "${coreToken}" → "${original}"`);
            }
        }

        console.log(`[SessionManager] Local deanonymization: ${replacements} replacements`);
        return { text: result, replacements };
    }

    /**
     * Load mappings from chrome.storage
     */
    async loadMappings() {
        try {
            const result = await chrome.storage.local.get(this.MAPPINGS_KEY);
            if (result[this.MAPPINGS_KEY]) {
                const stored = JSON.parse(result[this.MAPPINGS_KEY]);
                this.localMappings = new Map(Object.entries(stored));
                console.log(`[SessionManager] Loaded ${this.localMappings.size} session mappings`);
            }
        } catch (error) {
            console.error('[SessionManager] Failed to load mappings:', error);
        }
    }

    /**
     * Save mappings to chrome.storage (fire-and-forget)
     */
    saveMappings() {
        try {
            const obj = Object.fromEntries(this.localMappings);
            chrome.storage.local.set({
                [this.MAPPINGS_KEY]: JSON.stringify(obj)
            }).catch(err => console.warn('[SessionManager] Save mappings failed:', err));
        } catch (error) {
            console.error('[SessionManager] Failed to save mappings:', error);
        }
    }

    /**
     * Get or create session for current tab/conversation
     */
    async getSessionId(tabId, conversationId = null) {
        // Quick path: generate session without waiting for storage
        const key = conversationId || `tab_${tabId}`;
        
        // Check if session exists in memory
        if (this.sessions.has(key)) {
            const session = this.sessions.get(key);
            
            // Check if session expired
            if (Date.now() - session.created < this.SESSION_TTL) {
                session.lastUsed = Date.now();
                await this.saveSessions();
                return session.id;
            }
            
            // Session expired, delete it
            await this.deleteSession(key);
        }
        
        // Create new session
        const sessionId = this.generateSessionId();
        this.sessions.set(key, {
            id: sessionId,
            created: Date.now(),
            lastUsed: Date.now(),
            conversationId: conversationId
        });
        
        await this.saveSessions();
        console.log(`[SessionManager] Created new session: ${sessionId} for ${key}`);
        
        return sessionId;
    }

    /**
     * Delete session
     */
    async deleteSession(key) {
        if (this.sessions.has(key)) {
            const session = this.sessions.get(key);
            console.log(`[SessionManager] Deleting session: ${session.id}`);
            
            // Call backend to delete session
            try {
                const apiUrl = await this.getApiUrl();
                const apiKey = await this.getApiKey();
                
                await fetch(`${apiUrl}/session/${session.id}`, {
                    method: 'DELETE',
                    headers: {
                        'X-API-Key': apiKey
                    }
                });
            } catch (error) {
                console.warn('[SessionManager] Failed to delete session from backend:', error);
            }
            
            this.sessions.delete(key);
            await this.saveSessions();
        }
    }

    /**
     * Clear all sessions
     */
    async clearAllSessions() {
        console.log('[SessionManager] Clearing all sessions');
        this.sessions.clear();
        await this.saveSessions();
    }

    /**
     * Clean expired sessions
     */
    async cleanExpiredSessions() {
        const now = Date.now();
        let cleaned = 0;
        
        for (const [key, session] of this.sessions.entries()) {
            if (now - session.created > this.SESSION_TTL) {
                await this.deleteSession(key);
                cleaned++;
            }
        }
        
        if (cleaned > 0) {
            console.log(`[SessionManager] Cleaned ${cleaned} expired sessions`);
        }
    }

    /**
     * Load sessions from chrome.storage
     */
    async loadSessions() {
        try {
            const result = await chrome.storage.local.get(this.STORAGE_KEY);
            
            if (result[this.STORAGE_KEY]) {
                const stored = JSON.parse(result[this.STORAGE_KEY]);
                this.sessions = new Map(Object.entries(stored));
                console.log(`[SessionManager] Loaded ${this.sessions.size} sessions from storage`);
            }
        } catch (error) {
            console.error('[SessionManager] Failed to load sessions:', error);
        }
    }

    /**
     * Save sessions to chrome.storage (fire-and-forget, non-blocking)
     */
    saveSessions() {
        try {
            const obj = Object.fromEntries(this.sessions);
            chrome.storage.local.set({
                [this.STORAGE_KEY]: JSON.stringify(obj)
            }).catch(err => console.warn('[SessionManager] Save failed:', err));
        } catch (error) {
            console.error('[SessionManager] Failed to save sessions:', error);
        }
    }

    /**
     * Get API URL from storage
     */
    async getApiUrl() {
        const result = await chrome.storage.local.get('apiUrl');
        return result.apiUrl || 'http://localhost:8001';
    }

    /**
     * Get API Key from storage
     */
    async getApiKey() {
        const result = await chrome.storage.local.get('apiKey');
        return result.apiKey || '';
    }

    /**
     * Get session statistics
     */
    getStats() {
        return {
            totalSessions: this.sessions.size,
            sessions: Array.from(this.sessions.entries()).map(([key, session]) => ({
                key,
                sessionId: session.id,
                age: Date.now() - session.created,
                lastUsed: Date.now() - session.lastUsed
            }))
        };
    }
}

// Global instance
const sessionManager = new SessionManager();

// Clean expired sessions every 10 minutes
setInterval(() => {
    sessionManager.cleanExpiredSessions();
}, 10 * 60 * 1000);
