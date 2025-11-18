export interface BaseService {
    initialize(): Promise<void>;
    shutdown(): Promise<void>;
    isHealthy(): boolean;
}
//# sourceMappingURL=BaseService.d.ts.map