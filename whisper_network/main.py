#!/usr/bin/env python3
"""
Main entry point for the Whisper Network API.
FastAPI application for high-performance text anonymization.

Developed by Sylvain JOLY, NANO by NXO
License: MIT
"""

from fastapi import FastAPI, HTTPException, Security, Request, UploadFile, File, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import APIKeyHeader
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field, validator
from typing import Optional, Dict, Any
import uvicorn
from datetime import datetime
import os
import logging
import io
import uuid
from dotenv import load_dotenv
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from whisper_network import AnonymizationEngine, AnonymizationSettings
from whisper_network.fast_anonymizer import FastAnonymizer
from whisper_network.file_handler import FileHandler
from whisper_network.session_manager import get_session_manager
from whisper_network.cache_manager import get_cache
from whisper_network.database import get_db, init_db, close_db
from whisper_network.models import UserPreferences

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=getattr(logging, os.getenv("LOG_LEVEL", "INFO")),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Security configuration
API_KEY = os.getenv("API_KEY")
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*").split(",")
RATE_LIMIT_ENABLED = os.getenv("RATE_LIMIT_ENABLED", "true").lower() == "true"
RATE_LIMIT_PER_MINUTE = os.getenv("RATE_LIMIT_PER_MINUTE", "10")

# API Key security
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)

async def verify_api_key(api_key: str = Security(api_key_header)):
    """Verify API key if configured."""
    # Skip verification if API_KEY is empty or None (development mode)
    if not API_KEY or API_KEY.strip() == "":
        logger.debug("API Key verification disabled (development mode)")
        return None
    
    if api_key != API_KEY:
        logger.warning(f"Unauthorized access attempt with invalid API key")
        raise HTTPException(status_code=403, detail="Invalid API key")
    return api_key

# Rate limiting
limiter = Limiter(key_func=get_remote_address)
limiter_decorator = limiter.limit(f"{RATE_LIMIT_PER_MINUTE}/minute") if RATE_LIMIT_ENABLED else lambda x: x

# Initialize FastAPI app
app = FastAPI(
    title="Whisper Network API",
    description="High-performance text anonymization API for browser extensions",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Add rate limiter to app state
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Configure CORS with environment variables
logger.info(f"Configuring CORS with origins: {CORS_ORIGINS}")
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize anonymization engines
anonymization_engine = AnonymizationEngine()
fast_anonymizer = FastAnonymizer()  # Moteur optimisé pour modèles locaux
file_handler = FileHandler()  # Gestionnaire de fichiers

# Lifecycle events
@app.on_event("startup")
async def startup_event():
    """Initialize database connection on startup."""
    logger.info("🚀 Starting Whisper Network API...")
    await init_db()
    logger.info("✅ Database initialized")

@app.on_event("shutdown")
async def shutdown_event():
    """Close database connection on shutdown."""
    logger.info("🛑 Shutting down Whisper Network API...")
    await close_db()
    logger.info("✅ Database connections closed")

# Request/Response models
def get_default_anonymization_settings():
    """Retourne les settings par défaut pour l'anonymisation."""
    return {
        "anonymize_ip": True,
        "anonymize_email": True,
        "anonymize_phone": True,
        "anonymize_names": True,
        "anonymize_addresses": True,
        "anonymize_address": True,  # backward compatibility with older clients
        "anonymize_urls": True,
        "anonymize_credit_cards": True,
        "anonymize_iban": True,
        "anonymize_nir": True
    }

class AnonymizeRequest(BaseModel):
    text: str
    settings: Dict[str, bool] = Field(default_factory=get_default_anonymization_settings)
    session_id: Optional[str] = Field(None, description="Optional session ID for mapping persistence")
    ttl: int = Field(3600, ge=60, le=86400, description="Cache TTL in seconds (1h default, max 24h)")
    preserve_mapping: bool = Field(True, description="Store mappings for de-anonymization")

class AnonymizeResponse(BaseModel):
    success: bool
    original_text: str
    anonymized_text: str
    anonymizations_count: int
    processing_time_ms: float
    mapping_summary: Optional[Dict[str, Dict[str, str]]] = None
    session_id: Optional[str] = Field(None, description="Session ID if mapping preserved")

class DeanonymizeRequest(BaseModel):
    text: str
    session_id: str = Field(..., description="Session ID containing mappings")

class DeanonymizeResponse(BaseModel):
    success: bool
    original_text: str
    deanonymized_text: str
    replacements_count: int
    processing_time_ms: float
    session_id: str

class FileAnonymizeResponse(BaseModel):
    success: bool
    original_filename: str
    anonymized_filename: str
    file_size_bytes: int
    file_type: str
    anonymizations_count: int
    processing_time_ms: float
    mapping_summary: Optional[Dict[str, Dict[str, str]]] = None

class SettingsResponse(BaseModel):
    success: bool
    settings: Dict[str, bool]

class FileInfoResponse(BaseModel):
    supported_extensions: Dict[str, list]
    max_file_size: Dict[str, float]

# Anonymization processing using the advanced engine
async def process_anonymization_legacy(text: str, settings: Dict[str, bool]) -> tuple[str, int]:
    """Legacy wrapper for the new anonymization engine."""
    result = await anonymization_engine.anonymize(text, settings)
    return result.anonymized_text, result.anonymizations_count

# API Routes
@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "message": "Whisper Network API - Text Anonymization Service",
        "version": "1.0.0",
        "author": "Sylvain JOLY, NANO by NXO",
        "license": "MIT",
        "docs": "/docs",
        "health": "/health"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "service": "whisper-network-api"
    }

@app.post("/anonymize", response_model=AnonymizeResponse)
@limiter_decorator
async def anonymize_text(request: Request, body: AnonymizeRequest, api_key: str = Security(verify_api_key)):
    """
    Anonymize text based on provided settings using the advanced engine.
    
    - **text**: The text to anonymize
    - **settings**: Dictionary of anonymization options
    
    Requires: X-API-Key header (if API_KEY is configured)
    Rate limited: As per RATE_LIMIT_PER_MINUTE environment variable
    """
    try:
        logger.info(f"Anonymization request from {get_remote_address(request)}")
        
        if not body.text:
            raise HTTPException(status_code=400, detail="Text cannot be empty")
        
        # Process anonymization using the advanced engine
        result = await anonymization_engine.anonymize(body.text, body.settings)
        
        if not result.success:
            logger.error(f"Anonymization failed: {'; '.join(result.errors)}")
            raise HTTPException(status_code=500, detail=f"Anonymization failed: {'; '.join(result.errors)}")
        
        session_id = None
        
        # Store mappings if requested
        if body.preserve_mapping and result.mapping_summary:
            session_manager = get_session_manager()
            
            # Use provided session_id or create new one
            if body.session_id:
                session_id = body.session_id
            else:
                session_id = session_manager.create_session(ttl=body.ttl)
            
            # Store mappings
            session_manager.store_mappings(
                session_id=session_id,
                mappings=result.mapping_summary,
                ttl=body.ttl
            )
            logger.info(f"Stored mappings for session: {session_id}")
        
        logger.info(f"Anonymization successful: {result.anonymizations_count} replacements")
        return AnonymizeResponse(
            success=result.success,
            original_text=result.original_text,
            anonymized_text=result.anonymized_text,
            anonymizations_count=result.anonymizations_count,
            processing_time_ms=result.processing_time_ms,
            mapping_summary=result.mapping_summary,
            session_id=session_id
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Unexpected error during anonymization")
        raise HTTPException(status_code=500, detail=f"Anonymization failed: {str(e)}")

@app.post("/anonymize/fast", response_model=AnonymizeResponse)
@limiter_decorator
async def anonymize_text_fast(request: Request, body: AnonymizeRequest, api_key: str = Security(verify_api_key)):
    """
    Fast anonymization optimized for local models and low resource environments.
    Uses regex-only patterns for maximum speed.
    
    - **text**: The text to anonymize
    - **settings**: Dictionary of anonymization options
    
    Requires: X-API-Key header (if API_KEY is configured)
    Rate limited: As per RATE_LIMIT_PER_MINUTE environment variable
    """
    try:
        logger.info(f"Fast anonymization request from {get_remote_address(request)}")
        
        if not body.text:
            raise HTTPException(status_code=400, detail="Text cannot be empty")
        
        # Les settings utilisent déjà les valeurs par défaut via Field(default_factory)
        # Pas besoin de fusionner, Pydantic le fait automatiquement
        
        # Créer une nouvelle instance pour chaque requête (cache frais + tokens cohérents)
        anonymizer = FastAnonymizer()
        
        # Process anonymization using the fast engine
        result = await anonymizer.anonymize_fast(body.text, body.settings)
        
        if not result.success:
            logger.error(f"Fast anonymization failed: {'; '.join(result.errors)}")
            raise HTTPException(status_code=500, detail=f"Fast anonymization failed: {'; '.join(result.errors)}")
        
        logger.info(f"Fast anonymization successful: {result.anonymizations_count} replacements")
        return AnonymizeResponse(
            success=result.success,
            original_text=result.original_text,
            anonymized_text=result.anonymized_text,
            anonymizations_count=result.anonymizations_count,
            processing_time_ms=result.processing_time_ms,
            mapping_summary=result.mapping_summary
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Unexpected error during fast anonymization")
        raise HTTPException(status_code=500, detail=f"Fast anonymization failed: {str(e)}")

@app.get("/settings", response_model=SettingsResponse)
async def get_default_settings():
    """Get default anonymization settings."""
    settings = AnonymizationSettings()
    default_settings = {
        "anonymize_ip": settings.anonymize_ip,
        "anonymize_email": settings.anonymize_email,
        "anonymize_phone": settings.anonymize_phone,
        "anonymize_nir": settings.anonymize_nir,
        "anonymize_names": settings.anonymize_names,
        "anonymize_address": settings.anonymize_address,
        "anonymize_urls": settings.anonymize_urls,
        "anonymize_credit_cards": settings.anonymize_credit_cards,
        "anonymize_iban": settings.anonymize_iban
    }
    
    return SettingsResponse(
        success=True,
        settings=default_settings
    )

@app.get("/file/info", response_model=FileInfoResponse)
async def get_file_info():
    """Get information about supported file types and size limits."""
    return FileInfoResponse(
        supported_extensions=file_handler.get_supported_extensions(),
        max_file_size=file_handler.get_file_size_limit()
    )

@app.post("/anonymize-file")
@limiter_decorator
async def anonymize_file(
    request: Request,
    file: UploadFile = File(...),
    use_fast: bool = False,
    api_key: str = Security(verify_api_key)
):
    """
    Anonymize a text file while preserving its format.
    
    Supports:
    - Text files: .txt, .md, .log
    - Config files: .conf, .ini, .yaml, .json, .toml, .env
    - Scripts: .sh, .py, .js, etc.
    
    Args:
        file: Uploaded file (multipart/form-data)
        use_fast: Use fast anonymizer (default: False)
    
    Returns:
        Anonymized file as download with original format preserved
    
    Requires: X-API-Key header (if API_KEY is configured)
    Rate limited: As per RATE_LIMIT_PER_MINUTE environment variable
    """
    try:
        logger.info(f"File anonymization request from {get_remote_address(request)}: {file.filename}")
        
        if not file.filename:
            raise HTTPException(status_code=400, detail="No filename provided")
        
        # Read file bytes
        file_bytes = await file.read()
        
        # Parse file
        file_info = await file_handler.parse_file(file.filename, file_bytes)
        logger.info(f"File parsed: {file_info.filename} ({file_info.file_type.value}, {file_info.size_bytes} bytes)")
        
        # Get default settings
        settings = get_default_anonymization_settings()
        
        # Anonymize content using appropriate engine
        if use_fast:
            anonymizer = FastAnonymizer()
            result = await anonymizer.anonymize_fast(file_info.content, settings)
        else:
            result = await anonymization_engine.anonymize(file_info.content, settings)
        
        if not result.success:
            logger.error(f"File anonymization failed: {'; '.join(result.errors)}")
            raise HTTPException(
                status_code=500,
                detail=f"Anonymization failed: {'; '.join(result.errors)}"
            )
        
        # Export anonymized file
        new_filename, anonymized_bytes = await file_handler.export_file(
            file_info.filename,
            result.anonymized_text,
            file_info.encoding
        )
        
        logger.info(f"File anonymization successful: {new_filename} ({result.anonymizations_count} replacements)")
        
        # Return file as download
        return StreamingResponse(
            io.BytesIO(anonymized_bytes),
            media_type="application/octet-stream",
            headers={
                "Content-Disposition": f'attachment; filename="{new_filename}"',
                "X-Anonymizations-Count": str(result.anonymizations_count),
                "X-Processing-Time-Ms": str(result.processing_time_ms),
                "X-Original-Filename": file_info.filename,
                "X-File-Type": file_info.file_type.value
            }
        )
    
    except HTTPException:
        raise
    except ValueError as e:
        # Validation errors from file_handler
        logger.warning(f"File validation error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception("Unexpected error during file anonymization")
        raise HTTPException(status_code=500, detail=f"File anonymization failed: {str(e)}")

# ============================================================================
# SESSION & DE-ANONYMIZATION ENDPOINTS
# ============================================================================

@app.post("/deanonymize", response_model=DeanonymizeResponse)
@limiter_decorator
async def deanonymize_text(request: Request, body: DeanonymizeRequest, api_key: str = Security(verify_api_key)):
    """
    De-anonymize text using stored session mappings.
    Replaces ***XXX_N*** tokens with original values.
    
    - **text**: Text containing anonymized tokens
    - **session_id**: Session ID with stored mappings
    
    Requires: X-API-Key header (if API_KEY is configured)
    Rate limited: As per RATE_LIMIT_PER_MINUTE environment variable
    """
    import time
    start_time = time.time()
    
    try:
        logger.info(f"De-anonymization request from {get_remote_address(request)} for session: {body.session_id}")
        
        if not body.text:
            raise HTTPException(status_code=400, detail="Text cannot be empty")
        
        session_manager = get_session_manager()
        
        # Check if session exists
        if not session_manager.session_exists(body.session_id):
            raise HTTPException(status_code=404, detail=f"Session not found: {body.session_id}")
        
        # De-anonymize
        deanonymized = session_manager.deanonymize_text(body.session_id, body.text)
        
        if deanonymized is None:
            raise HTTPException(status_code=404, detail=f"No mappings found for session: {body.session_id}")
        
        # Count replacements
        replacements = body.text.count("***") // 2  # Rough estimate
        
        processing_time = (time.time() - start_time) * 1000
        
        logger.info(f"De-anonymization successful: {replacements} replacements")
        return DeanonymizeResponse(
            success=True,
            original_text=body.text,
            deanonymized_text=deanonymized,
            replacements_count=replacements,
            processing_time_ms=processing_time,
            session_id=body.session_id
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Unexpected error during de-anonymization")
        raise HTTPException(status_code=500, detail=f"De-anonymization failed: {str(e)}")

@app.get("/session/{session_id}/mappings")
@limiter_decorator
async def get_session_mappings(request: Request, session_id: str, api_key: str = Security(verify_api_key)):
    """
    Get all mappings for a session.
    Useful for debugging or displaying mapping table in extension.
    
    - **session_id**: Session identifier
    
    Returns: {entity_type: {original: anonymized}}
    """
    try:
        session_manager = get_session_manager()
        
        if not session_manager.session_exists(session_id):
            raise HTTPException(status_code=404, detail=f"Session not found: {session_id}")
        
        mappings = session_manager.get_mappings(session_id)
        stats = session_manager.get_session_stats(session_id)
        
        return {
            "success": True,
            "session_id": session_id,
            "mappings": mappings,
            "stats": stats
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error retrieving session mappings")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/session/{session_id}")
@limiter_decorator
async def delete_session(request: Request, session_id: str, api_key: str = Security(verify_api_key)):
    """
    Delete a session and all its mappings.
    
    - **session_id**: Session identifier
    """
    try:
        session_manager = get_session_manager()
        
        if not session_manager.session_exists(session_id):
            raise HTTPException(status_code=404, detail=f"Session not found: {session_id}")
        
        session_manager.delete_session(session_id)
        
        return {
            "success": True,
            "message": f"Session deleted: {session_id}"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error deleting session")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/cache/stats")
async def get_cache_stats(api_key: str = Security(verify_api_key)):
    """Get cache statistics (Redis or in-memory)."""
    try:
        cache = get_cache()
        return cache.get_stats()
    except Exception as e:
        logger.exception("Error getting cache stats")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# 🔐 User Preferences Endpoints (PostgreSQL)
# ============================================
# ⚠️ SÉCURITÉ : Stockage UNIQUEMENT des préférences UI
# ❌ JAMAIS de mappings d'anonymisation (restent en Redis)
# ============================================

class PreferencesSaveRequest(BaseModel):
    """Request model pour sauvegarder les préférences."""
    uuid: str = Field(..., description="UUID utilisateur (généré par extension)")
    preferences: Dict[str, Any] = Field(..., description="Préférences UI (checkboxes, langue, thème)")
    
    @validator('uuid')
    def validate_uuid(cls, v):
        """Valider le format UUID."""
        try:
            uuid.UUID(v)
            return v
        except ValueError:
            raise ValueError("Invalid UUID format")
    
    @validator('preferences')
    def validate_preferences(cls, v):
        """Valider que les préférences ne contiennent pas de données sensibles."""
        if not UserPreferences.validate_preferences(v):
            raise ValueError(
                "Invalid preferences: only UI settings allowed (anonymize_*, language, theme, etc.). "
                "Forbidden: emails, names, mappings, personal data."
            )
        return v

class PreferencesLoadRequest(BaseModel):
    """Request model pour charger les préférences."""
    uuid: str = Field(..., description="UUID utilisateur")
    
    @validator('uuid')
    def validate_uuid(cls, v):
        try:
            uuid.UUID(v)
            return v
        except ValueError:
            raise ValueError("Invalid UUID format")

class PreferencesResponse(BaseModel):
    """Response model pour les préférences."""
    success: bool
    uuid: str
    preferences: Dict[str, Any]
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

@app.post("/api/preferences/save")
@limiter_decorator
async def save_preferences(
    request: Request,
    request_data: PreferencesSaveRequest,
    db: AsyncSession = Depends(get_db),
    api_key: str = Security(verify_api_key)
):
    """
    💾 Sauvegarder les préférences utilisateur (UPSERT).
    
    ⚠️ SÉCURITÉ :
    - Stocke UNIQUEMENT les préférences UI (checkboxes, config)
    - JAMAIS de mappings d'anonymisation (restent en Redis)
    - JAMAIS de données confidentielles (emails, noms, etc.)
    
    Args:
        request: FastAPI Request (required for rate limiter)
        request_data: UUID + preferences dict
        db: Database session (auto-injected)
    
    Returns:
        Success status + saved preferences
    """
    start_time = datetime.now()
    
    try:
        user_uuid = uuid.UUID(request_data.uuid)
        
        # UPSERT: Insert or Update if exists
        stmt = insert(UserPreferences).values(
            uuid=user_uuid,
            preferences=request_data.preferences
        ).on_conflict_do_update(
            index_elements=["uuid"],
            set_={
                "preferences": request_data.preferences,
                "updated_at": datetime.now()
            }
        ).returning(UserPreferences)
        
        result = await db.execute(stmt)
        await db.commit()
        
        saved_prefs = result.scalar_one()
        
        processing_time = (datetime.now() - start_time).total_seconds() * 1000
        logger.info(f"✅ Preferences saved for UUID {user_uuid} in {processing_time:.2f}ms")
        
        return PreferencesResponse(
            success=True,
            uuid=str(saved_prefs.uuid),
            preferences=saved_prefs.preferences,
            created_at=saved_prefs.created_at.isoformat() if saved_prefs.created_at else None,
            updated_at=saved_prefs.updated_at.isoformat() if saved_prefs.updated_at else None
        )
        
    except ValueError as e:
        logger.warning(f"⚠️ Invalid UUID: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception(f"❌ Error saving preferences: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail="Failed to save preferences")

@app.post("/api/preferences/load")
@limiter_decorator
async def load_preferences(
    request: Request,
    request_data: PreferencesLoadRequest,
    db: AsyncSession = Depends(get_db),
    api_key: str = Security(verify_api_key)
):
    """
    📥 Charger les préférences utilisateur.
    
    Args:
        request: FastAPI Request (required for rate limiter)
        request_data: UUID utilisateur
        db: Database session (auto-injected)
    
    Returns:
        Preferences dict ou {} si non trouvé
    """
    start_time = datetime.now()
    
    try:
        user_uuid = uuid.UUID(request_data.uuid)
        
        # SELECT by UUID
        result = await db.get(UserPreferences, user_uuid)
        
        processing_time = (datetime.now() - start_time).total_seconds() * 1000
        
        if result:
            logger.info(f"✅ Preferences loaded for UUID {user_uuid} in {processing_time:.2f}ms")
            return PreferencesResponse(
                success=True,
                uuid=str(result.uuid),
                preferences=result.preferences,
                created_at=result.created_at.isoformat() if result.created_at else None,
                updated_at=result.updated_at.isoformat() if result.updated_at else None
            )
        else:
            logger.info(f"⚠️ No preferences found for UUID {user_uuid}, returning defaults")
            return PreferencesResponse(
                success=True,
                uuid=str(user_uuid),
                preferences={},  # Retourner objet vide si pas trouvé
                created_at=None,
                updated_at=None
            )
        
    except ValueError as e:
        logger.warning(f"⚠️ Invalid UUID: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception(f"❌ Error loading preferences: {e}")
        raise HTTPException(status_code=500, detail="Failed to load preferences")

@app.delete("/api/preferences/{user_uuid}")
@limiter_decorator
async def delete_preferences(
    request: Request,
    user_uuid: str,
    db: AsyncSession = Depends(get_db),
    api_key: str = Security(verify_api_key)
):
    """
    🗑️ Supprimer les préférences utilisateur (RGPD - droit à l'oubli).
    
    Args:
        request: FastAPI Request (required for rate limiter)
        user_uuid: UUID utilisateur
        db: Database session (auto-injected)
    
    Returns:
        Success status
    """
    try:
        user_id = uuid.UUID(user_uuid)
        
        result = await db.get(UserPreferences, user_id)
        if result:
            await db.delete(result)
            await db.commit()
            logger.info(f"✅ Preferences deleted for UUID {user_id}")
            return {"success": True, "message": "Preferences deleted"}
        else:
            logger.warning(f"⚠️ No preferences found for UUID {user_id}")
            raise HTTPException(status_code=404, detail="Preferences not found")
        
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid UUID format")
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"❌ Error deleting preferences: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail="Failed to delete preferences")

if __name__ == "__main__":
    # Load configuration from environment
    host = os.getenv("API_HOST", "127.0.0.1")
    port = int(os.getenv("API_PORT", "8000"))
    
    logger.info(f"Starting Whisper Network API on {host}:{port}")
    if API_KEY:
        logger.info("API Key authentication enabled")
    else:
        logger.warning("API Key authentication disabled - consider setting API_KEY in .env")
    
    if RATE_LIMIT_ENABLED:
        logger.info(f"Rate limiting enabled: {RATE_LIMIT_PER_MINUTE} requests/minute")
    else:
        logger.warning("Rate limiting disabled")
    
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=True,
        log_level="info"
    )