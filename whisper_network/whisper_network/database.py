"""
🔐 Database Configuration - PostgreSQL avec SQLAlchemy Async
============================================================
Configuration de la connexion PostgreSQL pour stocker les préférences utilisateur.

⚠️ SÉCURITÉ : 
- Stockage UNIQUEMENT des préférences UI (checkboxes, config)
- JAMAIS de mappings d'anonymisation (restent en Redis)
- JAMAIS de données confidentielles (emails, noms, etc.)
"""

import os
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import text
import logging

logger = logging.getLogger(__name__)

# ============================================
# Configuration Database
# ============================================

# URL de connexion depuis variables d'environnement
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://whisper_user:changeme_in_production@postgres:5432/whisper_network"
)

# Engine SQLAlchemy async
engine = create_async_engine(
    DATABASE_URL,
    echo=False,  # Set to True pour debug SQL
    pool_size=5,  # Nombre de connexions dans le pool
    max_overflow=10,  # Connexions supplémentaires si besoin
    pool_pre_ping=True,  # Vérifier connexion avant utilisation
    pool_recycle=3600,  # Recycler connexions après 1h
)

# Session factory
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

# ============================================
# Base Model
# ============================================

class Base(DeclarativeBase):
    """Base class pour tous les modèles SQLAlchemy"""
    pass

# ============================================
# Dependency Injection pour FastAPI
# ============================================

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency pour obtenir une session database dans FastAPI.
    
    Usage:
        @app.post("/api/preferences/save")
        async def save_prefs(db: AsyncSession = Depends(get_db)):
            ...
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception as e:
            await session.rollback()
            logger.error(f"Database session error: {e}")
            raise
        finally:
            await session.close()

# ============================================
# Lifecycle Management
# ============================================

async def init_db():
    """
    Initialiser la connexion database au démarrage de l'application.
    
    Note: La création des tables est gérée par init.sql
    Cette fonction vérifie juste la connexion.
    """
    try:
        async with engine.begin() as conn:
            # Test de connexion
            await conn.execute(text("SELECT 1"))
        logger.info("✅ PostgreSQL connection established")
    except Exception as e:
        logger.error(f"❌ Failed to connect to PostgreSQL: {e}")
        raise

async def close_db():
    """
    Fermer proprement les connexions database à l'arrêt de l'application.
    """
    try:
        await engine.dispose()
        logger.info("✅ PostgreSQL connections closed")
    except Exception as e:
        logger.error(f"❌ Error closing PostgreSQL connections: {e}")
        raise
