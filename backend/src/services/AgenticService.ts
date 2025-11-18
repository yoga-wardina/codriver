import { BaseService } from './BaseService';
import { ContextService } from './ContextService';
import { IndexingService } from './IndexingService';
import { ToolingService } from './ToolingService';
import { logger } from '../utils/logger';
import OpenAI from 'openai';

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
  private openai: OpenAI;

  constructor() {
    console.log('AgenticService constructor - API Key present:', !!process.env.OPENAI_API_KEY);
    console.log('AgenticService constructor - Base URL:', process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1');
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    });
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
    const prompt = `You are an expert software engineer. Create a detailed plan to accomplish this task: "${query}"

Available tools:
- context.query: Search for relevant code context
- context.store: Store information for later use
- context.search: Search stored contexts
- fs.readFile: Read file contents
- fs.writeFile: Write or modify files
- fs.listDir: List directory contents
- exec.shell: Execute shell commands

Provide a step-by-step plan in JSON format:
{
  "goal": "Brief description of the goal",
  "steps": ["Step 1 description", "Step 2 description", ...]
}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      const planData = JSON.parse(content);
      return {
        goal: planData.goal,
        steps: planData.steps,
        currentStep: 0,
      };
    } catch (error) {
      logger.error('Planning failed', { error });
      // Fallback plan
      return {
        goal: query,
        steps: ['Analyze the request', 'Execute necessary actions'],
        currentStep: 0,
      };
    }
  }

  private async nextAction(query: string, plan: AgentPlan, lastResult: any, step: number): Promise<AgentAction | null> {
    const prompt = `Current task: "${query}"
Plan: ${plan.goal}
Step ${step + 1}/${plan.steps.length}: ${plan.steps[step] || 'Complete the task'}

${lastResult ? `Last result: ${JSON.stringify(lastResult)}` : 'Starting execution'}

Available tools:
- context.query: Search for relevant code context
- context.store: Store information for later use  
- context.search: Search stored contexts
- fs.readFile: Read file contents
- fs.writeFile: Write or modify files
- fs.listDir: List directory contents
- exec.shell: Execute shell commands

Decide the next action. Respond in JSON format:
{
  "tool": {"name": "tool_name", "args": {...}} OR
  "finish": true,
  "reasoning": "Explanation of the decision"
}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      const actionData = JSON.parse(content);
      return actionData;
    } catch (error) {
      logger.error('Action generation failed', { error });
      // Fallback: finish if we have results, otherwise try a basic search
      if (lastResult) {
        return { finish: true, reasoning: 'Fallback: completing due to error' };
      } else {
        return {
          tool: { name: 'context.query', args: { query } },
          reasoning: 'Fallback: searching for context',
        };
      }
    }
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

  public getSessionStatus(sessionId: string): any {
    return this.activeSessions.get(sessionId);
  }

  public stopSession(sessionId: string): void {
    this.activeSessions.delete(sessionId);
  }
}
