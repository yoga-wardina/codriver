import 'dotenv/config';
import express from 'express';
declare class CodriverBackend {
    private app;
    private server;
    private wss;
    private agenticService;
    private indexingService;
    private contextService;
    private toolingService;
    constructor();
    private setupMiddleware;
    private setupRoutes;
    private setupWebSocket;
    private setupErrorHandling;
    start(port?: number): Promise<void>;
    stop(): Promise<void>;
    getApp(): express.Application;
}
export { CodriverBackend };
//# sourceMappingURL=server.d.ts.map