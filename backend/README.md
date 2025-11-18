# Codriver Backend Service

A standalone service providing the core functionality for the Codriver VS Code extension.

## Architecture

```
VS Code Extension (UI/Commands)
    ↓ HTTP/WebSocket
Backend Service (Docker)
    ├── Agentic Engine
    ├── Indexing Engine
    ├── Context Store (SQLite)
    ├── Redis Cache
    └── Tooling System
```

## API Endpoints

### Agentic Operations

- `POST /api/agent/process` - Process query with agentic loop
- `GET /api/agent/status/:sessionId` - Get agent status
- `POST /api/agent/stop/:sessionId` - Stop agent execution

### Indexing Operations

- `POST /api/index/workspace` - Index entire workspace
- `POST /api/index/file` - Index specific file
- `GET /api/index/symbols` - Search symbols
- `GET /api/index/definitions/:symbol` - Find definitions

### Context Operations

- `POST /api/context/store` - Store context
- `GET /api/context/search` - Search contexts
- `GET /api/context/:id` - Get context by ID

### Tooling Operations

- `POST /api/tools/execute` - Execute tool
- `GET /api/tools/list` - List available tools

### System Operations

- `GET /api/health` - Health check
- `POST /api/cache/clear` - Clear caches
- `GET /api/status` - Service status

## Configuration

Environment variables:

- `CODRIVER_SQLITE_PATH` - SQLite database path
- `CODRIVER_REDIS_URL` - Redis connection URL
- `CODRIVER_PORT` - Service port (default: 3000)
- `CODRIVER_HOST` - Service host (default: localhost)
- `CODRIVER_LOG_LEVEL` - Logging level

## Docker Setup

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY dist/ ./dist/
COPY src/ ./src/

EXPOSE 3000
CMD ["npm", "start"]
```

## Communication Protocol

Uses JSON-RPC 2.0 over WebSocket for real-time communication:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "agent.process",
  "params": {
    "query": "implement user authentication",
    "sessionId": "session_123"
  }
}
```

## Benefits

1. **Independent Scaling**: Backend can be optimized separately
2. **Language Flexibility**: Backend can be rewritten in Rust/Go for performance
3. **Testing**: Backend can be tested independently
4. **Multi-Client**: Same backend can serve multiple VS Code instances
5. **Deployment**: Backend updates don't require extension updates
