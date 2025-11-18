#!/bin/bash
# Test de conservation du formatage

API_URL="http://localhost:8001"
API_KEY="dev_test_key_12345"

echo "===================="
echo "Test formatage multi-lignes"
echo "===================="

# Texte avec retours à la ligne, tabulations, espaces
TEXT="Bonjour,

Je suis Jean Dupont.
Mon email: jean@example.com
Mon téléphone:	06 12 34 56 78

Informations:
    - Nom: Jean Dupont
    - Email: jean.dupont@societe.fr
    - Tel: +33 1 23 45 67 89

Cordialement"

echo "📝 TEXTE ORIGINAL:"
echo "$TEXT"
echo ""

echo "🔄 Anonymisation..."
RESULT=$(curl -s -X POST "${API_URL}/anonymize" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ${API_KEY}" \
  -d "{\"text\": $(echo "$TEXT" | jq -Rs .)}")

echo ""
echo "📊 RÉSULTAT:"
echo "$RESULT" | jq -r '.anonymized_text'

echo ""
echo "===================="
echo "Vérification formatage:"
echo "===================="
echo "$RESULT" | jq -r '.anonymized_text' | cat -A
