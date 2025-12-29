#!/usr/bin/env python3
"""
Test Redis Cache & Session Management Integration
"""
import requests
import json

API_URL = "http://localhost:8001"
API_KEY = "dev_test_key_12345"
HEADERS = {"X-API-Key": API_KEY}


def test_anonymize_with_session():
    """Test anonymization with session persistence"""
    print("\n🔒 Test 1: Anonymisation avec session...")
    
    response = requests.post(
        f"{API_URL}/anonymize",
        json={
            "text": "Jean Dupont habite à Paris. Email: jean@test.fr, Tel: 06 12 34 56 78",
            "preserve_mapping": True,
            "ttl": 7200  # 2h
        },
        headers=HEADERS
    )
    
    print(f"Status: {response.status_code}")
    result = response.json()
    
    if response.status_code == 200:
        print(f"✓ Session ID: {result.get('session_id')}")
        print(f"✓ Texte anonymisé: {result['anonymized_text']}")
        print(f"✓ Anonymisations: {result['anonymizations_count']}")
        return result.get('session_id')
    else:
        print(f"✗ Erreur: {result}")
        return None


def test_get_session_mappings(session_id):
    """Test retrieving session mappings"""
    print(f"\n📋 Test 2: Récupération mappings session {session_id}...")
    
    response = requests.get(
        f"{API_URL}/session/{session_id}/mappings",
        headers=HEADERS
    )
    
    print(f"Status: {response.status_code}")
    result = response.json()
    
    if response.status_code == 200:
        print(f"✓ Mappings récupérés:")
        print(json.dumps(result['mappings'], indent=2, ensure_ascii=False))
        print(f"✓ Stats: {result['stats']}")
    else:
        print(f"✗ Erreur: {result}")


def test_deanonymize(session_id):
    """Test de-anonymization with session"""
    print(f"\n🔓 Test 3: Dé-anonymisation avec session {session_id}...")
    
    # Simulate ChatGPT response containing anonymized tokens
    chatgpt_response = "Bonjour ***NAME_1***, votre email ***EMAIL_1*** est bien enregistré. Nous vous contacterons au ***PHONE_1***."
    
    response = requests.post(
        f"{API_URL}/deanonymize",
        json={
            "text": chatgpt_response,
            "session_id": session_id
        },
        headers=HEADERS
    )
    
    print(f"Status: {response.status_code}")
    result = response.json()
    
    if response.status_code == 200:
        print(f"✓ Texte original (anonymisé): {result['original_text']}")
        print(f"✓ Texte dé-anonymisé: {result['deanonymized_text']}")
        print(f"✓ Remplacements: {result['replacements_count']}")
    else:
        print(f"✗ Erreur: {result}")


def test_multi_request_same_session():
    """Test multiple requests with same session ID"""
    print("\n🔄 Test 4: Multiples requêtes même session...")
    
    session_id = "test_session_123"
    
    # First request
    r1 = requests.post(
        f"{API_URL}/anonymize",
        json={
            "text": "Marie Curie travaille à Lyon",
            "session_id": session_id,
            "preserve_mapping": True
        },
        headers=HEADERS
    )
    
    print(f"Requête 1: {r1.status_code}")
    print(f"  → {r1.json()['anonymized_text']}")
    
    # Second request (same session, new data)
    r2 = requests.post(
        f"{API_URL}/anonymize",
        json={
            "text": "Pierre Dupont habite à Marseille",
            "session_id": session_id,
            "preserve_mapping": True
        },
        headers=HEADERS
    )
    
    print(f"Requête 2: {r2.status_code}")
    print(f"  → {r2.json()['anonymized_text']}")
    
    # Get all mappings
    mappings = requests.get(
        f"{API_URL}/session/{session_id}/mappings",
        headers=HEADERS
    ).json()
    
    print(f"✓ Total mappings: {mappings['stats']['total_mappings']}")
    print(f"✓ Détail: {mappings['stats']['mappings_by_type']}")


def test_cache_stats():
    """Test cache statistics endpoint"""
    print("\n📊 Test 5: Statistiques cache...")
    
    response = requests.get(
        f"{API_URL}/cache/stats",
        headers=HEADERS
    )
    
    print(f"Status: {response.status_code}")
    stats = response.json()
    
    if response.status_code == 200:
        print(f"✓ Backend: {stats.get('backend')}")
        print(f"✓ Redis disponible: {stats.get('redis_available')}")
        if stats.get('redis_available'):
            print(f"✓ Mémoire utilisée: {stats.get('used_memory')}")
            print(f"✓ Total clés: {stats.get('total_keys')}")
    else:
        print(f"✗ Erreur: {stats}")


def test_delete_session(session_id):
    """Test session deletion"""
    print(f"\n🗑️ Test 6: Suppression session {session_id}...")
    
    response = requests.delete(
        f"{API_URL}/session/{session_id}",
        headers=HEADERS
    )
    
    print(f"Status: {response.status_code}")
    result = response.json()
    
    if response.status_code == 200:
        print(f"✓ {result['message']}")
        
        # Try to retrieve deleted session
        verify = requests.get(
            f"{API_URL}/session/{session_id}/mappings",
            headers=HEADERS
        )
        
        if verify.status_code == 404:
            print(f"✓ Session correctement supprimée (404)")
        else:
            print(f"✗ Session encore présente ?!")
    else:
        print(f"✗ Erreur: {result}")


if __name__ == "__main__":
    print("=" * 60)
    print("🧪 TEST REDIS CACHE & SESSION MANAGEMENT")
    print("=" * 60)
    
    # Test workflow complet
    session_id = test_anonymize_with_session()
    
    if session_id:
        test_get_session_mappings(session_id)
        test_deanonymize(session_id)
        test_multi_request_same_session()
        test_cache_stats()
        test_delete_session(session_id)
    
    print("\n" + "=" * 60)
    print("✅ Tests terminés !")
    print("=" * 60)
