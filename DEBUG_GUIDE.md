# 🔧 GUIDE DE TEST WHISPER

## ✅ ÉTAPES POUR FAIRE FONCTIONNER L'EXTENSION

### 1️⃣ Recharger l'Extension (IMPORTANT)
1. Aller sur `chrome://extensions/`
2. Trouver **Whisper Network**
3. Cliquer sur l'icône **🔄 Recharger**
4. ✅ Extension rechargée

### 2️⃣ Vérifier que l'API Fonctionne
```bash
# Dans le terminal
docker ps | grep whisper-network
```
✅ Si tu vois le conteneur, c'est bon

### 3️⃣ Tester sur ChatGPT
1. Aller sur **https://chat.openai.com**
2. **F5** pour rafraîchir la page
3. Tu DOIS voir un **bouton orange "🔒 ANONYMISER"** en haut à droite

### 4️⃣ Déboguer si Pas de Bouton

#### Ouvrir la Console (F12)
1. Appuie sur **F12**
2. Va dans l'onglet **Console**
3. Cherche "Whisper Network"

#### Ce que tu DOIS voir :
```
🔒 Whisper Network - Démarré !
✅ Bouton Whisper créé !
🔒 Whisper Network - Prêt !
```

#### Si tu NE VOIS PAS ces messages :
- ❌ Le content script n'est pas chargé
- **Solution** : Recharger l'extension ET rafraîchir la page

#### Si tu vois une ERREUR :
- Copie l'erreur et dis-moi

### 5️⃣ Test Complet

#### Dans ChatGPT :
1. **Écris** dans le champ : `Mon email est test@example.com et mon tel 0612345678`
2. **Clique** sur le bouton orange **🔒 ANONYMISER**
3. **Attends** 1-2 secondes
4. ✅ Le texte DOIT être anonymisé

#### Résultat Attendu :
```
Mon email est ***EMAIL_1234*** et mon tel ***TELEPHONE_5678***
```

---

## 🐛 DÉBOGAGE AVANCÉ

### Vérifier l'Extension est Chargée
```
chrome://extensions/
```
- ✅ Whisper Network doit être **activé** (bouton bleu)
- ✅ Pas d'erreur affichée

### Vérifier les Permissions
Dans chrome://extensions/ → Whisper Network → Détails :
- ✅ "Sur tous les sites" doit être autorisé

### Tester l'API Directement
Dans la console du navigateur (F12) :
```javascript
chrome.runtime.sendMessage({action: 'anonymize', text: 'test@example.com'}, console.log)
```

✅ Tu DOIS voir une réponse avec `success: true`

---

## 📋 CHECKLIST

- [ ] Docker container whisper-network en cours d'exécution
- [ ] Extension rechargée avec bouton 🔄
- [ ] Page ChatGPT rafraîchie (F5)
- [ ] Console (F12) montre "Whisper Network - Démarré"
- [ ] Bouton orange visible en haut à droite
- [ ] Clic sur le bouton anonymise le texte

---

## 🆘 SI ÇA NE MARCHE TOUJOURS PAS

### Dis-moi :
1. **Quel message** tu vois dans la console (F12) ?
2. **Le bouton orange** apparaît-il ?
3. **Quelle erreur** s'affiche (s'il y en a une) ?

### Captures d'écran utiles :
- chrome://extensions/ (liste des extensions)
- Console (F12) sur ChatGPT
- La page ChatGPT avec/sans le bouton