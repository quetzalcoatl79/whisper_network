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
- **Support multi-types** : IP, emails, téléphones, noms, adresses, URLs
- **CORS intégré** : Prêt pour les extensions de navigateur
- **API REST** : Documentation automatique avec Swagger/OpenAPI
- **Configuration flexible** : Paramètres d'anonymisation personnalisables

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
  const response = await fetch('http://127.0.0.1:8000/anonymize', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: text,
      settings: settings
    })
  });
  
  return await response.json();
}

// Usage
const result = await anonymizeText(
  "Mon email est test@example.com", 
  { anonymize_email: true }
);
console.log(result.anonymized_text); // "Mon email est ***EMAIL***"
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

## �📝 Structure du projet

```
whisper_network/
├── main.py                  # Point d'entrée FastAPI
├── whisper_network/         # Package principal
│   ├── __init__.py         # Initialisation du package
│   └── anonymizers.py      # Moteur d'anonymisation
├── tests/                   # Tests unitaires
│   └── test_main.py
├── docker-compose.yml       # Configuration Docker Compose
├── Dockerfile              # Image Docker
├── docker-run.sh           # Script de gestion (Linux/macOS)
├── docker-run.bat          # Script de gestion (Windows)
├── .dockerignore           # Fichiers ignorés par Docker
├── pyproject.toml          # Configuration du projet
├── requirements.txt        # Dépendances Python
└── README.md               # Documentation
```

## 🔒 Sécurité

- L'API ne stocke aucun texte traité
- Traitement en mémoire uniquement
- CORS configuré (à adapter en production)
- Validation des entrées avec Pydantic

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