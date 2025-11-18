# 🔐 Configuration de la Sécurité - Extension Navigateur

## 📝 Configuration Rapide

### 1. Ouvrir l'extension
Cliquez sur l'icône 🔒 dans votre barre d'extensions

### 2. Configurer l'API Key

Dans la section **Configuration API** :

```
URL de l'API Whisper: http://localhost:8001
🔑 Clé API: dev_test_key_12345
```

⚠️ **Important** : 
- Si vous n'avez pas configuré d'API Key sur le serveur (dans le fichier `.env`), **laissez ce champ vide**
- L'extension fonctionnera uniquement si la clé correspond à celle du serveur

### 3. Sauvegarder
Cliquez sur **"Sauvegarder"** en bas de la popup

---

## 🧪 Tester la Configuration

### Test 1 : Vérifier la connexion API
1. Cliquez sur le bouton **"Tester"** à côté de l'URL
2. Vous devriez voir : `✅ API connectée (whisper-network-api)`

### Test 2 : Tester l'anonymisation
1. Dans l'onglet **"Test"** de la popup
2. Entrez du texte : `Bonjour, je suis Jean Dupont, mon email est jean@example.com`
3. Cliquez sur **"Tester l'anonymisation"**
4. Résultat attendu : `Bonjour, je suis ***NAME_1***, mon email est ***EMAIL_1***`

---

## ⚙️ Configuration Serveur

### Développement Local

Dans `whisper_network/.env` :
```bash
API_KEY=dev_test_key_12345
CORS_ORIGINS=http://localhost:3000,https://chat.openai.com,https://claude.ai
```

### Production

Générer une clé sécurisée :
```bash
openssl rand -hex 32
```

Dans `.env` :
```bash
API_KEY=votre_clé_ultra_secrète_64_caractères
CORS_ORIGINS=https://votre-domaine.com,https://chat.openai.com
```

---

## 🔍 Dépannage

### ❌ "Invalid API key" dans la console

**Symptôme** : La requête échoue avec un 403 Forbidden

**Solution** :
1. Vérifier que l'API Key dans l'extension correspond à celle du `.env`
2. Redémarrer Docker : `docker-compose restart`
3. Vérifier les logs : `docker logs whisper-network-api`

### ❌ CORS bloque les requêtes

**Symptôme** : Erreur "CORS policy blocked" dans la console navigateur

**Solution** :
1. Ajouter le domaine dans `CORS_ORIGINS` du `.env` :
   ```bash
   CORS_ORIGINS=http://localhost:3000,https://chat.openai.com,https://claude.ai
   ```
2. Redémarrer : `docker-compose restart`

### ⚠️ Pas d'API Key configurée sur le serveur

Si `API_KEY` est vide ou commenté dans le `.env`, l'API ne nécessite pas d'authentification.

Dans ce cas :
- **Laissez le champ "Clé API" vide** dans l'extension
- L'extension fonctionnera sans authentification (mode dev uniquement)

---

## 📊 Vérification Logs

Voir les requêtes dans les logs Docker :
```bash
docker logs whisper-network-api --tail 50
```

**Logs normaux** :
```
2025-11-18 10:00:00 - main - INFO - Anonymization request from 172.19.0.1
2025-11-18 10:00:00 - main - INFO - Anonymization successful: 3 replacements
```

**Logs d'erreur (mauvaise clé)** :
```
2025-11-18 10:00:00 - main - WARNING - Unauthorized access attempt with invalid API key
INFO:     172.19.0.1:40616 - "POST /anonymize HTTP/1.1" 403 Forbidden
```

---

## ✅ Checklist Configuration

- [ ] Fichier `.env` créé avec `API_KEY`
- [ ] Docker redémarré après modification `.env`
- [ ] Extension installée et rechargée (`chrome://extensions/`)
- [ ] API Key configurée dans la popup de l'extension
- [ ] Test API réussi (bouton "Tester")
- [ ] Test d'anonymisation fonctionnel

---

**Prêt à l'emploi** ! Votre extension communique maintenant de manière sécurisée avec l'API. 🎉
