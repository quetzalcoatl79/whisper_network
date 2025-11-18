# 📁 Support Fichiers - Whisper Network

## 🎯 Vue d'ensemble

Whisper Network supporte maintenant l'anonymisation de **fichiers complets** en préservant leur formatage et structure. Plus besoin de copier-coller, uploadez directement vos fichiers !

---

## ✨ Fonctionnalités

### 📄 Formats Supportés

#### Texte Simple
- `.txt` - Fichiers texte brut
- `.md` - Markdown / Documentation
- `.log` - Logs système/application
- `.rst` - reStructuredText
- `.csv` - Données tabulaires

#### Configuration
- `.yaml`, `.yml` - Configurations YAML
- `.json` - Configurations JSON
- `.toml` - Configurations TOML
- `.ini` - Fichiers INI
- `.conf` - Configs système
- `.env` - Variables d'environnement
- `.properties` - Propriétés Java

#### Scripts & Code
- **Shell**: `.sh`, `.bash`, `.zsh`, `.fish`
- **PowerShell**: `.ps1`, `.psm1`, `.psd1`
- **Python**: `.py`, `.pyw`
- **JavaScript**: `.js`, `.mjs`, `.cjs`, `.ts`, `.tsx`
- **Langages compilés**: `.java`, `.cpp`, `.c`, `.h`, `.cs`, `.go`, `.rs`
- **Autres**: `.rb`, `.php`, `.pl`, `.lua`, `.swift`, `.kt`

### 🎨 Préservation du Formatage

✅ **Retours à la ligne** conservés  
✅ **Indentation** (espaces et tabs) préservée  
✅ **Structure** des fichiers intacte  
✅ **Syntaxe** du code non cassée  
✅ **Encoding** original respecté (UTF-8, Latin-1, etc.)

### 🚀 Modes d'Anonymisation

- **Standard** : NER avancé avec spaCy (FR + EN)
  - Détection contextuelle des entités
  - Précision maximale
  - ~300-400ms pour fichiers < 5KB

- **Rapide** : Regex optimisé
  - Ultra-rapide (< 10ms)
  - Idéal pour fichiers lourds
  - Tokens simples (`NOM_1`, `EMAIL_1`)

---

## 🖥️ Utilisation Backend

### API Endpoint

```http
POST /anonymize-file
Content-Type: multipart/form-data
X-API-Key: your_api_key

file: [binary file data]
use_fast: false (optionnel)
```

### Headers de Réponse

```http
Content-Disposition: attachment; filename="file.anonymized.txt"
X-Anonymizations-Count: 15
X-Processing-Time-Ms: 324.5
X-Original-Filename: file.txt
X-File-Type: text
```

### Exemple cURL

```bash
curl -X POST "http://localhost:8001/anonymize-file" \
  -H "X-API-Key: dev_test_key_12345" \
  -F "file=@document.txt" \
  -F "use_fast=false" \
  --output document.anonymized.txt
```

### Exemple Python

```python
import requests

API_URL = "http://localhost:8001"
API_KEY = "dev_test_key_12345"

with open("document.txt", "rb") as f:
    files = {"file": ("document.txt", f)}
    headers = {"X-API-Key": API_KEY}
    params = {"use_fast": False}
    
    response = requests.post(
        f"{API_URL}/anonymize-file",
        files=files,
        headers=headers,
        params=params
    )
    
    if response.ok:
        with open("document.anonymized.txt", "wb") as out:
            out.write(response.content)
        
        print(f"Anonymisations: {response.headers['X-Anonymizations-Count']}")
        print(f"Temps: {response.headers['X-Processing-Time-Ms']}ms")
```

---

## 🌐 Utilisation Extension Browser

### Interface Graphique

1. **Ouvrir l'extension** → Cliquer sur l'icône Whisper Network
2. **Onglet "📁 Fichier"** → Naviguer vers l'onglet fichiers
3. **Upload** :
   - **Clic** : Cliquer sur la zone pour sélectionner un fichier
   - **Drag & Drop** : Glisser-déposer un fichier sur la zone
4. **Options** :
   - ☐ Mode rapide (pour fichiers lourds)
5. **Anonymiser** : Cliquer sur "🔒 Anonymiser"
6. **Téléchargement** : Le fichier `.anonymized` est téléchargé automatiquement

### Exemple Visuel

```
┌─────────────────────────────────────────┐
│  📝 Texte  📁 Fichier  ⚙️ Paramètres   │
├─────────────────────────────────────────┤
│                                         │
│         ┌───────────────────────┐       │
│         │         📄            │       │
│         │  Cliquez ou déposez   │       │
│         │    votre fichier      │       │
│         └───────────────────────┘       │
│                                         │
│  📄 Fichier: document.txt               │
│  📦 Taille: 2.5 KB                      │
│  📑 Type: .txt                          │
│                                         │
│  ☐ Mode rapide                          │
│                                         │
│  [====================] 100%            │
│                                         │
│  ✅ Fichier anonymisé avec succès !    │
│  📊 15 anonymisations • ⚡ 324ms        │
│                                         │
│  [🔒 Anonymiser]  [✖ Annuler]           │
│                                         │
└─────────────────────────────────────────┘
```

---

## 📊 Informations Techniques

### Limites

| Paramètre | Valeur |
|-----------|--------|
| Taille max fichier | 10 MB |
| Encodings supportés | UTF-8, Latin-1, CP1252, etc. (auto-détection) |
| Formats | 30+ extensions |
| Timeout upload | 60 secondes |
| Rate limit | 10 requêtes/minute |

### Architecture Backend

```python
# whisper_network/file_handler.py

class FileHandler:
    """Gère l'upload, parsing et export des fichiers."""
    
    async def validate_file() -> bool
        # Validation: taille, type, encoding
    
    async def parse_file() -> FileInfo
        # Parsing: détection encoding, extraction contenu
    
    async def export_file() -> bytes
        # Export: re-encoding, génération filename
```

### Endpoint FastAPI

```python
# main.py

@app.post("/anonymize-file")
async def anonymize_file(
    file: UploadFile,
    use_fast: bool = False,
    api_key: str = Security(verify_api_key)
):
    # 1. Parser le fichier
    file_info = await file_handler.parse_file(...)
    
    # 2. Anonymiser le contenu
    result = await anonymization_engine.anonymize(...)
    
    # 3. Exporter le fichier
    filename, bytes = await file_handler.export_file(...)
    
    # 4. Retourner en téléchargement
    return StreamingResponse(io.BytesIO(bytes), ...)
```

---

## 🧪 Tests

### Test Backend

```bash
cd whisper_network
python test_file_upload.py
```

**Résultat attendu** :
```
============================================================
FILE UPLOAD ANONYMIZATION - TEST SUITE
============================================================
✅ API is healthy

📝 Creating test files...
✅ Created: test_sample.txt
✅ Created: test_script.py
✅ Created: test_config.yaml
✅ Created: test_doc.md

============================================================
Testing: test_sample.txt
Engine: Standard
============================================================
✅ Success!
   File Type: text
   Anonymizations: 7
   Processing Time: 324.11ms
   Output Size: 163 bytes
   Saved to: test_sample.anonymized.txt
```

### Test Extension

Voir le guide complet : **[GUIDE_TESTS_FICHIERS.md](./GUIDE_TESTS_FICHIERS.md)**

---

## 🎯 Exemples d'Utilisation

### 1. Anonymiser un script Python

**Avant** (`script.py`) :
```python
# Auteur: Jean Dupont <jean.dupont@company.fr>

def main():
    email = "admin@company.fr"
    phone = "+33 1 23 45 67 89"
    server = "192.168.1.100"
    
    print(f"Contact: {email}")
```

**Après** (`script.anonymized.py`) :
```python
# Auteur: ***NAME_1*** <***EMAIL_1***>

def main():
    email = "***EMAIL_2***"
    phone = "***PHONE_1***"
    server = "***IP_PRIVEE_1***"
    
    print(f"Contact: {email}")
```

✅ Syntaxe Python intacte  
✅ Indentation préservée  
✅ PII anonymisées

---

### 2. Anonymiser une configuration YAML

**Avant** (`config.yaml`) :
```yaml
database:
  host: 192.168.1.50
  username: admin
  password: secret123

users:
  - name: Pierre Durand
    email: pierre.durand@company.com
    phone: 01 23 45 67 89
```

**Après** (`config.anonymized.yaml`) :
```yaml
database:
  host: ***IP_PRIVEE_1***
  username: admin
  password: ***LOCATION_1***

users:
  - name: ***NAME_1***
    email: ***EMAIL_1***
    phone: ***PHONE_1***
```

✅ Structure YAML intacte  
✅ Clés non modifiées  
✅ Valeurs sensibles anonymisées

---

### 3. Anonymiser de la documentation Markdown

**Avant** (`README.md`) :
```markdown
# Projet XYZ

## Contact

**Chef de projet**: Jean-Michel Durand  
**Email**: jm.durand@company.fr  
**Téléphone**: +33 6 12 34 56 78

## Serveurs

| Env | IP | URL |
|-----|-----|-----|
| Prod | 192.168.1.100 | https://prod.example.com |
```

**Après** (`README.anonymized.md`) :
```markdown
# Projet XYZ

## Contact

**Chef de projet**: ***NAME_1***  
**Email**: ***EMAIL_1***  
**Téléphone**: ***PHONE_1***

## Serveurs

| Env | IP | URL |
|-----|-----|-----|
| Prod | ***IP_PRIVEE_1*** | ***URL_1*** |
```

✅ Markdown intact (titres, tableaux)  
✅ Formatage préservé  
✅ PII anonymisées

---

## 🐛 Problèmes Connus

### 1. Mots détectés comme entités dans strings

**Symptôme** : Dans du code, `"Hello World"` peut être détecté comme nom propre.

**Impact** : Mineur, uniquement dans strings entre guillemets.

**Workaround** : Utiliser le mode rapide pour fichiers code.

**Fix prévu** : Amélioration du filtrage NER pour détecter contexte de strings.

---

### 2. Encodings exotiques

**Symptôme** : Fichiers avec encodings rares (EBCDIC, etc.) peuvent échouer.

**Impact** : Très rare, la plupart des encodings modernes sont supportés.

**Workaround** : Convertir en UTF-8 avant upload.

---

## 📚 Ressources

- **Backend** : `whisper_network/file_handler.py`
- **API** : `whisper_network/main.py` (endpoint `/anonymize-file`)
- **Extension** : `whisper_browser_extension/popup-file.html` + `popup-file.js`
- **Tests** : `whisper_network/test_file_upload.py`
- **Guide Tests** : `whisper_browser_extension/GUIDE_TESTS_FICHIERS.md`

---

## 🚀 Prochaines Améliorations

- [ ] Support .pdf (extraction texte)
- [ ] Support .docx (Microsoft Word)
- [ ] Support .odt (LibreOffice)
- [ ] Preview avant/après dans extension
- [ ] Batch processing (multiple fichiers)
- [ ] Compression ZIP pour gros fichiers

---

**Version** : 1.0.0  
**Date** : 18 novembre 2025  
**Auteur** : Sylvain JOLY, NANO by NXO  
**License** : MIT
