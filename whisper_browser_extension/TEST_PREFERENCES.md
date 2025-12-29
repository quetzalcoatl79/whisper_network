# 🧪 Test Rapide - Système de Préférences Persistantes

## 🎯 Objectif

Vérifier que les **préférences sont conservées après F5/Ctrl+R**.

---

## ✅ Test 1 : Première Installation

### Étapes :
1. **Recharger l'extension** : `chrome://extensions` → Recharger
2. **Ouvrir ChatGPT** : https://chat.openai.com
3. **Attendre 1 seconde** → Le modal RGPD doit apparaître ✨

### Modal Attendu :
```
┌───────────────────────────────────────────┐
│   🔒 Bienvenue sur Whisper Network        │
│                                           │
│   🍪 Protection de vos données...         │
│                                           │
│   ✅ Clé API                              │
│   ✅ URL du serveur                       │
│   ✅ Préférences d'anonymisation          │
│                                           │
│   [✅ J'accepte]  [❌ Refuser]            │
└───────────────────────────────────────────┘
```

### Actions :
4. **Cliquer `✅ J'accepte`**
5. **Notification** : "✅ Préférences sauvegardées !"

---

## ✅ Test 2 : Configuration Persistante

### Étapes :
1. **Ouvrir la popup** : Clic icône extension 🔒
2. **Modifier les paramètres** :
   - Clé API : `test_key_123`
   - Cocher "Auto-dé-anonymisation"
   - Changer URL : `http://localhost:8001`
3. **Cliquer `[Sauvegarder]`**
4. **Notification** : "✅ Paramètres sauvegardés"

### Vérifier :
5. **Fermer la popup** (clic ailleurs)
6. **Rouvrir la popup**
7. ✅ **Les paramètres sont toujours là** (pas perdus)

---

## ✅ Test 3 : Persistance après F5

### Étapes :
1. **Rafraîchir la page** : `F5` ou `Ctrl+R`
2. **Rouvrir la popup**
3. ✅ **Clé API toujours présente** : `test_key_123`
4. ✅ **Auto-dé-anonymisation toujours cochée**

---

## ✅ Test 4 : Persistance après Fermeture

### Étapes :
1. **Fermer l'onglet ChatGPT** complètement
2. **Ouvrir un nouvel onglet** : https://chat.openai.com
3. **Ouvrir la popup**
4. ✅ **Tous les paramètres conservés**

---

## ✅ Test 5 : Indicateur de Consentement

### Dans la Popup :

**Si consentement accordé** :
```
┌────────────────────────────────┐
│ ✅ Stockage activé             │
│ Vos préférences sont           │
│ sauvegardées depuis le         │
│ 19/11/2025        [Révoquer]   │
└────────────────────────────────┘
```

**Actions possibles** :
- Clic `[Révoquer]` → Efface tout + passage mode session
- Confirmation requise avant effacement

---

## ✅ Test 6 : Mode Session (Sans Consentement)

### Étapes :
1. **Révoquer le consentement** : Popup → `[Révoquer]` → Confirmer
2. **Indicateur change** :
```
┌────────────────────────────────┐
│ ⚠️ Mode session uniquement      │
│ Les préférences seront perdues │
│ après fermeture    [Activer]   │
└────────────────────────────────┘
```

3. **Modifier un paramètre** → `[Sauvegarder]`
4. **Notification** : "⚠️ Consentement requis pour sauvegarder"
5. **Rafraîchir F5** → **Paramètres perdus** ❌ (comportement attendu)

---

## 🐛 Problèmes Possibles

### 1. Pas de modal au premier lancement

**Cause** : Extension déjà installée précédemment

**Solution** :
```javascript
// Console DevTools (F12)
chrome.storage.local.clear();

// Puis rafraîchir la page
```

### 2. Préférences toujours perdues après F5

**Vérifications** :
1. Console (F12) → Chercher erreurs
2. Vérifier logs :
   ```
   [PreferencesManager] Consent saved: true
   [PreferencesManager] Preferences saved: {...}
   ```

3. Vérifier stockage :
   ```javascript
   chrome.storage.local.get(null, console.log);
   ```

**Si vide** → Consentement pas accordé

### 3. Modal n'apparaît pas du tout

**Causes** :
- `consent-banner.js` pas chargé
- Erreur JavaScript bloque le script

**Solutions** :
1. Vérifier `manifest.json` → `consent-banner.js` dans content_scripts
2. Console → Chercher :
   ```
   🍪 ConsentBanner loaded
   🍪 PreferencesManager loaded
   ```

---

## 📊 Checklist de Validation

- [ ] Modal RGPD apparaît première fois
- [ ] Bouton "J'accepte" fonctionne
- [ ] Notification "Préférences sauvegardées"
- [ ] Paramètres restent après fermeture popup
- [ ] Paramètres restent après F5
- [ ] Paramètres restent après fermeture onglet
- [ ] Indicateur ✅ "Stockage activé" affiché
- [ ] Bouton "Révoquer" fonctionne
- [ ] Mode session : paramètres perdus après F5
- [ ] Bouton "Activer" permet de réaccorder

---

## 🎉 Critères de Succès

✅ **Test RÉUSSI** si :
- Modal RGPD s'affiche à la première utilisation
- Après consentement, **F5 ne perd plus les paramètres**
- Indicateur de statut correct dans popup
- Mode session fonctionne si refus

❌ **Test ÉCHOUÉ** si :
- Paramètres perdus après F5 (même avec consentement)
- Modal jamais affiché
- Erreurs JavaScript dans console

---

**Version** : 1.0.0  
**Test sur** : Chrome 119+, Firefox 115+, Edge 119+
