#!/bin/bash
# Script de rechargement pour la VRAIE extension
# Path: E:/Documents/NXO/PROJETS/R&D/whisper/whisper_browser_extension

echo "ÌæØ WHISPER NETWORK - EXTENSION MISE √Ä JOUR"
echo "=========================================="
echo "Ì≥Å Extension path: E:/Documents/NXO/PROJETS/R&D/whisper/whisper_browser_extension"
echo ""

# V√©rifier l'API
echo "Ì¥ç V√©rification API..."
if curl -s http://localhost:8001/health > /dev/null 2>&1; then
    echo "‚úÖ API Whisper Network active"
else
    echo "Ì∫Ä D√©marrage API..."
    cd ../whisper_network
    docker-compose up -d
    sleep 3
    cd ../whisper_browser_extension
fi

echo ""
echo "‚úÖ FICHIERS MIS √Ä JOUR:"
echo "‚Ä¢ content.js ‚Üê Support Mistral + File interception am√©lior√©e"
echo "‚Ä¢ background.js ‚Üê Statistiques + notifications"
echo "‚Ä¢ Scripts de debug disponibles"

echo ""
echo "ÔøΩÔøΩ ACTIONS OBLIGATOIRES:"
echo "1. Ìºê Ouvrir chrome://extensions/"
echo "2. Ì¥ç Trouver 'Whisper Network - Anonymiseur IA'"
echo "3. Ì¥Ñ Cliquer 'RECHARGER' (OBLIGATOIRE!)"
echo "4. ‚úÖ V√©rifier que l'extension est bien activ√©e"

echo ""
echo "Ì∫Ä TESTER SUR MISTRAL:"
echo "1. Aller sur https://chat.mistral.ai"
echo "2. Ouvrir F12 ‚Üí Console"
echo "3. Coller le contenu de test-mistral.js"
echo "4. Essayer d'uploader un fichier .conf"

echo ""
echo "‚ö° RECHARGER L'EXTENSION MAINTENANT!"
