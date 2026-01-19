# 🎬 Script de Démonstration - Whisper Network

> **Durée estimée** : 10-15 minutes  
> **Public** : Équipe technique / Direction / Clients  

---

## 📋 PARTIE 1 : Installation de l'Extension (3 min)

### 🔵 Chrome / Edge / Brave

**[DIAPO : Écran navigateur]**

> "Je vais vous montrer comment installer Whisper Network en moins d'une minute."

**Étapes à montrer :**

1. **Ouvrir la page des extensions**
   - Chrome : `chrome://extensions`
   - Edge : `edge://extensions`
   
2. **Activer le mode développeur**
   > "On active le mode développeur en haut à droite. C'est nécessaire pour charger une extension non publiée sur le store."
   
3. **Charger l'extension**
   - Cliquer sur **"Charger l'extension non empaquetée"**
   - Sélectionner le dossier `whisper_browser_extension`
   
4. **Vérifier l'installation**
   > "L'icône 🛡️ apparaît dans la barre d'outils. L'extension est prête !"

---

### 🦊 Firefox

**Étapes à montrer :**

1. **Ouvrir le gestionnaire de debug**
   - Aller à `about:debugging#/runtime/this-firefox`
   
2. **Charger l'extension**
   - Cliquer sur **"Charger un module complémentaire temporaire"**
   - Sélectionner `whisper_browser_extension/firefox/manifest.json`

3. **Confirmer**
   > "L'extension est maintenant active sur Firefox également."

---

## 🔧 PARTIE 2 : Configuration Rapide (2 min)

**[DIAPO : Popup de l'extension]**

> "Avant d'utiliser l'outil, vérifions rapidement la configuration."

**Actions à montrer :**

1. **Cliquer sur l'icône de l'extension** 🛡️
   
2. **Vérifier l'URL de l'API**
   > "L'API tourne sur localhost:8001. En production, ce sera l'URL de votre serveur."
   
3. **Tester la connexion**
   - Cliquer sur **"Tester la connexion"**
   > "Le voyant passe au vert ✅, la connexion est établie."

4. **Montrer les options d'anonymisation**
   > "Par défaut, on anonymise : noms, emails, téléphones, IBAN, IPs... Tout est personnalisable."

---

## 🚀 PARTIE 3 : Utilisation en Live (5-7 min)

### 3.1 Démonstration sur ChatGPT

**[DIAPO : Ouvrir chatgpt.com]**

> "Passons à la démonstration concrète. Je vais utiliser ChatGPT."

**Texte de démo à copier :**
```
Bonjour Pierre,

Suite à notre réunion avec Marie Lefebvre, voici la configuration réseau :

- Serveur Web : 192.168.1.10 (privée) / 203.45.167.89 (publique)
- Serveur BDD : 10.0.0.50
- Firewall : autoriser l'IP client 85.123.45.201

Contact admin : Thomas Bernard (thomas.bernard@nxo.fr) - 06 78 45 12 90
IBAN facturation : FR76 3000 4012 3400 0100 0946 042

Cordialement,
Nicolas Petit
```

**Étapes à montrer :**

1. **Coller le texte** dans la zone de saisie ChatGPT
   > "J'ai un texte avec des données sensibles : noms, emails, IPs, IBAN..."

2. **Cliquer sur le bouton 🔒 ANONYMISER**
   > "Je clique sur le bouton orange. L'anonymisation est instantanée."

3. **Montrer le résultat**
   > "Regardez : tous les noms sont remplacés par ***NAME_1***, ***NAME_2***... 
   > Les IPs deviennent ***IP_1***, ***IP_2***...
   > L'IBAN est masqué en ***IBAN_1***."

4. **Envoyer le message à ChatGPT**
   > "J'envoie ce texte anonymisé à l'IA. Elle n'a aucune connaissance des vraies données."

5. **Attendre la réponse de ChatGPT**
   > "ChatGPT répond en utilisant les placeholders ***NAME_1***, ***IP_1***..."

6. **Dé-anonymisation automatique ou manuelle**
   > "Et maintenant, la magie : je clique sur 🔓 DÉ-ANONYMISER..."
   > "Les données originales réapparaissent ! Pierre, Marie Lefebvre, les vraies IPs..."

---

### 3.2 Point clé : Contexte conversationnel

**[Montrer une 2ème question]**

> "Ce qui est puissant, c'est que le contexte est conservé."

**Taper :**
```
Peux-tu me rappeler l'email de Thomas ?
```

> "ChatGPT répond avec ***EMAIL_1***, et après dé-anonymisation, on retrouve thomas.bernard@nxo.fr"

---

### 3.3 Démonstration fichiers (optionnel)

**[DIAPO : Interface fichiers]**

> "Whisper Network gère aussi les fichiers."

1. **Ouvrir l'interface avancée** (⚙️)
2. **Aller sur l'onglet 📁 Fichiers**
3. **Glisser-déposer un fichier** (PDF, Word, Excel...)
4. **Montrer le preview avant/après**
5. **Télécharger le fichier anonymisé**

---

## 💡 PARTIE 4 : Points Clés à Retenir (2 min)

**[DIAPO : Récapitulatif]**

> "Pour résumer les avantages de Whisper Network :"

| ✅ Avantage | Description |
|-------------|-------------|
| **Confidentialité** | Aucune donnée sensible n'atteint les serveurs IA |
| **Transparence** | Vous voyez exactement ce qui est envoyé |
| **Réversibilité** | Dé-anonymisation en 1 clic |
| **Multi-plateformes** | ChatGPT, Claude, Gemini, Copilot, Perplexity... |
| **Formats fichiers** | PDF, Word, Excel, code source... |
| **On-premise** | L'API tourne sur VOS serveurs |

---

## ❓ PARTIE 5 : Questions / Réponses

**Questions anticipées :**

**Q : Les données passent-elles par le cloud ?**
> "Non, tout est local. L'API tourne sur votre infrastructure. Les mappings sont stockés temporairement en Redis, jamais persistés."

**Q : Que se passe-t-il si je ferme le navigateur ?**
> "Les mappings ont un TTL (durée de vie). Par défaut 1h. Après ça, ils sont automatiquement supprimés."

**Q : Ça fonctionne avec d'autres langues ?**
> "Oui, le système supporte le français et l'anglais. D'autres langues peuvent être ajoutées."

**Q : Et pour un déploiement en production ?**
> "On a prévu une architecture avec authentification JWT, HTTPS, et possibilité de multi-tenant pour plusieurs équipes."

---

## 🎯 Checklist Pré-Démo

```
□ Docker lancé (docker compose ps)
□ API accessible (curl localhost:8001/health)
□ Extension installée et activée
□ Connexion API testée (voyant vert)
□ Redis vidé pour démo propre (docker exec whisper-network-redis redis-cli FLUSHALL)
□ Texte de démo prêt à copier
□ ChatGPT ouvert dans un onglet
```

---

## 🛠️ Commandes Utiles Pendant la Démo

```bash
# Vérifier que tout tourne
docker compose ps

# Voir les logs en temps réel (dans un terminal à côté)
docker compose logs -f whisper-network

# Reset si problème
docker exec whisper-network-redis redis-cli FLUSHALL
```

---

**Bonne démo ! 🚀**

*Document préparé le 14 janvier 2026*
