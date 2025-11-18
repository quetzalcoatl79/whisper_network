#!/usr/bin/env python3
"""Debug des détections spaCy"""

import requests
import json

API_URL = "http://localhost:8001"
API_KEY = "dev_test_key_12345"

text = """Bonjour,

Je suis Jean Dupont.
Mon email: jean@example.com

Informations:
    - Nom: Jean Dupont
    - Email: jean.dupont@societe.fr"""

print("📝 TEXTE:")
print(text)
print("\n" + "=" * 50)

# Anonymisation avec mapping_summary
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
            "anonymize_phone": False
        }
    }
)

if response.status_code == 200:
    result = response.json()
    
    print("\n🔍 DÉTECTIONS:")
    print(json.dumps(result['mapping_summary'], indent=2, ensure_ascii=False))
    
    print("\n✅ RÉSULTAT:")
    print(result['anonymized_text'])
    
    print("\n📊 DÉTAIL PAR LIGNE:")
    original_lines = text.split('\n')
    anonymized_lines = result['anonymized_text'].split('\n')
    
    for i, (orig, anon) in enumerate(zip(original_lines, anonymized_lines), 1):
        if orig != anon:
            print(f"Ligne {i}:")
            print(f"  Original  : {repr(orig)}")
            print(f"  Anonymisé : {repr(anon)}")
else:
    print(f"❌ Erreur: {response.status_code}")
    print(response.text)
