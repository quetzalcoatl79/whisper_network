# 🧪 Guide de Test - Dé-anonymisation Automatique

## 📋 Pré-requis

1. **Backend démarré** : `docker-compose up -d` (whisper-network + redis)
2. **Extension rechargée** dans Chrome : `chrome://extensions` → Recharger
3. **Page ChatGPT/Claude rechargée** : F5

---

## ✅ Checklist de Test

### Test 1 : Vérification Console

1. Ouvrir DevTools (F12)
2. Console doit afficher :
   ```
   🔒 Whisper Network - Démarré !
   ✅ Bouton Whisper créé !
   [SessionManager] Loaded X sessions from storage
   [ResponseInterceptor] Initializing...
   [ResponseInterceptor] Started observing chatgpt
   [Whisper Network] Response interceptor initialized
   ```

**✅ Si tu vois ces logs** → Extension chargée correctement !

---

### Test 2 : Anonymisation avec Session

1. Dans ChatGPT, écrire :
   ```
   Jean Dupont habite à Paris.
   Email: jean.dupont@test.fr
   Tél: 06 12 34 56 78
   ```

2. Cliquer sur **🔒 ANONYMISER**

3. Vérifier dans la console :
   ```
   📌 Using session ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   ```

4. Le texte doit devenir :
   ```
   ***NAME_1*** habite à ***LOCATION_1***.
   Email: ***EMAIL_1***
   Tél: ***PHONE_1***
   ```

5. **Envoyer le message** à ChatGPT

**✅ Attendu** : Message envoyé avec tokens anonymisés

---

### Test 3 : Détection Réponse avec Tokens

ChatGPT va répondre quelque chose comme :
```
Bonjour ! Vous vous appelez ***NAME_1*** et vous habitez à ***LOCATION_1***.
Je peux vous contacter à ***EMAIL_1*** ou ***PHONE_1***.
```

**Dans la console, tu dois voir** :
```
[ResponseInterceptor] Detected anonymized tokens in response
[ResponseInterceptor] Deanonymizing with session: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
[ResponseInterceptor] Deanonymized successfully: 4 replacements
```

---

### Test 4 : Vérification Visuelle

Sur la réponse de ChatGPT, tu dois voir **2 éléments** :

#### A) Si mode AUTO (par défaut) :
- ✅ **Texte dé-anonymisé automatiquement** :
  ```
  Bonjour ! Vous vous appelez Jean Dupont et vous habitez à Paris.
  Je peux vous contacter à jean.dupont@test.fr ou 06 12 34 56 78.
  ```
- ✅ **Bordure verte à gauche** de la réponse
- ✅ **Badge "✓ Dé-anonymisé"** en haut à droite (vert)

#### B) Si mode MANUEL :
- ⏸️ Texte reste avec tokens `***XXX_N***`
- 🔓 **Bouton "🔓 Dé-anonymiser"** apparaît (vert, top-right)
- Clic sur le bouton → Texte se dé-anonymise

---

## 🐛 Problèmes Fréquents

### 1. Aucun log dans la console
**Cause** : Extension pas rechargée
**Solution** : `chrome://extensions` → Recharger + F5 sur ChatGPT

### 2. SessionManager undefined
**Cause** : Ordre des scripts dans manifest.json
**Solution** : Vérifier que `session-manager.js` est **avant** `response-interceptor.js`

### 3. Bouton 🔓 n'apparaît pas
**Causes possibles** :
- Pas de tokens `***XXX_N***` dans la réponse
- Observer pas démarré (check console)
- Selector ChatGPT changé (vérifier `getResponseSelector()`)

**Debug** :
```javascript
// Dans console DevTools
console.log(document.querySelectorAll('[data-message-author-role="assistant"]'));
```

### 4. Erreur "Session not found"
**Cause** : Session expirée ou pas créée
**Solution** : 
- Vérifier Redis : `docker-compose logs redis`
- Vérifier session dans backend : `GET http://localhost:8001/session/{id}/mappings`

---

## 🎯 Test Complet (Flow E2E)

```
1. USER écrit texte sensible
   ↓
2. Clique 🔒 ANONYMISER
   ↓ (session_id généré)
3. Texte anonymisé avec tokens
   ↓ (mappings stockés Redis)
4. USER envoie à ChatGPT
   ↓
5. ChatGPT répond avec tokens
   ↓ (MutationObserver détecte)
6. Extension appelle /deanonymize
   ↓ (mappings récupérés)
7. Texte restauré automatiquement
   ↓
8. USER voit données originales ✨
```

---

## 📸 Captures Attendues

### Avant Dé-anonymisation (si mode manuel)
```
┌─────────────────────────────────────────┐
│  ChatGPT                   [🔓 Dé-anon] │
│                                         │
│  Bonjour ***NAME_1***, vous habitez    │
│  à ***LOCATION_1***.                    │
└─────────────────────────────────────────┘
```

### Après Dé-anonymisation
```
┌─────────────────────────────────────────┐
│ ║ ChatGPT              [✓ Dé-anonymisé] │
│ ║                                        │
│ ║ Bonjour Jean Dupont, vous habitez     │
│ ║ à Paris.                               │
└─────────────────────────────────────────┘
  ^bordure verte
```

---

## 🔧 Debug Avancé

### Vérifier session dans backend :
```bash
curl -H "X-API-Key: dev_test_key_12345" \
  http://localhost:8001/session/VOTRE_SESSION_ID/mappings
```

### Tester dé-anonymisation manuellement :
```bash
curl -X POST http://localhost:8001/deanonymize \
  -H "Content-Type: application/json" \
  -H "X-API-Key: dev_test_key_12345" \
  -d '{
    "text": "Bonjour ***NAME_1***",
    "session_id": "VOTRE_SESSION_ID"
  }'
```

### Logs Docker :
```bash
docker-compose logs -f whisper-network
docker-compose logs -f redis
```

---

## ✅ Critères de Succès

- [ ] Logs extension dans console
- [ ] Session ID généré et affiché
- [ ] Anonymisation fonctionne
- [ ] Mappings stockés (vérifiable via `/session/{id}/mappings`)
- [ ] MutationObserver détecte réponses
- [ ] Bouton 🔓 apparaît OU auto-deanonymize fonctionne
- [ ] Texte restauré correctement
- [ ] Indicateurs visuels (bordure + badge)

**Si tous les critères OK** → 🎉 **Phase 2 validée !**
