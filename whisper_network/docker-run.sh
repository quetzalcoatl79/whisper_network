#!/bin/bash

# Whisper Network - Container Management Script
# Usage: ./docker-run.sh [build|start|stop|restart|logs|shell]

set -e

PROJECT_NAME="whisper-network"
IMAGE_NAME="whisper-network-api"

function build_image() {
    echo "🔨 Building Docker image..."
    docker build -t $IMAGE_NAME .
}

function start_container() {
    echo "🚀 Starting Whisper Network API..."
    docker-compose up -d
    echo "✅ API is running at http://localhost:8001"
    echo "📚 Documentation available at http://localhost:8001/docs"
}

function stop_container() {
    echo "🛑 Stopping Whisper Network API..."
    docker-compose down
}

function restart_container() {
    echo "🔄 Restarting Whisper Network API..."
    docker-compose restart
}

function show_logs() {
    echo "📋 Showing logs..."
    docker-compose logs -f whisper-network
}

function shell_access() {
    echo "🐚 Accessing container shell..."
    docker-compose exec whisper-network /bin/bash
}

function show_status() {
    echo "📊 Container status:"
    docker-compose ps
}

function cleanup() {
    echo "🧹 Cleaning up..."
    docker-compose down --volumes --remove-orphans
    docker image prune -f
}

case "$1" in
    build)
        build_image
        ;;
    start)
        start_container
        ;;
    stop)
        stop_container
        ;;
    restart)
        restart_container
        ;;
    logs)
        show_logs
        ;;
    shell)
        shell_access
        ;;
    status)
        show_status
        ;;
    cleanup)
        cleanup
        ;;
    *)
        echo "Usage: $0 {build|start|stop|restart|logs|shell|status|cleanup}"
        echo ""
        echo "Commands:"
        echo "  build    - Build the Docker image"
        echo "  start    - Start the API container"
        echo "  stop     - Stop the API container"
        echo "  restart  - Restart the API container"
        echo "  logs     - Show container logs"
        echo "  shell    - Access container shell"
        echo "  status   - Show container status"
        echo "  cleanup  - Clean up containers and images"
        exit 1
        ;;
esac