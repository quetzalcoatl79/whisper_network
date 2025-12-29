# 🐛 Debug - Préférences d'Anonymisation Non Sauvegardées

## 🔍 Symptôme

Après avoir modifié les cases à cocher (anonymize_names, anonymize_email, etc.) et cliqué sur **Sauvegarder**, les paramètres ne sont pas conservés après F5.

---

## ✅ Vérifications à Faire

### 1. Vérifier le Consentement

**Console DevTools (F12)** :
```javascript
chrome.storage.local.get('whisper_network_consent', (data) => {
  console.log('Consentement:', data.whisper_network_consent);
});
```

**Résultat attendu** : `true`

**Si `false` ou `undefined`** → Problème de consentement
- **Solution** : Ouvre la popup → Clique sur le bouton `[Activer]`

---

### 2. Vérifier le Contenu Sauvegardé

**Console DevTools** :
```javascript
chrome.storage.local.get('whisper_network_preferences', (data) => {
  console.log('Préférences sauvegardées:', data.whisper_network_preferences);
});
```

**Résultat attendu** :
```javascript
{
  enabled: true,
  apiUrl: "http://localhost:8001",
  apiKey: "...",
  anonymize_names: true,
  anonymize_email: true,
  anonymize_phone: true,
  // ... autres options
  version: "1.0.0",
  last_updated: "2025-11-19T..."
}
```

**Si les `anonymize_*` sont absents** → Problème de collecte

---

### 3. Tester la Séquence Complète

1. **Ouvrir la popup**
2. **Modifier une case** : Décocher "Anonymiser les noms"
3. **Cliquer `[Sauvegarder]`**
4. **Regarder la console** (F12 dans la popup) :

**Logs attendus** :
```
[WhisperPopup] Saving settings: {
  anonymize_names: false,  ← Vérifier que c'est bien false
  anonymize_email: true,
  ...
}
[PreferencesManager] Preferences saved: {...}
[WhisperPopup] Settings saved with consent ✅
```

---

### 4. Vérifier Après F5

1. **Rafraîchir la page** : F5
2. **Rouvrir la popup**
3. **Vérifier** : La case "Anonymiser les noms" doit être **décochée**

**Si elle est recochée** :
- Vérifier les logs de chargement :
```
[WhisperPopup] Settings loaded from PreferencesManager: {...}
```

---

## 🔧 Corrections Appliquées

### 1. Ajout des Paramètres Manquants dans PreferencesManager

**Fichier** : `preferences-manager.js`

**Avant** :
```javascript
this.defaults = {
  apiKey: '',
  apiUrl: 'http://localhost:8001',
  autoDeanonymize: true,
  // ❌ Manquaient : anonymize_names, anonymize_email, etc.
}
```

**Après** :
```javascript
this.defaults = {
  // Configuration API
  enabled: true,
  apiKey: '',
  apiUrl: 'http://localhost:8001',
  
  // ✅ Paramètres d'anonymisation
  anonymize_names: true,
  anonymize_email: true,
  anonymize_phone: true,
  anonymize_address: true,
  anonymize_nir: true,
  anonymize_iban: true,
  anonymize_credit_cards: true,
  anonymize_ip: true,
  anonymize_urls: true,
  
  // Options
  autoDeanonymize: true,
  preserveMapping: true,
  // ...
}
```

### 2. Ajout de Logs de Debug

**Fichier** : `popup.js`

Ajout dans `saveSettings()` :
```javascript
console.log('[WhisperPopup] Saving settings:', this.settings);
```

Permet de voir **exactement** ce qui est envoyé à `PreferencesManager`.

---

## 🧪 Test Complet

### Script de Test Automatisé

**Console DevTools** :
```javascript
// 1. Vérifier consentement
chrome.storage.local.get('whisper_network_consent', (data) => {
  console.log('✅ Consentement:', data.whisper_network_consent);
});

// 2. Vérifier préférences
chrome.storage.local.get('whisper_network_preferences', (data) => {
  const prefs = data.whisper_network_preferences;
  console.log('✅ Préférences:', prefs);
  
  // Vérifier que les paramètres d'anonymisation existent
  const anonymizationKeys = [
    'anonymize_names', 'anonymize_email', 'anonymize_phone',
    'anonymize_address', 'anonymize_nir', 'anonymize_iban',
    'anonymize_credit_cards', 'anonymize_ip', 'anonymize_urls'
  ];
  
  const missing = anonymizationKeys.filter(key => !(key in prefs));
  
  if (missing.length === 0) {
    console.log('✅ Tous les paramètres d\'anonymisation sont présents');
  } else {
    console.error('❌ Paramètres manquants:', missing);
  }
});

// 3. Tester la sauvegarde
async function testSave() {
  const pm = new PreferencesManager();
  const prefs = await pm.load();
  
  // Modifier un paramètre
  prefs.anonymize_names = false;
  
  // Sauvegarder
  const success = await pm.save(prefs);
  console.log('Sauvegarde:', success ? '✅ OK' : '❌ Échec');
  
  // Recharger
  const reloaded = await pm.load();
  console.log('Après rechargement, anonymize_names =', reloaded.anonymize_names);
  console.log(reloaded.anonymize_names === false ? '✅ Test OK' : '❌ Test Échec');
}

testSave();
```

---

## 📊 Résultats Attendus

### Test Réussi ✅
```
✅ Consentement: true
✅ Préférences: { anonymize_names: true, anonymize_email: true, ... }
✅ Tous les paramètres d'anonymisation sont présents
Sauvegarde: ✅ OK
Après rechargement, anonymize_names = false
✅ Test OK
```

### Test Échoué ❌

**Scénario 1** : Pas de consentement
```
✅ Consentement: false  ← PROBLÈME
[PreferencesManager] No consent - preferences not saved
```
→ **Solution** : Accorder le consentement dans la popup

**Scénario 2** : Paramètres manquants
```
❌ Paramètres manquants: ['anonymize_names', 'anonymize_email', ...]
```
→ **Solution** : Recharger l'extension (les defaults ont été mis à jour)

**Scénario 3** : Sauvegarde échoue
```
Sauvegarde: ❌ Échec
[PreferencesManager] Error saving preferences: ...
```
→ **Solution** : Vérifier la console pour l'erreur complète

---

## 🔄 Actions à Réaliser

1. **Recharger l'extension** : `chrome://extensions` → ⟳ Recharger
2. **Effacer les anciennes données** (optionnel) :
   ```javascript
   chrome.storage.local.clear();
   ```
3. **Ouvrir ChatGPT** → Modal RGPD → Accepter
4. **Ouvrir popup** → Modifier options → Sauvegarder
5. **Console** → Vérifier logs :
   ```
   [WhisperPopup] Saving settings: { anonymize_names: false, ... }
   [PreferencesManager] Preferences saved: {...}
   ```
6. **F5** → Rouvrir popup → **Vérifier que les options sont conservées**

---

## ✅ Validation Finale

**Checklist** :
- [ ] Consentement accordé (indicateur ✅ dans popup)
- [ ] Modification d'une case → Clic Sauvegarder → Notification
- [ ] Console montre : `Saving settings: { anonymize_names: ... }`
- [ ] Console montre : `Preferences saved: {...}`
- [ ] F5 sur la page → Rouvrir popup → Options toujours modifiées
- [ ] Fermer onglet → Rouvrir → Options toujours modifiées

**Si tous les checks ✅** → Système fonctionne parfaitement ! 🎉

---

**Version** : 1.0.1  
**Date** : 19 novembre 2025
