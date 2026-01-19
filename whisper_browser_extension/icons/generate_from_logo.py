#!/usr/bin/env python3
"""
Générateur d'icônes pour Whisper Network
Redimensionne le logo source en différentes tailles pour l'extension
"""

from PIL import Image
import os

def create_icons_from_logo():
    """Crée les icônes à partir du logo source"""
    
    # Chemin du logo source
    source_logo = "whisper_logo.png"
    
    if not os.path.exists(source_logo):
        print(f"❌ Fichier source '{source_logo}' non trouvé!")
        print("   Placez le fichier whisper_logo.png dans ce dossier.")
        return
    
    # Ouvrir l'image source
    img = Image.open(source_logo)
    
    # Convertir en RGBA si nécessaire
    if img.mode != 'RGBA':
        img = img.convert('RGBA')
    
    # Tailles requises pour l'extension
    sizes = [16, 32, 48, 128]
    
    for size in sizes:
        # Redimensionner avec antialiasing de haute qualité
        resized = img.resize((size, size), Image.Resampling.LANCZOS)
        
        # Sauvegarder
        filename = f"icon{size}.png"
        resized.save(filename, 'PNG')
        print(f"✅ Créé {filename} ({size}x{size})")
    
    print("\n🎉 Toutes les icônes ont été générées!")
    print("   N'oubliez pas de recharger l'extension dans le navigateur.")

if __name__ == "__main__":
    create_icons_from_logo()
