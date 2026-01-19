#!/bin/bash

# Script pour générer les icônes PNG à partir de SVG ou créer des icônes simples

echo "🎨 Génération des icônes Whisper Network..."

# Vérifier si ImageMagick est installé
if command -v convert >/dev/null 2>&1; then
    echo "✅ ImageMagick détecté, création des icônes PNG..."
    
    # Créer une icône SVG temporaire
    cat > temp_icon.svg << EOF
<svg width="128" height="128" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
  <rect width="128" height="128" rx="20" fill="#667eea"/>
  <text x="64" y="80" text-anchor="middle" fill="white" font-size="60" font-family="Arial, sans-serif" font-weight="bold">W</text>
  <circle cx="64" cy="45" r="8" fill="white" opacity="0.8"/>
  <rect x="60" y="48" width="8" height="12" rx="2" fill="white" opacity="0.8"/>
</svg>
EOF

    # Générer les différentes tailles
    convert temp_icon.svg -resize 16x16 icon16.png
    convert temp_icon.svg -resize 32x32 icon32.png
    convert temp_icon.svg -resize 48x48 icon48.png
    convert temp_icon.svg -resize 128x128 icon128.png
    
    # Nettoyer
    rm temp_icon.svg
    
    echo "✅ Icônes créées avec succès!"
    
else
    echo "❌ ImageMagick non trouvé."
    echo "📝 Solutions alternatives:"
    echo "1. Installer ImageMagick: https://imagemagick.org/"
    echo "2. Utiliser le générateur HTML: ouvrir icon-generator.html dans votre navigateur"
    echo "3. Créer manuellement avec un éditeur d'image"
    echo "4. Utiliser un générateur en ligne: https://favicon.io/"
fi