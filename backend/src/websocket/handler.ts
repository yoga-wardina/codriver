import { WebSocket } from 'ws';
import { AgenticService } from '../services/AgenticService';
import { IndexingService } from '../services/IndexingService';
import { ContextService } from '../services/ContextService';
import { ToolingService } from '../services/ToolingService';
import { logger } from '../utils/logger';

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: number | string;
  method: string;
  params?: any;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: number | string;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

export class WebSocketHandler {
  private ws: WebSocket;
  private agenticService: AgenticService;
  private indexingService: IndexingService;
  private contextService: ContextService;
  private toolingService: ToolingService;
  private pendingRequests: Map<number | string, (response: JsonRpcResponse) => void> = new Map();

  constructor(
    ws: WebSocket,
    agenticService: AgenticService,
    indexingService: IndexingService,
    contextService: ContextService,
    toolingService: ToolingService
  ) {
    this.ws = ws;
    this.agenticService = agenticService;
    this.indexingService = indexingService;
    this.contextService = contextService;
    this.toolingService = toolingService;
  }

  public handleMessage(message: JsonRpcRequest) {
    if (message.jsonrpc !== '2.0') {
      this.sendError(message.id, -32600, 'Invalid Request');
      return;
    }

    this.dispatchMethod(message);
  }

  private async dispatchMethod(request: JsonRpcRequest) {
    try {
      let result: any;

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
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('WebSocket method dispatch error', { error: errorMessage, method: request.method });
      this.sendError(request.id, -32603, 'Internal error');
    }
  }

  private sendResponse(id: number | string, result: any) {
    const response: JsonRpcResponse = {
      jsonrpc: '2.0',
      id,
      result,
    };

    this.ws.send(JSON.stringify(response));
  }

  private sendError(id: number | string, code: number, message: string, data?: any) {
    const response: JsonRpcResponse = {
      jsonrpc: '2.0',
      id,
      error: { code, message, data },
    };

    this.ws.send(JSON.stringify(response));
  }

  public cleanup() {
    this.pendingRequests.clear();
  }
}

export const createWebSocketHandler = (
  ws: WebSocket,
  agenticService: AgenticService,
  indexingService: IndexingService,
  contextService: ContextService,
  toolingService: ToolingService
) => {
  return new WebSocketHandler(ws, agenticService, indexingService, contextService, toolingService);
};
