#!/usr/bin/env python3
"""
Script de test complet pour Whisper Network
Teste les deux endpoints (fast et complete) avec différents types de données
"""

import requests
import json
import time

def test_endpoint(endpoint_name, endpoint_path, test_data):
    """Test un endpoint avec des données spécifiques"""
    print(f"\n🧪 Test {endpoint_name}")
    print("=" * 50)
    
    url = f"http://localhost:8001{endpoint_path}"
    
    try:
        start_time = time.time()
        response = requests.post(url, json=test_data, timeout=10)
        end_time = time.time()
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Succès!")
            print(f"   Texte original: {result['original_text']}")
            print(f"   Texte anonymisé: {result['anonymized_text']}")
            print(f"   Anonymisations: {result['anonymizations_count']}")
            print(f"   Temps API: {result['processing_time_ms']:.2f}ms")
            print(f"   Temps total: {(end_time - start_time) * 1000:.2f}ms")
            
            if result.get('mapping_summary'):
                print(f"   Mappings: {len(result['mapping_summary'])} types détectés")
            
            return True
        else:
            print(f"❌ Erreur HTTP {response.status_code}")
            print(f"   Réponse: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Exception: {e}")
        return False

def main():
    print("🔬 Tests Whisper Network - Mode Conteneurisé")
    print("=" * 60)
    
    # Données de test variées
    test_cases = [
        {
            "name": "Données personnelles basiques",
            "data": {
                "text": "Salut, je suis Marie Durand, mon email est marie.durand@company.com et mon téléphone est 0123456789",
                "settings": {
                    "anonymize_names": True,
                    "anonymize_email": True,
                    "anonymize_phone": True
                }
            }
        },
        {
            "name": "Données financières",
            "data": {
                "text": "Mon IBAN est FR14 2004 1010 0505 0001 3M02 606 et ma carte est 4532 1234 5678 9012",
                "settings": {
                    "anonymize_iban": True,
                    "anonymize_credit_cards": True
                }
            }
        },
        {
            "name": "Adresses IP",
            "data": {
                "text": "Mon serveur est sur 192.168.1.100 et le proxy sur 203.45.67.89",
                "settings": {
                    "anonymize_ip": True
                }
            }
        },
        {
            "name": "URLs",
            "data": {
                "text": "Visitez https://monsite-secret.com/admin et http://192.168.1.1:8080/dashboard",
                "settings": {
                    "anonymize_urls": True
                }
            }
        }
    ]
    
    success_count = 0
    total_tests = len(test_cases) * 2  # 2 endpoints
    
    for test_case in test_cases:
        print(f"\n📋 Cas de test: {test_case['name']}")
        
        # Test endpoint rapide
        if test_endpoint("Mode Rapide ⚡", "/anonymize/fast", test_case['data']):
            success_count += 1
            
        # Test endpoint complet
        if test_endpoint("Mode Complet 🎯", "/anonymize", test_case['data']):
            success_count += 1
    
    print(f"\n📊 Résultats: {success_count}/{total_tests} tests réussis")
    
    if success_count == total_tests:
        print("🎉 Tous les tests sont passés! L'API est opérationnelle.")
        return True
    else:
        print("⚠️  Certains tests ont échoué.")
        return False

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)