#!/usr/bin/env python3
"""
Test script for file upload and anonymization.
Tests various file formats with the /anonymize-file endpoint.

Usage:
    python test_file_upload.py
"""

import requests
import os
from pathlib import Path

API_URL = "http://localhost:8001"
API_KEY = "dev_test_key_12345"

def test_file_upload(file_path: str, use_fast: bool = False):
    """Test file upload and anonymization."""
    print(f"\n{'='*60}")
    print(f"Testing: {file_path}")
    print(f"Engine: {'Fast' if use_fast else 'Standard'}")
    print('='*60)
    
    if not os.path.exists(file_path):
        print(f"❌ File not found: {file_path}")
        return
    
    try:
        # Read file
        with open(file_path, 'rb') as f:
            files = {'file': (os.path.basename(file_path), f)}
            params = {'use_fast': use_fast}
            headers = {'X-API-Key': API_KEY}
            
            # Upload and anonymize
            response = requests.post(
                f"{API_URL}/anonymize-file",
                files=files,
                params=params,
                headers=headers
            )
        
        if response.status_code == 200:
            # Get metadata from headers
            anon_count = response.headers.get('X-Anonymizations-Count', 'N/A')
            proc_time = response.headers.get('X-Processing-Time-Ms', 'N/A')
            file_type = response.headers.get('X-File-Type', 'N/A')
            
            print(f"✅ Success!")
            print(f"   File Type: {file_type}")
            print(f"   Anonymizations: {anon_count}")
            print(f"   Processing Time: {proc_time}ms")
            print(f"   Output Size: {len(response.content)} bytes")
            
            # Save anonymized file
            output_path = Path(file_path).stem + ".anonymized" + Path(file_path).suffix
            with open(output_path, 'wb') as f:
                f.write(response.content)
            print(f"   Saved to: {output_path}")
            
            # Show preview
            try:
                content = response.content.decode('utf-8')
                preview = content[:200] + ('...' if len(content) > 200 else '')
                print(f"\n   Preview:\n   {preview}\n")
            except:
                print("   (Binary content, no preview)")
        else:
            print(f"❌ Error: {response.status_code}")
            print(f"   {response.text}")
    
    except Exception as e:
        print(f"❌ Exception: {e}")

def test_file_info():
    """Test /file/info endpoint."""
    print(f"\n{'='*60}")
    print("Testing: /file/info endpoint")
    print('='*60)
    
    try:
        response = requests.get(f"{API_URL}/file/info")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Success!")
            print(f"\n📊 Supported Extensions:")
            for category, extensions in data['supported_extensions'].items():
                print(f"   {category.upper()}: {', '.join(extensions[:10])}")
                if len(extensions) > 10:
                    print(f"      ... and {len(extensions) - 10} more")
            
            print(f"\n📦 File Size Limit:")
            print(f"   {data['max_file_size']['mb']:.2f} MB")
        else:
            print(f"❌ Error: {response.status_code}")
            print(f"   {response.text}")
    
    except Exception as e:
        print(f"❌ Exception: {e}")

def create_test_files():
    """Create sample test files."""
    print("\n📝 Creating test files...")
    
    # Test file 1: Simple text with PII
    with open("test_sample.txt", "w", encoding="utf-8") as f:
        f.write("""Bonjour,

Je suis Jean Dupont, développeur chez TechCorp.
Mon email: jean.dupont@techcorp.fr
Mon téléphone: 06 12 34 56 78

Adresse:
    15 rue de la Paix
    75002 Paris

Cordialement
""")
    print("✅ Created: test_sample.txt")
    
    # Test file 2: Python script
    with open("test_script.py", "w", encoding="utf-8") as f:
        f.write("""#!/usr/bin/env python3
# Script de test pour anonymisation
# Auteur: Jean Dupont <jean.dupont@example.com>

def main():
    # Configuration
    email = "admin@company.fr"
    phone = "+33 1 23 45 67 89"
    
    print(f"Contact: {email}")
    print(f"Téléphone: {phone}")
    
    # Adresse du serveur
    server = "192.168.1.100"
    api_url = "https://api.example.com/v1/users"
    
    return True

if __name__ == "__main__":
    main()
""")
    print("✅ Created: test_script.py")
    
    # Test file 3: Config file
    with open("test_config.yaml", "w", encoding="utf-8") as f:
        f.write("""# Configuration YAML
# Maintainer: Marie Martin <marie.martin@example.com>

database:
  host: 192.168.1.50
  port: 5432
  username: admin
  password: secret123

api:
  endpoint: https://api.company.com
  key: sk_live_abc123def456
  contact_email: support@company.com

users:
  - name: Pierre Durand
    email: pierre.durand@company.com
    phone: 01 23 45 67 89
  
  - name: Sophie Leblanc  
    email: sophie.leblanc@company.com
    phone: 06 98 76 54 32
""")
    print("✅ Created: test_config.yaml")
    
    # Test file 4: Markdown documentation
    with open("test_doc.md", "w", encoding="utf-8") as f:
        f.write("""# Documentation Projet

## Contact

**Chef de projet**: Jean-Michel Durand  
**Email**: jm.durand@company.fr  
**Téléphone**: +33 6 12 34 56 78

## Serveurs

| Environnement | IP | URL |
|---------------|-----|-----|
| Production | 192.168.1.100 | https://prod.example.com |
| Staging | 192.168.1.101 | https://staging.example.com |

## Support

Pour toute question, contactez:
- Support technique: support@company.fr
- Urgences: 01 23 45 67 89 (ligne directe)

Adresse du siège:
```
TechCorp SAS
42 Avenue des Champs-Élysées
75008 Paris, France
```
""")
    print("✅ Created: test_doc.md")
    
    print("\n✅ All test files created!\n")

if __name__ == "__main__":
    print("\n" + "="*60)
    print("FILE UPLOAD ANONYMIZATION - TEST SUITE")
    print("="*60)
    
    # Check API health
    try:
        response = requests.get(f"{API_URL}/health")
        if response.status_code != 200:
            print("❌ API is not responding. Make sure the server is running.")
            exit(1)
        print("✅ API is healthy")
    except:
        print("❌ Cannot connect to API. Make sure the server is running on localhost:8001")
        exit(1)
    
    # Create test files
    create_test_files()
    
    # Test file info endpoint
    test_file_info()
    
    # Test each file type
    test_file_upload("test_sample.txt")
    test_file_upload("test_script.py")
    test_file_upload("test_config.yaml")
    test_file_upload("test_doc.md")
    
    # Test fast mode
    print("\n" + "="*60)
    print("TESTING FAST MODE")
    print("="*60)
    test_file_upload("test_sample.txt", use_fast=True)
    
    print("\n" + "="*60)
    print("ALL TESTS COMPLETED!")
    print("="*60)
    print("\nCheck the .anonymized files for results.\n")
