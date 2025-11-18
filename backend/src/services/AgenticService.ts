import { BaseService } from './BaseService';
import { ContextService } from './ContextService';
import { IndexingService } from './IndexingService';
import { ToolingService } from './ToolingService';
import { logger } from '../utils/logger';

interface AgentAction {
  tool?: {
    name: string;
    args: any;
  };
  finish?: boolean;
  reasoning?: string;
}

interface AgentPlan {
  goal: string;
  steps: string[];
  currentStep: number;
}

export class AgenticService implements BaseService {
  private contextService!: ContextService;
  private indexingService!: IndexingService;
  private toolingService!: ToolingService;
  private activeSessions: Map<string, { plan: AgentPlan; lastResult?: any }> = new Map();
  private maxSteps: number = 12;

  constructor() {
    // Services will be injected after creation
  }

  public setServices(contextService: ContextService, indexingService: IndexingService, toolingService: ToolingService) {
    this.contextService = contextService;
    this.indexingService = indexingService;
    this.toolingService = toolingService;
  }

  async initialize(): Promise<void> {
    logger.info('AgenticService initialized');
  }

  async shutdown(): Promise<void> {
    this.activeSessions.clear();
    logger.info('AgenticService shutdown');
  }

  isHealthy(): boolean {
    return true; // Basic health check
  }

  public async processQuery(query: string, sessionId: string): Promise<any> {
    try {
      // Plan the task
      const plan = await this.plan(query);
      this.activeSessions.set(sessionId, { plan });

      let step = 0;
      let lastResult: any;

      while (step < this.maxSteps) {
        logger.info(`Processing step ${step + 1}/${this.maxSteps}`, { sessionId });

        // Get next action
        const action = await this.nextAction(query, plan, lastResult, step);
        if (!action) break;

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
            logger.warn('Tool execution failed', { sessionId, tool: action.tool.name, error: result.error });
          }
        }

        step++;
      }

      if (step >= this.maxSteps) {
        logger.warn('Agentic processing reached maximum steps', { sessionId });
        return { success: false, error: 'Maximum steps reached' };
      }

      return { success: true, result: lastResult };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Agentic processing failed', { sessionId, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  }

  private async plan(query: string): Promise<AgentPlan> {
    // Simple planning logic
    const plan: AgentPlan = {
      goal: `Process query: ${query}`,
      steps: ['Analyze the query and gather context', 'Search for relevant information', 'Execute necessary tools', 'Provide final answer'],
      currentStep: 0,
    };

    return plan;
  }

  private async nextAction(query: string, plan: AgentPlan, lastResult?: any, step?: number): Promise<AgentAction | null> {
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

  private async storeInteraction(sessionId: string, query: string, action: AgentAction, result: any): Promise<void> {
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

  private extractSearchTerm(query: string): string {
    const words = query.toLowerCase().split(/\s+/);
    const codeTerms = words.filter(
      (word) => word.includes('function') || word.includes('class') || word.includes('method') || word.includes('variable')
    );

    return codeTerms.length > 0 ? codeTerms[0] || '' : query.split(/\s+/)[0] || '';
  }

  public getSessionStatus(sessionId: string): any {
    return this.activeSessions.get(sessionId);
  }

  public stopSession(sessionId: string): void {
    this.activeSessions.delete(sessionId);
  }
}
