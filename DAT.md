# 📐 Document d'Architecture Technique (DAT)
# Whisper Network - Anonymisation de Données

> **Version** : 1.0  
> **Date** : 14 janvier 2026  
> **Auteur** : Sylvain JOLY, NANO by NXO  
> **Statut** : Déploiement Développement  

---

## 📋 Table des matières

1. [Présentation générale](#1-présentation-générale)
2. [Architecture globale](#2-architecture-globale)
3. [Composants techniques](#3-composants-techniques)
4. [Flux de données](#4-flux-de-données)
5. [Sécurité](#5-sécurité)
6. [Déploiement DEV](#6-déploiement-dev)
7. [Déploiement PROD (Futur)](#7-déploiement-prod-futur)
8. [API Reference](#8-api-reference)
9. [Monitoring & Logs](#9-monitoring--logs)
10. [Évolutions prévues](#10-évolutions-prévues)

---

## 1. Présentation générale

### 1.1 Objectif

**Whisper Network** est une solution d'anonymisation de données personnelles en temps réel, conçue pour protéger les informations sensibles avant leur envoi vers des services d'IA (ChatGPT, Claude, Gemini, etc.).

### 1.2 Périmètre fonctionnel

| Fonctionnalité | Description |
|----------------|-------------|
| 🔒 Anonymisation texte | Remplacement des données sensibles par des placeholders |
| 🔓 Dé-anonymisation | Restauration des données originales dans les réponses IA |
| 📁 Traitement fichiers | Support PDF, Word, Excel, texte, code source |
| 💾 Gestion sessions | Persistance des mappings pour le contexte conversationnel |
| 🔄 Cache intelligent | Redis + fallback mémoire pour performances |
| 🌐 Extension navigateur | Interface Chrome/Firefox pour sites IA |

### 1.3 Données traitées

```
┌─────────────────────────────────────────────────────────────┐
│                    DONNÉES ANONYMISÉES                       │
├─────────────────────────────────────────────────────────────┤
│  👤 Identité      : Noms, prénoms, emails, téléphones       │
│  📍 Localisation  : Adresses postales, IPs                  │
│  💳 Financier     : IBAN, cartes bancaires, salaires        │
│  🔢 Identifiants  : NIR (sécu sociale), matricules          │
│  🏢 Professionnel : Entreprises, organisations              │
│  🌐 Technique     : URLs, emails, IPs                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Architecture globale

### 2.1 Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              ARCHITECTURE WHISPER NETWORK                    │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌──────────────────┐
    │   🌐 NAVIGATEUR   │
    │   Chrome/Firefox  │
    │  (Extension)      │
    └────────┬─────────┘
             │ HTTP/HTTPS
             │ Port 8001
             ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DOCKER NETWORK                                  │
│                          (whisper-network bridge)                            │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                                                                        │  │
│  │  ┌─────────────────────┐     ┌─────────────────┐     ┌─────────────┐ │  │
│  │  │  🐍 WHISPER-API     │────▶│  🔴 REDIS 7     │     │ 🐘 POSTGRES │ │  │
│  │  │  FastAPI + Python   │     │  Cache/Sessions │     │   15-alpine │ │  │
│  │  │  Port 8000 (int)    │     │  Port 6379      │     │  Port 5432  │ │  │
│  │  │                     │     └─────────────────┘     └─────────────┘ │  │
│  │  │  • Anonymizer       │                                    │        │  │
│  │  │  • spaCy NLP        │◀───────────────────────────────────┘        │  │
│  │  │  • File Handler     │         (Préférences UI)                    │  │
│  │  │  • Session Manager  │                                              │  │
│  │  └─────────────────────┘                                              │  │
│  │           ▲                                                           │  │
│  │           │ Port 8001 (external)                                      │  │
│  └───────────┼───────────────────────────────────────────────────────────┘  │
│              │                                                               │
└──────────────┼───────────────────────────────────────────────────────────────┘
               │
    ┌──────────┴─────────┐
    │   HOST MACHINE     │
    │   localhost:8001   │
    │   localhost:6379   │
    │   localhost:5432   │
    └────────────────────┘
```

### 2.2 Stack technologique

| Couche | Technologie | Version | Rôle |
|--------|-------------|---------|------|
| **Frontend** | Extension Browser | Manifest V3 | Interface utilisateur |
| **API** | FastAPI | 0.100+ | REST API asynchrone |
| **Runtime** | Python | 3.11 | Exécution backend |
| **NLP** | spaCy | 3.x | Détection entités nommées |
| **Cache** | Redis | 7-alpine | Sessions & mappings |
| **Database** | PostgreSQL | 15-alpine | Préférences utilisateur |
| **Container** | Docker | 24+ | Conteneurisation |
| **Orchestration** | Docker Compose | 3.8 | Multi-conteneurs |

---

## 3. Composants techniques

### 3.1 Backend API (whisper-network-api)

```
whisper_network/
├── main.py                 # Point d'entrée FastAPI
├── config.toml             # Configuration performance
├── requirements.txt        # Dépendances Python
├── Dockerfile              # Image Docker
├── docker-compose.yml      # Orchestration
└── whisper_network/
    ├── __init__.py         # AnonymizationEngine principal
    ├── anonymizers.py      # Moteur d'anonymisation spaCy
    ├── fast_anonymizer.py  # Moteur regex optimisé
    ├── file_handler.py     # Traitement fichiers
    ├── session_manager.py  # Gestion sessions Redis
    ├── cache_manager.py    # Cache unifié Redis/Memory
    ├── database.py         # Connexion PostgreSQL
    └── models.py           # Modèles SQLAlchemy
```

#### 3.1.1 Moteurs d'anonymisation

```python
# 2 moteurs disponibles selon les besoins

┌─────────────────────────────────────────────────────────────┐
│                    FAST ANONYMIZER (Regex)                   │
│                                                              │
│  ✅ Ultra-rapide (<10ms)                                    │
│  ✅ Patterns déterministes                                  │
│  ✅ Idéal pour : emails, IPs, IBAN, téléphones              │
│  ❌ Pas de contexte linguistique                            │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                  ANONYMIZATION ENGINE (spaCy)                │
│                                                              │
│  ✅ Détection noms propres contextuels                      │
│  ✅ Support multi-langues (FR/EN)                           │
│  ✅ Idéal pour : noms, prénoms, organisations               │
│  ❌ Plus lent (~50-200ms)                                   │
│  ❌ Faux positifs possibles                                 │
└─────────────────────────────────────────────────────────────┘
```

#### 3.1.2 Configuration (config.toml)

```toml
[performance]
use_spacy = false          # Désactiver pour modèles légers
cache_patterns = true      # Cache regex compilés
batch_size = 100           # Taille batch pour gros volumes
request_timeout = 5000     # Timeout requête (ms)

[local_model]
enable_local_optimizations = true
max_cache_size = 50        # Cache mémoire (MB)
cache_cleanup_interval = 300

[anonymization]
default_patterns = [
    "anonymize_email",
    "anonymize_phone", 
    "anonymize_ip",
    "anonymize_credit_cards",
    "anonymize_iban"
]
```

### 3.2 Cache Redis

```
┌─────────────────────────────────────────────────────────────┐
│                         REDIS 7                              │
├─────────────────────────────────────────────────────────────┤
│  Mode          : AOF (Append Only File)                     │
│  Persistance   : appendonly yes                             │
│  Mémoire max   : 256 MB                                     │
│  Politique     : allkeys-lru (éviction LRU)                │
│  Volume        : redis_data (persistant)                    │
└─────────────────────────────────────────────────────────────┘

Structure des clés:
┌─────────────────────────────────────────────────────────────┐
│  session:{uuid}  →  {                                        │
│                       "session_id": "uuid",                  │
│                       "created_at": "2026-01-14T...",        │
│                       "last_used": "2026-01-14T...",         │
│                       "ttl": 3600,                           │
│                       "mappings": {                          │
│                         "NAME": {"Jean Dupont": "***NAME_1***"},
│                         "EMAIL": {"j@test.fr": "***EMAIL_1***"}
│                       }                                      │
│                     }                                        │
└─────────────────────────────────────────────────────────────┘
```

### 3.3 Base PostgreSQL

```sql
-- Table unique pour préférences UI (non sensibles)
CREATE TABLE user_preferences (
    uuid UUID PRIMARY KEY,
    preferences JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Exemple de données stockées (JAMAIS de données sensibles)
{
    "anonymize_email": true,
    "anonymize_phone": true,
    "anonymize_iban": true,
    "theme": "dark",
    "language": "fr"
}
```

### 3.4 Extension Navigateur

```
whisper_browser_extension/
├── manifest.json            # Config Chrome MV3
├── manifest-firefox.json    # Config Firefox
├── background.js            # Service Worker
├── content-simple.js        # Boutons flottants (🔒/🔓)
├── content.js               # Injection sites IA
├── popup.html               # Interface popup simple
├── popup-advanced.html      # Interface avancée (onglets)
├── popup.js                 # Logique popup
├── popup.css                # Styles (dark/light mode)
├── session-manager.js       # Gestion sessions côté client
├── response-interceptor.js  # Auto-dé-anonymisation réponses
├── storage-sync.js          # Persistance chrome.storage
├── preferences-manager.js   # Import/Export préférences
└── icons/                   # Icônes extension
```

---

## 4. Flux de données

### 4.1 Flux d'anonymisation

```
┌────────────────────────────────────────────────────────────────────────────┐
│                         FLUX ANONYMISATION                                  │
└────────────────────────────────────────────────────────────────────────────┘

  1. SAISIE           2. INTERCEPTION        3. ANONYMISATION      4. ENVOI
┌─────────┐         ┌─────────────┐        ┌──────────────┐     ┌─────────┐
│ User    │  ───▶   │ Extension   │  ───▶  │ API Backend  │ ──▶ │ ChatGPT │
│ écrit   │  texte  │ (bouton 🔒) │  POST  │              │     │ Claude  │
│ message │  brut   │             │ /anon. │ • spaCy NER  │     │ Gemini  │
└─────────┘         └─────────────┘        │ • Regex fast │     └─────────┘
                           │               │ • Session    │
                           │               └──────────────┘
                           │                      │
                           │               ┌──────▼──────┐
                           │               │   REDIS     │
                           │               │ Mappings    │
                           │               │ session:xxx │
                           │               └─────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │    TEXTE ANONYMISÉ     │
              │                        │
              │ "Bonjour ***NAME_1***  │
              │  mon email est         │
              │  ***EMAIL_1***"        │
              └────────────────────────┘
```

### 4.2 Flux de dé-anonymisation

```
┌────────────────────────────────────────────────────────────────────────────┐
│                       FLUX DÉ-ANONYMISATION                                 │
└────────────────────────────────────────────────────────────────────────────┘

  1. RÉPONSE IA       2. DÉTECTION          3. DÉ-ANONYMISATION    4. AFFICHAGE
┌─────────────┐     ┌─────────────┐       ┌──────────────┐      ┌─────────────┐
│ "Bonjour    │ ──▶ │ Response    │  ───▶ │ API Backend  │ ───▶ │ "Bonjour    │
│ ***NAME_1***│     │ Interceptor │  POST │              │      │ Jean Dupont │
│ votre email │     │ (Mutation   │ /dean │ • Lookup     │      │ votre email │
│ ***EMAIL_1**│     │  Observer)  │       │   mappings   │      │ jean@ex.com │
│ est..."     │     └─────────────┘       └──────────────┘      │ est..."     │
└─────────────┘            ▲                     │               └─────────────┘
                           │              ┌──────▼──────┐
                           │              │   REDIS     │
                           └──────────────│ session:xxx │
                              session_id  └─────────────┘
```

### 4.3 Flux fichiers

```
┌────────────────────────────────────────────────────────────────────────────┐
│                         FLUX TRAITEMENT FICHIERS                            │
└────────────────────────────────────────────────────────────────────────────┘

┌─────────────┐     ┌─────────────────────────────────────────────────────┐
│   UPLOAD    │     │                  FILE HANDLER                        │
│  Drag&Drop  │────▶│                                                      │
│  ou Browse  │     │  ┌─────────┐   ┌───────────┐   ┌──────────────────┐ │
└─────────────┘     │  │ DETECT  │──▶│  EXTRACT  │──▶│    ANONYMIZE     │ │
                    │  │ Format  │   │  Content  │   │                  │ │
                    │  │ (magic) │   │           │   │  • Texte brut    │ │
                    │  └─────────┘   │ PDF→text  │   │  • Patterns      │ │
                    │                │ DOCX→text │   │  • spaCy NER     │ │
                    │                │ XLSX→text │   │                  │ │
                    │                └───────────┘   └────────┬─────────┘ │
                    │                                         │           │
                    └─────────────────────────────────────────┼───────────┘
                                                              │
                                                              ▼
                                                 ┌────────────────────────┐
                                                 │   DOWNLOAD            │
                                                 │   fichier_anon.txt    │
                                                 └────────────────────────┘

Formats supportés:
┌─────────────────────────────────────────────────────────────────────────────┐
│ 📄 Documents : .pdf, .docx, .xlsx, .odt, .ods, .rtf                        │
│ 📝 Texte     : .txt, .md, .log, .csv                                        │
│ ⚙️ Config    : .json, .yaml, .toml, .ini, .conf, .env                       │
│ 💻 Code      : .py, .js, .java, .cpp, .cs, .go, .rs, .rb, .php             │
│ 🐚 Shell     : .sh, .bash, .zsh, .ps1, .bat                                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Sécurité

### 5.1 Mécanismes implémentés

| Mécanisme | Implémentation | Statut |
|-----------|----------------|--------|
| **Authentification API** | Header `X-API-Key` | ✅ DEV (optionnel) |
| **CORS** | Liste blanche origines | ✅ Configurable |
| **Rate Limiting** | slowapi (10 req/min) | ✅ Activé |
| **Non-root user** | User `whisper` dans Docker | ✅ Actif |
| **Secrets** | Fichier `.env` | ✅ Implémenté |
| **Health checks** | `/health` endpoint | ✅ Docker |
| **HTTPS** | À configurer (PROD) | ⏳ Futur |
| **JWT Tokens** | À implémenter (PROD) | ⏳ Futur |

### 5.2 Isolation des données

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       SÉPARATION DES DONNÉES                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌─────────────────────────────┐    ┌─────────────────────────────────┐   │
│   │         REDIS               │    │        POSTGRESQL               │   │
│   │    (Données SENSIBLES)      │    │    (Données NON sensibles)      │   │
│   ├─────────────────────────────┤    ├─────────────────────────────────┤   │
│   │ ✓ Mappings anonymisation    │    │ ✓ Préférences UI                │   │
│   │   • Noms réels              │    │   • Checkboxes actives          │   │
│   │   • Emails originaux        │    │   • Thème (dark/light)          │   │
│   │   • Téléphones              │    │   • Langue                      │   │
│   │   • IBAN/CB                 │    │   • Configuration extension     │   │
│   │                             │    │                                  │   │
│   │ ⚠️ TTL automatique          │    │ ✓ Pas de données perso          │   │
│   │ ⚠️ Volatile (en RAM)        │    │ ✓ UUID anonyme                  │   │
│   │ ⚠️ Pas de backup            │    │ ✓ Backup possible               │   │
│   └─────────────────────────────┘    └─────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.3 Variables d'environnement (.env)

```bash
# ============================================
# WHISPER NETWORK - Configuration DEV
# ============================================

# API Security (vide = pas d'authentification)
API_KEY=

# CORS Origins (séparés par virgule)
CORS_ORIGINS=http://localhost:3000,chrome-extension://*

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_PER_MINUTE=60

# PostgreSQL
POSTGRES_PASSWORD=dev_password_change_in_prod
DATABASE_URL=postgresql+asyncpg://whisper_user:dev_password@postgres:5432/whisper_network

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# Logging
LOG_LEVEL=DEBUG
```

---

## 6. Déploiement DEV

### 6.1 Prérequis

| Composant | Version minimum | Vérification |
|-----------|-----------------|--------------|
| Docker | 24.0+ | `docker --version` |
| Docker Compose | 2.20+ | `docker compose version` |
| Git | 2.40+ | `git --version` |
| Navigateur | Chrome 120+ / Firefox 120+ | - |

### 6.2 Installation rapide

```bash
# 1. Cloner le repository
git clone https://github.com/your-repo/whisper_network.git
cd whisper_network/whisper_network

# 2. Créer le fichier .env
cp .env.example .env
# Éditer .env si nécessaire (optionnel en DEV)

# 3. Lancer les conteneurs
docker compose up -d --build

# 4. Vérifier le statut
docker compose ps
docker compose logs -f whisper-network

# 5. Tester l'API
curl http://localhost:8001/health
# {"status": "healthy", "version": "1.0.0", ...}
```

### 6.3 Architecture Docker DEV

```yaml
# docker-compose.yml (simplifié)
services:
  whisper-network:
    build: .
    ports: ["8001:8000"]
    volumes: [".:/app"]  # Hot-reload en DEV
    depends_on: [redis, postgres]
    
  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
    volumes: [redis_data:/data]
    
  postgres:
    image: postgres:15-alpine
    ports: ["5432:5432"]
    volumes: [postgres_data:/var/lib/postgresql/data]
```

### 6.4 Installation Extension

1. Ouvrir `chrome://extensions/` (Chrome) ou `about:debugging` (Firefox)
2. Activer le **Mode développeur**
3. **Charger l'extension non empaquetée** → sélectionner `whisper_browser_extension/`
4. Configurer l'URL API : `http://localhost:8001`

### 6.5 Commandes utiles DEV

```bash
# Logs en temps réel
docker compose logs -f

# Redémarrer l'API après modification
docker compose restart whisper-network

# Accéder au shell Redis
docker exec -it whisper-network-redis redis-cli

# Vider le cache Redis
docker exec whisper-network-redis redis-cli FLUSHALL

# Accéder à PostgreSQL
docker exec -it whisper-network-postgres psql -U whisper_user -d whisper_network

# Rebuild complet
docker compose down -v && docker compose up -d --build
```

---

## 7. Déploiement PROD (Futur)

### 7.1 Architecture cible PROD

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       ARCHITECTURE PRODUCTION                                │
└─────────────────────────────────────────────────────────────────────────────┘

                         ┌─────────────────┐
                         │    INTERNET     │
                         └────────┬────────┘
                                  │
                         ┌────────▼────────┐
                         │   CLOUDFLARE    │  CDN + DDoS Protection
                         │   (ou autre)    │
                         └────────┬────────┘
                                  │ HTTPS (443)
                         ┌────────▼────────┐
                         │   NGINX         │  Reverse Proxy + SSL
                         │   + Let's Encrypt│ Rate Limiting
                         └────────┬────────┘
                                  │
         ┌────────────────────────┼────────────────────────┐
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ WHISPER-API #1  │    │ WHISPER-API #2  │    │ WHISPER-API #N  │
│ (Load Balanced) │    │                 │    │                 │
└────────┬────────┘    └────────┬────────┘    └────────┬────────┘
         │                      │                      │
         └──────────────────────┼──────────────────────┘
                                │
              ┌─────────────────┴─────────────────┐
              │                                   │
    ┌─────────▼─────────┐           ┌────────────▼────────────┐
    │   REDIS CLUSTER   │           │   POSTGRESQL HA         │
    │   (Sentinel)      │           │   (Primary + Replica)   │
    └───────────────────┘           └─────────────────────────┘
```

### 7.2 Authentification par Tokens JWT (Proposition)

Pour lier les tokens aux variables anonymisées en production, voici l'architecture proposée :

#### 7.2.1 Schéma d'authentification

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    AUTHENTIFICATION JWT + SESSIONS                           │
└─────────────────────────────────────────────────────────────────────────────┘

  ┌───────────────────────────────────────────────────────────────────────────┐
  │                           FLUX D'AUTHENTIFICATION                          │
  │                                                                            │
  │  1. LOGIN/REGISTER                                                         │
  │  ┌────────────┐                           ┌────────────────────┐          │
  │  │ Extension  │──── POST /auth/login ────▶│ API Backend        │          │
  │  │            │     {user, password}      │                    │          │
  │  │            │◀─── JWT Token ────────────│ • Verify creds     │          │
  │  └────────────┘     (access + refresh)    │ • Generate JWT     │          │
  │        │                                  │ • Create user_id   │          │
  │        │                                  └────────────────────┘          │
  │        ▼                                                                   │
  │  2. REQUÊTE ANONYMISATION                                                  │
  │  ┌────────────┐                           ┌────────────────────┐          │
  │  │ Extension  │──── POST /anonymize ─────▶│ API Backend        │          │
  │  │            │     Headers:              │                    │          │
  │  │            │     Authorization:        │ • Verify JWT       │          │
  │  │            │       Bearer <JWT>        │ • Extract user_id  │          │
  │  └────────────┘                           │ • Link session     │          │
  │                                           └─────────┬──────────┘          │
  │                                                     │                      │
  │  3. STOCKAGE MAPPINGS                               ▼                      │
  │  ┌────────────────────────────────────────────────────────────────────┐  │
  │  │                              REDIS                                   │  │
  │  │                                                                      │  │
  │  │   user:{user_id}:session:{session_id}                               │  │
  │  │   {                                                                  │  │
  │  │     "user_id": "usr_abc123",        ← Lié au JWT                    │  │
  │  │     "session_id": "sess_xyz789",    ← Session conversation          │  │
  │  │     "created_at": "2026-01-14T...",                                 │  │
  │  │     "mappings": {                                                    │  │
  │  │       "NAME": {"Jean Dupont": "***NAME_1***"},                      │  │
  │  │       "EMAIL": {"jean@test.fr": "***EMAIL_1***"}                    │  │
  │  │     }                                                                │  │
  │  │   }                                                                  │  │
  │  │                                                                      │  │
  │  │   ⚠️ Isolation par user_id = Un utilisateur ne peut JAMAIS          │  │
  │  │      accéder aux mappings d'un autre                                │  │
  │  │                                                                      │  │
  │  └────────────────────────────────────────────────────────────────────┘  │
  │                                                                            │
  └───────────────────────────────────────────────────────────────────────────┘
```

#### 7.2.2 Structure JWT proposée

```python
# Exemple de payload JWT
{
    "sub": "usr_abc123def456",        # User ID unique
    "iat": 1705234567,                # Issued at
    "exp": 1705238167,                # Expires (1h)
    "type": "access",                 # Token type
    "permissions": [
        "anonymize",
        "deanonymize", 
        "file_upload"
    ],
    "rate_limit": 100,                # Requêtes/minute pour ce user
    "organization": "nxo",            # Multi-tenant (optionnel)
}
```

#### 7.2.3 Implémentation proposée

```python
# auth.py - À créer pour PROD
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from datetime import datetime, timedelta
import secrets

# Configuration
SECRET_KEY = os.getenv("JWT_SECRET_KEY", secrets.token_urlsafe(32))
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60
REFRESH_TOKEN_EXPIRE_DAYS = 30

security = HTTPBearer()

class TokenData:
    def __init__(self, user_id: str, permissions: list):
        self.user_id = user_id
        self.permissions = permissions

def create_access_token(user_id: str, permissions: list) -> str:
    """Créer un JWT access token"""
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": user_id,
        "exp": expire,
        "iat": datetime.utcnow(),
        "type": "access",
        "permissions": permissions
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    """Créer un JWT refresh token (longue durée)"""
    expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    payload = {
        "sub": user_id,
        "exp": expire,
        "type": "refresh"
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> TokenData:
    """Middleware de vérification JWT"""
    token = credentials.credentials
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
            
        return TokenData(
            user_id=user_id,
            permissions=payload.get("permissions", [])
        )
        
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

# Endpoint modifié pour PROD
@app.post("/anonymize")
async def anonymize_text(
    request: AnonymizeRequest,
    current_user: TokenData = Depends(get_current_user)  # JWT obligatoire
):
    """Anonymiser texte avec liaison user"""
    
    # Générer session liée à l'utilisateur
    session_id = f"{current_user.user_id}:{request.session_id or uuid.uuid4()}"
    
    # Stocker mappings avec préfixe user
    redis_key = f"user:{current_user.user_id}:session:{session_id}"
    
    # ... anonymisation ...
    
    return {
        "session_id": session_id,
        "user_id": current_user.user_id,  # Pour traçabilité
        # ...
    }
```

#### 7.2.4 Endpoints d'authentification à ajouter

```python
# Nouveaux endpoints pour PROD

@app.post("/auth/register")
async def register(email: str, password: str):
    """Créer un compte utilisateur"""
    user_id = f"usr_{secrets.token_urlsafe(12)}"
    # Hash password avec bcrypt
    # Stocker dans PostgreSQL
    return {"user_id": user_id, "message": "Account created"}

@app.post("/auth/login")
async def login(email: str, password: str):
    """Authentification et génération tokens"""
    # Vérifier credentials
    # Générer tokens
    return {
        "access_token": create_access_token(user_id, permissions),
        "refresh_token": create_refresh_token(user_id),
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60
    }

@app.post("/auth/refresh")
async def refresh_token(refresh_token: str):
    """Renouveler access token"""
    # Vérifier refresh token
    # Générer nouveau access token
    return {"access_token": new_access_token}

@app.post("/auth/logout")
async def logout(current_user: TokenData = Depends(get_current_user)):
    """Invalider tokens (blacklist)"""
    # Ajouter token à blacklist Redis
    return {"message": "Logged out"}
```

#### 7.2.5 Schéma base de données PROD

```sql
-- Nouvelles tables pour auth PROD

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    organization_id UUID REFERENCES organizations(id),
    permissions JSONB DEFAULT '["anonymize", "deanonymize"]',
    rate_limit INTEGER DEFAULT 100,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_login TIMESTAMPTZ
);

CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    api_key VARCHAR(255) UNIQUE,
    max_users INTEGER DEFAULT 10,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE token_blacklist (
    token_hash VARCHAR(64) PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour performances
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_org ON users(organization_id);
CREATE INDEX idx_blacklist_expires ON token_blacklist(expires_at);
```

### 7.3 Checklist déploiement PROD

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       CHECKLIST PRODUCTION                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  □ Infrastructure                                                            │
│    □ VPS/Cloud provisionné (Hetzner, OVH, Scaleway)                         │
│    □ Domaine acheté + DNS configuré                                         │
│    □ Certificat SSL (Let's Encrypt / Certbot)                               │
│    □ Firewall configuré (UFW/iptables)                                      │
│    □ Fail2ban installé                                                       │
│                                                                              │
│  □ Sécurité                                                                  │
│    □ JWT_SECRET_KEY généré (32+ caractères)                                 │
│    □ POSTGRES_PASSWORD fort                                                  │
│    □ Utilisateur SSH non-root                                               │
│    □ Accès SSH par clé uniquement                                           │
│    □ API_KEY de production                                                   │
│    □ CORS restreint aux domaines autorisés                                  │
│                                                                              │
│  □ Haute disponibilité                                                       │
│    □ Redis Sentinel ou Cluster                                              │
│    □ PostgreSQL avec replica                                                 │
│    □ Load balancer (Nginx/HAProxy)                                          │
│    □ Multi-workers Uvicorn (--workers 4)                                    │
│                                                                              │
│  □ Monitoring                                                                │
│    □ Prometheus metrics (/metrics)                                          │
│    □ Grafana dashboards                                                      │
│    □ Alerting (PagerDuty, Slack)                                            │
│    □ Uptime monitoring (UptimeRobot)                                        │
│                                                                              │
│  □ Backup                                                                    │
│    □ Snapshots quotidiens VPS                                               │
│    □ pg_dump PostgreSQL                                                      │
│    □ Redis RDB/AOF persistance                                              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 8. API Reference

### 8.1 Endpoints principaux

| Méthode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| GET | `/` | Info API | Non |
| GET | `/health` | Health check | Non |
| GET | `/docs` | Documentation Swagger | Non |
| POST | `/anonymize` | Anonymiser texte (spaCy) | Oui* |
| POST | `/anonymize/fast` | Anonymiser texte (regex) | Oui* |
| POST | `/anonymize-file` | Anonymiser fichier | Oui* |
| POST | `/deanonymize` | Restaurer texte | Oui* |
| GET | `/session/{id}/mappings` | Obtenir mappings | Oui* |
| DELETE | `/session/{id}` | Supprimer session | Oui* |
| GET | `/settings` | Config disponible | Non |
| GET | `/cache/stats` | Stats Redis | Oui* |
| POST | `/api/preferences/save` | Sauver préférences | Non |
| POST | `/api/preferences/load` | Charger préférences | Non |

*Auth optionnelle en DEV, obligatoire en PROD

### 8.2 Exemple requête/réponse

```bash
# Anonymisation
curl -X POST http://localhost:8001/anonymize \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "text": "Bonjour, je suis Jean Dupont, mon email est jean@example.com",
    "settings": {
      "anonymize_names": true,
      "anonymize_email": true
    },
    "session_id": "my-session-123",
    "ttl": 3600
  }'

# Réponse
{
  "success": true,
  "original_text": "Bonjour, je suis Jean Dupont, mon email est jean@example.com",
  "anonymized_text": "Bonjour, je suis ***NAME_1***, mon email est ***EMAIL_1***",
  "anonymizations_count": 2,
  "processing_time_ms": 45.2,
  "session_id": "my-session-123",
  "mapping_summary": {
    "NAME": {"Jean Dupont": "***NAME_1***"},
    "EMAIL": {"jean@example.com": "***EMAIL_1***"}
  }
}
```

---

## 9. Monitoring & Logs

### 9.1 Logs applicatifs

```bash
# Niveaux de log
LOG_LEVEL=DEBUG   # Développement (verbose)
LOG_LEVEL=INFO    # Production (normal)
LOG_LEVEL=WARNING # Production (minimal)

# Format des logs
2026-01-14 10:30:45 - whisper_network - INFO - 🚀 Starting Whisper Network API...
2026-01-14 10:30:46 - whisper_network - INFO - ✅ Redis connected: redis:6379
2026-01-14 10:30:46 - whisper_network - INFO - ✅ PostgreSQL connection established
2026-01-14 10:30:47 - uvicorn.access - INFO - 127.0.0.1 - "POST /anonymize" 200
```

### 9.2 Métriques disponibles

| Métrique | Description | Endpoint |
|----------|-------------|----------|
| `requests_total` | Total requêtes | `/cache/stats` |
| `cache_hits` | Hits cache Redis | `/cache/stats` |
| `cache_misses` | Misses cache | `/cache/stats` |
| `active_sessions` | Sessions actives | `/cache/stats` |
| `processing_time_ms` | Temps moyen | Chaque réponse |

### 9.3 Health checks

```bash
# Vérification santé
curl http://localhost:8001/health

{
  "status": "healthy",
  "version": "1.0.0",
  "redis": "connected",
  "postgres": "connected",
  "timestamp": "2026-01-14T10:30:00Z"
}
```

---

## 10. Évolutions prévues

### 10.1 Court terme (Q1 2026)

- [ ] HTTPS obligatoire avec Let's Encrypt
- [ ] JWT authentication complète
- [ ] Fine-tuning modèle spaCy
- [ ] Tests E2E avec Playwright

### 10.2 Moyen terme (Q2-Q3 2026)

- [ ] Multi-tenant (organisations)
- [ ] API publique avec quotas
- [ ] Reconstruction formats originaux (PDF, DOCX)
- [ ] Dashboard admin

### 10.3 Long terme (2026+)

- [ ] Mode collaboratif
- [ ] Plugin VS Code
- [ ] App mobile
- [ ] Intégration LLM local (Ollama)

---

## 📎 Annexes

### A. Références

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [spaCy NER](https://spacy.io/usage/linguistic-features#named-entities)
- [Redis Documentation](https://redis.io/docs/)
- [Docker Compose](https://docs.docker.com/compose/)

### B. Contacts

- **Auteur** : Sylvain JOLY
- **Organisation** : NANO by NXO
- **Email** : [contact@nxo.fr]
- **Repository** : [GitHub]

---

*Document généré le 14 janvier 2026*  
*Version 1.0 - Déploiement Développement*
