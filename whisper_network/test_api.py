#!/usr/bin/env python3
"""
Test script pour l'API Whisper Network
"""
import requests
import json

def test_api():
    base_url = "http://localhost:8001"
    
    try:
        # Test health
        print("🔍 Test de santé de l'API...")
        response = requests.get(f"{base_url}/health", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ API en ligne: {data}")
        else:
            print(f"❌ Erreur HTTP {response.status_code}: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Connexion échouée: {e}")
        return False
    
    try:
        # Test anonymization
        print("\n🔍 Test d'anonymisation...")
        test_data = {
            "text": "Bonjour, je m'appelle Jean Dupont et mon email est jean.dupont@example.com",
            "settings": {
                "anonymize_names": True,
                "anonymize_email": True,
                "anonymize_phone": True,
                "anonymize_ip": False
            }
        }
        
        response = requests.post(f"{base_url}/anonymize", 
                               json=test_data, 
                               headers={"Content-Type": "application/json"}, 
                               timeout=10)
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Anonymisation réussie:")
            print(f"   Texte original: {result['original_text']}")
            print(f"   Texte anonymisé: {result['anonymized_text']}")
            print(f"   Nb anonymisations: {result['anonymizations_count']}")
            print(f"   Temps de traitement: {result['processing_time_ms']:.2f}ms")
        else:
            print(f"❌ Erreur anonymisation HTTP {response.status_code}: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Test anonymisation échoué: {e}")
        return False
    
    return True

if __name__ == "__main__":
    print("🧪 Test de l'API Whisper Network")
    print("=" * 50)
    
    if test_api():
        print("\n🎉 Tous les tests sont passés avec succès!")
    else:
        print("\n💥 Certains tests ont échoué.")