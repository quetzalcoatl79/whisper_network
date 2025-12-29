# 🔍 DEBUG: Pourquoi les préférences ne persistent pas ?

## Étape 1: Vérifier le Service Worker

1. Ouvrir `chrome://extensions`
2. Trouver "Whisper Network"
3. Cliquer sur **"service worker"** (lien bleu)
4. Dans la console qui s'ouvre, coller ce code :

```javascript
// Test direct de chrome.storage.local
chrome.storage.local.set({test: 'hello', anonymize_names: true}, () => {
  console.log('✅ Écriture OK');
  chrome.storage.local.get(null, (all) => {
    console.log('📦 Toutes les données:', all);
  });
});
```

**Résultat attendu** : Doit afficher `{test: 'hello', anonymize_names: true, ...}`

---

## Étape 2: Vérifier la Console Popup

1. Cliquer sur l'icône de l'extension (en haut à droite)
2. **IMMÉDIATEMENT** faire `Clic droit sur la popup → Inspecter`
3. Dans la console, coller :

```javascript
// Vérifier ce qui est chargé
chrome.runtime.sendMessage({action: 'getSettings'}, (response) => {
  console.log('🔍 Settings reçus:', response);
});
```

**Résultat attendu** : Doit afficher les settings sauvegardés

---

## Étape 3: Test de Persistence

1. Ouvrir popup → Modifier un paramètre → Cliquer "Sauvegarder"
2. **ATTENDRE 2 SECONDES** (pour que le service worker traite)
3. Dans la console popup, exécuter :

```javascript
chrome.storage.local.get(null, (all) => {
  console.log('📦 Direct storage access:', all);
});
```

4. **Fermer la popup complètement**
5. **Rouvrir la popup** (avec Inspecter déjà ouvert)
6. Vérifier dans la console si les settings sont chargés

---

## Étape 4: Vérifier les Logs Background

Dans la console du service worker, vous devez voir :

```
[background.js] Background received message: {action: 'saveSettings', settings: {...}}
[background.js] Saving settings to chrome.storage.local: {...}
[background.js] ✅ Settings saved successfully to chrome.storage.local
[background.js] 🔍 All storage after save: {...}
```

**Si ces logs N'APPARAISSENT PAS** → Le message n'arrive pas au background !

---

## Étape 5: Test Chrome Storage API directement

Dans la console du service worker :

```javascript
// Vider complètement le storage
chrome.storage.local.clear(() => {
  console.log('🧹 Storage effacé');
  
  // Recréer les settings
  chrome.storage.local.set({
    enabled: true,
    apiUrl: 'http://localhost:8001',
    anonymize_names: true,
    anonymize_email: true,
    anonymize_phone: true
  }, () => {
    console.log('✅ Settings recréés');
    
    // Vérifier immédiatement
    chrome.storage.local.get(null, (all) => {
      console.log('📦 Vérification:', all);
    });
  });
});
```

Ensuite **rouvrir la popup** et vérifier si les settings sont chargés.

---

## 🐛 Bugs Possibles

### Bug 1: Service Worker inactif
- **Symptôme** : Pas de logs dans background après "Sauvegarder"
- **Solution** : Recharger l'extension (`chrome://extensions` → Bouton 🔄)

### Bug 2: Popup ouvre AVANT que background soit prêt
- **Symptôme** : Premier clic popup → pas de settings, deuxième clic → OK
- **Solution** : Ajouter retry dans `loadSettings()`

### Bug 3: Storage quota dépassé
- **Symptôme** : Erreur "QUOTA_BYTES_PER_ITEM quota exceeded"
- **Solution** : Réduire taille des settings ou utiliser `storage.local` (10MB)

### Bug 4: Conflit entre storage.sync et storage.local
- **Symptôme** : Settings sauvegardés mais pas rechargés
- **Solution** : Utiliser UNIQUEMENT `storage.local` (déjà fait)

---

## 📋 Checklist de Debug

- [ ] Service worker actif (lien "service worker" cliquable)
- [ ] Logs `[background.js]` apparaissent dans console service worker
- [ ] `chrome.storage.local.get(null)` retourne les settings
- [ ] Popup reçoit les settings via `chrome.runtime.sendMessage`
- [ ] Settings persistent après fermeture popup
- [ ] Settings persistent après refresh page ChatGPT

---

## 🚨 Si RIEN ne fonctionne

**Hypothèse** : Extension corrompue ou cache Chrome bloqué

1. Désinstaller complètement l'extension
2. Fermer Chrome
3. Supprimer cache : 
   - Windows : `%LOCALAPPDATA%\Google\Chrome\User Data\Default\Extensions`
   - Supprimer le dossier de l'extension
4. Rouvrir Chrome
5. Recharger l'extension en mode développeur
6. Tester à nouveau

---

**Envoie-moi les résultats de chaque étape !** 🔍
