import { BaseService } from './BaseService';
export interface Context {
    id: string;
    type: string;
    title: string;
    content: string;
    embedding?: number[];
    created_at: Date;
    updated_at: Date;
}
export interface Interaction {
    id: string;
    context_id: string;
    role: string;
    content: string;
    metadata?: any;
    created_at: Date;
}
export declare class ContextService implements BaseService {
    private db;
    private dbPath;
    constructor();
    private ensureDirectoryExists;
    initialize(): Promise<void>;
    private initializeTables;
    createConversation(title?: string): Promise<string>;
    addMessage(conversationId: string, role: string, content: string, metadata?: any): Promise<void>;
    getConversation(conversationId: string): Promise<any>;
    listConversations(limit?: number): Promise<any[]>;
    private getQuery;
    private allQuery;
    shutdown(): Promise<void>;
    isHealthy(): boolean;
    storeContext(context: Omit<Context, 'id' | 'created_at' | 'updated_at'>): Promise<string>;
    getContext(id: string): Promise<Context | null>;
    searchContexts(query: string): Promise<Context[]>;
    storeInteraction(interaction: Omit<Interaction, 'id' | 'created_at'>): Promise<string>;
    getInteractions(contextId: string): Promise<Interaction[]>;
    clearCache(): Promise<void>;
    private generateId;
}
//# sourceMappingURL=ContextService.d.ts.map