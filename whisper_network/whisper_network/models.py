"""
📊 Database Models - SQLAlchemy ORM
====================================
Modèles de données pour PostgreSQL.

⚠️ SÉCURITÉ : 
- user_preferences = Préférences UI UNIQUEMENT (checkboxes, config)
- PAS de mappings d'anonymisation (restent en Redis avec TTL)
- PAS de données confidentielles (emails, noms, IPs, etc.)
"""

from sqlalchemy import Column, String, DateTime, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from datetime import datetime
from typing import Dict, Any
import uuid

from .database import Base

# ============================================
# Model: UserPreferences
# ============================================

class UserPreferences(Base):
    """
    Stockage des préférences utilisateur (UI uniquement).
    
    Exemples de préférences valides:
    {
        "anonymize_email": true,
        "anonymize_phone": true,
        "anonymize_iban": true,
        "anonymize_ip": true,
        "anonymize_name": true,
        "anonymize_address": true,
        "anonymize_vin": true,
        "anonymize_siret": true,
        "anonymize_secu": true,
        "anonymize_matricule": true,
        "anonymize_salaire": true,
        "anonymize_evaluation": true,
        "anonymize_planning": true,
        "language": "fr",
        "theme": "dark"
    }
    
    ⚠️ INTERDIT de stocker:
    - Mappings d'anonymisation (john.doe@example.com → ***EMAIL_1***)
    - Données personnelles (noms, emails, téléphones, IPs)
    - Textes anonymisés
    - Sessions ou tokens
    """
    
    __tablename__ = "user_preferences"
    
    # Primary Key: UUID généré par l'extension
    uuid = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        comment="Identifiant anonyme généré par l'extension"
    )
    
    # Préférences (JSON flexible)
    preferences = Column(
        JSONB,
        nullable=False,
        default=dict,
        comment="Préférences UI (checkboxes, langue, thème, etc.)"
    )
    
    # Timestamps
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        comment="Date de création"
    )
    
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
        comment="Dernière modification"
    )
    
    def __repr__(self) -> str:
        return f"<UserPreferences(uuid={self.uuid}, updated_at={self.updated_at})>"
    
    def to_dict(self) -> Dict[str, Any]:
        """Convertir en dictionnaire pour JSON response"""
        return {
            "uuid": str(self.uuid),
            "preferences": self.preferences,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
    
    @staticmethod
    def validate_preferences(prefs: Dict[str, Any]) -> bool:
        """
        Valider que les préférences ne contiennent pas de données sensibles.
        
        Returns:
            bool: True si valide, False sinon
        """
        # Liste blanche des clés autorisées
        allowed_keys = {
            # === Données personnelles ===
            "anonymize_names", "anonymize_addresses", "anonymize_phone",
            "anonymize_email", "anonymize_birth_dates", "anonymize_nir",
            "anonymize_id_cards", "anonymize_passports", "anonymize_ip",
            "anonymize_logins",
            
            # === Données professionnelles ===
            "anonymize_employee_ids", "anonymize_performance_data",
            "anonymize_salary_data", "anonymize_schedules", "anonymize_internal_comm",
            
            # === Données sensibles spécifiques ===
            "anonymize_medical_data", "anonymize_bank_accounts",
            "anonymize_credit_cards", "anonymize_iban", "anonymize_transactions",
            "anonymize_grades", "anonymize_legal_cases",
            
            # === Données contextuelles ===
            "anonymize_locations", "anonymize_geolocations",
            "anonymize_access_badges", "anonymize_photo_references",
            "anonymize_biometric", "anonymize_urls",
            
            # === Anciens noms (compatibilité) ===
            "anonymize_address", "anonymize_matricule", "anonymize_salaire",
            "anonymize_evaluation", "anonymize_planning",
            
            # === UI preferences ===
            "language", "theme", "auto_anonymize", "show_preview",
            "enabled", "notification_sound", "badge_counter",
            "apiUrl", "apiKey", "processingMode",
            "showPreview", "autoAnonymize", "autoDeanonymize", "preserveMapping"
        }
        
        # Vérifier que toutes les clés sont autorisées
        for key in prefs.keys():
            if key not in allowed_keys:
                return False
        
        # Vérifier les types de valeurs (pas d'objets complexes)
        for value in prefs.values():
            if not isinstance(value, (bool, str, int, float, type(None))):
                return False
        
        return True

# ============================================
# Exemple d'utilisation (pour référence)
# ============================================
"""
# Créer/Mettre à jour des préférences
async with AsyncSessionLocal() as session:
    user_uuid = uuid.UUID("550e8400-e29b-41d4-a716-446655440000")
    
    # Upsert (INSERT or UPDATE)
    stmt = insert(UserPreferences).values(
        uuid=user_uuid,
        preferences={"anonymize_email": True, "language": "fr"}
    ).on_conflict_do_update(
        index_elements=["uuid"],
        set_={"preferences": {"anonymize_email": True, "language": "fr"}}
    )
    
    await session.execute(stmt)
    await session.commit()

# Récupérer des préférences
async with AsyncSessionLocal() as session:
    result = await session.get(UserPreferences, user_uuid)
    if result:
        print(result.preferences)  # {'anonymize_email': True, ...}
"""
