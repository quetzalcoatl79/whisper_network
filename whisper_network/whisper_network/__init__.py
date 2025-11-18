"""
Whisper Network - Advanced Text Anonymization Package
Developed by Sylvain JOLY, NANO by NXO
"""

__version__ = "1.0.0"
__author__ = "Sylvain JOLY, NANO by NXO"
__email__ = "sylvain.joly@whisper-network.com"
__license__ = "MIT"

from .anonymizers import (
    AnonymizationEngine,
    AnonymizationSettings,
    AnonymizationResult
)

__all__ = [
    "AnonymizationEngine",
    "AnonymizationSettings", 
    "AnonymizationResult"
]