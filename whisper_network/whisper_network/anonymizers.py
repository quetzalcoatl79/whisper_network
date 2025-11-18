"""
Advanced anonymization engine with patterns based on the original Whisper project.

Developed by Sylvain JOLY, NANO by NXO
License: MIT
Copyright (c) 2025 Sylvain JOLY, NANO by NXO
"""

import re
import asyncio
import logging
from typing import Dict, List, Tuple, Optional, Any
from dataclasses import dataclass, field
from enum import Enum
import time

logger = logging.getLogger(__name__)

try:
    import spacy
    SPACY_AVAILABLE = True
except ImportError:
    SPACY_AVAILABLE = False
    spacy = None

try:
    from langdetect import detect, LangDetectException
    LANGDETECT_AVAILABLE = True
except ImportError:
    LANGDETECT_AVAILABLE = False
    detect = None
    LangDetectException = Exception


class AnonymizationType(Enum):
    """Types of anonymization available."""
    # Données personnelles des individus
    NAME = "name"
    FIRST_NAME = "first_name"
    INITIALS = "initials"
    ADDRESS = "address"
    PHONE = "phone"
    EMAIL = "email"
    BIRTH_DATE = "birth_date"
    AGE = "age"
    NIR = "nir"  # French social security number
    ID_CARD = "id_card"
    PASSPORT = "passport"
    IP_ADDRESS = "ip_address"
    IP_PUBLIC = "ip_public"
    IP_PRIVATE = "ip_private"
    LOGIN = "login"
    
    # Données professionnelles
    EMPLOYEE_ID = "employee_id"
    PERFORMANCE_DATA = "performance_data"
    SALARY_DATA = "salary_data"
    SCHEDULE = "schedule"
    INTERNAL_COMMUNICATION = "internal_communication"
    
    # Données sensibles spécifiques
    MEDICAL_DATA = "medical_data"
    DIAGNOSIS = "diagnosis"
    TREATMENT = "treatment"
    DISABILITY = "disability"
    BANK_ACCOUNT = "bank_account"
    TRANSACTION = "transaction"
    SALARY = "salary"
    DEBT = "debt"
    GRADES = "grades"
    SCHOOL_RECORD = "school_record"
    LEGAL_CASE = "legal_case"
    DISCIPLINARY = "disciplinary"
    
    # Données contextuelles
    LOCATION = "location"
    GEOLOCATION = "geolocation"
    ACCESS_BADGE = "access_badge"
    PHOTO_REFERENCE = "photo_reference"
    BIOMETRIC = "biometric"
    
    # Données financières
    CREDIT_CARD = "credit_card"
    IBAN = "iban"
    
    # URLs et références
    URL = "url"


@dataclass
class ConsistencyMapper:
    """Maps original values to consistent anonymized tokens."""
    
    def __init__(self):
        self._mappings: Dict[str, Dict[str, str]] = {}  # {type: {original: token}}
        self._counters: Dict[str, int] = {}  # {type: next_number}
    
    def get_token(self, value_type: str, original_value: str, base_token: str) -> str:
        """Get consistent token for a value, creating one if needed."""
        if value_type not in self._mappings:
            self._mappings[value_type] = {}
            self._counters[value_type] = 1
        
        if original_value not in self._mappings[value_type]:
            number = self._counters[value_type]
            # Extract base token name (remove *** if present)
            clean_token = base_token.replace("***", "").replace("*", "")
            self._mappings[value_type][original_value] = f"***{clean_token}_{number}***"
            self._counters[value_type] += 1
        
        return self._mappings[value_type][original_value]
    
    def get_mapping_summary(self) -> Dict[str, Dict[str, str]]:
        """Get summary of all mappings for debugging/logging."""
        return self._mappings.copy()


@dataclass
class AnonymizationSettings:
    """Configuration for text anonymization."""
    # === DONNÉES PERSONNELLES ===
    anonymize_names: bool = False
    anonymize_first_names: bool = False
    anonymize_initials: bool = False
    anonymize_addresses: bool = False
    anonymize_phone: bool = True
    anonymize_email: bool = True
    anonymize_birth_dates: bool = False
    anonymize_age: bool = False
    anonymize_nir: bool = True
    anonymize_id_cards: bool = False
    anonymize_passports: bool = False
    anonymize_ip: bool = True
    anonymize_ip_public: bool = True
    anonymize_ip_private: bool = True
    anonymize_logins: bool = False
    
    # === CONSISTENCY MAPPING ===
    use_consistent_tokens: bool = True  # Enable consistent mapping by default
    
    # === DONNÉES PROFESSIONNELLES ===
    anonymize_employee_ids: bool = False
    anonymize_performance_data: bool = False
    anonymize_salary_data: bool = False
    anonymize_schedules: bool = False
    anonymize_internal_comm: bool = False
    
    # === DONNÉES SENSIBLES ===
    anonymize_medical_data: bool = False
    anonymize_bank_accounts: bool = False
    anonymize_transactions: bool = False
    anonymize_grades: bool = False
    anonymize_legal_cases: bool = False
    
    # === DONNÉES CONTEXTUELLES ===
    anonymize_locations: bool = False
    anonymize_geolocations: bool = False
    anonymize_biometric: bool = False
    
    # === DONNÉES FINANCIÈRES ===
    anonymize_credit_cards: bool = False
    anonymize_iban: bool = False
    
    # === RÉFÉRENCES ===
    anonymize_urls: bool = True
    
    # === TOKENS DE REMPLACEMENT ===
    name_token: str = "***NAME***"
    first_name_token: str = "***PRENOM***"
    initials_token: str = "***INITIALES***"
    address_token: str = "***ADDRESS***"
    phone_token: str = "***PHONE***"
    email_token: str = "***EMAIL***"
    birth_date_token: str = "***DATE_NAISSANCE***"
    age_token: str = "***AGE***"
    nir_token: str = "***NIR***"
    id_card_token: str = "***CNI***"
    passport_token: str = "***PASSEPORT***"
    ip_token: str = "***IP***"
    ip_public_token: str = "***IP_PUBLIQUE***"
    ip_private_token: str = "***IP_PRIVEE***"
    login_token: str = "***LOGIN***"
    employee_id_token: str = "***MATRICULE***"
    performance_token: str = "***EVALUATION***"
    salary_token: str = "***SALAIRE***"
    schedule_token: str = "***PLANNING***"
    internal_comm_token: str = "***COMM_INTERNE***"
    medical_token: str = "***MEDICAL***"
    bank_account_token: str = "***COMPTE_BANCAIRE***"
    transaction_token: str = "***TRANSACTION***"
    grades_token: str = "***NOTE***"
    legal_case_token: str = "***DOSSIER_JURIDIQUE***"
    location_token: str = "***LIEU***"
    geolocation_token: str = "***COORDONNEES***"
    biometric_token: str = "***BIOMETRIE***"
    credit_card_token: str = "***CARTE***"
    iban_token: str = "***IBAN***"
    url_token: str = "***URL***"


@dataclass
class AnonymizationMatch:
    """Represents a found match for anonymization."""
    type: AnonymizationType
    start: int
    end: int
    original_text: str
    replacement: str


@dataclass
class AnonymizationResult:
    """Result of the anonymization process."""
    success: bool
    original_text: str
    anonymized_text: str
    matches: List[AnonymizationMatch] = field(default_factory=list)
    anonymizations_count: int = 0
    processing_time_ms: float = 0.0
    errors: List[str] = field(default_factory=list)
    mapping_summary: Optional[Dict[str, Dict[str, str]]] = None  # Consistency mappings


class RegexPatterns:
    """Compiled regex patterns for anonymization."""
    
    # NIR (Numéro de Sécurité Sociale français) - from original code
    NIR = re.compile(
        r'\b[12]'
        r'(?:[\s.-]?\d{2}){2}'
        r'(?:[\s.-]?\d{2,3})'
        r'(?:[\s.-]?\d{3}){2}'
        r'(?:[\s.-]?\d{2})?\b'
    )
    
    # Phone numbers - Support international amélioré
    PHONE = re.compile(
        r'''(?x)
        (?<!\d)  # Ne pas suivre un chiffre
        (?:
            # Format international avec parenthèses optionnelles pour indicatif zone
            (?:\+|00)\d{1,3}[\s\-\.]*
            (?:\(\d{1,4}\)[\s\-\.]*)?  # Parenthèses pour indicatif zone (ex: (555))
            (?:\(0\)[\s\-\.]*)?  # Ou (0) pour certains pays
            \d{1,4}(?:[\s\-\.]\d{2,4}){1,4}  # Reste du numéro
            |
            # Format français national (strict pour éviter confusion avec IP)
            0[1-9][\s\-]?(?:\d{2}[\s\-]?){4}
            |
            # Format US sans code pays : XXX-XXX-XXXX ou (XXX) XXX-XXXX
            (?:\(\d{3}\)|\d{3})[\s\-\.]?\d{3}[\s\-\.]\d{4}
            |
            # Format générique international (minimum 7 chiffres avec séparateurs)
            (?:\d{2,4}[\s\-]\d{2,4}[\s\-]\d{2,4}(?:[\s\-]\d{2,4})*)
        )
        (?![\.\d])  # Ne pas précéder un point + chiffre (évite les IP)
        '''
    )
    
    # IP addresses (IPv4) - amélioration avec validation des plages
    IP_V4 = re.compile(r'\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b')
    
    # IP privées (RFC 1918)
    IP_PRIVATE = re.compile(r'\b(?:10\.(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){2}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)|172\.(?:1[6-9]|2[0-9]|3[01])\.(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){1}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)|192\.168\.(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){1}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?))\b')
    
    # IP localhost
    IP_LOCALHOST = re.compile(r'\b127\.(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){2}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b')
    
    # Email addresses
    EMAIL = re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b')
    
    # URLs
    URL = re.compile(
        r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+'
    )
    
    # French names (improved pattern for both orders)
    FRENCH_NAME = re.compile(r'''(?x)
        \b(?:
            # Prénom Nom (ex: Sylvain JOLY, NANO by NXO)
            [A-Z][a-zàâäéèêëïîôùûüÿ]{2,}\s+[A-Z][A-Z\-]{2,}
            |
            # NOM Prénom (ex: JOLY Sylvain)  
            [A-Z][A-Z\-]{2,}\s+[A-Z][a-zàâäéèêëïîôùûüÿ]{2,}
            |
            # Prénom Nom classique (ex: Marie Dupont)
            [A-Z][a-zàâäéèêëïîôùûüÿ]{2,}\s+[A-Z][a-zàâäéèêëïîôùûüÿ]{2,}
        )\b
    ''', re.UNICODE)
    
    # French postal codes
    FRENCH_POSTAL = re.compile(r'\b\d{5}\b')
    
    # French street addresses (simple)
    FRENCH_STREET = re.compile(
        r'\b\d{1,4}\s+(?:rue|avenue|boulevard|place|impasse|allée|chemin|cours|quai|passage)\s+[A-Za-zÀ-ÿ\s\'-]+',
        re.IGNORECASE | re.UNICODE
    )
    
    # Complete French addresses (number + street + postal + city)
    FRENCH_COMPLETE_ADDRESS = re.compile(r'''(?x)
        \b\d{1,4}\s+                                    # Numéro
        (?:bis|ter)?\s*                                 # bis/ter optionnel
        (?:rue|avenue|boulevard|place|impasse|allée|chemin|cours|quai|passage)\s+  # Type de voie
        [A-Za-zÀ-ÿ\s\'-]+\s+                          # Nom de la rue
        \d{5}\s+                                        # Code postal
        [A-Za-zÀ-ÿ\s\'-]+                             # Ville
        \b
    ''', re.IGNORECASE | re.UNICODE)
    
    # Credit card numbers (basic pattern)
    CREDIT_CARD = re.compile(r'\b(?:\d{4}[\s-]?){3}\d{4}\b')
    
    # IBAN (International Bank Account Number)
    IBAN = re.compile(r'\b[A-Z]{2}\d{2}[A-Z0-9]{4}\d{7}[A-Z0-9]{1,16}\b')
    
    # === NOUVEAUX PATTERNS ÉTENDUS ===
    
    # Dates de naissance (DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY)
    BIRTH_DATE = re.compile(r'\b(?:0[1-9]|[12]\d|3[01])[\/\-\.](0[1-9]|1[012])[\/\-\.](?:19|20)\d\d\b')
    
    # Âge exact (patterns contextuels)
    AGE = re.compile(r'\b(?:j\'ai|age de|âgé? de|[0-9]{1,2})\s*(?:ans?)\b', re.IGNORECASE | re.UNICODE)
    
    # Numéros de carte d'identité française
    ID_CARD = re.compile(r'\b[0-9]{12}\b')  # 12 chiffres pour CNI française
    
    # Numéros de passeport français
    PASSPORT = re.compile(r'\b[0-9]{2}[A-Z]{2}[0-9]{5}\b')  # Format passeport français
    
    # Identifiants de connexion
    LOGIN = re.compile(r'\b(?:login|username|user|identifiant)[\s:=]+[a-zA-Z0-9._-]+\b', re.IGNORECASE)
    
    # Matricule employé
    EMPLOYEE_ID = re.compile(r'\b(?:matricule|emp|employee)[\s:]*[A-Z0-9]{3,10}\b', re.IGNORECASE)
    
    # Données de salaire (euros)
    SALARY_DATA = re.compile(r'\b[0-9]{3,6}[\s]*(?:€|euros?|EUR)\s*(?:brut|net|par mois|mensuel)?.{0,20}\b', re.IGNORECASE | re.UNICODE)
    
    # Numéros de compte bancaire français (RIB)
    BANK_ACCOUNT = re.compile(r'\b[0-9]{5}\s*[0-9]{5}\s*[0-9A-Z]{11}\s*[0-9]{2}\b')
    
    # Références médicales
    MEDICAL_DATA = re.compile(r'\b(?:diagnostic|pathologie|traitement|médicament|ordonnance|consultation)[\s:].{1,50}\b', re.IGNORECASE | re.UNICODE)
    
    # Coordonnées GPS
    GEOLOCATION = re.compile(r'\b[-+]?[0-9]{1,3}\.?[0-9]*[°]?\s*[NS]?\s*[,\s]\s*[-+]?[0-9]{1,3}\.?[0-9]*[°]?\s*[EW]?\b')
    
    # Adresses précises avec numéro
    PRECISE_ADDRESS = re.compile(r'\b\d{1,4}\s+(?:rue|avenue|boulevard|place|impasse|allée|chemin|cours|quai|passage|bis|ter)\s+[A-Za-zÀ-ÿ\s\'-]+,?\s*\d{5}\s+[A-Za-zÀ-ÿ\s\'-]+\b', re.IGNORECASE | re.UNICODE)
    
    # Notes et évaluations
    GRADES = re.compile(r'\b(?:note|résultat|moyenne|score)[\s:]*[0-9]{1,2}[\/\.][0-9]{1,2}\b', re.IGNORECASE | re.UNICODE)
    
    # Codes postaux précis
    POSTAL_CODE = re.compile(r'\b\d{5}\b')
    
    # Références juridiques
    LEGAL_CASE = re.compile(r'\b(?:dossier|affaire|proc[ée]dure|plainte)[\s:]?[A-Z0-9\/-]{5,15}\b', re.IGNORECASE | re.UNICODE)
    
    # Données biométriques (références)
    BIOMETRIC = re.compile(r'\b(?:empreinte|biométrie|reconnaissance|scan|capteur)[\s:].{1,30}\b', re.IGNORECASE | re.UNICODE)


class AnonymizationEngine:
    """Advanced anonymization engine with multi-language support."""
    
    def __init__(self, settings: Optional[AnonymizationSettings] = None):
        """Initialize the anonymization engine."""
        self.settings = settings or AnonymizationSettings()
        self.patterns = RegexPatterns()
        
        # Initialize spaCy models for name detection (multi-language)
        self.nlp_fr = None
        self.nlp_en = None
        self.nlp = None  # Will be set dynamically based on language detection
        
        if SPACY_AVAILABLE:
            # Load French model
            try:
                self.nlp_fr = spacy.load("fr_core_news_sm")
                self.nlp = self.nlp_fr  # Default to French
                logger.info("spaCy French model loaded successfully")
            except OSError:
                logger.warning("spaCy French model not found. FR name detection disabled.")
            
            # Load English model
            try:
                self.nlp_en = spacy.load("en_core_web_sm")
                logger.info("spaCy English model loaded successfully")
            except OSError:
                logger.warning("spaCy English model not found. EN name detection disabled.")
            
            if not self.nlp_fr and not self.nlp_en:
                logger.error("No spaCy models available. Name detection disabled.")
    
    def _detect_language(self, text: str) -> str:
        """
        Detect the language of the text.
        Returns 'fr' for French, 'en' for English, or 'fr' as default.
        """
        if not LANGDETECT_AVAILABLE or not text or len(text.strip()) < 10:
            return 'fr'  # Default to French
        
        try:
            # langdetect returns ISO 639-1 codes (fr, en, etc.)
            lang = detect(text)
            
            # Map to supported languages
            if lang in ['en', 'eng']:
                return 'en'
            elif lang in ['fr', 'fra']:
                return 'fr'
            else:
                # Default to French for unsupported languages
                return 'fr'
        except (LangDetectException, Exception):
            return 'fr'  # Default to French on error
    
    def _select_nlp_model(self, text: str):
        """Select the appropriate spaCy model based on detected language."""
        if not SPACY_AVAILABLE:
            return
        
        detected_lang = self._detect_language(text)
        
        if detected_lang == 'en' and self.nlp_en:
            self.nlp = self.nlp_en
        elif detected_lang == 'fr' and self.nlp_fr:
            self.nlp = self.nlp_fr
        else:
            # Fallback to any available model
            self.nlp = self.nlp_fr or self.nlp_en
    
    def _is_likely_person_name(self, text: str) -> bool:
        """Check if text is likely a person name using multiple heuristics."""
        # Skip common words that aren't names
        common_words = {
            'bonjour', 'hello', 'salut', 'contact', 'développé', 'serveur', 'client', 'projet',
            'world', 'true', 'false', 'none', 'null', 'informations', 'information',
            'def', 'class', 'return', 'print', 'import', 'from'  # Python keywords
        }
        if text.lower() in common_words:
            return False
        
        words = text.split()
        if len(words) < 1 or len(words) > 3:  # Names usually have 1-3 words
            return False
        
        # Skip if contains code-like patterns
        if any(char in text for char in ['(', ')', '{', '}', '[', ']', '=', ':', ';', '"', "'"]):
            return False
        
        # Check if it matches our improved name patterns
        import re
        name_pattern = re.compile(r'''(?x)
            ^(?:
                # Prénom Nom (ex: Sylvain JOLY, NANO by NXO)
                [A-Z][a-zàâäéèêëïîôùûüÿ]{2,}\s+[A-Z][A-Z\-]{2,}
                |
                # NOM Prénom (ex: JOLY Sylvain)  
                [A-Z][A-Z\-]{2,}\s+[A-Z][a-zàâäéèêëïîôùûüÿ]{2,}
                |
                # Prénom Nom classique (ex: Marie Dupont)
                [A-Z][a-zàâäéèêëïîôùûüÿ]{2,}\s+[A-Z][a-zàâäéèêëïîôùûüÿ]{2,}
                |
                # Single name (ex: Sylvain, JOLY)
                [A-Z][a-zàâäéèêëïîôùûüÿA-Z\-]{2,}
            )$
        ''', re.UNICODE)
        
        return bool(name_pattern.match(text))
    
    def _normalize_name(self, name: str) -> str:
        """Normalize name for consistent mapping (e.g., 'JOLY Sylvain' -> 'Sylvain JOLY, NANO by NXO')."""
        words = name.split()
        if len(words) != 2:
            return name  # Don't normalize complex names
        
        word1, word2 = words
        
        # If first word is all caps and second is mixed case, it's likely "NOM Prénom"
        if word1.isupper() and word2[0].isupper() and any(c.islower() for c in word2[1:]):
            return f"{word2} {word1}"  # "JOLY Sylvain" -> "Sylvain JOLY, NANO by NXO"
        
        return name  # Keep original order
    
    def _apply_consistent_mapping(self, matches: List[AnonymizationMatch], text: str, mapper: Optional[ConsistencyMapper]) -> Tuple[str, List[AnonymizationMatch]]:
        """Apply consistent mapping to matches and update text."""
        if not mapper:
            # No mapping, use original tokens
            anonymized_text = text
            for match in sorted(matches, key=lambda x: x.start, reverse=True):
                anonymized_text = (
                    anonymized_text[:match.start] + 
                    match.replacement + 
                    anonymized_text[match.end:]
                )
            return anonymized_text, matches
        
        # Apply consistent mapping
        updated_matches = []
        for match in matches:
            # Map each type to a consistent token
            type_name = match.type.value.upper()
            
            # Normalize names for consistent mapping
            key_for_mapping = match.original_text
            if match.type == AnonymizationType.NAME:
                key_for_mapping = self._normalize_name(match.original_text)
            
            consistent_token = mapper.get_token(type_name, key_for_mapping, match.replacement)
            
            updated_match = AnonymizationMatch(
                type=match.type,
                start=match.start,
                end=match.end,
                original_text=match.original_text,
                replacement=consistent_token
            )
            updated_matches.append(updated_match)
        
        # Apply replacements in reverse order to maintain positions
        anonymized_text = text
        for match in sorted(updated_matches, key=lambda x: x.start, reverse=True):
            anonymized_text = (
                anonymized_text[:match.start] + 
                match.replacement + 
                anonymized_text[match.end:]
            )
        
        return anonymized_text, updated_matches
    
    async def anonymize(self, text: str, custom_settings: Optional[Dict[str, Any]] = None) -> AnonymizationResult:
        """
        Anonymize text based on settings with automatic language detection.
        
        Args:
            text: Text to anonymize
            custom_settings: Optional custom settings to override defaults
            
        Returns:
            AnonymizationResult with the processed text and metadata
        """
        start_time = time.perf_counter()
        
        # Detect language and select appropriate NLP model
        self._select_nlp_model(text)
        
        if custom_settings:
            # Create temporary settings object with custom values
            settings = AnonymizationSettings()
            for key, value in custom_settings.items():
                if hasattr(settings, key):
                    setattr(settings, key, value)
        else:
            settings = self.settings
        
        try:
            matches = []
            anonymized_text = text
            
            # Initialize consistency mapper if enabled
            mapper = ConsistencyMapper() if settings.use_consistent_tokens else None
            
            # PHASE 1: Collect all matches without applying them yet
            # ORDER MATTERS: Process regex patterns FIRST to protect them from NER
            raw_matches = []
            
            # === REGEX PATTERNS FIRST (to protect structured data) ===
            # Process emails, phones, IPs, URLs BEFORE NER to avoid breaking them
            
            if settings.anonymize_email:
                _, email_matches = await self._anonymize_email(text, settings.email_token)
                raw_matches.extend(email_matches)
            
            if settings.anonymize_phone:
                _, phone_matches = await self._anonymize_phone(text, settings.phone_token)
                raw_matches.extend(phone_matches)
            
            # Traiter les IP AVANT les téléphones pour éviter les conflits
            if settings.anonymize_ip or settings.anonymize_ip_public or settings.anonymize_ip_private:
                _, ip_matches = await self._anonymize_ip_intelligent(text, settings)
                raw_matches.extend(ip_matches)
            
            if settings.anonymize_urls:
                _, url_matches = await self._anonymize_urls(text, settings.url_token)
                raw_matches.extend(url_matches)
            
            if settings.anonymize_nir:
                _, nir_matches = await self._anonymize_nir(text, settings.nir_token)
                raw_matches.extend(nir_matches)
            
            # === THEN ADDRESSES (broader context before specific names) ===
            if settings.anonymize_addresses:
                _, address_matches = await self._anonymize_addresses(text, settings.address_token)
                raw_matches.extend(address_matches)
            
            # === NAMES LAST (to avoid conflicts with address components and protected patterns) ===
            if settings.anonymize_names:
                _, name_matches = await self._anonymize_names(text, settings.name_token)
                # Filter out name matches that overlap with ANY existing match (emails, addresses, etc.)
                filtered_name_matches = []
                for name_match in name_matches:
                    # Check if this name overlaps with any existing match
                    overlaps = any(
                        max(name_match.start, existing_match.start) < min(name_match.end, existing_match.end)
                        for existing_match in raw_matches
                    )
                    if not overlaps:
                        filtered_name_matches.append(name_match)
                raw_matches.extend(filtered_name_matches)
            
            # PHASE 2: Apply consistent mapping and generate final anonymized text
            anonymized_text, matches = self._apply_consistent_mapping(raw_matches, text, mapper)
            
            # Continue with other types that don't need consistent mapping for now
            if settings.anonymize_birth_dates:
                anonymized_text, birth_matches = await self._anonymize_birth_dates(anonymized_text, settings.birth_date_token)
                matches.extend(birth_matches)
            
            if settings.anonymize_age:
                anonymized_text, age_matches = await self._anonymize_age(anonymized_text, settings.age_token)
                matches.extend(age_matches)
            
            if settings.anonymize_id_cards:
                anonymized_text, id_matches = await self._anonymize_id_cards(anonymized_text, settings.id_card_token)
                matches.extend(id_matches)
            
            if settings.anonymize_passports:
                anonymized_text, passport_matches = await self._anonymize_passports(anonymized_text, settings.passport_token)
                matches.extend(passport_matches)
            
            if settings.anonymize_logins:
                anonymized_text, login_matches = await self._anonymize_logins(anonymized_text, settings.login_token)
                matches.extend(login_matches)
            
            # === DONNÉES PROFESSIONNELLES ===
            if settings.anonymize_employee_ids:
                anonymized_text, emp_matches = await self._anonymize_employee_ids(anonymized_text, settings.employee_id_token)
                matches.extend(emp_matches)
            
            if settings.anonymize_salary_data:
                anonymized_text, salary_matches = await self._anonymize_salary_data(anonymized_text, settings.salary_token)
                matches.extend(salary_matches)
            
            # === DONNÉES SENSIBLES ===
            if settings.anonymize_medical_data:
                anonymized_text, medical_matches = await self._anonymize_medical_data(anonymized_text, settings.medical_token)
                matches.extend(medical_matches)
            
            if settings.anonymize_bank_accounts:
                anonymized_text, bank_matches = await self._anonymize_bank_accounts(anonymized_text, settings.bank_account_token)
                matches.extend(bank_matches)
            
            if settings.anonymize_grades:
                anonymized_text, grade_matches = await self._anonymize_grades(anonymized_text, settings.grades_token)
                matches.extend(grade_matches)
            
            if settings.anonymize_legal_cases:
                anonymized_text, legal_matches = await self._anonymize_legal_cases(anonymized_text, settings.legal_case_token)
                matches.extend(legal_matches)
            
            # === DONNÉES CONTEXTUELLES ===
            if settings.anonymize_geolocations:
                anonymized_text, geo_matches = await self._anonymize_geolocations(anonymized_text, settings.geolocation_token)
                matches.extend(geo_matches)
            
            if settings.anonymize_biometric:
                anonymized_text, bio_matches = await self._anonymize_biometric(anonymized_text, settings.biometric_token)
                matches.extend(bio_matches)
            
            # === DONNÉES FINANCIÈRES ===
            if settings.anonymize_credit_cards:
                anonymized_text, cc_matches = await self._anonymize_credit_cards(anonymized_text, settings.credit_card_token)
                matches.extend(cc_matches)
            
            if settings.anonymize_iban:
                anonymized_text, iban_matches = await self._anonymize_iban(anonymized_text, settings.iban_token)
                matches.extend(iban_matches)
            
            end_time = time.perf_counter()
            processing_time = (end_time - start_time) * 1000
            
            return AnonymizationResult(
                success=True,
                original_text=text,
                anonymized_text=anonymized_text,
                matches=matches,
                anonymizations_count=len(matches),
                processing_time_ms=round(processing_time, 2),
                mapping_summary=mapper.get_mapping_summary() if mapper else None
            )
            
        except Exception as e:
            end_time = time.perf_counter()
            processing_time = (end_time - start_time) * 1000
            
            return AnonymizationResult(
                success=False,
                original_text=text,
                anonymized_text=text,
                processing_time_ms=round(processing_time, 2),
                errors=[str(e)]
            )
    
    async def _anonymize_nir(self, text: str, token: str) -> Tuple[str, List[AnonymizationMatch]]:
        """Anonymize French social security numbers."""
        matches = []
        for match in self.patterns.NIR.finditer(text):
            matches.append(AnonymizationMatch(
                type=AnonymizationType.NIR,
                start=match.start(),
                end=match.end(),
                original_text=match.group(),
                replacement=token
            ))
        
        anonymized_text = self.patterns.NIR.sub(token, text)
        return anonymized_text, matches
    
    async def _anonymize_phone(self, text: str, token: str) -> Tuple[str, List[AnonymizationMatch]]:
        """Anonymize phone numbers."""
        matches = []
        for match in self.patterns.PHONE.finditer(text):
            matches.append(AnonymizationMatch(
                type=AnonymizationType.PHONE,
                start=match.start(),
                end=match.end(),
                original_text=match.group(),
                replacement=token
            ))
        
        anonymized_text = self.patterns.PHONE.sub(token, text)
        return anonymized_text, matches
    
    async def _anonymize_ip(self, text: str, token: str) -> Tuple[str, List[AnonymizationMatch]]:
        """Anonymize IP addresses."""
        matches = []
        for match in self.patterns.IP_V4.finditer(text):
            matches.append(AnonymizationMatch(
                type=AnonymizationType.IP_ADDRESS,
                start=match.start(),
                end=match.end(),
                original_text=match.group(),
                replacement=token
            ))
        
        anonymized_text = self.patterns.IP_V4.sub(token, text)
        return anonymized_text, matches
    
    async def _anonymize_ip_intelligent(self, text: str, settings: AnonymizationSettings) -> Tuple[str, List[AnonymizationMatch]]:
        """Anonymize IP addresses with smart public/private detection."""
        matches = []
        anonymized_text = text
        
        # Traiter d'abord les IP privées si activé
        if settings.anonymize_ip_private:
            for match in self.patterns.IP_PRIVATE.finditer(text):
                matches.append(AnonymizationMatch(
                    type=AnonymizationType.IP_PRIVATE,
                    start=match.start(),
                    end=match.end(),
                    original_text=match.group(),
                    replacement=settings.ip_private_token
                ))
            anonymized_text = self.patterns.IP_PRIVATE.sub(settings.ip_private_token, anonymized_text)
        
        # Traiter localhost
        if settings.anonymize_ip_private:
            for match in self.patterns.IP_LOCALHOST.finditer(anonymized_text):
                matches.append(AnonymizationMatch(
                    type=AnonymizationType.IP_PRIVATE,
                    start=match.start(),
                    end=match.end(),
                    original_text=match.group(),
                    replacement=settings.ip_private_token
                ))
            anonymized_text = self.patterns.IP_LOCALHOST.sub(settings.ip_private_token, anonymized_text)
        
        # Traiter les IP publiques (toutes les autres IP valides)
        if settings.anonymize_ip_public or settings.anonymize_ip:
            for match in self.patterns.IP_V4.finditer(anonymized_text):
                # Vérifier que ce n'est pas déjà remplacé par un token
                if not any(token in match.group() for token in [settings.ip_private_token, settings.ip_public_token]):
                    matches.append(AnonymizationMatch(
                        type=AnonymizationType.IP_PUBLIC,
                        start=match.start(),
                        end=match.end(),
                        original_text=match.group(),
                        replacement=settings.ip_public_token
                    ))
            
            # Remplacer uniquement les IP non déjà traitées
            import re
            def replace_public_ip(match):
                ip = match.group()
                if any(token in ip for token in [settings.ip_private_token, settings.ip_public_token]):
                    return ip  # Déjà traité
                return settings.ip_public_token
            
            anonymized_text = self.patterns.IP_V4.sub(replace_public_ip, anonymized_text)
        
        return anonymized_text, matches
    
    async def _anonymize_email(self, text: str, token: str) -> Tuple[str, List[AnonymizationMatch]]:
        """Anonymize email addresses."""
        matches = []
        for match in self.patterns.EMAIL.finditer(text):
            matches.append(AnonymizationMatch(
                type=AnonymizationType.EMAIL,
                start=match.start(),
                end=match.end(),
                original_text=match.group(),
                replacement=token
            ))
        
        anonymized_text = self.patterns.EMAIL.sub(token, text)
        return anonymized_text, matches
    
    async def _anonymize_urls(self, text: str, token: str) -> Tuple[str, List[AnonymizationMatch]]:
        """Anonymize URLs."""
        matches = []
        for match in self.patterns.URL.finditer(text):
            matches.append(AnonymizationMatch(
                type=AnonymizationType.URL,
                start=match.start(),
                end=match.end(),
                original_text=match.group(),
                replacement=token
            ))
        
        anonymized_text = self.patterns.URL.sub(token, text)
        return anonymized_text, matches
    
    async def _anonymize_names(self, text: str, token: str) -> Tuple[str, List[AnonymizationMatch]]:
        """Anonymize names using NLP model or fallback to regex."""
        return await self._anonymize_names_nlp(text, token)
    
    async def _anonymize_addresses(self, text: str, token: str) -> Tuple[str, List[AnonymizationMatch]]:
        """Anonymize postal addresses with priority to complete addresses."""
        matches = []
        anonymized_text = text
        
        # FIRST: Anonymize complete addresses (number + street + postal + city)
        complete_addresses = []
        for match in self.patterns.FRENCH_COMPLETE_ADDRESS.finditer(text):
            matches.append(AnonymizationMatch(
                type=AnonymizationType.ADDRESS,
                start=match.start(),
                end=match.end(),
                original_text=match.group().strip(),
                replacement=token
            ))
            complete_addresses.append((match.start(), match.end()))
        
        # Apply complete address anonymization
        for match in sorted([m for m in matches if m.type == AnonymizationType.ADDRESS], 
                           key=lambda x: x.start, reverse=True):
            anonymized_text = (
                anonymized_text[:match.start] + 
                match.replacement + 
                anonymized_text[match.end:]
            )
        
        # THEN: Anonymize remaining postal codes (not already covered)
        for match in self.patterns.FRENCH_POSTAL.finditer(text):
            # Check if this postal code is not already part of a complete address
            is_covered = any(start <= match.start() < end for start, end in complete_addresses)
            if not is_covered:
                matches.append(AnonymizationMatch(
                    type=AnonymizationType.ADDRESS,
                    start=match.start(),
                    end=match.end(),
                    original_text=match.group(),
                    replacement=token
                ))
        
        # FINALLY: Anonymize remaining street addresses (not already covered)
        for match in self.patterns.FRENCH_STREET.finditer(text):
            # Check if this street is not already part of a complete address
            is_covered = any(start <= match.start() < end for start, end in complete_addresses)
            if not is_covered:
                matches.append(AnonymizationMatch(
                    type=AnonymizationType.ADDRESS,
                    start=match.start(),
                    end=match.end(),
                    original_text=match.group(),
                    replacement=token
                ))
        
        # Re-apply anonymization for remaining matches
        remaining_matches = [m for m in matches if m.type == AnonymizationType.ADDRESS][len(complete_addresses):]
        for match in sorted(remaining_matches, key=lambda x: x.start, reverse=True):
            anonymized_text = (
                anonymized_text[:match.start] + 
                match.replacement + 
                anonymized_text[match.end:]
            )
        
        return anonymized_text, matches
    
    async def _anonymize_credit_cards(self, text: str, token: str) -> Tuple[str, List[AnonymizationMatch]]:
        """Anonymize credit card numbers."""
        matches = []
        for match in self.patterns.CREDIT_CARD.finditer(text):
            matches.append(AnonymizationMatch(
                type=AnonymizationType.CREDIT_CARD,
                start=match.start(),
                end=match.end(),
                original_text=match.group(),
                replacement=token
            ))
        
        anonymized_text = self.patterns.CREDIT_CARD.sub(token, text)
        return anonymized_text, matches
    
    async def _anonymize_iban(self, text: str, token: str) -> Tuple[str, List[AnonymizationMatch]]:
        """Anonymize IBAN numbers."""
        matches = []
        for match in self.patterns.IBAN.finditer(text):
            matches.append(AnonymizationMatch(
                type=AnonymizationType.IBAN,
                start=match.start(),
                end=match.end(),
                original_text=match.group(),
                replacement=token
            ))
        
        anonymized_text = self.patterns.IBAN.sub(token, text)
        return anonymized_text, matches
    
    async def _anonymize_names_nlp(self, text: str, token: str) -> Tuple[str, List[AnonymizationMatch]]:
        """Anonymize names using spaCy NLP model combined with regex fallback."""
        matches = []
        
        if not self.nlp:
            # Fallback to regex pattern if NLP not available
            return await self._anonymize_names_regex(text, token)
        
        try:
            doc = self.nlp(text)
            
            # Find different types of entities
            for ent in doc.ents:
                if ent.label_ == "PER":  # Person entity in French model
                    # CRITICAL: Strip trailing whitespace from entity to preserve formatting
                    entity_text = ent.text.rstrip()
                    if not entity_text:  # Skip if only whitespace
                        continue
                    
                    # Adjust end position to exclude trailing whitespace
                    end_pos = ent.start_char + len(entity_text)
                    
                    matches.append(AnonymizationMatch(
                        type=AnonymizationType.NAME,
                        start=ent.start_char,
                        end=end_pos,  # Use adjusted end position
                        original_text=entity_text,  # Use cleaned text
                        replacement=token
                    ))
                elif ent.label_ == "ORG":  # Organization - can contain sensitive internal refs
                    entity_text = ent.text.rstrip()
                    if not entity_text:
                        continue
                    end_pos = ent.start_char + len(entity_text)
                    
                    matches.append(AnonymizationMatch(
                        type=AnonymizationType.INTERNAL_COMMUNICATION,
                        start=ent.start_char,
                        end=end_pos,
                        original_text=entity_text,
                        replacement="***ORG***"
                    ))
                elif ent.label_ == "LOC":  # Location - but could be a person name with title
                    entity_text = ent.text.rstrip()
                    if not entity_text:
                        continue
                    
                    # Check if it starts with a title (Mr, Mme, Dr, etc.) - likely a person
                    if any(entity_text.lower().startswith(title) for title in ['mr', 'mme', 'mlle', 'dr', 'm.', 'mme.', 'dr.']):
                        # Extract just the name part (remove verbs and other words)
                        import re
                        name_pattern = r'((?:Mr|Mme|Mlle|Dr|M\.|Mme\.|Dr\.)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)'
                        name_match = re.search(name_pattern, entity_text, re.IGNORECASE)
                        if name_match:
                            name_text = name_match.group(1)
                            name_start = ent.start_char + name_match.start(1)
                            name_end = ent.start_char + name_match.end(1)
                            matches.append(AnonymizationMatch(
                                type=AnonymizationType.NAME,
                                start=name_start,
                                end=name_end,
                                original_text=name_text,
                                replacement=token
                            ))
                        else:
                            # Fallback: use the whole entity as name
                            end_pos = ent.start_char + len(entity_text)
                            matches.append(AnonymizationMatch(
                                type=AnonymizationType.NAME,
                                start=ent.start_char,
                                end=end_pos,
                                original_text=entity_text,
                                replacement=token
                            ))
                    else:
                        # Real location
                        end_pos = ent.start_char + len(entity_text)
                        matches.append(AnonymizationMatch(
                            type=AnonymizationType.LOCATION,
                            start=ent.start_char,
                            end=end_pos,
                            original_text=entity_text,
                            replacement="***LOCATION***"
                        ))
                elif ent.label_ == "MISC":  # Miscellaneous - can contain IDs, refs, or names
                    entity_text = ent.text.rstrip()
                    if not entity_text:
                        continue
                    end_pos = ent.start_char + len(entity_text)
                    
                    # Check if it looks like an ID or reference (contains digits)
                    if any(char.isdigit() for char in entity_text) and len(entity_text) > 3:
                        matches.append(AnonymizationMatch(
                            type=AnonymizationType.EMPLOYEE_ID,
                            start=ent.start_char,
                            end=end_pos,
                            original_text=entity_text,
                            replacement="***ID***"
                        ))
                    # Check if it looks like a person name with better heuristics
                    elif self._is_likely_person_name(entity_text):
                        matches.append(AnonymizationMatch(
                            type=AnonymizationType.NAME,
                            start=ent.start_char,
                            end=end_pos,
                            original_text=entity_text,
                            replacement=token
                        ))
            
            # ADD REGEX FALLBACK: Look for names that NLP might have missed
            # Get areas already covered by NLP matches
            covered_ranges = [(match.start, match.end) for match in matches if match.type == AnonymizationType.NAME]
            
            # Apply regex pattern to find additional names
            for regex_match in self.patterns.FRENCH_NAME.finditer(text):
                start, end = regex_match.start(), regex_match.end()
                # Only add if not already covered by NLP
                if not any(nlp_start <= start < nlp_end or nlp_start < end <= nlp_end for nlp_start, nlp_end in covered_ranges):
                    matches.append(AnonymizationMatch(
                        type=AnonymizationType.NAME,
                        start=start,
                        end=end,
                        original_text=regex_match.group(),
                        replacement=token
                    ))
            
            # Replace entities in reverse order to maintain positions
            anonymized_text = text
            for match in sorted(matches, key=lambda x: x.start, reverse=True):
                anonymized_text = (
                    anonymized_text[:match.start] + 
                    match.replacement + 
                    anonymized_text[match.end:]
                )
            
            return anonymized_text, matches
            
        except Exception as e:
            logger.warning(f"NLP error: {e}. Falling back to regex-based name detection.")
            return await self._anonymize_names_regex(text, token)
    
    async def _anonymize_names_regex(self, text: str, token: str) -> Tuple[str, List[AnonymizationMatch]]:
        """Fallback regex-based name anonymization."""
        matches = []
        for match in self.patterns.FRENCH_NAME.finditer(text):
            matches.append(AnonymizationMatch(
                type=AnonymizationType.NAME,
                start=match.start(),
                end=match.end(),
                original_text=match.group(),
                replacement=token
            ))
        
        anonymized_text = self.patterns.FRENCH_NAME.sub(token, text)
        return anonymized_text, matches
    
    # === NOUVELLES MÉTHODES D'ANONYMISATION ===
    
    async def _anonymize_birth_dates(self, text: str, token: str) -> Tuple[str, List[AnonymizationMatch]]:
        """Anonymize birth dates."""
        matches = []
        for match in self.patterns.BIRTH_DATE.finditer(text):
            matches.append(AnonymizationMatch(
                type=AnonymizationType.BIRTH_DATE,
                start=match.start(),
                end=match.end(),
                original_text=match.group(),
                replacement=token
            ))
        anonymized_text = self.patterns.BIRTH_DATE.sub(token, text)
        return anonymized_text, matches
    
    async def _anonymize_age(self, text: str, token: str) -> Tuple[str, List[AnonymizationMatch]]:
        """Anonymize age references."""
        matches = []
        for match in self.patterns.AGE.finditer(text):
            matches.append(AnonymizationMatch(
                type=AnonymizationType.AGE,
                start=match.start(),
                end=match.end(),
                original_text=match.group(),
                replacement=token
            ))
        anonymized_text = self.patterns.AGE.sub(token, text)
        return anonymized_text, matches
    
    async def _anonymize_id_cards(self, text: str, token: str) -> Tuple[str, List[AnonymizationMatch]]:
        """Anonymize ID card numbers."""
        matches = []
        for match in self.patterns.ID_CARD.finditer(text):
            matches.append(AnonymizationMatch(
                type=AnonymizationType.ID_CARD,
                start=match.start(),
                end=match.end(),
                original_text=match.group(),
                replacement=token
            ))
        anonymized_text = self.patterns.ID_CARD.sub(token, text)
        return anonymized_text, matches
    
    async def _anonymize_passports(self, text: str, token: str) -> Tuple[str, List[AnonymizationMatch]]:
        """Anonymize passport numbers."""
        matches = []
        for match in self.patterns.PASSPORT.finditer(text):
            matches.append(AnonymizationMatch(
                type=AnonymizationType.PASSPORT,
                start=match.start(),
                end=match.end(),
                original_text=match.group(),
                replacement=token
            ))
        anonymized_text = self.patterns.PASSPORT.sub(token, text)
        return anonymized_text, matches
    
    async def _anonymize_logins(self, text: str, token: str) -> Tuple[str, List[AnonymizationMatch]]:
        """Anonymize login identifiers."""
        matches = []
        for match in self.patterns.LOGIN.finditer(text):
            matches.append(AnonymizationMatch(
                type=AnonymizationType.LOGIN,
                start=match.start(),
                end=match.end(),
                original_text=match.group(),
                replacement=token
            ))
        anonymized_text = self.patterns.LOGIN.sub(token, text)
        return anonymized_text, matches
    
    async def _anonymize_employee_ids(self, text: str, token: str) -> Tuple[str, List[AnonymizationMatch]]:
        """Anonymize employee IDs."""
        matches = []
        for match in self.patterns.EMPLOYEE_ID.finditer(text):
            matches.append(AnonymizationMatch(
                type=AnonymizationType.EMPLOYEE_ID,
                start=match.start(),
                end=match.end(),
                original_text=match.group(),
                replacement=token
            ))
        anonymized_text = self.patterns.EMPLOYEE_ID.sub(token, text)
        return anonymized_text, matches
    
    async def _anonymize_salary_data(self, text: str, token: str) -> Tuple[str, List[AnonymizationMatch]]:
        """Anonymize salary information."""
        matches = []
        for match in self.patterns.SALARY_DATA.finditer(text):
            matches.append(AnonymizationMatch(
                type=AnonymizationType.SALARY_DATA,
                start=match.start(),
                end=match.end(),
                original_text=match.group(),
                replacement=token
            ))
        anonymized_text = self.patterns.SALARY_DATA.sub(token, text)
        return anonymized_text, matches
    
    async def _anonymize_bank_accounts(self, text: str, token: str) -> Tuple[str, List[AnonymizationMatch]]:
        """Anonymize bank account numbers."""
        matches = []
        for match in self.patterns.BANK_ACCOUNT.finditer(text):
            matches.append(AnonymizationMatch(
                type=AnonymizationType.BANK_ACCOUNT,
                start=match.start(),
                end=match.end(),
                original_text=match.group(),
                replacement=token
            ))
        anonymized_text = self.patterns.BANK_ACCOUNT.sub(token, text)
        return anonymized_text, matches
    
    async def _anonymize_medical_data(self, text: str, token: str) -> Tuple[str, List[AnonymizationMatch]]:
        """Anonymize medical references."""
        matches = []
        for match in self.patterns.MEDICAL_DATA.finditer(text):
            matches.append(AnonymizationMatch(
                type=AnonymizationType.MEDICAL_DATA,
                start=match.start(),
                end=match.end(),
                original_text=match.group(),
                replacement=token
            ))
        anonymized_text = self.patterns.MEDICAL_DATA.sub(token, text)
        return anonymized_text, matches
    
    async def _anonymize_geolocations(self, text: str, token: str) -> Tuple[str, List[AnonymizationMatch]]:
        """Anonymize GPS coordinates."""
        matches = []
        for match in self.patterns.GEOLOCATION.finditer(text):
            matches.append(AnonymizationMatch(
                type=AnonymizationType.GEOLOCATION,
                start=match.start(),
                end=match.end(),
                original_text=match.group(),
                replacement=token
            ))
        anonymized_text = self.patterns.GEOLOCATION.sub(token, text)
        return anonymized_text, matches
    
    async def _anonymize_grades(self, text: str, token: str) -> Tuple[str, List[AnonymizationMatch]]:
        """Anonymize grades and scores."""
        matches = []
        for match in self.patterns.GRADES.finditer(text):
            matches.append(AnonymizationMatch(
                type=AnonymizationType.GRADES,
                start=match.start(),
                end=match.end(),
                original_text=match.group(),
                replacement=token
            ))
        anonymized_text = self.patterns.GRADES.sub(token, text)
        return anonymized_text, matches
    
    async def _anonymize_legal_cases(self, text: str, token: str) -> Tuple[str, List[AnonymizationMatch]]:
        """Anonymize legal case references."""
        matches = []
        for match in self.patterns.LEGAL_CASE.finditer(text):
            matches.append(AnonymizationMatch(
                type=AnonymizationType.LEGAL_CASE,
                start=match.start(),
                end=match.end(),
                original_text=match.group(),
                replacement=token
            ))
        anonymized_text = self.patterns.LEGAL_CASE.sub(token, text)
        return anonymized_text, matches
    
    async def _anonymize_biometric(self, text: str, token: str) -> Tuple[str, List[AnonymizationMatch]]:
        """Anonymize biometric references."""
        matches = []
        for match in self.patterns.BIOMETRIC.finditer(text):
            matches.append(AnonymizationMatch(
                type=AnonymizationType.BIOMETRIC,
                start=match.start(),
                end=match.end(),
                original_text=match.group(),
                replacement=token
            ))
        anonymized_text = self.patterns.BIOMETRIC.sub(token, text)
        return anonymized_text, matches