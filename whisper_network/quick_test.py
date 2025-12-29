#!/usr/bin/env python3
"""Quick API test after rebuild"""
import requests

API_URL = "http://localhost:8001"
API_KEY = "dev_test_key_12345"
HEADERS = {"X-API-Key": API_KEY}

def test_french():
    """Test French anonymization"""
    print("🇫🇷 Test français...")
    response = requests.post(
        f"{API_URL}/anonymize",
        json={"text": "Jean Dupont habite à Paris. Tel: 06 12 34 56 78"},
        headers=HEADERS
    )
    print(f"Status: {response.status_code}")
    print(f"Result: {response.json()}\n")

def test_english():
    """Test English anonymization"""
    print("🇬🇧 Test anglais...")
    response = requests.post(
        f"{API_URL}/anonymize",
        json={"text": "John Smith lives in London. Phone: +44 20 1234 5678"},
        headers=HEADERS
    )
    print(f"Status: {response.status_code}")
    print(f"Result: {response.json()}\n")

def test_health():
    """Test health endpoint"""
    print("Test health endpoint...")
    response = requests.get(f"{API_URL}/health")
    print(f"Status: {response.status_code}")
    print(f"Result: {response.json()}\n")

if __name__ == "__main__":
    test_health()
    test_french()
    test_english()
    print("Tests terminés !")
