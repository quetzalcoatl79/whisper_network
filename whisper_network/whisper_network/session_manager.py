"""
Session Manager for Whisper Network
Manages anonymization sessions with mapping persistence
"""
import logging
import uuid
from datetime import datetime
from typing import Dict, List, Optional
from dataclasses import dataclass, asdict

from .cache_manager import get_cache

logger = logging.getLogger(__name__)


@dataclass
class AnonymizationMapping:
    """Single anonymization mapping"""
    original: str
    anonymized: str
    entity_type: str  # NAME, EMAIL, PHONE, etc.


@dataclass
class SessionData:
    """Session data structure"""
    session_id: str
    created_at: str
    last_used: str
    ttl: int
    mappings: Dict[str, Dict[str, str]]  # {entity_type: {original: anonymized}}
    
    def to_dict(self) -> Dict:
        """Convert to dictionary for JSON serialization"""
        return asdict(self)


class SessionManager:
    """
    Manages anonymization sessions
    Stores mappings for context-aware de-anonymization
    """
    
    def __init__(self):
        self.cache = get_cache()
    
    def _get_session_key(self, session_id: str) -> str:
        """Generate Redis key for session"""
        return f"session:{session_id}"
    
    def create_session(
        self,
        session_id: Optional[str] = None,
        ttl: int = 3600
    ) -> str:
        """
        Create new session
        
        Args:
            session_id: Optional custom session ID (generates UUID if None)
            ttl: Time to live in seconds (default: 3600 = 1h)
        
        Returns:
            session_id
        """
        if not session_id:
            session_id = str(uuid.uuid4())
        
        now = datetime.now().isoformat()
        session_data = SessionData(
            session_id=session_id,
            created_at=now,
            last_used=now,
            ttl=ttl,
            mappings={}
        )
        
        key = self._get_session_key(session_id)
        self.cache.set_json(key, session_data.to_dict(), ttl)
        
        logger.info(f"Created session: {session_id} [TTL: {ttl}s]")
        return session_id
    
    def get_session(self, session_id: str) -> Optional[SessionData]:
        """Get session data"""
        key = self._get_session_key(session_id)
        data = self.cache.get_json(key)
        
        if not data:
            logger.debug(f"Session not found: {session_id}")
            return None
        
        # Update last_used
        data["last_used"] = datetime.now().isoformat()
        self.cache.set_json(key, data, data.get("ttl", 3600))
        
        return SessionData(**data)
    
    def session_exists(self, session_id: str) -> bool:
        """Check if session exists"""
        key = self._get_session_key(session_id)
        return self.cache.exists(key)
    
    def delete_session(self, session_id: str):
        """Delete session and all its data"""
        key = self._get_session_key(session_id)
        self.cache.delete(key)
        logger.info(f"Deleted session: {session_id}")
    
    def store_mappings(
        self,
        session_id: str,
        mappings: Dict[str, Dict[str, str]],
        ttl: int = 3600
    ):
        """
        Store anonymization mappings for a session
        
        Args:
            session_id: Session identifier
            mappings: {entity_type: {original: anonymized}}
            ttl: Time to live in seconds
        
        Example:
            {
                "NAME": {"Jean Dupont": "***NAME_1***"},
                "EMAIL": {"jean@test.fr": "***EMAIL_1***"},
                "PHONE": {"06 12 34 56 78": "***PHONE_1***"}
            }
        """
        session = self.get_session(session_id)
        
        if not session:
            # Create new session if doesn't exist
            self.create_session(session_id, ttl)
            session = self.get_session(session_id)
        
        # Merge new mappings with existing ones
        for entity_type, entity_mappings in mappings.items():
            if entity_type not in session.mappings:
                session.mappings[entity_type] = {}
            session.mappings[entity_type].update(entity_mappings)
        
        # Save updated session
        key = self._get_session_key(session_id)
        self.cache.set_json(key, session.to_dict(), ttl)
        
        total_mappings = sum(len(m) for m in mappings.values())
        logger.info(f"Stored {total_mappings} mappings for session: {session_id}")
    
    def get_mappings(self, session_id: str) -> Dict[str, Dict[str, str]]:
        """
        Get all mappings for a session
        
        Returns:
            {entity_type: {original: anonymized}}
        """
        session = self.get_session(session_id)
        if not session:
            logger.warning(f"Session not found: {session_id}")
            return {}
        
        return session.mappings
    
    def get_reverse_mappings(self, session_id: str) -> Dict[str, str]:
        """
        Get reverse mappings (anonymized → original) for de-anonymization
        
        Returns:
            {anonymized: original} flat dictionary
        
        Example:
            {
                "***NAME_1***": "Jean Dupont",
                "***EMAIL_1***": "jean@test.fr",
                "***PHONE_1***": "06 12 34 56 78"
            }
        """
        mappings = self.get_mappings(session_id)
        reverse = {}
        
        for entity_type, entity_mappings in mappings.items():
            for original, anonymized in entity_mappings.items():
                reverse[anonymized] = original
        
        return reverse
    
    def deanonymize_text(self, session_id: str, text: str) -> Optional[str]:
        """
        De-anonymize text using session mappings
        
        Args:
            session_id: Session identifier
            text: Text containing anonymized tokens (***XXX_N***)
        
        Returns:
            De-anonymized text or None if session not found
        """
        reverse_mappings = self.get_reverse_mappings(session_id)
        
        if not reverse_mappings:
            logger.warning(f"No mappings found for session: {session_id}")
            return None
        
        result = text
        replacements = 0
        
        # Replace all anonymized tokens with original values
        for anonymized, original in reverse_mappings.items():
            if anonymized in result:
                result = result.replace(anonymized, original)
                replacements += 1
        
        logger.info(f"De-anonymized {replacements} tokens for session: {session_id}")
        return result
    
    def get_session_stats(self, session_id: str) -> Optional[Dict]:
        """Get session statistics"""
        session = self.get_session(session_id)
        if not session:
            return None
        
        total_mappings = sum(len(m) for m in session.mappings.values())
        
        return {
            "session_id": session.session_id,
            "created_at": session.created_at,
            "last_used": session.last_used,
            "ttl": session.ttl,
            "total_mappings": total_mappings,
            "mappings_by_type": {
                entity_type: len(mappings)
                for entity_type, mappings in session.mappings.items()
            }
        }


# Global session manager instance
_session_manager: Optional[SessionManager] = None


def get_session_manager() -> SessionManager:
    """Get or create global session manager instance"""
    global _session_manager
    
    if _session_manager is None:
        _session_manager = SessionManager()
    
    return _session_manager
