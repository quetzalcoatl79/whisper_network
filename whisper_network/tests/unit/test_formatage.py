#!/usr/bin/env python3
"""Test de conservation du formatage lors de l'anonymisation"""

import requests
import json

API_URL = "http://localhost:8001"
API_KEY = "dev_test_key_12345"

# Texte avec formatage complexe
text = """Bonjour,

Je suis Jean Dupont.
Mon email: jean@example.com
Mon téléphone:	06 12 34 56 78

Informations:
    - Nom: Jean Dupont
    - Email: jean.dupont@societe.fr
    - Tel: +33 1 23 45 67 89

Code exemple:
    def hello():
        print("Hello World")
        return True

Cordialement"""

print("=" * 50)
print("📝 TEXTE ORIGINAL:")
print("=" * 50)
print(text)
print(f"\nLongueur: {len(text)} caractères")
print(f"Lignes: {text.count(chr(10))} retours à la ligne")
print(f"Tabs: {text.count(chr(9))} tabulations")

# Anonymisation
print("\n" + "=" * 50)
print("🔄 Anonymisation en cours...")
print("=" * 50)

response = requests.post(
    f"{API_URL}/anonymize",
    headers={
        "Content-Type": "application/json",
        "X-API-Key": API_KEY
    },
    json={
        "text": text,
        "settings": {
            "anonymize_names": True,
            "anonymize_email": True,
            "anonymize_phone": True
        }
    }
)

if response.status_code == 200:
    result = response.json()
    anonymized = result['anonymized_text']
    
    print("\n" + "=" * 50)
    print("✅ TEXTE ANONYMISÉ:")
    print("=" * 50)
    print(anonymized)
    print(f"\nLongueur: {len(anonymized)} caractères")
    print(f"Lignes: {anonymized.count(chr(10))} retours à la ligne")
    print(f"Tabs: {anonymized.count(chr(9))} tabulations")
    
    # Comparaison
    print("\n" + "=" * 50)
    print("📊 COMPARAISON:")
    print("=" * 50)
    print(f"Retours ligne conservés: {text.count(chr(10)) == anonymized.count(chr(10))}")
    print(f"Tabulations conservées: {text.count(chr(9)) == anonymized.count(chr(9))}")
    
    # Afficher avec caractères visibles
    print("\n" + "=" * 50)
    print("🔍 VISUALISATION (\\n = retour ligne, \\t = tab):")
    print("=" * 50)
    print(repr(anonymized[:200]))
    
else:
    print(f"❌ Erreur: {response.status_code}")
    print(response.text)
