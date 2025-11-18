"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgenticService = void 0;
const logger_1 = require("../utils/logger");
class AgenticService {
    constructor() {
        this.activeSessions = new Map();
        this.maxSteps = 12;
        // Services will be injected after creation
    }
    setServices(contextService, indexingService, toolingService) {
        this.contextService = contextService;
        this.indexingService = indexingService;
        this.toolingService = toolingService;
    }
    async initialize() {
        logger_1.logger.info('AgenticService initialized');
    }
    async shutdown() {
        this.activeSessions.clear();
        logger_1.logger.info('AgenticService shutdown');
    }
    isHealthy() {
        return true; // Basic health check
    }
    async processQuery(query, sessionId) {
        try {
            // Plan the task
            const plan = await this.plan(query);
            this.activeSessions.set(sessionId, { plan });
            let step = 0;
            let lastResult;
            while (step < this.maxSteps) {
                logger_1.logger.info(`Processing step ${step + 1}/${this.maxSteps}`, { sessionId });
                // Get next action
                const action = await this.nextAction(query, plan, lastResult, step);
                if (!action)
                    break;
                if (action.finish) {
                    break;
                }
                if (action.tool) {
                    // Execute tool
                    const result = await this.toolingService.executeTool(action.tool.name, action.tool.args, {
                        workspaceFolder: process.cwd(), // TODO: Get from request context
                        contextStore: this.contextService,
                        redisCache: null, // TODO: Inject RedisCache
                    });
                    lastResult = result;
                    // Store interaction
                    await this.storeInteraction(sessionId, query, action, result);
                    // Simple reflection
                    if (!result.success) {
                        logger_1.logger.warn('Tool execution failed', { sessionId, tool: action.tool.name, error: result.error });
                    }
                }
                step++;
            }
            if (step >= this.maxSteps) {
                logger_1.logger.warn('Agentic processing reached maximum steps', { sessionId });
                return { success: false, error: 'Maximum steps reached' };
            }
            return { success: true, result: lastResult };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger_1.logger.error('Agentic processing failed', { sessionId, error: errorMessage });
            return { success: false, error: errorMessage };
        }
    }
    async plan(query) {
        // Simple planning logic
        const plan = {
            goal: `Process query: ${query}`,
            steps: ['Analyze the query and gather context', 'Search for relevant information', 'Execute necessary tools', 'Provide final answer'],
            currentStep: 0,
        };
        return plan;
    }
    async nextAction(query, plan, lastResult, step) {
        if (!lastResult) {
            // First action: search for context
            return {
                tool: {
                    name: 'context.search',
                    args: { query, limit: 5 },
                },
                reasoning: 'Searching for relevant context to understand the query',
            };
        }
        if (lastResult.success && lastResult.data) {
            // We have results, now analyze them
            const contextData = lastResult.data;
            if (Array.isArray(contextData) && contextData.length > 0) {
                // Found context, now search for symbols if it's a coding query
                if (query.toLowerCase().includes('function') || query.toLowerCase().includes('class')) {
                    return {
                        tool: {
                            name: 'index.searchSymbols',
                            args: { query: this.extractSearchTerm(query) },
                        },
                        reasoning: 'Searching for relevant symbols in the codebase',
                    };
                }
            }
        }
        // If we have errors or no more actions needed, finish
        if (!lastResult.success || (step && step >= plan.steps.length - 1)) {
            return { finish: true, reasoning: 'Task completed or encountered error' };
        }
        // Default: continue with next step
        return {
            tool: {
                name: 'context.query',
                args: { query: `step_${step}_result` },
            },
            reasoning: 'Continuing with next processing step',
        };
    }
    async storeInteraction(sessionId, query, action, result) {
        // Store the interaction in context store
        const interaction = {
            context_id: sessionId,
            role: 'assistant',
            content: JSON.stringify({
                action,
                result: {
                    success: result.success,
                    error: result.error,
                    hasData: !!result.data,
                },
            }),
            metadata: {
                tool: action.tool?.name,
                step: true,
            },
        };
        await this.contextService.storeInteraction(interaction);
    }
    extractSearchTerm(query) {
        const words = query.toLowerCase().split(/\s+/);
        const codeTerms = words.filter((word) => word.includes('function') || word.includes('class') || word.includes('method') || word.includes('variable'));
        return codeTerms.length > 0 ? codeTerms[0] || '' : query.split(/\s+/)[0] || '';
    }
    getSessionStatus(sessionId) {
        return this.activeSessions.get(sessionId);
    }
    stopSession(sessionId) {
        this.activeSessions.delete(sessionId);
    }
}
exports.AgenticService = AgenticService;
//# sourceMappingURL=AgenticService.js.map