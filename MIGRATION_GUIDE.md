# 🔄 Guide de Migration - Support Multi-Langues

> Comment mettre à jour votre installation existante

---

## 📦 **Mise à Jour Rapide**

### Option 1 : Docker (Recommandé)

```bash
# 1. Arrêter les containers
cd whisper_network
docker-compose down

# 2. Rebuild avec les nouveaux modèles
docker-compose build --no-cache

# 3. Redémarrer
docker-compose up -d

# 4. Vérifier les logs
docker logs whisper-network-api | tail -20

# Vous devriez voir :
# ✅ Modèle spaCy français chargé
# ✅ Modèle spaCy anglais chargé
```

**Temps estimé** : 3-5 minutes

---

### Option 2 : Installation Locale

```bash
# 1. Mettre à jour les dépendances
cd whisper_network
pip install -r requirements.txt

# 2. Les modèles spaCy seront installés automatiquement
# Si erreur, installer manuellement :
python -m spacy download fr_core_news_sm
python -m spacy download en_core_web_sm

# 3. Installer langdetect
pip install langdetect

# 4. Redémarrer l'API
python main.py
```

**Temps estimé** : 2-3 minutes

---

## 🧪 **Vérification Installation**

### Test 1 : Vérifier les modèles

```bash
# Depuis le container
docker exec -it whisper-network-api python -c "
import spacy
try:
    nlp_fr = spacy.load('fr_core_news_sm')
    print('✅ Modèle FR OK')
except:
    print('❌ Modèle FR manquant')

try:
    nlp_en = spacy.load('en_core_web_sm')
    print('✅ Modèle EN OK')
except:
    print('❌ Modèle EN manquant')
"
```

### Test 2 : Tester l'API

```bash
# Test français
curl -X POST http://localhost:8001/anonymize \
  -H "Content-Type: application/json" \
  -d '{"text": "Bonjour Marie Curie", "settings": {"anonymize_names": true}}'

# Test anglais
curl -X POST http://localhost:8001/anonymize \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello John Smith", "settings": {"anonymize_names": true}}'
```

### Test 3 : Script automatique

```bash
cd whisper_network
python test_multilingual.py
```

---

## 📊 **Impact de la Mise à Jour**

### Ressources Ajoutées

| Ressource | Avant | Après | Delta |
|-----------|-------|-------|-------|
| **Disque** | ~200 MB | ~228 MB | +28 MB |
| **RAM** | ~400 MB | ~590 MB | +190 MB |
| **CPU** | Inchangé | Inchangé | - |

### Performance

| Métrique | Avant | Après | Impact |
|----------|-------|-------|--------|
| **Démarrage** | ~5s | ~8s | +3s (chargement 2 modèles) |
| **Requête FR** | ~50ms | ~50ms | Identique |
| **Requête EN** | ~50ms | ~50ms | Identique |
| **Détection langue** | N/A | <1ms | Négligeable |

---

## ⚠️ **Problèmes Connus**

### Erreur : "No module named 'langdetect'"

**Solution** :
```bash
pip install langdetect
# OU dans Docker
docker-compose build --no-cache
```

### Erreur : "Can't find model 'en_core_web_sm'"

**Solution** :
```bash
# Installation manuelle
python -m spacy download en_core_web_sm

# Dans Docker, rebuild
docker-compose build --no-cache
```

### Avertissement : "Modèle spaCy anglais non trouvé"

**Impact** : L'app fonctionne quand même !
- ✅ Détection emails, phones, URLs : OK
- ⚠️ Détection noms anglais : Moins précise
- ✅ Détection noms français : OK (si modèle FR présent)

**Solution** : Installer le modèle EN (voir ci-dessus)

### RAM insuffisante

Si votre serveur a **moins de 1 GB RAM** :

**Option A** : Utiliser uniquement le mode rapide
```python
# Dans main.py, désactiver les modèles IA
SPACY_AVAILABLE = False
```

**Option B** : Charger un seul modèle
```python
# Dans anonymizers.py, commenter le modèle non utilisé
# self.nlp_en = spacy.load("en_core_web_sm")
```

---

## 🔙 **Rollback (Retour en Arrière)**

Si vous voulez revenir à la version mono-langue :

### 1. Restaurer requirements.txt

```diff
fastapi>=0.104.0
uvicorn[standard]>=0.24.0
pydantic>=2.4.0
python-multipart>=0.0.6
spacy>=3.7.0
-# Modèles spaCy multilingues
https://github.com/explosion/spacy-models/releases/download/fr_core_news_sm-3.7.0/fr_core_news_sm-3.7.0-py3-none-any.whl
-https://github.com/explosion/spacy-models/releases/download/en_core_web_sm-3.7.1/en_core_web_sm-3.7.1-py3-none-any.whl
-# Détection automatique de langue
-langdetect>=1.0.9
```

### 2. Restaurer anonymizers.py

```python
# Remplacer par :
self.nlp = None
if SPACY_AVAILABLE:
    try:
        self.nlp = spacy.load("fr_core_news_sm")
    except OSError:
        print("⚠️  Modèle spaCy français non trouvé.")
        self.nlp = None
```

### 3. Rebuild

```bash
docker-compose build --no-cache
docker-compose up -d
```

---

## 🎓 **FAQ Migration**

### Q : Mes données existantes sont-elles affectées ?
**R :** Non, l'anonymisation est **stateless**. Aucune donnée n'est stockée.

### Q : Dois-je modifier mes requêtes API ?
**R :** Non ! L'API reste **100% compatible**. La détection est automatique.

### Q : Ça marche avec mon extension navigateur ?
**R :** Oui, aucune modification nécessaire côté extension.

### Q : Je peux désactiver la détection auto ?
**R :** Oui, l'API peut être étendue pour forcer une langue :
```python
# Feature à implémenter
{"text": "...", "settings": {...}, "force_language": "fr"}
```

### Q : Combien de temps pour migrer ?
**R :** 
- Docker : **3-5 minutes**
- Local : **2-3 minutes**
- Production : **5-10 minutes** (avec tests)

---

## ✅ **Checklist Migration**

Avant de mettre en production :

- [ ] Backup de la configuration actuelle
- [ ] Mise à jour du code (git pull ou copie fichiers)
- [ ] Rebuild Docker ou pip install
- [ ] Vérifier les logs (modèles chargés)
- [ ] Tester avec `test_multilingual.py`
- [ ] Tester l'extension navigateur
- [ ] Vérifier les métriques (RAM, CPU)
- [ ] Documenter pour l'équipe

---

## 📞 **Support**

Besoin d'aide ? 

- 📖 **Documentation** : Lire `MULTILINGUAL_SUPPORT.md`
- 🐛 **Issues GitHub** : Ouvrir un ticket
- 💬 **Discussion** : Section Discussions GitHub

---

**Bonne migration !** 🚀

---

**Dernière mise à jour** : 18 novembre 2025  
**Mainteneur** : Sylvain JOLY, NANO by NXO
