# 🚀 Déploiement Whisper Network

Scripts de déploiement automatique pour le backend Whisper Network en Docker.

## 📋 Prérequis

- Docker installé et démarré
- Port 8001 disponible sur l'hôte

## 🐧 Linux / macOS

### Déploiement complet

```bash
./deploy.sh
```

### Commandes disponibles

```bash
./deploy.sh        # Déploiement complet (clean + build + run + test)
./deploy.sh clean  # Nettoyage uniquement
./deploy.sh logs   # Afficher les logs en temps réel
./deploy.sh shell  # Ouvrir un shell dans le conteneur
./deploy.sh test   # Exécuter uniquement le test d'anonymisation
```

## 🪟 Windows

### Déploiement complet

Double-cliquez sur `deploy.bat` ou exécutez dans PowerShell :

```cmd
.\deploy.bat
```

## 📊 Ce que fait le script

1. **Nettoyage** : Arrête et supprime le conteneur existant
2. **Build** : Construit l'image Docker avec le code le plus récent
3. **Run** : Démarre le conteneur sur le port 8001
4. **Health Check** : Attend que le service soit opérationnel
5. **Test** : Exécute un test d'anonymisation complet
6. **Info** : Affiche les URLs et commandes utiles

## 🔗 URLs après déploiement

- **API** : http://localhost:8001
- **Health Check** : http://localhost:8001/health
- **Documentation Swagger** : http://localhost:8001/docs
- **Documentation ReDoc** : http://localhost:8001/redoc

## 🧪 Test manuel

```bash
curl -X POST http://localhost:8001/anonymize/fast \
  -H "Content-Type: application/json" \
  -d '{"text": "Jean Dupont - jean@test.fr - 192.168.1.100"}'
```

## 🛠️ Commandes Docker utiles

```bash
# Voir les logs en temps réel
docker logs whisper-network -f

# Ouvrir un shell dans le conteneur
docker exec -it whisper-network bash

# Redémarrer le service
docker restart whisper-network

# Arrêter le service
docker stop whisper-network

# Voir les statistiques
docker stats whisper-network
```

## ⚙️ Configuration

Pour modifier le port ou le nom du conteneur, éditez les variables en haut du script :

**Linux/macOS (deploy.sh)** :
```bash
IMAGE_NAME="whisper-network"
CONTAINER_NAME="whisper-network"
HOST_PORT=8001
CONTAINER_PORT=8000
```

**Windows (deploy.bat)** :
```cmd
set IMAGE_NAME=whisper-network
set CONTAINER_NAME=whisper-network
set HOST_PORT=8001
set CONTAINER_PORT=8000
```

## 🐛 Dépannage

### Le service ne démarre pas

```bash
docker logs whisper-network --tail 50
```

### Le port 8001 est déjà utilisé

Changez `HOST_PORT` dans le script ou arrêtez le service utilisant le port :

```bash
# Linux/macOS
lsof -i :8001

# Windows
netstat -ano | findstr :8001
```

### Réinitialisation complète

```bash
./deploy.sh clean
docker rmi whisper-network
./deploy.sh
```

## 📝 Logs

Les logs du conteneur sont accessibles via :

```bash
docker logs whisper-network
```

Pour suivre les logs en temps réel :

```bash
docker logs whisper-network -f
```

## 🔄 Mise à jour

Après modification du code :

```bash
./deploy.sh  # Le script rebuild automatiquement
```

---

**Auteur** : Sylvain JOLY, NANO by NXO  
**Licence** : MIT
