import { BaseService } from './BaseService';
import { ContextService } from './ContextService';
import { IndexingService } from './IndexingService';
import { ToolingService } from './ToolingService';
export declare class AgenticService implements BaseService {
    private contextService;
    private indexingService;
    private toolingService;
    private activeSessions;
    private maxSteps;
    private openai;
    constructor();
    setServices(contextService: ContextService, indexingService: IndexingService, toolingService: ToolingService): void;
    initialize(): Promise<void>;
    shutdown(): Promise<void>;
    isHealthy(): boolean;
    processQuery(query: string, sessionId: string): Promise<any>;
    private plan;
    private nextAction;
    private storeInteraction;
    getSessionStatus(sessionId: string): any;
    stopSession(sessionId: string): void;
}
//# sourceMappingURL=AgenticService.d.ts.map