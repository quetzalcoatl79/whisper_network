# 🚀 **Instructions de Déploiement Whisper**

## **1. Backend (Déjà Fait)**
```bash
cd whisper_network  
docker-compose -f docker-compose-whisper.yml up -d
```
✅ **Status** : L'API fonctionne sur http://localhost:8001

---

## **2. Extension Browser**

### **Étape 1 : Ouvrir Chrome/Edge**
1. Aller dans **Extensions** (chrome://extensions/)
2. Activer le **Mode développeur** (coin en haut à droite)

### **Étape 2 : Charger l'Extension** 
1. Cliquer **"Charger l'extension non empaquetée"**
2. Sélectionner le dossier : `whisper_browser_extension`
3. ✅ Extension chargée !

### **Étape 3 : Recharger (Important)**
Si l'extension était déjà chargée :
1. Cliquer sur l'icône **🔄** de rechargement dans la liste des extensions
2. ⚠️ **Nécessaire** pour activer le nouveau content script

---

## **3. Test Immédiat**

### **Test 1 : API**
1. Cliquer sur l'icône Whisper 🔒
2. Vérifier que le statut est **🟢 API connectée**
3. Tester dans la zone "Test en direct"

### **Test 2 : Chat IA**
1. Aller sur **chat.openai.com** (ou Claude, Mistral, etc.)
2. Tu devrais voir :
   - **Bouton flottant 🔒** en haut à droite
   - **Boutons 🔒 Anonymiser** près des champs de texte
3. Écrire du texte avec données sensibles
4. **Ctrl+Shift+A** pour anonymiser

### **Exemple de Test :**
```
Texte : Salut, je suis Jean Dupont, email: jean@test.com
Résultat : Salut, je suis ***PRENOM_1234***, email: ***EMAIL_5678***
```

---

## **4. Dépannage Rapide**

### **Si pas de bouton 🔒 dans le chat :**
1. **F12** → Console → Chercher "Whisper Network"
2. Si pas de message, recharger l'extension
3. Rafraîchir la page du chat (F5)

### **Si erreur API :**
1. Vérifier que Docker tourne : `docker ps | grep whisper`
2. Tester l'API : Ouvrir http://localhost:8001/health
3. Dans l'extension, vérifier l'URL API (popup → Configuration)

### **Si anonymisation ne marche pas :**
1. Vérifier que l'extension est activée (popup)  
2. Essayer **Ctrl+Shift+A** sur texte sélectionné
3. Regarder la console (F12) pour les erreurs

---

## **🎉 Prêt à Utiliser !**

**Utilisation quotidienne :**
1. Écris normalement dans les chats IA
2. **Ctrl+Shift+A** avant d'envoyer  
3. Tes données restent privées ! 🔒

**Performance attendue : <5ms par anonymisation**