#!/usr/bin/env python3
"""
Test des différents formats de numéros de téléphone
"""
import requests
import json

def test_phone_formats():
    """Test différents formats de téléphones internationaux."""
    base_url = "http://localhost:8001"
    
    print("📱 TEST FORMATS TÉLÉPHONES INTERNATIONAUX\n")
    print("=" * 70)
    
    test_cases = [
        # Français
        ("🇫🇷 France - Format standard", "Mon numéro est 06 12 34 56 78"),
        ("🇫🇷 France - Avec points", "Appelez le 01.23.45.67.89"),
        ("🇫🇷 France - Avec tirets", "Contact: 07-89-76-54-32"),
        ("🇫🇷 France - International", "Depuis l'étranger: +33 6 12 34 56 78"),
        ("🇫🇷 France - 0033", "Ou bien 0033 1 23 45 67 89"),
        
        # États-Unis / Canada
        ("🇺🇸 USA - Format standard", "Call me at +1-555-123-4567"),
        ("🇺🇸 USA - Avec parenthèses", "Phone: +1 (555) 123-4567"),
        ("🇺🇸 USA - Sans code pays", "Contact: 555-123-4567"),
        
        # Royaume-Uni
        ("🇬🇧 UK - Mobile", "My mobile is +44 7700 900123"),
        ("🇬🇧 UK - London", "London office: +44 20 7123 4567"),
        
        # Autres pays
        ("🇩🇪 Allemagne", "Telefon: +49 30 12345678"),
        ("🇪🇸 Espagne", "Teléfono: +34 912 345 678"),
        ("🇮🇹 Italie", "Telefono: +39 02 1234 5678"),
        ("🇧🇪 Belgique", "Numéro: +32 2 123 45 67"),
        ("🇨🇭 Suisse", "Tel: +41 22 123 45 67"),
        
        # Cas mixtes
        ("🌍 Mixte FR/US", "FR: 06 12 34 56 78 et US: +1-555-987-6543"),
    ]
    
    print("\n🎯 TEST MODE COMPLET (/anonymize)\n")
    print("-" * 70)
    
    success_count = 0
    fail_count = 0
    
    for label, text in test_cases:
        try:
            response = requests.post(
                f"{base_url}/anonymize",
                json={
                    "text": text,
                    "settings": {
                        "anonymize_phone": True,
                        "anonymize_names": False,
                        "anonymize_email": False
                    }
                },
                timeout=10
            )
            
            if response.status_code == 200:
                result = response.json()
                anonymized = result['anonymized_text']
                count = result['anonymizations_count']
                
                if count > 0:
                    print(f"✅ {label}")
                    print(f"   Original  : {text}")
                    print(f"   Anonymisé : {anonymized}")
                    print(f"   Count     : {count}\n")
                    success_count += 1
                else:
                    print(f"⚠️  {label}")
                    print(f"   Original  : {text}")
                    print(f"   ❌ AUCUN NUMÉRO DÉTECTÉ\n")
                    fail_count += 1
            else:
                print(f"❌ {label} - Erreur HTTP {response.status_code}\n")
                fail_count += 1
                
        except Exception as e:
            print(f"❌ {label} - Erreur: {e}\n")
            fail_count += 1
    
    print("=" * 70)
    print(f"\n📊 RÉSULTATS: {success_count} succès, {fail_count} échecs\n")
    
    # Test mode rapide
    print("\n⚡ TEST MODE RAPIDE (/anonymize/fast)\n")
    print("-" * 70)
    
    fast_success = 0
    fast_fail = 0
    
    for label, text in test_cases[:5]:  # Tester seulement quelques cas
        try:
            response = requests.post(
                f"{base_url}/anonymize/fast",
                json={
                    "text": text,
                    "settings": {"anonymize_phone": True}
                },
                timeout=10
            )
            
            if response.status_code == 200:
                result = response.json()
                anonymized = result['anonymized_text']
                count = result['anonymizations_count']
                time_ms = result['processing_time_ms']
                
                if count > 0:
                    print(f"✅ {label} ({time_ms:.2f}ms)")
                    print(f"   {text} → {anonymized}\n")
                    fast_success += 1
                else:
                    print(f"⚠️  {label} - AUCUN NUMÉRO DÉTECTÉ\n")
                    fast_fail += 1
                    
        except Exception as e:
            print(f"❌ {label} - Erreur: {e}\n")
            fast_fail += 1
    
    print("=" * 70)
    print(f"\n📊 MODE RAPIDE: {fast_success} succès, {fast_fail} échecs")
    
    # Résumé final
    print("\n" + "=" * 70)
    print("📌 RÉSUMÉ FINAL")
    print("=" * 70)
    print(f"Mode Complet : {success_count}/{len(test_cases)} formats détectés")
    print(f"Mode Rapide  : {fast_success}/5 formats testés")
    
    if success_count == len(test_cases):
        print("\n🎉 PARFAIT ! Tous les formats sont supportés !")
    elif success_count >= len(test_cases) * 0.8:
        print("\n✅ BIEN ! La plupart des formats fonctionnent.")
    else:
        print("\n⚠️  Attention, certains formats ne sont pas détectés.")
    
    print("\n💡 NOTES:")
    print("  - Mode complet : Utilise IA + regex (plus précis)")
    print("  - Mode rapide  : Regex uniquement (plus rapide)")
    print("  - Les formats avec séparateurs variés sont supportés")
    print("  - Les formats internationaux (+XX) sont prioritaires")


if __name__ == "__main__":
    test_phone_formats()
