#!/bin/bash
# Test de sécurité pour Whisper Network API

API_URL="http://localhost:8001"
API_KEY="dev_test_key_12345"

echo "===================="
echo "1. Test sans API Key (doit échouer)"
echo "===================="
curl -X POST "${API_URL}/anonymize" \
  -H "Content-Type: application/json" \
  -d '{"text": "Bonjour je suis Jean Dupont"}' \
  -w "\nHTTP Status: %{http_code}\n\n"

echo "===================="
echo "2. Test avec mauvaise API Key (doit échouer)"
echo "===================="
curl -X POST "${API_URL}/anonymize" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: wrong_key" \
  -d '{"text": "Bonjour je suis Jean Dupont"}' \
  -w "\nHTTP Status: %{http_code}\n\n"

echo "===================="
echo "3. Test avec bonne API Key (doit réussir)"
echo "===================="
curl -X POST "${API_URL}/anonymize" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ${API_KEY}" \
  -d '{"text": "Bonjour je suis Jean Dupont, mon email est jean@example.com"}' \
  -w "\nHTTP Status: %{http_code}\n\n"

echo "===================="
echo "4. Test endpoint /health (toujours accessible)"
echo "===================="
curl "${API_URL}/health" -w "\nHTTP Status: %{http_code}\n\n"

echo "===================="
echo "5. Test rate limiting (10 requêtes rapides)"
echo "===================="
for i in {1..12}; do
  echo "Requête $i:"
  curl -X POST "${API_URL}/anonymize/fast" \
    -H "Content-Type: application/json" \
    -H "X-API-Key: ${API_KEY}" \
    -d '{"text": "Test"}' \
    -w " - HTTP Status: %{http_code}\n" \
    -s -o /dev/null
  sleep 0.1
done

echo ""
echo "===================="
echo "Test terminé"
echo "===================="
