# 🔒 Whisper Network - Service d'Anonymisation Rapide

**Version 2.0** - Optimisé pour modèles locaux et performances maximales

## 📋 Résumé des Corrections et Améliorations

### ✅ Problèmes Résolus

1. **Erreurs de Communication Extension** 
   - ❌ `runtime.lastError: The message port closed before a response was received`
   - ✅ Gestion robuste des messages entre popup, background et content scripts
   - ✅ Gestion d'erreurs avec fallback sur paramètres par défaut

2. **Configuration Docker**
   - ✅ Healthcheck corrigé (curl installé)
   - ✅ Port mapping 8001:8000 pour correspondre à l'extension
   - ✅ Docker-compose pour faciliter le déploiement

3. **Performance et Optimisation**
   - ✅ Nouveau moteur d'anonymisation rapide (FastAnonymizer)
   - ✅ Mode "Rapide" : 1-2ms vs mode "Complet" : 50-200ms
   - ✅ Cache des patterns regex pour éviter la recompilation

### 🚀 Nouvelles Fonctionnalités

#### Backend (API)
- **Endpoint rapide** : `/anonymize/fast` - Optimisé pour modèles locaux
- **Endpoint standard** : `/anonymize` - Analyse complète avec spaCy
- **Configuration flexible** : `config.toml` pour optimiser selon l'environnement
- **Consistance des tokens** : Même valeur → même token anonymisé

#### Extension Navigateur
- **Mode de traitement** : Choix entre "Rapide ⚡" et "Complet 🎯"
- **Statistiques temps réel** : Temps de traitement, moyenne, compteur
- **Interface améliorée** : Design moderne avec indicateurs visuels
- **Gestion d'erreurs robuste** : Retry automatique et messages d'erreur clairs

## 🏃‍♂️ Démarrage Rapide

### Backend (Containerisé)

```bash
cd whisper_network
docker-compose -f docker-compose-whisper.yml up -d
```

L'API sera disponible sur `http://localhost:8001`

### Tests Rapides

```bash
# Test de santé
docker exec whisper-network python -c "import requests; print(requests.get('http://localhost:8000/health').json())"

# Test d'anonymisation rapide
docker exec whisper-network python -c "
import requests
data = {'text': 'Mon email: test@example.com, tel: 01.23.45.67.89', 'settings': {'anonymize_email': True, 'anonymize_phone': True}}
print(requests.post('http://localhost:8000/anonymize/fast', json=data).json())
"
```

## ⚡ Performances

| Mode | Temps Moyen | Cas d'Usage |
|------|-------------|-------------|
| **Rapide** | 1-5ms | Modèles locaux, chat temps réel |
| **Complet** | 50-200ms | Analyse précise, gros documents |

### Patterns Supportés (Mode Rapide)

- ✅ **Emails** : `user@domain.com` → `***EMAIL_1234***`
- ✅ **Téléphones FR** : `01.23.45.67.89` → `***TELEPHONE_5678***`
- ✅ **Adresses IP** : `192.168.1.100` → `***IP_ADDRESS_9012***`
- ✅ **Cartes bancaires** : `4532 1234 5678 9012` → `***CARTE_CREDIT_3456***`
- ✅ **IBAN FR** : `FR14 2004 1010 0505 0001 3M02 606` → `***IBAN_7890***`
- ✅ **NIR** : `1234567890123` → `***NIR_2345***`
- ✅ **URLs** : `https://example.com` → `***URL_6789***`
- 🔄 **Noms** : Liste de prénoms français courants

## 📊 Monitoring et Debug

### Logs du Container
```bash
docker logs whisper-network -f
```

### Vérification Extension
1. Ouvrir l'extension (popup)
2. Vérifier le statut API (vert = connecté)
3. Tester avec du texte d'exemple
4. Consulter les statistiques de performance

### Métriques Importantes
- **Temps de traitement** : < 5ms en mode rapide
- **Taux de succès** : > 99%
- **Utilisation mémoire** : < 50MB par container

## 🔧 Configuration Avancée

### Mode Développement (sans Docker)

```bash
cd whisper_network
pip install -e .
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

### Optimisation pour Production

Dans `config.toml` :
```toml
[performance]
use_spacy = false           # Mode rapide uniquement
cache_patterns = true       # Cache des regex
batch_size = 100           # Traitement par lots
request_timeout = 5000     # Timeout requêtes

[local_model]
enable_local_optimizations = true
max_cache_size = 50        # Limite cache (MB)
```

## 🛠️ Architecture

```
whisper_browser_extension/     # Extension Chrome/Firefox
├── popup.html/js/css         # Interface utilisateur
├── background.js             # Service Worker
├── content.js                # Injection dans pages
└── manifest.json             # Configuration extension

whisper_network/              # Backend API
├── main.py                   # FastAPI app
├── whisper_network/
│   ├── anonymizers.py        # Moteur complet (spaCy)
│   └── fast_anonymizer.py    # Moteur rapide (regex)
├── config.toml               # Configuration
└── Dockerfile                # Container optimisé
```

## 🎯 Utilisation

1. **Installation Extension** : Charger le dossier dans Chrome://extensions
2. **Démarrer Backend** : `docker-compose up -d`
3. **Configurer** : Ouvrir popup extension, vérifier connexion API
4. **Choisir Mode** : "Rapide" pour modèles locaux, "Complet" pour précision
5. **Tester** : Saisir du texte dans la zone de test

L'extension détecte automatiquement les sites de chat IA et propose l'anonymisation avant envoi.

## 🔐 Sécurité et Confidentialité

- ✅ **Traitement local** : Données anonymisées sur votre machine uniquement
- ✅ **Pas de télémétrie** : Aucune donnée envoyée à l'extérieur
- ✅ **Open Source** : Code auditable
- ✅ **Tokens cohérents** : Même donnée = même token dans la session

---

**Développé par Sylvain JOLY, NANO by NXO** | [License MIT](LICENSE) | Version 2.0.0