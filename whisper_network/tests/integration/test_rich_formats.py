#!/usr/bin/env python3
"""
Test script for rich format support (PDF, RTF) in Whisper Network.
Creates sample PDF and RTF files and tests anonymization.

Author: Sylvain JOLY, NANO by NXO
"""

import asyncio
import requests
import os
from pathlib import Path


# API Configuration
API_URL = "http://localhost:8001"
API_KEY = "dev_test_key_12345"


def create_test_pdf(filename: str):
    """Create a test .pdf file with sample content."""
    try:
        from reportlab.lib.pagesizes import letter, A4
        from reportlab.pdfgen import canvas
        from reportlab.lib.units import inch
        
        c = canvas.Canvas(filename, pagesize=A4)
        width, height = A4
        
        # Page 1
        c.setFont("Helvetica-Bold", 16)
        c.drawString(100, height - 100, "Rapport Confidentiel")
        
        c.setFont("Helvetica", 12)
        y = height - 150
        
        texts = [
            "Ce document contient des informations sensibles.",
            "",
            "Contacts:",
            "- M. Jean Dupont (jean.dupont@entreprise.fr)",
            "- Mme Sophie Martin (sophie.martin@entreprise.fr)",
            "- Tel: +33 1 42 53 64 75",
            "",
            "Configuration Réseau:",
            "- Serveur Web: 192.168.1.100",
            "- Serveur BDD: 10.20.30.40",
            "- DNS: 8.8.8.8",
            "",
            "Employés concernés:",
            "- ID-12345: Alice Durand",
            "- ID-67890: Bob Martin",
            "- ID-11111: Claire Petit",
        ]
        
        for text in texts:
            c.drawString(100, y, text)
            y -= 20
        
        # Page 2
        c.showPage()
        c.setFont("Helvetica-Bold", 14)
        c.drawString(100, height - 100, "Page 2 - Informations Techniques")
        
        c.setFont("Helvetica", 11)
        y = height - 150
        
        tech_info = [
            "Adresses IP privées:",
            "192.168.1.10 - Station 1",
            "192.168.1.11 - Station 2",
            "172.16.0.5 - Serveur",
            "",
            "Emails:",
            "admin@company.com",
            "support@company.com",
            "contact@company.com",
        ]
        
        for text in tech_info:
            c.drawString(100, y, text)
            y -= 20
        
        c.save()
        print(f"✅ Created {filename}")
        return True
    except Exception as e:
        print(f"❌ Failed to create {filename}: {e}")
        return False


def create_test_rtf(filename: str):
    """Create a test .rtf file with sample content."""
    try:
        # RTF format: {\\rtf1\\ansi\\deff0 content}
        rtf_content = r"""{{\rtf1\ansi\deff0
{{\fonttbl{{\f0 Times New Roman;}}}}
{{\colortbl;\red0\green0\blue0;\red255\green0\blue0;}}
\viewkind4\uc1\pard\cf1\f0\fs24

\b Compte-rendu de réunion\b0\par
\par
Date: 18 novembre 2025\par
\par
\b Présents:\b0\par
- M. Pierre Lefevre (pierre.lefevre@societe.fr)\par
- Mme Anne Moreau (anne.moreau@societe.fr)\par
- M. Lucas Garnier (lucas.garnier@societe.fr)\par
\par
\b Sujets abordés:\b0\par
1. Incident réseau du serveur 192.168.50.100\par
2. Migration vers 10.0.0.0/24\par
3. Nouveaux employés ID-99999 et ID-88888\par
\par
\b Contact IT:\b0\par
Email: support@entreprise.fr\par
Tel: +33 1 23 45 67 89\par
\par
\b Informations confidentielles:\b0\par
- Nom: Jacques Dumont\par
- Poste: Administrateur système\par
- IP Bureau: 172.16.10.25\par
- Extension: 1234\par
}}"""
        
        with open(filename, 'w', encoding='latin-1') as f:
            f.write(rtf_content)
        
        print(f"✅ Created {filename}")
        return True
    except Exception as e:
        print(f"❌ Failed to create {filename}: {e}")
        return False


async def test_file_anonymization(filename: str):
    """Test anonymization of a single file."""
    try:
        print(f"\n🔄 Testing {filename}...")
        
        # Read file
        with open(filename, 'rb') as f:
            file_content = f.read()
        
        print(f"   📂 File size: {len(file_content)} bytes")
        
        # Upload and anonymize
        files = {'file': (filename, file_content)}
        headers = {'X-API-Key': API_KEY}
        
        response = requests.post(
            f"{API_URL}/anonymize-file",
            files=files,
            headers=headers,
            timeout=60  # PDF can take longer
        )
        
        if response.status_code == 200:
            # Success - metadata is in headers
            anon_count = response.headers.get('X-Anonymizations-Count', '0')
            proc_time = response.headers.get('X-Processing-Time-Ms', '0')
            file_type = response.headers.get('X-File-Type', 'unknown')
            new_filename = response.headers.get('Content-Disposition', '').split('filename="')[-1].rstrip('"')
            
            print(f"   ✅ Anonymization successful!")
            print(f"   📊 Anonymizations: {anon_count}")
            print(f"   ⏱️  Processing time: {proc_time}ms")
            print(f"   📁 File type: {file_type}")
            print(f"   📝 New filename: {new_filename}")
            
            # Save anonymized file
            output_filename = new_filename or filename.replace('.', '.anonymized.')
            with open(output_filename, 'wb') as f:
                f.write(response.content)
            print(f"   💾 Saved to {output_filename} ({len(response.content)} bytes)")
            
            return True
        else:
            print(f"   ❌ API Error {response.status_code}: {response.text}")
            return False
            
    except Exception as e:
        print(f"   ❌ Test failed: {e}")
        return False


async def main():
    """Main test runner."""
    print("=" * 60)
    print("🧪 Rich Formats (PDF, RTF) Anonymization Test")
    print("=" * 60)
    
    # Create test files directory
    test_dir = Path("test-rich-formats")
    test_dir.mkdir(exist_ok=True)
    os.chdir(test_dir)
    
    # Create test files
    print("\n📝 Creating test files...")
    test_files = []
    
    if create_test_pdf("test_document.pdf"):
        test_files.append("test_document.pdf")
    
    if create_test_rtf("test_document.rtf"):
        test_files.append("test_document.rtf")
    
    if not test_files:
        print("❌ No test files created!")
        return
    
    print(f"\n✅ Created {len(test_files)} test files")
    
    # Test anonymization
    print("\n" + "=" * 60)
    print("🔒 Testing Anonymization")
    print("=" * 60)
    
    success_count = 0
    for filename in test_files:
        if await test_file_anonymization(filename):
            success_count += 1
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 Test Summary")
    print("=" * 60)
    print(f"✅ Successful: {success_count}/{len(test_files)}")
    print(f"❌ Failed: {len(test_files) - success_count}/{len(test_files)}")
    
    if success_count == len(test_files):
        print("\n🎉 All tests passed!")
    else:
        print("\n⚠️  Some tests failed")
    
    print(f"\n📁 Test files location: {test_dir.absolute()}")


if __name__ == "__main__":
    asyncio.run(main())
