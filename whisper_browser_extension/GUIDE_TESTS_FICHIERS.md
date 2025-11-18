# 📋 Guide de Test - Support Fichiers Whisper Network

## 🎯 Objectif

Tester le support complet de l'anonymisation de fichiers depuis l'extension browser jusqu'au backend.

---

## ✅ Prérequis

1. **Backend démarré** : `docker ps` doit montrer `whisper-network` en statut `healthy`
2. **Extension chargée** : Extension Whisper Network installée dans Chrome/Edge
3. **Fichiers de test** : Disponibles dans `whisper_network/` (créés automatiquement par test_file_upload.py)

---

## 🧪 Tests à Effectuer

### 1️⃣ Test Interface Extension

#### Vérifier les onglets
1. Cliquer sur l'icône de l'extension
2. Vérifier 3 onglets : 📝 Texte | 📁 Fichier | ⚙️ Paramètres
3. Naviguer entre les onglets → Doit être fluide

#### Onglet Paramètres
1. Aller dans ⚙️ Paramètres
2. Vérifier URL API : `http://localhost:8001`
3. Vérifier API Key : `dev_test_key_12345`
4. Modifier et cliquer "💾 Sauvegarder"
5. Fermer/rouvrir popup → Paramètres doivent être conservés ✅

---

### 2️⃣ Test Upload Fichier Texte Simple

1. Aller dans onglet 📁 Fichier
2. Cliquer sur la zone de drop
3. Sélectionner `test_sample.txt`
4. Vérifier affichage :
   - ✅ Fichier sélectionné
   - 📄 Nom du fichier
   - 📦 Taille affichée
   - 📑 Type `.txt`
5. Cliquer "🔒 Anonymiser"
6. Observer :
   - Barre de progression ✅
   - Message "📤 Upload en cours..."
   - Message "🔒 Anonymisation en cours..."
   - Message "✅ Fichier anonymisé avec succès !"
7. Vérifier téléchargement : `test_sample.anonymized.txt`
8. Ouvrir le fichier téléchargé :
   ```
   Bonjour,

   Je suis ***NAME_2***, développeur chez ***ORG_1***.
   Mon email: ***EMAIL_1***
   Mon téléphone: ***PHONE_1***
   ```
9. **Vérifier formatage préservé** : Retours ligne, indentation ✅

---

### 3️⃣ Test Upload Script Python

1. Sélectionner `test_script.py`
2. Anonymiser
3. Vérifier fichier téléchargé :
   - Syntaxe Python intacte
   - Indentation préservée
   - Emails/phones anonymisés
   - Pas de code cassé

**Exemple attendu** :
```python
#!/usr/bin/env ***ID_1***
# Script de test pour anonymisation
# Auteur: ***NAME_2*** <***EMAIL_1***>

def main():
    email = "***EMAIL_2***"
    phone = "***PHONE_1***"
```

---

### 4️⃣ Test Upload Config YAML

1. Sélectionner `test_config.yaml`
2. Anonymiser
3. Vérifier fichier téléchargé :
   - Structure YAML intacte
   - Clés non modifiées
   - Valeurs sensibles anonymisées
   - Indentation préservée

**Exemple attendu** :
```yaml
database:
  host: ***IP_PRIVEE_1***
  port: 5432
  username: admin
  password: ***LOCATION_1***

users:
  - name: ***NAME_3***
    email: ***EMAIL_3***
```

---

### 5️⃣ Test Upload Markdown

1. Sélectionner `test_doc.md`
2. Anonymiser
3. Vérifier fichier téléchargé :
   - Titres Markdown intacts (`#`, `##`)
   - Tableaux intacts
   - Blocs code intacts
   - PII anonymisées

---

### 6️⃣ Test Mode Rapide

1. Sélectionner `test_sample.txt`
2. ✅ Cocher "Mode rapide"
3. Anonymiser
4. Vérifier :
   - Temps de traitement < 10ms
   - Tokens simples : `NOM_1`, `EMAIL_1`, `TEL_1`
   - Formatage préservé

---

### 7️⃣ Test Drag & Drop

1. Ouvrir l'explorateur de fichiers
2. Glisser `test_sample.txt` sur la zone de drop
3. Vérifier :
   - Effet visuel pendant survol
   - Fichier détecté automatiquement
   - Bouton "Anonymiser" activé

---

### 8️⃣ Test Annulation

1. Sélectionner un fichier
2. Cliquer "✖ Annuler"
3. Vérifier :
   - Zone de drop revenue à l'état initial
   - Infos fichier cachées
   - Bouton "Anonymiser" désactivé

---

### 9️⃣ Test Erreurs

#### Fichier trop gros
1. Créer un fichier > 10MB :
   ```bash
   dd if=/dev/zero of=big_file.txt bs=1M count=11
   ```
2. Uploader → Erreur attendue : "File too large"

#### Mauvais format
1. Uploader un `.exe` ou `.zip`
2. Erreur attendue : "Unsupported file type"

#### API down
1. Arrêter le backend : `docker stop whisper-network`
2. Uploader un fichier
3. Erreur attendue : "Cannot connect to API"
4. Redémarrer : `docker start whisper-network`

---

### 🔟 Test Multi-fichiers Séquence

1. Anonymiser `test_sample.txt`
2. Sans fermer popup, cliquer "✖ Annuler"
3. Anonymiser `test_script.py`
4. Annuler
5. Anonymiser `test_config.yaml`
6. Vérifier : 3 fichiers téléchargés distincts

---

## 📊 Critères de Succès

| Critère | Attendu | Status |
|---------|---------|--------|
| Interface à onglets | 3 onglets fonctionnels | ⬜ |
| Upload clic | Sélection fichier OK | ⬜ |
| Upload drag & drop | Glisser-déposer OK | ⬜ |
| Détection type fichier | Extension + taille affichées | ⬜ |
| Barre progression | Affichage 0-100% | ⬜ |
| Téléchargement auto | Fichier .anonymized téléchargé | ⬜ |
| Formatage texte | Retours ligne préservés | ⬜ |
| Formatage code | Indentation préservée | ⬜ |
| Formatage config | Structure YAML/JSON intacte | ⬜ |
| Mode rapide | Traitement < 10ms | ⬜ |
| Gestion erreurs | Messages d'erreur clairs | ⬜ |
| Persistance settings | Paramètres sauvegardés | ⬜ |

---

## 🐛 Bugs Connus

1. **"Téléphone" cassé** : Dans scripts Python, `print(f"Téléphone: {phone}")` devient `***LOCATION_1***: {phone})`
   - Cause : SpaCy détecte "Téléphone" comme LOC
   - Impact : Mineur, uniquement dans strings Python
   - Fix prévu : Améliorer filtrage NER pour strings

---

## 📝 Notes de Test

### Performance Attendue

- Texte simple (< 1KB) : ~300-400ms
- Script Python (< 5KB) : ~30-50ms
- Config YAML (< 5KB) : ~30-50ms
- Mode rapide : < 10ms

### Formats de Sortie

Tous les fichiers doivent :
- ✅ Conserver l'extension originale
- ✅ Ajouter `.anonymized` avant extension : `file.anonymized.txt`
- ✅ Conserver l'encoding original (UTF-8, Latin-1, etc.)
- ✅ Préserver structure (retours ligne, tabs, espaces)

---

## ✅ Validation Finale

Après tous les tests, vérifier :

1. **Backend logs** : Pas d'erreurs critiques
   ```bash
   docker logs whisper-network | tail -50
   ```

2. **Fichiers téléchargés** : Tous lisibles et formatés
   ```bash
   ls -la *.anonymized.*
   ```

3. **Métriques** :
   - Nombres d'anonymisations corrects
   - Temps de traitement raisonnables
   - Pas de perte de données

---

**Testé par** : _________________  
**Date** : _________________  
**Résultat** : ✅ Succès / ❌ Échec / ⚠️ Partiel  
**Notes** : _________________

---

## 🚀 Prochaines Étapes

Si tous les tests passent :
1. Mettre à jour ROADMAP.md avec [x] sur "Support Fichiers Importés"
2. Commit et push des changements
3. Passer à la prochaine fonctionnalité (Performance/Cache ou Interface avancée)
