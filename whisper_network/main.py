#!/usr/bin/env python3
"""
Main entry point for the Whisper Network API.
FastAPI application for high-performance text anonymization.

Developed by Sylvain JOLY, NANO by NXO
License: MIT
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
import uvicorn
from datetime import datetime
from whisper_network import AnonymizationEngine, AnonymizationSettings
from whisper_network.fast_anonymizer import FastAnonymizer

# Initialize FastAPI app
app = FastAPI(
    title="Whisper Network API",
    description="High-performance text anonymization API for browser extensions",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS for browser extension
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize anonymization engines
anonymization_engine = AnonymizationEngine()
fast_anonymizer = FastAnonymizer()  # Moteur optimisé pour modèles locaux

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

class SettingsResponse(BaseModel):
    success: bool
    settings: Dict[str, bool]

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
async def anonymize_text(request: AnonymizeRequest):
    """
    Anonymize text based on provided settings using the advanced engine.
    
    - **text**: The text to anonymize
    - **settings**: Dictionary of anonymization options
    """
    try:
        if not request.text:
            raise HTTPException(status_code=400, detail="Text cannot be empty")
        
        # Process anonymization using the advanced engine
        result = await anonymization_engine.anonymize(request.text, request.settings)
        
        if not result.success:
            raise HTTPException(status_code=500, detail=f"Anonymization failed: {'; '.join(result.errors)}")
        
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
        raise HTTPException(status_code=500, detail=f"Anonymization failed: {str(e)}")

@app.post("/anonymize/fast", response_model=AnonymizeResponse)
async def anonymize_text_fast(request: AnonymizeRequest):
    """
    Fast anonymization optimized for local models and low resource environments.
    Uses regex-only patterns for maximum speed.
    
    - **text**: The text to anonymize
    - **settings**: Dictionary of anonymization options
    """
    try:
        if not request.text:
            raise HTTPException(status_code=400, detail="Text cannot be empty")
        
        # Les settings utilisent déjà les valeurs par défaut via Field(default_factory)
        # Pas besoin de fusionner, Pydantic le fait automatiquement
        
        # Créer une nouvelle instance pour chaque requête (cache frais + tokens cohérents)
        anonymizer = FastAnonymizer()
        
        # Process anonymization using the fast engine
        result = await anonymizer.anonymize_fast(request.text, request.settings)
        
        if not result.success:
            raise HTTPException(status_code=500, detail=f"Fast anonymization failed: {'; '.join(result.errors)}")
        
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

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
        log_level="info"
    )