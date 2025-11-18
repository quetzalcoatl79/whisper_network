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
    
    print_success "Nettoyage terminé"
}

build_image() {
    print_step "Build de l'image Docker ${IMAGE_NAME}..."
    
    if docker build -t ${IMAGE_NAME}:latest . ; then
        print_success "Image construite avec succès"
    else
        print_error "Échec du build de l'image"
        exit 1
    fi
}

run_container() {
    print_step "Démarrage du conteneur..."
    
    docker run -d \
        --name ${CONTAINER_NAME} \
        -p ${HOST_PORT}:${CONTAINER_PORT} \
        --restart unless-stopped \
        ${IMAGE_NAME}:latest
    
    if [ $? -eq 0 ]; then
        print_success "Conteneur démarré sur le port ${HOST_PORT}"
    else
        print_error "Échec du démarrage du conteneur"
        exit 1
    fi
}

wait_for_health() {
    print_step "Attente du démarrage du service..."
    
    local max_attempts=30
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -sf http://localhost:${HOST_PORT}/health > /dev/null 2>&1; then
            print_success "Service opérationnel !"
            return 0
        fi
        
        echo -n "."
        sleep 1
        ((attempt++))
    done
    
    echo ""
    print_error "Le service n'a pas démarré dans les temps"
    docker logs ${CONTAINER_NAME} --tail 20
    exit 1
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
    echo -e "  ${GREEN}API URL:${NC}        http://localhost:${HOST_PORT}"
    echo -e "  ${GREEN}Health Check:${NC}   http://localhost:${HOST_PORT}/health"
    echo -e "  ${GREEN}Documentation:${NC}  http://localhost:${HOST_PORT}/docs"
    echo -e "  ${GREEN}ReDoc:${NC}          http://localhost:${HOST_PORT}/redoc"
    echo ""
    echo -e "  ${GREEN}Commandes utiles:${NC}"
    echo -e "    docker logs ${CONTAINER_NAME} -f       # Voir les logs"
    echo -e "    docker exec -it ${CONTAINER_NAME} bash # Shell interactif"
    echo -e "    docker stop ${CONTAINER_NAME}          # Arrêter"
    echo -e "    docker restart ${CONTAINER_NAME}       # Redémarrer"
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
        docker logs ${CONTAINER_NAME} -f
        ;;
    shell)
        docker exec -it ${CONTAINER_NAME} bash
        ;;
    test)
        run_test
        ;;
    *)
        main
        ;;
esac
