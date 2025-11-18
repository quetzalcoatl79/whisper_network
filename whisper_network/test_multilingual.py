#!/usr/bin/env python3
"""
Script de test pour le support multi-langues de Whisper Network
"""
import requests
import json

def test_multilingual_support():
    """Test l'API avec des textes en français et anglais."""
    base_url = "http://localhost:8001"
    
    print("🌍 TEST SUPPORT MULTI-LANGUES\n")
    print("=" * 60)
    
    # Test 1: Texte en français
    print("\n📝 TEST 1 : Texte en FRANÇAIS")
    print("-" * 60)
    
    test_fr = {
        "text": "Bonjour, je m'appelle Marie Curie et mon email est marie.curie@sorbonne.fr. Mon téléphone est le 06 12 34 56 78.",
        "settings": {
            "anonymize_names": True,
            "anonymize_email": True,
            "anonymize_phone": True
        }
    }
    
    try:
        response = requests.post(
            f"{base_url}/anonymize",
            json=test_fr,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Succès!")
            print(f"📥 Original  : {result['original_text']}")
            print(f"📤 Anonymisé : {result['anonymized_text']}")
            print(f"🔢 Anonymisations : {result['anonymizations_count']}")
            print(f"⏱️  Temps : {result['processing_time_ms']:.2f}ms")
        else:
            print(f"❌ Erreur HTTP {response.status_code}: {response.text}")
    except Exception as e:
        print(f"❌ Erreur: {e}")
    
    # Test 2: Texte en anglais
    print("\n📝 TEST 2 : Texte en ANGLAIS")
    print("-" * 60)
    
    test_en = {
        "text": "Hello, my name is Albert Einstein and my email is albert@princeton.edu. My phone number is +1-555-123-4567.",
        "settings": {
            "anonymize_names": True,
            "anonymize_email": True,
            "anonymize_phone": True
        }
    }
    
    try:
        response = requests.post(
            f"{base_url}/anonymize",
            json=test_en,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Succès!")
            print(f"📥 Original  : {result['original_text']}")
            print(f"📤 Anonymisé : {result['anonymized_text']}")
            print(f"🔢 Anonymisations : {result['anonymizations_count']}")
            print(f"⏱️  Temps : {result['processing_time_ms']:.2f}ms")
        else:
            print(f"❌ Erreur HTTP {response.status_code}: {response.text}")
    except Exception as e:
        print(f"❌ Erreur: {e}")
    
    # Test 3: Texte mixte (FR + EN)
    print("\n📝 TEST 3 : Texte MIXTE (FR/EN)")
    print("-" * 60)
    
    test_mixed = {
        "text": "Bonjour Jean Dupont, I received your email at john.smith@company.com. Please call me at 06 12 34 56 78.",
        "settings": {
            "anonymize_names": True,
            "anonymize_email": True,
            "anonymize_phone": True
        }
    }
    
    try:
        response = requests.post(
            f"{base_url}/anonymize",
            json=test_mixed,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Succès!")
            print(f"📥 Original  : {result['original_text']}")
            print(f"📤 Anonymisé : {result['anonymized_text']}")
            print(f"🔢 Anonymisations : {result['anonymizations_count']}")
            print(f"⏱️  Temps : {result['processing_time_ms']:.2f}ms")
        else:
            print(f"❌ Erreur HTTP {response.status_code}: {response.text}")
    except Exception as e:
        print(f"❌ Erreur: {e}")
    
    # Test 4: Mode rapide (regex only) - devrait fonctionner même sans modèles IA
    print("\n📝 TEST 4 : Mode RAPIDE (regex only)")
    print("-" * 60)
    
    try:
        response = requests.post(
            f"{base_url}/anonymize/fast",
            json=test_en,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Succès!")
            print(f"📥 Original  : {result['original_text']}")
            print(f"📤 Anonymisé : {result['anonymized_text']}")
            print(f"🔢 Anonymisations : {result['anonymizations_count']}")
            print(f"⏱️  Temps : {result['processing_time_ms']:.2f}ms")
            print(f"⚡ Mode rapide : parfait pour emails/phones/URLs universels")
        else:
            print(f"❌ Erreur HTTP {response.status_code}: {response.text}")
    except Exception as e:
        print(f"❌ Erreur: {e}")
    
    print("\n" + "=" * 60)
    print("✅ Tests terminés!")
    print("\n💡 NOTES:")
    print("  - Si 'anonymize_names' ne fonctionne pas, vérifier les modèles spaCy")
    print("  - Les regex (email, phone) fonctionnent toujours, même sans IA")
    print("  - Le mode /anonymize/fast est plus rapide mais moins précis sur les noms")
    print("\n📊 Pour voir les logs du serveur:")
    print("  docker logs whisper-network-api | grep 'Modèle spaCy'")


if __name__ == "__main__":
    test_multilingual_support()
