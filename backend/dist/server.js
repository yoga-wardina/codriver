"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodriverBackend = void 0;
require("dotenv/config");
console.error('server.ts loaded');
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const http_1 = require("http");
const ws_1 = require("ws");
const AgenticService_1 = require("./services/AgenticService");
const IndexingService_1 = require("./services/IndexingService");
const ContextService_1 = require("./services/ContextService");
const ToolingService_1 = require("./services/ToolingService");
const logger_1 = require("./utils/logger");
const errorHandler_1 = require("./middleware/errorHandler");
const handler_1 = require("./websocket/handler");
class CodriverBackend {
    constructor() {
        this.app = (0, express_1.default)();
        this.server = (0, http_1.createServer)(this.app);
        this.wss = new ws_1.WebSocketServer({ server: this.server });
        // Initialize services
        this.agenticService = new AgenticService_1.AgenticService();
        this.indexingService = new IndexingService_1.IndexingService();
        this.contextService = new ContextService_1.ContextService();
        this.toolingService = new ToolingService_1.ToolingService();
        this.setupMiddleware();
        this.setupRoutes();
        this.setupWebSocket();
        this.setupErrorHandling();
    }
    setupMiddleware() {
        this.app.use((0, helmet_1.default)());
        this.app.use((0, cors_1.default)({
            origin: ['vscode-webview://', 'http://localhost:*'],
            credentials: true,
        }));
        this.app.use(express_1.default.json({ limit: '10mb' }));
        this.app.use(express_1.default.urlencoded({ extended: true }));
        // Request logging
        this.app.use((req, res, next) => {
            logger_1.logger.info(`${req.method} ${req.path}`, {
                ip: req.ip,
                userAgent: req.get('User-Agent'),
            });
            next();
        });
    }
    setupRoutes() {
        console.log('Setting up routes...');
        // Health check
        this.app.get('/api/health', (req, res) => {
            console.log('Health check route called');
            res.json({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                services: {
                    agentic: this.agenticService.isHealthy(),
                    indexing: this.indexingService.isHealthy(),
                    context: this.contextService.isHealthy(),
                    tooling: this.toolingService.isHealthy(),
                },
            });
        });
        // Test route
        this.app.post('/api/test', (req, res) => {
            console.log('Test route called');
            res.json({ success: true, message: 'Test route works' });
        });
        // Chat endpoints
        this.app.post('/api/chat/conversations', async (req, res) => {
            try {
                console.log('API: Create conversation called with body:', req.body);
                const { title } = req.body;
                console.log('API: Calling contextService.createConversation with title:', title);
                const conversationId = await this.contextService.createConversation(title);
                console.log('API: Conversation created with ID:', conversationId);
                res.json({ success: true, conversationId });
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                console.error('API: Create conversation error:', errorMessage);
                res.status(500).json({ success: false, error: errorMessage });
            }
        });
    }
    setupWebSocket() {
        this.wss.on('connection', (ws, req) => {
            logger_1.logger.info('WebSocket connection established', { ip: req.socket.remoteAddress });
            const handler = (0, handler_1.createWebSocketHandler)(ws, this.agenticService, this.indexingService, this.contextService, this.toolingService);
            ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data.toString());
                    handler.handleMessage(message);
                }
                catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    logger_1.logger.error('WebSocket message parse error', { error: errorMessage });
                    ws.send(JSON.stringify({
                        jsonrpc: '2.0',
                        error: { code: -32700, message: 'Parse error' },
                        id: null,
                    }));
                }
            });
            ws.on('close', () => {
                logger_1.logger.info('WebSocket connection closed');
                handler.cleanup();
            });
            ws.on('error', (error) => {
                logger_1.logger.error('WebSocket error', { error: error.message });
            });
        });
    }
    setupErrorHandling() {
        this.app.use(errorHandler_1.errorHandler);
    }
    async start(port = 3001) {
        try {
            // Set service dependencies
            this.agenticService.setServices(this.contextService, this.indexingService, this.toolingService);
            // Initialize services
            await Promise.all([
                this.agenticService.initialize(),
                this.indexingService.initialize(),
                this.contextService.initialize(),
                this.toolingService.initialize(),
            ]);
            this.server.listen(port, () => {
                logger_1.logger.info(`Codriver Backend listening on port ${port}`);
            });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger_1.logger.error('Failed to start backend', { error: errorMessage });
            process.exit(1);
        }
    }
    async stop() {
        logger_1.logger.info('Shutting down Codriver Backend...');
        this.wss.close();
        this.server.close();
        await Promise.all([
            this.agenticService.shutdown(),
            this.indexingService.shutdown(),
            this.contextService.shutdown(),
            this.toolingService.shutdown(),
        ]);
        logger_1.logger.info('Codriver Backend shutdown complete');
    }
    getApp() {
        return this.app;
    }
}
exports.CodriverBackend = CodriverBackend;
// Start server if run directly
if (require.main === module) {
    const port = parseInt(process.env.CODRIVER_PORT || '3001');
    const backend = new CodriverBackend();
    process.on('SIGINT', async () => {
        await backend.stop();
        process.exit(0);
    });
    process.on('SIGTERM', async () => {
        await backend.stop();
        process.exit(0);
    });
    backend.start(port);
}
//# sourceMappingURL=server.js.map