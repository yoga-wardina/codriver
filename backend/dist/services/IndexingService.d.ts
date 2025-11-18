import { BaseService } from './BaseService';
export interface SymbolInfo {
    symbol: string;
    kind: string;
    file_path: string;
    range: {
        start: {
            line: number;
            column: number;
        };
        end: {
            line: number;
            column: number;
        };
    };
    container?: string;
    signature?: string;
}
export declare class IndexingService implements BaseService {
    private supportedLanguages;
    constructor();
    initialize(): Promise<void>;
    shutdown(): Promise<void>;
    isHealthy(): boolean;
    indexWorkspace(workspacePath: string): Promise<void>;
    indexFile(filePath: string): Promise<void>;
    private getFilesToIndex;
    private shouldIndexFile;
    private shouldSkipDirectory;
    private shouldSkipFile;
    private computeHash;
    searchSymbols(query: string): Promise<SymbolInfo[]>;
    findDefinition(symbol: string): Promise<SymbolInfo | null>;
    getCallGraph(symbol: string): Promise<any[]>;
    findRelatedFiles(filePath: string): Promise<string[]>;
}
//# sourceMappingURL=IndexingService.d.ts.map