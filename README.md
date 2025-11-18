# Codriver

A VS Code extension providing an agentic, local-first coding assistant with context memory, tooling, terminal access, and LSP-like indexing.

## Architecture Options

Codriver supports two deployment architectures:

### Option 1: Monolithic Extension (Current)

Everything runs within the VS Code extension process:

- Simple deployment and debugging
- Lower latency (no network calls)
- Easier development setup
- All functionality in one package

### Option 2: Separated Backend Service (Recommended for Production)

Extension UI + separate backend service:

- Backend runs in Docker container
- Better resource isolation
- Independent scaling and updates
- Multi-client support
- Advanced deployment options

## Quick Start

### Monolithic Mode (Development)

```bash
npm install
npm run compile
# Press F5 in VS Code to launch
```

### Separated Backend Mode (Production)

```bash
# Start backend service
./scripts/manage-backend.sh start

# Then launch extension
npm install
npm run compile
# Press F5 in VS Code to launch
```

## Features

- **Agentic Mode**: True agentic behavior with planning, tool use, recursion, and self-debugging
- **Local Context Storage**: SQLite for persistent storage, Redis for caching
- **Local Indexing**: Tree-sitter based indexing for symbols, references, and code navigation
- **Secure Terminal Access**: Optional, permission-controlled terminal execution
- **Tooling System**: Comprehensive set of tools for filesystem, editor, debugging, and more

## Installation

1. Clone this repository
2. Run `npm install`
3. Run `npm run compile`
4. Press F5 to launch extension development host

## Configuration

All configuration is done via VS Code settings under `codriver.*`:

- `codriver.enabled`: Enable/disable the extension
- `codriver.agentic.enabled`: Enable agentic mode
- `codriver.agentic.maxSteps`: Maximum steps in agentic loop
- `codriver.storage.sqlite.path`: SQLite database path
- `codriver.storage.redis.*`: Redis configuration
- `codriver.tools.shell.enabled`: Enable terminal execution
- `codriver.indexing.*`: Indexing configuration

## Commands

- `Codriver: Toggle`: Enable/disable Codriver
- `Codriver: Ask`: Ask a question (simple mode)
- `Codriver: Enable Agentic Mode`: Toggle agentic mode
- `Codriver: Clear Cache`: Clear all caches
- `Codriver: Index Workspace`: Re-index the entire workspace
- `Codriver: Open Debug Panel`: Open debugging interface

## Architecture

The extension consists of several core components:

- **CodriverCore**: Main engine coordinating all components
- **ContextStore**: SQLite-based persistent storage
- **RedisCache**: In-memory caching layer
- **IndexingEngine**: Tree-sitter based code indexing
- **ToolingSystem**: Tool definitions and execution
- **AgenticEngine**: Agentic loop with planning and reflection

## Development

### Building

```bash
npm run compile
```

### Testing

```bash
npm run test
```

### Linting

```bash
npm run lint
```

## Security

- Terminal execution is disabled by default
- Requires explicit user permission for shell commands
- Filesystem access limited to workspace
- No network access unless explicitly enabled

## License

MIT
