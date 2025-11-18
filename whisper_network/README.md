# Whisper Network API

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python](https://img.shields.io/badge/Python-3.8%2B-blue.svg)](https://www.python.org/downloads/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104%2B-green.svg)](https://fastapi.tiangolo.com/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://www.docker.com/)

Une API FastAPI haute performance pour l'anonymisation de texte, conçue pour les extensions de navigateur.

**Développé par Sylvain JOLY, NANO by NXO**  
**Licence : MIT**

## 🚀 Fonctionnalités

- **Anonymisation en temps réel** : Traitement asynchrone ultra-rapide
- **Support multi-types** : IP, emails, téléphones, noms, adresses, URLs, cartes bancaires, IBAN, NIR
- **Multi-langues** : Support français et anglais avec détection automatique
- **CORS intégré** : Configuration sécurisée pour les extensions de navigateur
- **Sécurité renforcée** : API Key, rate limiting, logs de sécurité
- **API REST** : Documentation automatique avec Swagger/OpenAPI
- **Configuration flexible** : Paramètres d'anonymisation personnalisables via `.env`

## 🔐 Sécurité

Whisper Network intègre plusieurs niveaux de protection :

- ✅ **CORS restrictif** : Contrôle précis des origines autorisées
- ✅ **API Key authentication** : Protection par clé d'API
- ✅ **Rate limiting** : Protection anti-abus (configurable)
- ✅ **Logs de sécurité** : Traçabilité des tentatives d'accès

**Configuration rapide** :

```bash
# 1. Copier le template
cp .env.example .env

# 2. Générer une API Key sécurisée
openssl rand -hex 32

# 3. Éditer .env avec vos paramètres
API_KEY=votre_clé_générée
CORS_ORIGINS=https://chat.openai.com,https://votre-domaine.com
RATE_LIMIT_ENABLED=true
RATE_LIMIT_PER_MINUTE=10
```

📖 **Documentation complète** : [SECURITY.md](./SECURITY.md)

## 📋 Prérequis

- Python 3.8 ou supérieur
- pip (gestionnaire de paquets Python)

## 🛠 Installation

### Option 1: Installation avec Docker (Recommandée)

1. **Prérequis** : Avoir Docker et Docker Compose installés
2. **Cloner le projet** :
```bash
git clone <repository-url>
cd whisper_network
```

3. **Construire et démarrer** :
```bash
# Sur Linux/macOS
./docker-run.sh build
./docker-run.sh start

# Sur Windows
docker-run.bat build
docker-run.bat start
```

L'API sera accessible sur : http://localhost:8000

### Option 2: Installation locale

1. **Cloner le projet** :
```bash
git clone <repository-url>
cd whisper_network
```

2. **Créer un environnement virtuel** (recommandé) :
```bash
python -m venv venv

# Sur Windows :
venv\\Scripts\\activate

# Sur macOS/Linux :
source venv/bin/activate
```

3. **Installer les dépendances** :
```bash
pip install -e .
```

Ou pour le développement :
```bash
pip install -e ".[dev]"
```

## 🚀 Utilisation

### Avec Docker (Recommandé)

```bash
# Démarrer l'API
./docker-run.sh start    # Linux/macOS
docker-run.bat start     # Windows

# Voir les logs
./docker-run.sh logs     # Linux/macOS
docker-run.bat logs      # Windows

# Arrêter l'API
./docker-run.sh stop     # Linux/macOS
docker-run.bat stop      # Windows
```

### Installation locale

```bash
python main.py
```

ou avec uvicorn directement :

```bash
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

L'API sera accessible sur : http://127.0.0.1:8000

### Documentation interactive

- **Swagger UI** : http://127.0.0.1:8000/docs
- **ReDoc** : http://127.0.0.1:8000/redoc

## 📡 Endpoints API

### `POST /anonymize`

Anonymise un texte selon les paramètres fournis.

**Exemple de requête** :
```json
{
  "text": "Contactez moi sur jean.dupont@email.com ou au 01.23.45.67.89",
  "settings": {
    "anonymize_email": true,
    "anonymize_phone": true,
    "anonymize_ip": true,
    "anonymize_names": false,
    "anonymize_address": false,
    "anonymize_urls": true
  }
}
```

**Exemple de réponse** :
```json
{
  "success": true,
  "original_text": "Contactez moi sur jean.dupont@email.com ou au 01.23.45.67.89",
  "anonymized_text": "Contactez moi sur ***EMAIL*** ou au ***PHONE***",
  "anonymizations_count": 2,
  "processing_time_ms": 1.23
}
```

### `GET /settings`

Récupère les paramètres d'anonymisation par défaut.

### `GET /health`

Point de contrôle de santé de l'API.

## ⚙️ Configuration

Les paramètres d'anonymisation disponibles :

- `anonymize_ip` : Anonymise les adresses IP (ex: 192.168.1.1 → ***IP***)
- `anonymize_email` : Anonymise les emails (ex: user@domain.com → ***EMAIL***)
- `anonymize_phone` : Anonymise les téléphones (ex: 01.23.45.67.89 → ***PHONE***)
- `anonymize_names` : Anonymise les noms propres (ex: Jean Dupont → ***NAME***)
- `anonymize_address` : Anonymise les adresses postales
- `anonymize_urls` : Anonymise les URLs

## 🔌 Intégration Extension Navigateur

L'API est optimisée pour les extensions de navigateur avec :

- **CORS configuré** pour accepter les requêtes cross-origin
- **Réponses rapides** grâce au traitement asynchrone
- **Format JSON standardisé** pour faciliter l'intégration

### Exemple d'utilisation JavaScript

```javascript
async function anonymizeText(text, settings = {}) {
  const response = await fetch('http://127.0.0.1:8001/anonymize', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': 'votre_clé_api'  // Requis si API_KEY est configuré
    },
    body: JSON.stringify({
      text: text,
      settings: settings
    })
  });
  
  if (!response.ok) {
    if (response.status === 403) throw new Error('API Key invalide');
    if (response.status === 429) throw new Error('Rate limit dépassé');
    throw new Error('Erreur API');
  }
  
  return await response.json();
}

// Usage
try {
  const result = await anonymizeText(
    "Mon email est test@example.com et mon téléphone est 06 12 34 56 78", 
    { anonymize_email: true, anonymize_phone: true }
  );
  console.log(result.anonymized_text); 
  // "Mon email est ***EMAIL_1*** et mon téléphone est ***PHONE_1***"
} catch (error) {
  console.error('Erreur:', error.message);
}
```

## 🧪 Tests

Exécuter les tests :

```bash
pytest
```

Avec couverture :

```bash
pytest --cov=whisper_network
```

## 🛠 Développement

### Formatage du code

```bash
black .
isort .
```

### Vérification des types

```bash
mypy .
```

### Linting

```bash
flake8 .
```

## � Gestion des Conteneurs

### Scripts de gestion

- **Linux/macOS** : `./docker-run.sh [command]`
- **Windows** : `docker-run.bat [command]`

### Commandes disponibles

| Commande | Description |
|----------|-------------|
| `build` | Construire l'image Docker |
| `start` | Démarrer le conteneur API |
| `stop` | Arrêter le conteneur |
| `restart` | Redémarrer le conteneur |
| `logs` | Afficher les logs en temps réel |
| `shell` | Accéder au shell du conteneur |
| `status` | Voir l'état des conteneurs |
| `cleanup` | Nettoyer les conteneurs et images |

### Exemples d'utilisation

```bash
# Construire et démarrer
./docker-run.sh build
./docker-run.sh start

# Suivre les logs
./docker-run.sh logs

# Accéder au conteneur pour déboguer
./docker-run.sh shell

# Nettoyer après développement
./docker-run.sh cleanup
```

## 📝 Structure du projet

```
whisper_network/
├── main.py                     # Point d'entrée FastAPI
├── .env                        # Configuration (ne pas commiter!)
├── .env.example                # Template de configuration
├── SECURITY.md                 # Guide de sécurité complet
├── whisper_network/            # Package principal
│   ├── __init__.py            # Initialisation du package
│   ├── anonymizers.py         # Moteur d'anonymisation multi-langues
│   └── fast_anonymizer.py     # Moteur rapide (regex uniquement)
├── tests/                      # Tests unitaires
│   ├── test_main.py
│   ├── test_multilingual.py   # Tests multi-langues
│   └── test_phone_formats.py  # Tests formats téléphone
├── test_security.sh            # Script de test de sécurité
├── docker-compose.yml          # Configuration Docker Compose
├── Dockerfile                  # Image Docker
├── docker-run.sh               # Script de gestion (Linux/macOS)
├── docker-run.bat              # Script de gestion (Windows)
├── .dockerignore               # Fichiers ignorés par Docker
├── pyproject.toml              # Configuration du projet
├── requirements.txt            # Dépendances Python
└── README.md                   # Documentation
```

## 🔒 Sécurité

- ✅ **Aucune donnée stockée** : Traitement en mémoire uniquement
- ✅ **API Key authentication** : Protection par clé d'API configurable
- ✅ **Rate limiting** : Protection anti-abus (10 req/min par défaut)
- ✅ **CORS restrictif** : Liste blanche d'origines autorisées
- ✅ **Logs de sécurité** : Traçabilité des accès et tentatives
- ✅ **Validation stricte** : Toutes entrées validées via Pydantic

**⚠️ Avant production** : Consultez [SECURITY.md](./SECURITY.md) pour la configuration complète.

### Test de sécurité rapide

```bash
# Tester tous les mécanismes de sécurité
bash test_security.sh
```

## �‍💻 Développeur

**Sylvain JOLY, NANO by NXO**  
Développeur principal et créateur de Whisper Network

- **LinkedIn** : [Sylvain JOLY, NANO by NXO](https://linkedin.com/in/sylvain-joly)
- **Email** : sylvain.joly@whisper-network.com

## �📄 Licence

**MIT License** - Copyright (c) 2025 Sylvain JOLY, NANO by NXO

Voir le fichier [LICENSE](LICENSE) pour plus de détails.

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir une issue ou une pull request.

## 📞 Support

Pour toute question ou problème :
- **Email** : sylvain.joly@whisper-network.com
- **Issues GitHub** : Ouvrir une issue sur le repository