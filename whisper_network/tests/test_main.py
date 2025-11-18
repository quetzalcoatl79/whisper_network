"""
Whisper Network API - Tests unitaires
Développé par Sylvain JOLY, NANO by NXO - Licence MIT
"""

import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_root_endpoint():
    """Test the root endpoint."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "message" in data
    assert "Whisper Network API" in data["message"]


def test_health_endpoint():
    """Test the health check endpoint."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "timestamp" in data


def test_get_settings():
    """Test getting default anonymization settings."""
    response = client.get("/settings")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "settings" in data
    assert "anonymize_ip" in data["settings"]


def test_anonymize_text_basic():
    """Test basic text anonymization."""
    payload = {
        "text": "Mon email est test@example.com",
        "settings": {
            "anonymize_email": True,
            "anonymize_ip": False,
            "anonymize_phone": False
        }
    }
    
    response = client.post("/anonymize", json=payload)
    assert response.status_code == 200
    data = response.json()
    
    assert data["success"] is True
    assert data["original_text"] == "Mon email est test@example.com"
    assert "***EMAIL***" in data["anonymized_text"]
    assert data["anonymizations_count"] >= 1


def test_anonymize_ip_addresses():
    """Test IP address anonymization."""
    payload = {
        "text": "Le serveur est sur 192.168.1.1 et 10.0.0.1",
        "settings": {
            "anonymize_ip": True,
            "anonymize_email": False
        }
    }
    
    response = client.post("/anonymize", json=payload)
    assert response.status_code == 200
    data = response.json()
    
    assert data["success"] is True
    assert "***IP***" in data["anonymized_text"]
    assert data["anonymizations_count"] == 2


def test_anonymize_phone_numbers():
    """Test phone number anonymization."""
    payload = {
        "text": "Appelez moi au 01.23.45.67.89 ou +33123456789",
        "settings": {
            "anonymize_phone": True,
            "anonymize_ip": False,
            "anonymize_email": False
        }
    }
    
    response = client.post("/anonymize", json=payload)
    assert response.status_code == 200
    data = response.json()
    
    assert data["success"] is True
    assert "***PHONE***" in data["anonymized_text"]


def test_empty_text():
    """Test handling of empty text."""
    payload = {
        "text": "",
        "settings": {"anonymize_email": True}
    }
    
    response = client.post("/anonymize", json=payload)
    assert response.status_code == 400


def test_multiple_anonymization_types():
    """Test multiple anonymization types together."""
    payload = {
        "text": "Contact Jean Dupont sur jean@test.com, IP: 192.168.1.1, Tel: 0123456789",
        "settings": {
            "anonymize_email": True,
            "anonymize_ip": True,
            "anonymize_phone": True,
            "anonymize_names": True
        }
    }
    
    response = client.post("/anonymize", json=payload)
    assert response.status_code == 200
    data = response.json()
    
    assert data["success"] is True
    anonymized = data["anonymized_text"]
    assert "***EMAIL***" in anonymized
    assert "***IP***" in anonymized
    assert "***PHONE***" in anonymized or "0123456789" not in anonymized


def test_no_anonymization_needed():
    """Test text that doesn't need anonymization."""
    payload = {
        "text": "Hello world, this is a simple text without sensitive data",
        "settings": {
            "anonymize_email": True,
            "anonymize_ip": True,
            "anonymize_phone": True
        }
    }
    
    response = client.post("/anonymize", json=payload)
    assert response.status_code == 200
    data = response.json()
    
    assert data["success"] is True
    assert data["anonymizations_count"] == 0
    assert data["original_text"] == data["anonymized_text"]


def test_response_time_tracking():
    """Test that response time is tracked."""
    payload = {
        "text": "Test with email@test.com",
        "settings": {"anonymize_email": True}
    }
    
    response = client.post("/anonymize", json=payload)
    assert response.status_code == 200
    data = response.json()
    
    assert "processing_time_ms" in data
    assert isinstance(data["processing_time_ms"], float)
    assert data["processing_time_ms"] >= 0