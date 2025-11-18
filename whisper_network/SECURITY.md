# 🔐 Whisper Network - Guide de Sécurité

## Vue d'ensemble

Whisper Network API intègre plusieurs niveaux de sécurité pour protéger votre infrastructure en production :

- ✅ **CORS restrictif** : Contrôle précis des origines autorisées
- ✅ **API Key authentication** : Protection par clé d'API pour tous les endpoints sensibles
- ✅ **Rate limiting** : Protection anti-abus (10 requêtes/minute par défaut)
- ✅ **Logs de sécurité** : Traçabilité des tentatives d'accès
- ✅ **Configuration centralisée** : Toute la configuration via fichier `.env`

---

## 🚀 Configuration Rapide

### 1. Créer votre fichier `.env`

```bash
cd whisper_network
cp .env.example .env
```

### 2. Générer une API Key sécurisée

**Option A - Linux/Mac :**
```bash
openssl rand -hex 32
```

**Option B - Python :**
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

### 3. Modifier `.env` avec vos valeurs

```bash
# API Server Configuration
API_HOST=0.0.0.0  # 0.0.0.0 pour production, 127.0.0.1 pour dev local
API_PORT=8000

# CORS Configuration (IMPORTANT!)
CORS_ORIGINS=https://votre-domaine.com,https://chat.openai.com

# API Key Authentication
API_KEY=votre_clé_générée_avec_openssl_rand

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_PER_MINUTE=20

# Logging
LOG_LEVEL=INFO
```

⚠️ **ATTENTION** : Ne JAMAIS commiter le fichier `.env` dans Git ! Il est déjà dans `.gitignore`.

---

## 🛡️ Niveaux de Sécurité

### Niveau 1 : CORS Restrictif

**Problème** : Par défaut, l'API acceptait `allow_origins=["*"]` (toutes origines).

**Solution** : Spécifier uniquement les domaines autorisés :

```bash
# .env
CORS_ORIGINS=https://chat.openai.com,https://claude.ai,https://votre-app.com
```

**Résultat** : Les requêtes depuis d'autres domaines sont bloquées par le navigateur.

---

### Niveau 2 : API Key Authentication

**Fonctionnement** :
- Tous les endpoints sensibles (`/anonymize`, `/anonymize/fast`) nécessitent un header `X-API-Key`
- Les endpoints publics (`/health`, `/`) restent accessibles

**Exemple d'utilisation** :

```bash
# ❌ Sans API Key → 403 Forbidden
curl -X POST http://localhost:8001/anonymize \
  -H "Content-Type: application/json" \
  -d '{"text": "Jean Dupont"}'

# ✅ Avec API Key → 200 OK
curl -X POST http://localhost:8001/anonymize \
  -H "Content-Type: application/json" \
  -H "X-API-Key: votre_clé_api" \
  -d '{"text": "Jean Dupont"}'
```

**Configuration** :
```bash
# .env
API_KEY=votre_clé_ultra_secrète
```

⚠️ Si `API_KEY` est vide dans `.env`, l'authentification est **désactivée** (mode dev uniquement).

---

### Niveau 3 : Rate Limiting

**Fonctionnement** : Limite le nombre de requêtes par minute par adresse IP.

**Configuration** :
```bash
# .env
RATE_LIMIT_ENABLED=true
RATE_LIMIT_PER_MINUTE=10
```

**Résultat** :
- Requêtes 1-10 : `200 OK`
- Requêtes 11+ : `429 Too Many Requests`

**Tester** :
```bash
# Envoyer 12 requêtes rapides
for i in {1..12}; do
  curl -X POST http://localhost:8001/anonymize/fast \
    -H "X-API-Key: votre_clé" \
    -H "Content-Type: application/json" \
    -d '{"text": "test"}' \
    -w " - HTTP %{http_code}\n"
done
```

---

### Niveau 4 : Logs de Sécurité

Tous les événements de sécurité sont tracés :

```
2025-11-18 10:11:38 - main - WARNING - Unauthorized access attempt with invalid API key
2025-11-18 10:11:41 - slowapi - WARNING - ratelimit 10 per 1 minute (172.19.0.1) exceeded at endpoint: /anonymize/fast
```

**Voir les logs Docker** :
```bash
docker logs whisper-network-api
```

**Filtrer les alertes de sécurité** :
```bash
docker logs whisper-network-api 2>&1 | grep -i "unauthorized\|warning\|403\|429"
```

---

## 🔧 Configuration Avancée

### Production avec Nginx

Recommandation : Placer l'API derrière un reverse proxy Nginx pour :
- Gestion SSL/TLS
- Headers de sécurité additionnels
- Logs centralisés

**Exemple nginx.conf** :
```nginx
server {
    listen 443 ssl http2;
    server_name api.votre-domaine.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;

    location / {
        proxy_pass http://whisper-network:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 📊 Monitoring & Alertes

### Health Check

L'endpoint `/health` est toujours public pour les systèmes de monitoring :

```bash
curl http://localhost:8001/health
# {"status":"healthy","timestamp":"2025-11-18T10:00:00","service":"whisper-network-api"}
```

### Alertes Recommandées

1. **Nombre de 403** : Trop de tentatives d'accès non autorisées
2. **Nombre de 429** : Pic d'utilisation ou attaque DDoS
3. **Temps de réponse** : Dégradation des performances

---

## 🧪 Tests de Sécurité

Un script de test complet est fourni :

```bash
cd whisper_network
bash test_security.sh
```

**Ce qui est testé** :
- ✅ Accès sans API Key (doit échouer)
- ✅ Accès avec mauvaise API Key (doit échouer)
- ✅ Accès avec bonne API Key (doit réussir)
- ✅ Endpoint /health (toujours accessible)
- ✅ Rate limiting (10 requêtes OK, 11-12 bloquées)

---

## ⚠️ Checklist Production

Avant de déployer en production :

- [ ] Générer une API Key forte (32+ caractères aléatoires)
- [ ] Configurer `CORS_ORIGINS` avec les domaines exacts (jamais `*`)
- [ ] Activer `RATE_LIMIT_ENABLED=true`
- [ ] Définir `LOG_LEVEL=WARNING` ou `ERROR`
- [ ] Vérifier que `.env` est dans `.gitignore`
- [ ] Tester avec `test_security.sh`
- [ ] Configurer un reverse proxy (Nginx/Traefik)
- [ ] Mettre en place des alertes monitoring
- [ ] Activer les backups des logs

---

## 🔍 Dépannage

### "Invalid API key" même avec la bonne clé

**Solution** : Vérifier que le fichier `.env` est bien chargé par Docker :

```bash
# Vérifier que docker-compose charge .env
docker-compose config | grep API_KEY

# Redémarrer avec le .env
docker-compose down
docker-compose up -d
```

### CORS bloque mes requêtes

**Symptôme** : Erreur dans la console navigateur "CORS policy blocked..."

**Solution** : Vérifier que votre domaine est dans `CORS_ORIGINS` :

```bash
# Dans .env
CORS_ORIGINS=https://chat.openai.com,https://votre-domaine.com
```

### Rate limiting trop strict

**Solution** : Ajuster `RATE_LIMIT_PER_MINUTE` dans `.env` :

```bash
RATE_LIMIT_PER_MINUTE=50  # 50 requêtes/minute au lieu de 10
```

---

## 📚 Ressources

- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [FastAPI Security Best Practices](https://fastapi.tiangolo.com/tutorial/security/)
- [SlowAPI Documentation](https://github.com/laurentS/slowapi)

---

**Développé par** : Sylvain JOLY, NANO by NXO  
**Licence** : MIT  
**Support** : [Issues GitHub](https://github.com/votre-repo/issues)
