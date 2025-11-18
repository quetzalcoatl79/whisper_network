# Whisper Network API - Instructions pour Copilot

Ce projet est une API FastAPI haute performance pour l'anonymisation de texte, conçue pour les extensions de navigateur.

**Développé par Sylvain JOLY, NANO by NXO** - Licence MIT

## Architecture du projet

- **FastAPI** : Framework web moderne et rapide
- **Anonymisation asynchrone** : Traitement haute performance
- **Docker** : Conteneurisation pour un déploiement simple
- **CORS** : Support complet pour les extensions de navigateur

## Structure

```
whisper_network/
├── main.py                  # Point d'entrée FastAPI avec endpoints
├── whisper_network/         # Package principal
│   ├── anonymizers.py      # Moteur d'anonymisation avancé
│   └── __init__.py         # Initialisation
├── tests/                   # Tests unitaires
├── docker-compose.yml       # Configuration Docker
└── Dockerfile              # Image Docker
```

## Fonctionnalités d'anonymisation

Le système supporte l'anonymisation de :
- Adresses IP (IPv4)
- Adresses email
- Numéros de téléphone
- NIR (Sécurité Sociale française)
- Noms propres
- Adresses postales françaises
- URLs
- Numéros de carte de crédit
- Codes IBAN

## Déploiement

L'API est conteneurisée et accessible sur le port 8001 :
- **API** : http://localhost:8001
- **Documentation** : http://localhost:8001/docs
- **Health check** : http://localhost:8001/health

## Utilisation

```bash
# Démarrer avec Docker
docker-compose up -d

# Tester l'API
curl -X POST "http://localhost:8001/anonymize" \
  -H "Content-Type: application/json" \
  -d '{"text": "Mon email est test@example.com", "settings": {"anonymize_email": true}}'
```

## Extensions navigateur

L'API est optimisée pour l'intégration avec des extensions de navigateur :
- CORS configuré pour les requêtes cross-origin
- Réponses JSON standardisées
- Traitement asynchrone rapide
- Configuration flexible des types d'anonymisation