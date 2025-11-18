#!/bin/bash

# Codriver Backend Development Manager
# This script manages the backend service in development mode

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
LOG_FILE="$PROJECT_ROOT/backend.log"

cd "$PROJECT_ROOT"

case "$1" in
    start)
        echo "Starting Codriver backend in development mode..."
        cd "$BACKEND_DIR"
        nohup npx ts-node src/server.ts > "$LOG_FILE" 2>&1 &
        echo "Backend started with PID $!"
        sleep 3
        if curl -s http://localhost:3001/api/health > /dev/null; then
            echo "✅ Backend is healthy"
        else
            echo "❌ Backend health check failed"
        fi
        ;;

    stop)
        echo "Stopping Codriver backend..."
        pkill -f "ts-node src/server.ts" || true
        echo "Backend stopped."
        ;;

    restart)
        echo "Restarting Codriver backend..."
        $0 stop
        sleep 2
        $0 start
        ;;

    logs)
        if [ -f "$LOG_FILE" ]; then
            tail -f "$LOG_FILE"
        else
            echo "Log file not found: $LOG_FILE"
        fi
        ;;

    status)
        echo "Backend process status:"
        ps aux | grep "ts-node src/server.ts" | grep -v grep || echo "No backend process found"
        echo ""
        echo "Health check:"
        curl -s http://localhost:3001/api/health || echo "❌ Backend not responding"
        ;;

    build)
        echo "Building backend..."
        cd "$BACKEND_DIR"
        npx tsc
        echo "Backend built."
        ;;

    test)
        echo "Testing simple query endpoint..."
        curl -X POST http://localhost:3001/api/query/simple \
             -H "Content-Type: application/json" \
             -d '{"query":"What is 2+2?"}' || echo "❌ Test failed"
        ;;

    *)
        echo "Usage: $0 {start|stop|restart|logs|status|build|test}"
        echo ""
        echo "Commands:"
        echo "  start   - Start backend in development mode"
        echo "  stop    - Stop backend"
        echo "  restart - Restart backend"
        echo "  logs    - Show backend logs"
        echo "  status  - Show backend status"
        echo "  build   - Build TypeScript"
        echo "  test    - Test simple query endpoint"
        exit 1
        ;;
esac