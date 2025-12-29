# 🍪 Guide des Préférences & Consentement RGPD

## 📋 Vue d'Ensemble

Whisper Network implémente un **système de consentement conforme RGPD/CNIL** pour la sauvegarde des préférences utilisateur.

---

## ✅ Ce Qui Est Sauvegardé

### Données Stockées Localement
- **Clé API** : Pour communiquer avec le serveur backend
- **URL serveur** : http://localhost:8001 par défaut
- **Préférences d'anonymisation** :
  - Types d'entités à anonymiser (noms, emails, tél, etc.)
  - Mode de traitement (rapide/complet)
  - Auto-dé-anonymisation activée/désactivée
- **Identifiants de session** : UUID pour contexte conversationnel
- **Paramètres UI** : Thème, notifications, langue

### ❌ Ce Qui N'EST PAS Stocké
- ❌ Vos textes anonymisés
- ❌ Vos données personnelles
- ❌ Historique des conversations
- ❌ Aucune tracking analytics
- ❌ Aucune transmission à des tiers

---

## 🎯 Première Utilisation

### 1. Modal de Consentement

Au **premier lancement** de l'extension, un modal apparaît :

```
🔒 Bienvenue sur Whisper Network

🍪 Protection de vos données personnelles

Whisper Network utilise le stockage local de votre navigateur
pour sauvegarder vos préférences :

✅ Clé API
✅ URL du serveur
✅ Préférences d'anonymisation
✅ Identifiants de session

🔐 Garanties de confidentialité :
❌ Aucune donnée envoyée à des tiers
❌ Aucun tracking publicitaire
✅ Données stockées uniquement en local

[✅ J'accepte le stockage local]  [❌ Refuser]
```

### 2. Choix Utilisateur

#### A) **Accepter le consentement** ✅
- Les préférences sont **sauvegardées persistantes**
- Restent après fermeture du navigateur
- Restent après `F5` / `Ctrl+R` / `Ctrl+Shift+R`
- Synchronisées sur tous les onglets

#### B) **Refuser le consentement** ❌
- Mode **session uniquement**
- Préférences perdues après fermeture
- **À reconfigurer à chaque utilisation**
- Avertissement affiché dans la popup

---

## 🛠️ Gestion du Consentement

### Dans la Popup

#### Indicateur de Statut

**Si consentement accordé** :
```
┌──────────────────────────────────────┐
│ ✅ Stockage activé                   │
│ Vos préférences sont sauvegardées    │
│ depuis le 19/11/2025                 │
│                        [Révoquer]    │
└──────────────────────────────────────┘
```

**Si consentement refusé** :
```
┌──────────────────────────────────────┐
│ ⚠️ Mode session uniquement            │
│ Les préférences seront perdues après │
│ fermeture                            │
│                        [Activer]     │
└──────────────────────────────────────┘
```

### Actions Disponibles

#### 1. Révoquer le Consentement
```
Popup → Indicateur vert → Bouton [Révoquer]
```
- **Efface toutes les préférences sauvegardées**
- Passage en mode session
- Nécessite confirmation

#### 2. Accorder le Consentement
```
Popup → Indicateur jaune → Bouton [Activer]
```
- Active la sauvegarde persistante
- Sauvegarde immédiate des paramètres actuels

---

## 💾 Backup & Restauration

### Export des Préférences

**À venir dans la popup** (fonctionnalité implémentée mais UI à ajouter) :

```javascript
// Appel de la méthode
popup.exportPreferences();

// Télécharge un fichier JSON
whisper-network-backup-2025-11-19.json
```

### Import des Préférences

```javascript
popup.importPreferences();
```
- Sélectionner le fichier `.json`
- Restauration automatique
- Rechargement de l'UI

---

## 🔍 Détails Techniques

### Stockage Utilisé

```javascript
chrome.storage.local
```
- **API navigateur standard** (Chrome/Firefox/Edge)
- Stockage local sur votre ordinateur
- Limite : 10 MB par extension (largement suffisant)
- Chiffré par le système d'exploitation

### Clés de Stockage

| Clé | Description | Type |
|-----|-------------|------|
| `whisper_network_consent` | Consentement accordé (true/false) | Boolean |
| `whisper_network_preferences` | Toutes les préférences | Object |
| `first_run_complete` | Première utilisation complétée | Boolean |
| `installation_date` | Date d'installation | ISO String |
| `consent_date` | Date du consentement | ISO String |

### Exemple de Données Stockées

```json
{
  "whisper_network_preferences": {
    "apiKey": "dev_test_key_12345",
    "apiUrl": "http://localhost:8001",
    "autoDeanonymize": true,
    "preserveMapping": true,
    "anonymize_names": true,
    "anonymize_email": true,
    "theme": "auto",
    "language": "fr",
    "version": "1.0.0",
    "last_updated": "2025-11-19T12:34:56.789Z"
  },
  "whisper_network_consent": true,
  "first_run_complete": true,
  "installation_date": "2025-11-19T10:00:00.000Z",
  "consent_date": "2025-11-19T10:00:30.000Z"
}
```

---

## ⚖️ Conformité RGPD

### Principes Respectés

1. ✅ **Consentement explicite** : Modal à la première utilisation
2. ✅ **Transparence** : Liste détaillée des données stockées
3. ✅ **Droit d'accès** : Visualisation des données dans DevTools
4. ✅ **Droit à l'effacement** : Bouton "Révoquer" + désinstallation
5. ✅ **Minimisation** : Stockage uniquement du nécessaire
6. ✅ **Finalité** : Usage exclusif pour fonctionnement extension
7. ✅ **Limitation de conservation** : TTL sur sessions (2h)
8. ✅ **Intégrité** : Pas de transmission externe

### Aucune Obligation de DPO

Extension **hors champ RGPD Article 37** :
- ❌ Pas de traitement à grande échelle
- ❌ Pas de données sensibles catégories spéciales
- ❌ Pas de surveillance systématique
- ✅ Stockage purement local
- ✅ Pas de transfert de données

---

## 🐛 Dépannage

### Problème : "Préférences perdues après F5"

**Solution** :
1. Vérifier le consentement : Popup → Voir indicateur
2. Si "⚠️ Mode session" → Cliquer `[Activer]`
3. Sauvegarder les paramètres → Bouton `[Sauvegarder]`
4. Tester : `F5` → Paramètres doivent être conservés

### Problème : "Pas de modal de consentement"

**Causes possibles** :
1. Déjà consenti lors installation précédente
2. Extension pas rechargée après mise à jour

**Solution** :
```javascript
// Dans Console DevTools (F12)
chrome.storage.local.clear();

// Ou via l'extension
popup.revokeConsent(); // Force réinitialisation
```

### Problème : "Erreur de sauvegarde"

**Vérifications** :
```javascript
// Console DevTools
chrome.storage.local.get(null, (data) => {
  console.log('Données stockées:', data);
  console.log('Espace utilisé:', JSON.stringify(data).length, 'bytes');
});
```

---

## 📚 Références

- [Chrome Storage API](https://developer.chrome.com/docs/extensions/reference/storage/)
- [RGPD - Article 6](https://eur-lex.europa.eu/eli/reg/2016/679/oj) (Licéité du traitement)
- [CNIL - Cookies](https://www.cnil.fr/fr/cookies-et-autres-traceurs)
- [RGPD - Consentement](https://www.cnil.fr/fr/rgpd-le-consentement)

---

## ✅ Checklist Développeur

- [x] PreferencesManager implémenté avec defaults
- [x] ConsentBanner avec modal RGPD conforme
- [x] Popup affiche statut consentement
- [x] Boutons Accorder/Révoquer fonctionnels
- [x] Export/Import preferences implémenté
- [x] Scripts chargés dans manifest.json
- [x] popup.html charge preferences-manager.js
- [x] Sauvegarde persistante après F5 testée
- [ ] Tests E2E sur ChatGPT/Claude
- [ ] Documentation utilisateur finale

---

**Version** : 1.0.0  
**Dernière mise à jour** : 19 novembre 2025  
**Auteur** : Sylvain JOLY, NANO by NXO
