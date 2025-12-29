/**
 * Session Manager for Whisper Network Extension
 * Manages anonymization sessions per tab/conversation
 */

class SessionManager {
    constructor() {
        this.sessions = new Map(); // tabId -> sessionId
        this.STORAGE_KEY = 'whisper_sessions';
        this.SESSION_TTL = 2 * 60 * 60 * 1000; // 2 hours
        
        // Load sessions from storage on init
        this.loadSessions();
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
     * Get or create session for current tab/conversation
     */
    async getSessionId(tabId, conversationId = null) {
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
     * Save sessions to chrome.storage
     */
    async saveSessions() {
        try {
            const obj = Object.fromEntries(this.sessions);
            await chrome.storage.local.set({
                [this.STORAGE_KEY]: JSON.stringify(obj)
            });
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
