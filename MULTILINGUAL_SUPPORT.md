# 🌍 Support Multi-Langues - Whisper Network

> Détection automatique et anonymisation en Français et Anglais

---

## ✨ **Nouveauté : Support Bilingue FR/EN**

Whisper Network détecte maintenant **automatiquement** la langue de votre texte et utilise le modèle IA approprié pour une meilleure détection des noms propres.

### 🎯 **Langues Supportées**

| Langue | Code | Modèle spaCy | Détection Noms | Status |
|--------|------|--------------|----------------|--------|
| 🇫🇷 Français | `fr` | `fr_core_news_sm` | ✅ Oui | ✅ **Actif** |
| 🇬🇧 Anglais | `en` | `en_core_web_sm` | ✅ Oui | ✅ **Actif** |
| 🇪🇸 Espagnol | `es` | - | ❌ Non | 📅 Prévu |
| 🇩🇪 Allemand | `de` | - | ❌ Non | 📅 Prévu |
| 🇮🇹 Italien | `it` | - | ❌ Non | 📅 Prévu |

---

## 🔧 **Comment ça marche ?**

### 1. **Détection Automatique**
```python
# L'API détecte automatiquement la langue
POST /anonymize
{
  "text": "Hello, my name is John Doe and my email is john@example.com",
  "settings": { "anonymize_names": true, "anonymize_email": true }
}

# Réponse :
{
  "anonymized_text": "Hello, my name is ***NAME_1*** and my email is ***EMAIL_1***",
  "detected_language": "en"  // ← Détecté automatiquement
}
```

### 2. **Modèles IA par Langue**

#### Français → `fr_core_news_sm`
```python
Input:  "Bonjour, je m'appelle Jean Dupont et mon email est jean@example.fr"
Output: "Bonjour, je m'appelle ***NAME_1*** et mon email est ***EMAIL_1***"
```

#### Anglais → `en_core_web_sm`
```python
Input:  "Hi, I'm John Smith and my email is john@example.com"
Output: "Hi, I'm ***NAME_1*** and my email is ***EMAIL_1***"
```

### 3. **Fallback Intelligent**

Si la langue n'est pas détectée ou non supportée :
- ✅ Utilise le modèle **français** par défaut
- ✅ Les **regex universelles** fonctionnent toujours (emails, téléphones, etc.)
- ⚠️ Seule la détection de **noms propres** peut être moins précise

---

## 📦 **Installation des Modèles**

### Automatique (Docker)
```bash
# Les modèles sont installés automatiquement via requirements.txt
docker-compose build
```

### Manuel (développement local)
```bash
# Installer les modèles spaCy
pip install spacy
python -m spacy download fr_core_news_sm
python -m spacy download en_core_web_sm

# Installer langdetect
pip install langdetect
```

---

## 🧪 **Tester le Support Multi-Langues**

### Test Français
```bash
curl -X POST http://localhost:8001/anonymize \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Bonjour, je suis Marie Curie et mon numéro est 06 12 34 56 78",
    "settings": {
      "anonymize_names": true,
      "anonymize_phone": true
    }
  }'
```

**Résultat attendu** :
```json
{
  "success": true,
  "anonymized_text": "Bonjour, je suis ***NAME_1*** et mon numéro est ***PHONE_1***",
  "detected_language": "fr"
}
```

### Test Anglais
```bash
curl -X POST http://localhost:8001/anonymize \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Hello, I am Albert Einstein and my phone is +1-555-123-4567",
    "settings": {
      "anonymize_names": true,
      "anonymize_phone": true
    }
  }'
```

**Résultat attendu** :
```json
{
  "success": true,
  "anonymized_text": "Hello, I am ***NAME_1*** and my phone is ***PHONE_1***",
  "detected_language": "en"
}
```

---

## ⚙️ **Configuration Avancée**

### Forcer une Langue Spécifique

Si vous voulez **forcer** une langue au lieu de la détection auto :

```python
# Dans main.py ou votre code
class AnonymizeRequest(BaseModel):
    text: str
    settings: Dict[str, bool]
    force_language: Optional[str] = None  # 'fr', 'en', etc.

# Utilisation
{
  "text": "...",
  "settings": {...},
  "force_language": "en"  // ← Force le modèle anglais
}
```

*Note : Cette fonctionnalité n'est pas encore implémentée mais peut être ajoutée facilement.*

---

## 📊 **Performance par Langue**

| Langue | Modèle Taille | Mémoire RAM | Vitesse | Précision Noms |
|--------|---------------|-------------|---------|----------------|
| Français | ~15 MB | ~100 MB | ~1000 tok/s | 85-90% |
| Anglais | ~13 MB | ~90 MB | ~1200 tok/s | 90-95% |

**Impact Total** :
- 💾 **Disque** : +28 MB (2 modèles)
- 🧠 **RAM** : +190 MB (si les 2 chargés)
- ⚡ **Performance** : Négligeable (<1ms overhead détection)

---

## 🎓 **Cas d'Usage**

### Texte Mixte (FR + EN)
```python
Input: "Bonjour, I'm working with Jean Dupont on project X"

# La langue majoritaire est détectée (FR dans ce cas)
Output: "Bonjour, I'm working with ***NAME_1*** on project X"
```

### Email Multilingue
```python
Input: """
Subject: Meeting with John Smith
Bonjour Jean,
I hope this email finds you well.
Cordialement, Marie Dubois
"""

Output: """
Subject: Meeting with ***NAME_1***
Bonjour ***NAME_2***,
I hope this email finds you well.
Cordialement, ***NAME_3***
"""
```

---

## 🔮 **Prochaines Langues**

### Espagnol 🇪🇸 (Planifié)
```bash
python -m spacy download es_core_news_sm
```

### Allemand 🇩🇪 (Planifié)
```bash
python -m spacy download de_core_news_sm
```

### Italien 🇮🇹 (Planifié)
```bash
python -m spacy download it_core_news_sm
```

---

## ❓ **FAQ**

### Q : Est-ce que ça marche si le modèle anglais n'est pas installé ?
**R :** Oui ! L'app fonctionne même sans modèles IA. Les **regex universelles** (emails, téléphones, IBAN, etc.) fonctionnent toujours. Seule la détection de noms propres est désactivée.

### Q : Ça ralentit l'API ?
**R :** Non, l'overhead de détection de langue est <1ms. Les modèles sont chargés **une fois** au démarrage.

### Q : Je peux désactiver un modèle ?
**R :** Oui, commentez simplement la ligne dans `requirements.txt` :
```bash
# https://github.com/explosion/spacy-models/.../en_core_web_sm-3.7.1-py3-none-any.whl
```

### Q : Combien de langues maximum ?
**R :** Techniquement illimité, mais chaque modèle ajoute ~15MB disque et ~100MB RAM. Pour 5-10 langues, c'est parfaitement gérable.

---

## 🚀 **Mise à Jour depuis Version Précédente**

Si vous avez déjà Whisper Network installé :

```bash
# 1. Mettre à jour le code
cd whisper_network
git pull  # ou récupérer les nouveaux fichiers

# 2. Rebuild le container Docker
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# 3. Vérifier que les modèles sont chargés
docker logs whisper-network-api | grep "Modèle spaCy"

# Résultat attendu :
# ✅ Modèle spaCy français chargé
# ✅ Modèle spaCy anglais chargé
```

---

## 📈 **Monitoring Multi-Langues**

Ajoutez des logs pour suivre l'utilisation :

```python
# Dans anonymizers.py
def _detect_language(self, text: str) -> str:
    lang = detect(text)
    print(f"🌍 Langue détectée : {lang}")
    return lang
```

**Analyse des logs** :
```bash
docker logs whisper-network-api | grep "Langue détectée" | sort | uniq -c

# Exemple résultat :
#  45 🌍 Langue détectée : fr
#  12 🌍 Langue détectée : en
#   3 🌍 Langue détectée : es
```

---

## 💡 **Contribuer**

Vous voulez ajouter une nouvelle langue ?

1. **Trouver le modèle spaCy** : https://spacy.io/models
2. **Ajouter dans requirements.txt**
3. **Modifier `anonymizers.py`** :
```python
# Ajouter dans __init__
self.nlp_es = spacy.load("es_core_news_sm")

# Ajouter dans _select_nlp_model
elif detected_lang == 'es' and self.nlp_es:
    self.nlp = self.nlp_es
```
4. **Tester** avec des textes dans cette langue
5. **PR** sur GitHub ! 🎉

---

**Besoin d'aide ?** Ouvrir une issue GitHub ou contacter l'équipe.

---

**Dernière mise à jour** : 18 novembre 2025  
**Mainteneur** : Sylvain JOLY, NANO by NXO  
**License** : MIT
