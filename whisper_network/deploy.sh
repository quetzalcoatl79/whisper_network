#!/bin/bash

###############################################################################
# Whisper Network - Script de déploiement Docker
# Auteur: Sylvain JOLY, NANO by NXO
# Description: Build et déploie le conteneur Whisper Network avec gestion
#              propre des versions précédentes
###############################################################################

set -e  # Arrêt en cas d'erreur

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
IMAGE_NAME="whisper-network"
CONTAINER_NAME="whisper-network"
HOST_PORT=8001
CONTAINER_PORT=8000

###############################################################################
# Fonctions utilitaires
###############################################################################

print_header() {
    echo -e "${BLUE}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                   WHISPER NETWORK DEPLOY                     ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

check_docker() {
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker Desktop n'est pas démarré !"
        echo -e "${YELLOW}Action requise:${NC}"
        echo "  1. Démarrez Docker Desktop"
        echo "  2. Attendez que Docker soit complètement démarré"
        echo "  3. Relancez ce script: ./deploy.sh"
        exit 1
    fi
    print_success "Docker est actif"
}

print_step() {
    echo -e "${GREEN}▶ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

###############################################################################
# Étapes de déploiement
###############################################################################

cleanup_existing() {
    print_step "Nettoyage des conteneurs existants..."
    
    # Utiliser docker-compose pour arrêter et supprimer proprement
    if docker-compose ps -q | grep -q .; then
        print_warning "Arrêt des conteneurs via docker-compose..."
        docker-compose down || true
    else
        # Fallback sur docker si docker-compose n'a rien trouvé
        # Arrêter le conteneur s'il tourne
        if docker ps -q -f name=${CONTAINER_NAME} | grep -q .; then
            print_warning "Arrêt du conteneur ${CONTAINER_NAME}..."
            docker stop ${CONTAINER_NAME} || true
        fi
        
        # Supprimer le conteneur s'il existe
        if docker ps -aq -f name=${CONTAINER_NAME} | grep -q .; then
            print_warning "Suppression du conteneur ${CONTAINER_NAME}..."
            docker rm ${CONTAINER_NAME} || true
        fi
    fi
    
    print_success "Nettoyage terminé"
}

build_image() {
    print_step "Build de l'image Docker via docker-compose..."
    
    if docker-compose build --no-cache ; then
        print_success "Image construite avec succès"
    else
        print_error "Échec du build de l'image"
        exit 1
    fi
}

run_container() {
    print_step "Démarrage du conteneur via docker-compose..."
    
    if docker-compose up -d ; then
        print_success "Conteneur démarré sur le port ${HOST_PORT}"
    else
        print_error "Échec du démarrage du conteneur"
        exit 1
    fi
}

wait_for_health() {
    print_step "Attente du démarrage des services..."
    
    local max_attempts=30
    local attempt=0
    
    # Attendre l'API principale
    echo -n "API principale"
    while [ $attempt -lt $max_attempts ]; do
        if curl -sf http://localhost:${HOST_PORT}/health > /dev/null 2>&1; then
            print_success " ✓ API opérationnelle"
            break
        fi
        
        echo -n "."
        sleep 1
        ((attempt++))
    done
    
    if [ $attempt -eq $max_attempts ]; then
        echo ""
        print_error "L'API n'a pas démarré dans les temps"
        docker logs ${CONTAINER_NAME} --tail 20
        exit 1
    fi
    
    # Vérifier Redis
    echo -n "Redis"
    if docker-compose exec -T redis redis-cli ping > /dev/null 2>&1; then
        print_success " ✓ Redis opérationnel"
    else
        print_warning " Redis non accessible (peut être normal)"
    fi
    
    # Vérifier PostgreSQL
    echo -n "PostgreSQL"
    if docker-compose exec -T postgres pg_isready -U whisper_user -d whisper_network > /dev/null 2>&1; then
        print_success " ✓ PostgreSQL opérationnel"
    else
        print_warning " PostgreSQL non accessible (peut être normal)"
    fi
    
    echo ""
}

run_health_check() {
    print_step "Vérification de la santé du service..."
    
    health_response=$(curl -s http://localhost:${HOST_PORT}/health)
    
    echo -e "${BLUE}Response:${NC}"
    echo "$health_response" | python -m json.tool 2>/dev/null || echo "$health_response"
    echo ""
}

run_test() {
    print_step "Test d'anonymisation rapide..."
    
    docker exec ${CONTAINER_NAME} python -c "
import requests
import json

text = 'Jean Dupont - jean@test.fr - 01.23.45.67.89 - IP: 192.168.1.100'

response = requests.post('http://localhost:${CONTAINER_PORT}/anonymize/fast', json={
    'text': text
})

result = response.json()

print('📋 ORIGINAL:', result['original_text'])
print('✅ ANONYMISÉ:', result['anonymized_text'])
print(f\"⚡ {result['anonymizations_count']} éléments en {result['processing_time_ms']:.2f}ms\")
"
    
    if [ $? -eq 0 ]; then
        print_success "Test réussi"
    else
        print_warning "Test échoué, vérifier les logs"
    fi
}

show_info() {
    echo ""
    echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║                    INFORMATIONS                              ║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "  ${GREEN}Services déployés:${NC}"
    echo -e "    • API Whisper Network  http://localhost:${HOST_PORT}"
    echo -e "    • PostgreSQL           localhost:5432 (whisper_network)"
    echo -e "    • Redis                localhost:6379"
    echo ""
    echo -e "  ${GREEN}Endpoints utiles:${NC}"
    echo -e "    • Health Check:        http://localhost:${HOST_PORT}/health"
    echo -e "    • Documentation:       http://localhost:${HOST_PORT}/docs"
    echo -e "    • ReDoc:               http://localhost:${HOST_PORT}/redoc"
    echo -e "    • Preferences Save:    POST /api/preferences/save"
    echo -e "    • Preferences Load:    POST /api/preferences/load"
    echo ""
    echo -e "  ${GREEN}Commandes utiles:${NC}"
    echo -e "    docker-compose logs -f                        # Tous les logs"
    echo -e "    docker-compose logs -f whisper-network        # Logs API"
    echo -e "    docker-compose logs -f postgres               # Logs PostgreSQL"
    echo -e "    docker-compose exec whisper-network bash      # Shell API"
    echo -e "    docker-compose exec postgres psql -U whisper_user -d whisper_network  # SQL"
    echo -e "    docker-compose stop                           # Arrêter"
    echo -e "    docker-compose restart                        # Redémarrer"
    echo -e "    docker-compose down                           # Arrêter et supprimer"
    echo ""
}

###############################################################################
# Main
###############################################################################

main() {
    print_header
    
    # Vérifier que Docker est installé
    if ! command -v docker &> /dev/null; then
        print_error "Docker n'est pas installé ou n'est pas dans le PATH"
        exit 1
    fi
    
    # Vérifier que Docker Desktop est démarré
    check_docker
    
    # Vérifier que nous sommes dans le bon répertoire
    if [ ! -f "Dockerfile" ]; then
        print_error "Dockerfile non trouvé. Exécutez ce script depuis le répertoire whisper_network"
        exit 1
    fi
    
    # Étapes de déploiement
    cleanup_existing
    build_image
    run_container
    wait_for_health
    run_health_check
    run_test
    show_info
    
    print_success "Déploiement terminé avec succès ! 🚀"
}

# Gestion des arguments
case "${1:-}" in
    clean)
        print_header
        cleanup_existing
        print_success "Nettoyage terminé"
        ;;
    logs)
        docker-compose logs -f
        ;;
    shell)
        docker-compose exec whisper-network bash
        ;;
    test)
        run_test
        ;;
    *)
        main
        ;;
esac
