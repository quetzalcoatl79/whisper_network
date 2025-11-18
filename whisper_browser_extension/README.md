# Whisper Network - Extension Navigateur

Extension navigateur pour anonymiser automatiquement vos questions avant de les envoyer aux IA génératives (ChatGPT, Claude, Mistral, etc.).

## 🚀 Fonctionnalités

- **Anonymisation automatique** sur les sites d'IA populaires
- **Configuration flexible** des types de données à anonymiser
- **Aperçu en temps réel** avant/après anonymisation
- **API locale** pour préserver votre confidentialité
- **Support multi-sites** : ChatGPT, Claude, Mistral, Gemini, etc.

## 🛠 Installation

### Prérequis
1. **API Whisper Network** en cours d'exécution sur `http://localhost:8001`
2. Navigateur compatible (Chrome, Edge, Firefox)

### Installation de l'extension

#### Chrome/Edge (Manifest V3)
1. Ouvrez Chrome/Edge
2. Allez dans `chrome://extensions/` ou `edge://extensions/`
3. Activez le "Mode développeur"
4. Cliquez sur "Charger l'extension non empaquetée"
5. Sélectionnez le dossier `whisper_browser_extension`

#### Firefox (Adaptation nécessaire)
1. Ouvrez Firefox
2. Allez dans `about:debugging#/runtime/this-firefox`
3. Cliquez sur "Charger un module complémentaire temporaire"
4. Sélectionnez le fichier `manifest.json`

## 📋 Configuration

1. **Cliquez sur l'icône** de l'extension dans la barre d'outils
2. **Vérifiez la connexion** à l'API (indicateur vert = OK)
3. **Configurez les types** d'anonymisation souhaités :
   - ✅ Adresses IP
   - ✅ Emails
   - ✅ Téléphones
   - ✅ NIR (Sécurité Sociale)
   - ⚠️ Noms propres (optionnel)
   - ⚠️ Adresses postales (optionnel)
   - ✅ URLs
   - ✅ Cartes bancaires
   - ✅ IBAN

4. **Testez l'anonymisation** dans l'onglet de test
5. **Sauvegardez** vos paramètres

## 🎯 Utilisation

### Mode Manuel
1. Saisissez votre question dans le champ de chat
2. Cliquez sur le bouton **🔒** qui apparaît
3. Votre texte est automatiquement anonymisé
4. Envoyez votre question anonymisée

### Mode Automatique
1. Activez "Auto-anonymisation" dans les paramètres
2. Utilisez **Ctrl+I** pour anonymiser automatiquement

### Menu contextuel
1. Sélectionnez du texte sur n'importe quel site
2. Clic droit → "Anonymiser ce texte"
3. Le résultat s'affiche dans une notification

## 🌐 Sites Supportés

### Officiellement testés
- ✅ **ChatGPT** (chat.openai.com)
- ✅ **Claude** (claude.ai)
- ✅ **Mistral AI** (chat.mistral.ai)
- ✅ **Google Gemini** (gemini.google.com)

### Compatibilité générique
- 🔄 **You.com**
- 🔄 **Poe.com**
- 🔄 Autres sites de chat IA

## 🔒 Confidentialité

- ❌ **Aucune donnée** n'est envoyée vers des serveurs externes
- ✅ **Traitement local** via votre API Whisper Network
- ✅ **Pas de tracking** ni d'analytics
- ✅ **Code source** entièrement transparent

## 🛠 Développement

### Structure des fichiers
```
whisper_browser_extension/
├── manifest.json          # Configuration extension
├── background.js          # Service Worker (logique)
├── content.js            # Script injecté (interface)
├── popup.html            # Interface de configuration
├── popup.js              # Logique du popup
├── popup.css             # Styles du popup
├── content.css           # Styles injectés
├── icons/                # Icônes de l'extension
└── README.md             # Documentation
```

### Personnalisation

#### Ajouter un nouveau site
Dans `content.js`, section `detectSite()` :

```javascript
if (hostname.includes('nouveau-site.com')) {
  return {
    name: 'NouveauSite',
    selectors: {
      input: 'textarea.chat-input',
      submitButton: 'button.send-btn',
      messageContainer: '.message'
    }
  };
}
```

#### Modifier les types d'anonymisation
Dans `background.js`, modifier `DEFAULT_SETTINGS`.

## 🐛 Dépannage

### L'extension ne fonctionne pas
1. ✅ Vérifiez que l'API Whisper Network est démarrée
2. ✅ Testez la connexion dans le popup
3. ✅ Rechargez la page du site IA
4. ✅ Vérifiez les permissions dans chrome://extensions/

### Bouton 🔒 n'apparaît pas
1. ✅ L'extension est-elle activée dans le popup ?
2. ✅ Le site est-il dans la liste supportée ?
3. ✅ Rechargez la page après configuration

### Erreur "API non disponible"
1. ✅ L'API Docker est-elle démarrée ? (`docker-compose ps`)
2. ✅ Port correct ? (défaut: 8001)
3. ✅ Testez manuellement : `curl http://localhost:8001/health`

## 📱 Versions Futures

- 🔄 Support Firefox natif (Manifest V2)
- 🔄 Safari extension
- 🔄 Interface mobile
- 🔄 Synchronisation cloud des paramètres
- 🔄 Templates d'anonymisation personnalisés

## 🤝 Contribution

Cette extension fait partie du projet Whisper Network. Consultez le repository principal pour contribuer.

## 📄 Licence

MIT License - Voir LICENSE dans le projet principal.

---

**⚠️ Important** : Cette extension nécessite l'API Whisper Network locale pour fonctionner. Assurez-vous qu'elle soit démarrée avant d'utiliser l'extension.