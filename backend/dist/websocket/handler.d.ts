import { WebSocket } from 'ws';
import { AgenticService } from '../services/AgenticService';
import { IndexingService } from '../services/IndexingService';
import { ContextService } from '../services/ContextService';
import { ToolingService } from '../services/ToolingService';
interface JsonRpcRequest {
    jsonrpc: '2.0';
    id: number | string;
    method: string;
    params?: any;
}
export declare class WebSocketHandler {
    private ws;
    private agenticService;
    private indexingService;
    private contextService;
    private toolingService;
    private pendingRequests;
    constructor(ws: WebSocket, agenticService: AgenticService, indexingService: IndexingService, contextService: ContextService, toolingService: ToolingService);
    handleMessage(message: JsonRpcRequest): void;
    private dispatchMethod;
    private sendResponse;
    private sendError;
    cleanup(): void;
}
export declare const createWebSocketHandler: (ws: WebSocket, agenticService: AgenticService, indexingService: IndexingService, contextService: ContextService, toolingService: ToolingService) => WebSocketHandler;
export {};
//# sourceMappingURL=handler.d.ts.map