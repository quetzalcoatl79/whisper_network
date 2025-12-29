# 🧪 Test de Persistance de Configuration

## ✅ Solution Implémentée : Hybrid Storage

### Architecture à 3 niveaux :

```
1. chrome.storage.sync (PRIORITÉ 1)
   └─> Persiste entre appareils (sync Google)
   └─> Fonctionne en production
   └─> Effacé en mode dev à chaque reload

2. localStorage backup (PRIORITÉ 2)
   └─> Survit au reload de l'extension (mode dev)
   └─> Auto-backup à chaque sauvegarde
   └─> Restaure chrome.storage.sync si vide

3. Hardcoded defaults (PRIORITÉ 3)
   └─> Dernier recours si tout échoue
```

---

## 📋 Procédure de Test

### Test 1 : Sauvegarde Automatique (localStorage)

1. **Ouvrir l'extension** : `chrome://extensions`
2. **Recharger l'extension** : Bouton 🔄
3. **Ouvrir la popup** : Cliquer sur l'icône Whisper
4. **Modifier des paramètres** :
   - ✅ Activer/Désactiver des anonymizations
   - ✅ Changer l'URL API
   - ✅ Modifier le mode de traitement
5. **Cliquer "Sauvegarder"**
6. **Vérifier dans la popup** :
   - ✅ Message "✅ Paramètres sauvegardés"
   - ✅ Horodatage "Dernière sauvegarde" mis à jour
7. **Recharger l'extension** : `chrome://extensions` → 🔄
8. **Rouvrir la popup**
9. **✅ RÉSULTAT ATTENDU** : Les paramètres sont restaurés depuis localStorage

---

### Test 2 : Export / Import Manuel

1. **Configurer des paramètres** :
   - Activer : `anonymize_email`, `anonymize_phone`, `anonymize_ip`
   - Désactiver : `anonymize_names`, `anonymize_address`
   - URL API : `http://custom-api:8080`
2. **Cliquer "📥 Exporter JSON"**
3. **Vérifier** : Fichier `whisper-config-XXXXX.json` téléchargé
4. **Ouvrir le fichier** dans un éditeur
5. **Vérifier le contenu** :
   ```json
   {
     "settings": {
       "enabled": true,
       "apiUrl": "http://custom-api:8080",
       "anonymize_email": true,
       "anonymize_phone": true,
       "anonymize_ip": true,
       "anonymize_names": false,
       "anonymize_address": false,
       ...
     },
     "exportDate": "2025-11-19T...",
     "version": "1.0"
   }
   ```
6. **Modifier des paramètres dans la popup** (différents de l'export)
7. **Cliquer "📤 Importer JSON"**
8. **Sélectionner le fichier** exporté à l'étape 3
9. **✅ RÉSULTAT ATTENDU** : 
   - Message "✅ Configuration importée !"
   - Paramètres restaurés depuis le fichier

---

### Test 3 : Reload Multiple (Stress Test)

1. **Configurer des paramètres uniques** :
   - URL API : `http://test-reload:9999`
   - Activer TOUS les anonymizations
2. **Sauvegarder**
3. **Recharger l'extension 5 fois de suite** :
   - `chrome://extensions` → 🔄
   - Rouvrir popup après chaque reload
   - Vérifier que les paramètres persistent
4. **✅ RÉSULTAT ATTENDU** : 
   - Paramètres restaurés à chaque fois depuis localStorage
   - Horodatage "Dernière sauvegarde" visible

---

### Test 4 : chrome.storage.sync en Production

**⚠️ Ce test ne fonctionne QUE avec une extension publiée ou en mode normal (pas dev)**

1. **Installer l'extension** normalement (pas en mode dev)
2. **Configurer des paramètres**
3. **Se connecter à Chrome** avec un compte Google
4. **Sauvegarder**
5. **Ouvrir Chrome sur un AUTRE appareil** (même compte Google)
6. **✅ RÉSULTAT ATTENDU** : Paramètres synchronisés automatiquement

---

## 🔧 Debugging

### Voir les logs de sauvegarde :

1. **Ouvrir DevTools** sur la popup : `F12` sur la popup
2. **Chercher dans la console** :
   ```
   [WhisperPopup] 💾 Saving settings: {...}
   [WhisperPopup] ✅ Settings saved to chrome.storage.sync
   [WhisperPopup] 💾 Backup saved to localStorage
   ```

### Voir le backup localStorage :

1. **Dans DevTools (popup)** : Onglet "Application"
2. **Local Storage** → `chrome-extension://[ID]`
3. **Chercher** : `whisper_preferences_backup`
4. **Vérifier** : JSON avec `settings`, `timestamp`, `version`

### Voir chrome.storage.sync :

1. **Dans DevTools (popup)** : Console
2. **Exécuter** :
   ```javascript
   chrome.storage.sync.get(null, (data) => console.log('Sync Storage:', data));
   ```
3. **Vérifier** : Objet avec tous les paramètres

---

## ❌ Problèmes Connus

### Problème 1 : "chrome.storage.sync vide après reload"

**Cause** : Mode développeur de Chrome efface le storage à chaque reload d'extension

**Solution** : ✅ Implémentée - localStorage backup automatique

**Workaround** :
- En dev : Utiliser Export/Import manuel
- En production : chrome.storage.sync fonctionne parfaitement

### Problème 2 : "Horodatage pas visible"

**Cause** : Element `#lastBackupTime` pas trouvé dans le DOM

**Solution** : Vérifier que `popup.html` contient :
```html
<span id="lastBackupTime">Jamais</span>
```

### Problème 3 : "Import ne fonctionne pas"

**Cause** : Format de fichier JSON invalide

**Solution** : Utiliser uniquement des fichiers exportés par l'extension

---

## 📊 Métriques de Succès

| Test | Critère | Statut |
|------|---------|--------|
| Sauvegarde automatique | localStorage backup créé | ✅ À tester |
| Restauration après reload | Paramètres restaurés | ✅ À tester |
| Export JSON | Fichier téléchargé valide | ✅ À tester |
| Import JSON | Paramètres appliqués | ✅ À tester |
| Horodatage visible | Date affichée | ✅ À tester |
| Sync multi-device | Paramètres sync (prod) | ⏳ En attente |

---

## 🎯 Prochaines Étapes

1. ✅ **Tester tous les scénarios** ci-dessus
2. ⏳ **Valider en production** (extension publiée)
3. ⏳ **Ajouter un système d'auth backend** (optionnel)
4. ⏳ **Implémenter cloud sync** via API (optionnel)

---

**Date** : 19 novembre 2025  
**Version** : 1.0  
**Développeur** : Sylvain JOLY, NANO by NXO
