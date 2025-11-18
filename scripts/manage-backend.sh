#!/bin/bash

# Codriver Backend Service Manager
# This script manages the Docker-based backend service

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DOCKER_COMPOSE_FILE="$PROJECT_ROOT/docker-compose.yml"

case "$1" in
    start)
        echo "Starting Codriver backend service..."
        docker-compose -f "$DOCKER_COMPOSE_FILE" up -d
        echo "Backend service started. Waiting for health check..."
        sleep 5
        curl -f http://localhost:3000/api/health && echo "✅ Backend is healthy" || echo "❌ Backend health check failed"
        ;;

    stop)
        echo "Stopping Codriver backend service..."
        docker-compose -f "$DOCKER_COMPOSE_FILE" down
        echo "Backend service stopped."
        ;;

    restart)
        echo "Restarting Codriver backend service..."
        docker-compose -f "$DOCKER_COMPOSE_FILE" restart
        echo "Backend service restarted."
        ;;

    logs)
        docker-compose -f "$DOCKER_COMPOSE_FILE" logs -f codriver-backend
        ;;

    status)
        echo "Backend service status:"
        docker-compose -f "$DOCKER_COMPOSE_FILE" ps
        echo ""
        echo "Health check:"
        curl -s http://localhost:3000/api/health || echo "❌ Backend not responding"
        ;;

    build)
        echo "Building backend service..."
        docker-compose -f "$DOCKER_COMPOSE_FILE" build --no-cache
        echo "Backend service built."
        ;;

    clean)
        echo "Cleaning up backend service..."
        docker-compose -f "$DOCKER_COMPOSE_FILE" down -v
        docker system prune -f
        echo "Cleanup complete."
        ;;

    *)
        echo "Usage: $0 {start|stop|restart|logs|status|build|clean}"
        echo ""
        echo "Commands:"
        echo "  start   - Start the backend service"
        echo "  stop    - Stop the backend service"
        echo "  restart - Restart the backend service"
        echo "  logs    - Show backend service logs"
        echo "  status  - Show backend service status"
        echo "  build   - Rebuild the backend service"
        echo "  clean   - Clean up containers and volumes"
        exit 1
        ;;
esac