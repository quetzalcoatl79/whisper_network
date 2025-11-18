import requests
import json

API_URL = "http://localhost:8001"
API_KEY = "dev_test_key_12345"

text = """Ex: Si Mr Dupont achete à Mme Machin un objet, est ce que Mr Dupont aura une réduction  ?
Mr Nom1 achete a Mme Nom2, est ce que Mr Nom1 aura une réduction ? (moins de confusion dans le cas ou il y en a plein) 

Ex technique : 
voici ma configuration réseau : 
Serveur DHCP : 192.168.1.200
Serveur DNS : 192.168.1.200
IP Switch : 192.168.1.200
IP serveur : 192.168.1.100 
--> 
Serveur DHCP : IP1
Serveur DNS : IP1
IP Switch : IP1
IP serveur : IP2

plus cohérent pour comprendre que le DNS et le DHCP sont sur le switch"""

print("="*60)
print("TEXTE ORIGINAL:")
print("="*60)
print(text)
print(f"\nNombre de lignes: {text.count(chr(10)) + 1}")
print(f"Nombre de caractères: {len(text)}")

# Test anonymisation
response = requests.post(
    f"{API_URL}/anonymize",
    json={"text": text},
    headers={"X-API-Key": API_KEY}
)

if response.status_code == 200:
    result = response.json()
    anonymized = result['anonymized_text']
    
    print("\n" + "="*60)
    print("TEXTE ANONYMISÉ:")
    print("="*60)
    print(anonymized)
    print(f"\nNombre de lignes: {anonymized.count(chr(10)) + 1}")
    print(f"Nombre de caractères: {len(anonymized)}")
    print(f"Anonymisations: {result['anonymizations_count']}")
    print(f"Temps: {result['processing_time_ms']}ms")
    
    # Vérifier conservation des retours ligne
    original_lines = text.count('\n')
    anonymized_lines = anonymized.count('\n')
    
    print("\n" + "="*60)
    print("VERIFICATION:")
    print("="*60)
    print(f"Retours ligne originaux: {original_lines}")
    print(f"Retours ligne anonymisés: {anonymized_lines}")
    
    if original_lines == anonymized_lines:
        print("✅ FORMATAGE CONSERVÉ")
    else:
        print(f"❌ FORMATAGE PERDU: {original_lines - anonymized_lines} retours ligne supprimés")
else:
    print(f"❌ Erreur: {response.status_code}")
    print(response.text)
