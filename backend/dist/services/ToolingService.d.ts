import { BaseService } from './BaseService';
import { ContextService } from './ContextService';
export interface ToolResult {
    success: boolean;
    data?: any;
    error?: string;
    exitCode?: number;
}
export interface ToolContext {
    workspaceFolder: string;
    contextStore: ContextService;
    redisCache?: any;
}
export declare class ToolingService implements BaseService {
    private contextStore;
    private lastExecution;
    constructor();
    setContextStore(contextStore: ContextService): void;
    initialize(): Promise<void>;
    shutdown(): Promise<void>;
    isHealthy(): boolean;
    executeTool(toolName: string, args: any, context: ToolContext): Promise<ToolResult>;
    private handleContextQuery;
    private handleContextStore;
    private handleContextSearch;
    private handleFsReadFile;
    private handleFsWriteFile;
    private handleFsListDir;
    private handleExecShell;
    private isPathAllowed;
}
//# sourceMappingURL=ToolingService.d.ts.map