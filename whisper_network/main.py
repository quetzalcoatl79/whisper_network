#!/usr/bin/env python3
"""
Main entry point for the Whisper Network API.
FastAPI application for high-performance text anonymization.

Developed by Sylvain JOLY, NANO by NXO
License: MIT
"""

from fastapi import FastAPI, HTTPException, Security, Request, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import APIKeyHeader
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
import uvicorn
from datetime import datetime
import os
import logging
import io
from dotenv import load_dotenv
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from whisper_network import AnonymizationEngine, AnonymizationSettings
from whisper_network.fast_anonymizer import FastAnonymizer
from whisper_network.file_handler import FileHandler

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
    if API_KEY and api_key != API_KEY:
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

# Request/Response models
def get_default_anonymization_settings():
    """Retourne les settings par défaut pour l'anonymisation."""
    return {
        "anonymize_ip": True,
        "anonymize_email": True,
        "anonymize_phone": True,
        "anonymize_names": True,
        "anonymize_address": True,
        "anonymize_urls": True,
        "anonymize_credit_cards": True,
        "anonymize_iban": True,
        "anonymize_nir": True
    }

class AnonymizeRequest(BaseModel):
    text: str
    settings: Dict[str, bool] = Field(default_factory=get_default_anonymization_settings)

class AnonymizeResponse(BaseModel):
    success: bool
    original_text: str
    anonymized_text: str
    anonymizations_count: int
    processing_time_ms: float
    mapping_summary: Optional[Dict[str, Dict[str, str]]] = None

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
        
        logger.info(f"Anonymization successful: {result.anonymizations_count} replacements")
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