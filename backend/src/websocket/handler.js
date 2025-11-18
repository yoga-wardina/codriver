"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createWebSocketHandler = exports.WebSocketHandler = void 0;
const logger_1 = require("../utils/logger");
class WebSocketHandler {
    constructor(ws, agenticService, indexingService, contextService, toolingService) {
        this.pendingRequests = new Map();
        this.ws = ws;
        this.agenticService = agenticService;
        this.indexingService = indexingService;
        this.contextService = contextService;
        this.toolingService = toolingService;
    }
    handleMessage(message) {
        if (message.jsonrpc !== '2.0') {
            this.sendError(message.id, -32600, 'Invalid Request');
            return;
        }
        this.dispatchMethod(message);
    }
    async dispatchMethod(request) {
        try {
            let result;
            switch (request.method) {
                case 'agent.process':
                    result = await this.agenticService.processQuery(request.params?.query, request.params?.sessionId || 'default');
                    break;
                case 'agent.status':
                    result = this.agenticService.getSessionStatus(request.params?.sessionId);
                    break;
                case 'agent.stop':
                    this.agenticService.stopSession(request.params?.sessionId);
                    result = { success: true };
                    break;
                case 'index.workspace':
                    await this.indexingService.indexWorkspace(request.params?.workspacePath || process.cwd());
                    result = { success: true };
                    break;
                case 'index.symbols':
                    result = await this.indexingService.searchSymbols(request.params?.query);
                    break;
                case 'context.store':
                    const id = await this.contextService.storeContext(request.params);
                    result = { id };
                    break;
                case 'context.search':
                    result = await this.contextService.searchContexts(request.params?.query);
                    break;
                case 'tools.execute':
                    result = await this.toolingService.executeTool(request.params?.toolName, request.params?.args, {
                        workspaceFolder: process.cwd(),
                        contextStore: this.contextService,
                    });
                    break;
                default:
                    this.sendError(request.id, -32601, 'Method not found');
                    return;
            }
            this.sendResponse(request.id, result);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger_1.logger.error('WebSocket method dispatch error', { error: errorMessage, method: request.method });
            this.sendError(request.id, -32603, 'Internal error');
        }
    }
    sendResponse(id, result) {
        const response = {
            jsonrpc: '2.0',
            id,
            result,
        };
        this.ws.send(JSON.stringify(response));
    }
    sendError(id, code, message, data) {
        const response = {
            jsonrpc: '2.0',
            id,
            error: { code, message, data },
        };
        this.ws.send(JSON.stringify(response));
    }
    cleanup() {
        this.pendingRequests.clear();
    }
}
exports.WebSocketHandler = WebSocketHandler;
const createWebSocketHandler = (ws, agenticService, indexingService, contextService, toolingService) => {
    return new WebSocketHandler(ws, agenticService, indexingService, contextService, toolingService);
};
exports.createWebSocketHandler = createWebSocketHandler;
//# sourceMappingURL=handler.js.map