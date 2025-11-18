# 🚀 Recommandations Déploiement Production - Whisper Network

> Guide complet pour déployer Whisper Network en production

---

## 🤖 **Modèle IA : OUI, il est LOCAL !**

### 📦 **spaCy `fr_core_news_sm`**
Votre projet utilise **spaCy avec le modèle français `fr_core_news_sm`** qui est :

✅ **Complètement LOCAL**
- Téléchargé et installé dans le container Docker
- Aucun appel API externe
- Toutes les données restent sur votre serveur
- Pas de coût d'utilisation

📊 **Caractéristiques du modèle** :
- **Taille** : ~15 MB (très léger)
- **Mémoire** : ~100-200 MB en runtime
- **Performance** : Détection NER (noms, lieux, organisations)
- **Vitesse** : ~1000 tokens/seconde sur CPU

🔧 **Installation** :
```bash
pip install spacy
python -m spacy download fr_core_news_sm
# OU depuis requirements.txt (comme actuellement)
```

⚠️ **Note** : Si le modèle n'est pas trouvé, l'app fonctionne quand même en mode "regex only" (mode fast).

---

## 💻 **Recommandations VM selon Usage**

### 🥇 **TOP RECOMMANDATION : Hetzner Cloud CX21**

**Pourquoi Hetzner ?**
- 🏆 **Meilleur rapport qualité/prix** en Europe
- 🚀 **Performance** : AMD EPYC, NVMe SSD, 20 TB de trafic
- 🌍 **Datacenters** : Allemagne, Finlande (RGPD compliant)
- 💰 **Prix** : ~5€/mois (60€/an)

#### Configuration CX21 (Recommandée)
```yaml
CPU: 2 vCPU AMD EPYC
RAM: 4 GB
Disque: 40 GB NVMe SSD
Réseau: 20 TB trafic/mois
Prix: 4.90€/mois
```

**Estimation capacité** :
- ✅ **100-200 requêtes/seconde** avec cache
- ✅ **10-20 utilisateurs simultanés** sans problème
- ✅ Docker + FastAPI + spaCy + Redis

#### Montée en gamme (si besoin)
```yaml
CX31: 2 vCPU, 8 GB RAM → 8.90€/mois
CX41: 4 vCPU, 16 GB RAM → 15.90€/mois
```

---

## 🌍 **Comparatif Hébergeurs**

### Option 1 : **Hetzner Cloud** 🥇
```
✅ Prix imbattable (5€/mois)
✅ Performance excellente
✅ Datacenters EU (RGPD)
✅ Interface simple
✅ Snapshots gratuits
❌ Support en anglais/allemand
```
**🎯 IDÉAL POUR** : Production, projets sérieux, RGPD

### Option 2 : **Contabo VPS** 💰
```
✅ Excellent rapport qualité/prix (6€/mois pour 4vCPU/8GB)
✅ Beaucoup de ressources
✅ Support français
⚠️ Performance réseau variable
⚠️ Surallocation ressources
```
**🎯 IDÉAL POUR** : Budget très serré, beaucoup de RAM nécessaire

### Option 3 : **OVH VPS SSD** 🇫🇷
```
✅ Hébergeur français (support FR)
✅ Datacenters France
✅ Fiable et stable
❌ Plus cher (7-10€/mois)
⚠️ Interface vieillissante
```
**🎯 IDÉAL POUR** : Obligation d'héberger en France

### Option 4 : **Scaleway DEV1-M** 🇫🇷
```
✅ Hébergeur français (Iliad)
✅ Technologie moderne
✅ API excellente
❌ Prix moyen (8€/mois)
⚠️ Moins de communauté
```
**🎯 IDÉAL POUR** : Dev français moderne, API-first

### Option 5 : **DigitalOcean** 🌊
```
✅ Documentation exceptionnelle
✅ Interface intuitive
✅ Marketplace (one-click apps)
✅ Communauté énorme
❌ Plus cher (24$/mois)
❌ US-based (RGPD à vérifier)
```
**🎯 IDÉAL POUR** : Premiers pas, apprentissage, tutoriels

### Option 6 : **Self-hosted** 🏠
```
✅ Contrôle total
✅ Pas de coût mensuel
✅ Pas de limite de bande passante
❌ Électricité + Internet
❌ Maintenance physique
❌ IP dynamique (DynDNS)
```
**Hardware recommandé** :
- **Raspberry Pi 4 (8GB)** : 60-80€ (suffisant pour petit usage)
- **Mini PC (Intel N100)** : 150-200€ (excellent rapport perf/prix)
- **Ancien laptop** : Recyclage écologique

**🎯 IDÉAL POUR** : Apprentissage, tests, pas de production critique

---

## 📊 **Estimation Ressources par Usage**

### Usage Léger (1-5 utilisateurs)
```yaml
CPU: 1-2 vCPU
RAM: 2-4 GB
Disque: 20-40 GB
Prix: 3-5€/mois
Exemples: Hetzner CX11, Contabo VPS S
```

### Usage Moyen (5-20 utilisateurs) ✅ **VOTRE CAS**
```yaml
CPU: 2-4 vCPU
RAM: 4-8 GB
Disque: 40-80 GB
Prix: 5-10€/mois
Exemple: Hetzner CX21/CX31 ← RECOMMANDÉ
```

### Usage Intensif (20-100 utilisateurs)
```yaml
CPU: 4-8 vCPU
RAM: 8-16 GB
Disque: 80-160 GB
Prix: 15-30€/mois
Exemple: Hetzner CX41/CX51
```

### Usage Entreprise (100+ utilisateurs)
```yaml
Architecture: Multi-serveurs + Load Balancer
Orchestration: Kubernetes (K3s)
Cache: Redis Cluster
Base: PostgreSQL répliquée
Prix: 50-200€/mois+
```

---

## 🛠️ **Stack Technique Recommandée**

### Architecture Simple (Recommandée pour début)
```
                    Internet
                       ↓
                  [Cloudflare]  ← CDN + DDoS protection (gratuit)
                       ↓
              [Nginx Reverse Proxy]
                       ↓
            ┌──────────┴──────────┐
            ↓                     ↓
      [FastAPI API]          [Extension]
    (Docker Container)       (Browsers)
            ↓
      [Redis Cache]
    (Docker Container)
```

### Fichier docker-compose.yml Production
```yaml
version: '3.8'

services:
  whisper-api:
    image: whisper-network:latest
    restart: always
    ports:
      - "127.0.0.1:8000:8000"  # Seulement localhost
    environment:
      - REDIS_URL=redis://redis:6379
      - API_KEY=${API_KEY}
      - CORS_ORIGINS=${CORS_ORIGINS}
    volumes:
      - ./logs:/app/logs
    depends_on:
      - redis
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    networks:
      - whisper-network

  redis:
    image: redis:7-alpine
    restart: always
    ports:
      - "127.0.0.1:6379:6379"
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes
    networks:
      - whisper-network

volumes:
  redis-data:

networks:
  whisper-network:
    driver: bridge
```

### Configuration Nginx
```nginx
# /etc/nginx/sites-available/whisper-network
server {
    listen 80;
    server_name api.whisper-network.com;
    
    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.whisper-network.com;
    
    # SSL Certificates (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/api.whisper-network.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.whisper-network.com/privkey.pem;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    
    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_req zone=api_limit burst=20 nodelay;
    
    # Compression
    gzip on;
    gzip_types application/json;
    
    # Proxy to FastAPI
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

---

## 🔧 **Installation Automatique - Script Bash**

```bash
#!/bin/bash
# install-whisper-production.sh

set -e

echo "🚀 Installation Whisper Network Production"

# Update system
echo "📦 Mise à jour du système..."
sudo apt update && sudo apt upgrade -y

# Install Docker
echo "🐳 Installation Docker..."
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
echo "🔧 Installation Docker Compose..."
sudo apt install docker-compose-plugin -y

# Install Nginx
echo "🌐 Installation Nginx..."
sudo apt install nginx -y

# Install Certbot
echo "🔒 Installation Certbot..."
sudo apt install certbot python3-certbot-nginx -y

# Firewall
echo "🛡️ Configuration Firewall..."
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

# Create project directory
echo "📁 Création répertoires..."
mkdir -p ~/whisper-network/{logs,data}
cd ~/whisper-network

# Clone or copy project
echo "📥 Déploiement application..."
# git clone https://github.com/votre-repo/whisper-network.git

# Environment variables
echo "⚙️ Configuration variables..."
cat > .env << EOF
API_KEY=$(openssl rand -hex 32)
CORS_ORIGINS=https://chat.openai.com,https://claude.ai
REDIS_URL=redis://redis:6379
EOF

# Start services
echo "🚀 Démarrage services..."
docker-compose up -d

# SSL Certificate
read -p "Nom de domaine (ex: api.whisper-network.com): " DOMAIN
sudo certbot --nginx -d $DOMAIN

echo "✅ Installation terminée !"
echo "🌐 API disponible sur : https://$DOMAIN"
echo "🔑 API Key : $(grep API_KEY .env | cut -d= -f2)"
```

---

## 📈 **Monitoring & Maintenance**

### Vérifications quotidiennes (automatisables)
```bash
# Check service health
curl -f https://api.whisper-network.com/health || echo "❌ API DOWN"

# Check disk space
df -h | grep -E "/$|/var/lib/docker"

# Check Docker containers
docker ps --filter "status=running" --filter "name=whisper"

# Check logs errors
docker logs whisper-api --tail 100 | grep -i error
```

### Backup automatique (cron)
```bash
# Crontab : backup quotidien à 2h du matin
0 2 * * * /usr/local/bin/backup-whisper.sh

# /usr/local/bin/backup-whisper.sh
#!/bin/bash
DATE=$(date +%Y%m%d)
cd ~/whisper-network
docker-compose exec -T redis redis-cli SAVE
tar czf ~/backups/whisper-${DATE}.tar.gz data/ logs/ .env docker-compose.yml
# Garder seulement 7 derniers jours
find ~/backups -name "whisper-*.tar.gz" -mtime +7 -delete
```

---

## 💰 **Estimation Coûts Totaux**

### Setup Initial (One-time)
```
Nom de domaine : 10-15€/an
Temps installation : 2-4h (gratuit si DIY)
```

### Coûts Mensuels (Hetzner CX21)
```
VPS Hetzner CX21 : 4.90€/mois
Domaine (prorata) : 1€/mois
Monitoring gratuit : 0€
TOTAL : ~6€/mois (~72€/an)
```

### Alternative Self-hosted
```
Raspberry Pi 4 8GB : 80€ (one-time)
Électricité : ~2€/mois
DynDNS (No-IP) : 0€ (gratuit)
TOTAL : 80€ + 24€/an
Rentable après 3 ans vs Hetzner
```

---

## ✅ **Checklist Avant Production**

### Sécurité
- [ ] CORS configuré avec origines spécifiques
- [ ] API Key ou JWT implémenté
- [ ] HTTPS avec certificat valide
- [ ] Firewall activé (UFW)
- [ ] Fail2ban configuré
- [ ] SSH par clé uniquement
- [ ] Variables sensibles dans .env (pas dans git)
- [ ] Rate limiting activé

### Performance
- [ ] Redis cache installé et fonctionnel
- [ ] Nginx avec compression gzip
- [ ] Logs en rotation (logrotate)
- [ ] Health checks configurés

### Monitoring
- [ ] UptimeRobot ou équivalent
- [ ] Alertes email si down
- [ ] Backup automatique quotidien
- [ ] Script de rollback testé

### Documentation
- [ ] Procédure de déploiement documentée
- [ ] Credentials sauvegardées (coffre-fort)
- [ ] Contact urgence défini

---

## 🆘 **Troubleshooting Production**

### API ne répond pas
```bash
# Check container status
docker ps -a

# Check logs
docker logs whisper-api --tail 100

# Restart service
docker-compose restart whisper-api

# Nuclear option
docker-compose down && docker-compose up -d
```

### Performance dégradée
```bash
# Check CPU/RAM
docker stats

# Check Redis
docker exec -it redis redis-cli INFO stats

# Check Nginx logs
tail -f /var/log/nginx/error.log
```

### SSL certificate expired
```bash
# Renew certificate
sudo certbot renew
sudo systemctl reload nginx
```

---

**Besoin d'aide pour le déploiement ?**  
N'hésitez pas à demander ! Je peux vous guider étape par étape. 🚀

---

**Dernière mise à jour** : 18 novembre 2025  
**Mainteneur** : Sylvain JOLY, NANO by NXO
