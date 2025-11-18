import 'dotenv/config';

console.error('server.ts loaded');

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { AgenticService } from './services/AgenticService';
import { IndexingService } from './services/IndexingService';
import { ContextService } from './services/ContextService';
import { ToolingService } from './services/ToolingService';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { createWebSocketHandler } from './websocket/handler';

class CodriverBackend {
  private app: express.Application;
  private server: any;
  private wss: WebSocketServer;
  private agenticService: AgenticService;
  private indexingService: IndexingService;
  private contextService: ContextService;
  private toolingService: ToolingService;

  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.wss = new WebSocketServer({ server: this.server });

    // Initialize services
    this.agenticService = new AgenticService();
    this.indexingService = new IndexingService();
    this.contextService = new ContextService();
    this.toolingService = new ToolingService();

    this.setupMiddleware();
    this.setupRoutes();
    this.setupWebSocket();
    this.setupErrorHandling();
  }

  private setupMiddleware() {
    this.app.use(helmet());
    this.app.use(
      cors({
        origin: ['vscode-webview://', 'http://localhost:*'],
        credentials: true,
      })
    );
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Request logging
    this.app.use((req, res, next) => {
      logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });
      next();
    });
  }

  private setupRoutes() {
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
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('API: Create conversation error:', errorMessage);
        res.status(500).json({ success: false, error: errorMessage });
      }
    });

    // Simple query endpoint
    this.app.post('/api/query/simple', async (req, res) => {
      try {
        console.log('API: Simple query called with body:', req.body);
        console.log('API: agenticService type:', typeof this.agenticService);
        console.log('API: agenticService methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(this.agenticService)));
        const { query } = req.body;
        if (!query) {
          return res.status(400).json({ success: false, error: 'Query is required' });
        }
        const result = await this.agenticService.simpleQueryTest(query);
        res.json(result);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('API: Simple query error:', errorMessage);
        res.status(500).json({ success: false, error: errorMessage });
      }
    });
  }

  private setupWebSocket() {
    this.wss.on('connection', (ws, req) => {
      logger.info('WebSocket connection established', { ip: req.socket.remoteAddress });

      const handler = createWebSocketHandler(ws, this.agenticService, this.indexingService, this.contextService, this.toolingService);

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          handler.handleMessage(message);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          logger.error('WebSocket message parse error', { error: errorMessage });
          ws.send(
            JSON.stringify({
              jsonrpc: '2.0',
              error: { code: -32700, message: 'Parse error' },
              id: null,
            })
          );
        }
      });

      ws.on('close', () => {
        logger.info('WebSocket connection closed');
        handler.cleanup();
      });

      ws.on('error', (error) => {
        logger.error('WebSocket error', { error: error.message });
      });
    });
  }

  private setupErrorHandling() {
    this.app.use(errorHandler);
  }

  public async start(port: number = 3001): Promise<void> {
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
        logger.info(`Codriver Backend listening on port ${port}`);
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to start backend', { error: errorMessage });
      process.exit(1);
    }
  }

  public async stop(): Promise<void> {
    logger.info('Shutting down Codriver Backend...');

    this.wss.close();
    this.server.close();

    await Promise.all([
      this.agenticService.shutdown(),
      this.indexingService.shutdown(),
      this.contextService.shutdown(),
      this.toolingService.shutdown(),
    ]);

    logger.info('Codriver Backend shutdown complete');
  }

  public getApp(): express.Application {
    return this.app;
  }
}

// Start server if run directly
if (require.main === module) {
  const port = parseInt(process.env.CODRIVER_PORT || '3001');
  const backend = new CodriverBackend();

  // For testing, don't shut down immediately on SIGINT
  let shutdownTimer: NodeJS.Timeout;
  process.on('SIGINT', async () => {
    console.log('SIGINT received, shutting down in 5 seconds...');
    if (shutdownTimer) clearTimeout(shutdownTimer);
    shutdownTimer = setTimeout(async () => {
      await backend.stop();
      process.exit(0);
    }, 5000);
  });

  process.on('SIGTERM', async () => {
    await backend.stop();
    process.exit(0);
  });

  backend.start(port);
}

export { CodriverBackend };
