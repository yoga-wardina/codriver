"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgenticService = void 0;
const logger_1 = require("../utils/logger");
const openai_1 = __importDefault(require("openai"));
class AgenticService {
    constructor() {
        this.activeSessions = new Map();
        this.maxSteps = 12;
        console.log('AgenticService constructor - API Key present:', !!process.env.OPENAI_API_KEY);
        console.log('AgenticService constructor - Base URL:', process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1');
        this.openai = new openai_1.default({
            apiKey: process.env.OPENAI_API_KEY,
            baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
        });
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
        }
        catch (error) {
            logger_1.logger.error('Planning failed', { error });
            // Fallback plan
            return {
                goal: query,
                steps: ['Analyze the request', 'Execute necessary actions'],
                currentStep: 0,
            };
        }
    }
    async nextAction(query, plan, lastResult, step) {
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
        }
        catch (error) {
            logger_1.logger.error('Action generation failed', { error });
            // Fallback: finish if we have results, otherwise try a basic search
            if (lastResult) {
                return { finish: true, reasoning: 'Fallback: completing due to error' };
            }
            else {
                return {
                    tool: { name: 'context.query', args: { query } },
                    reasoning: 'Fallback: searching for context',
                };
            }
        }
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
    getSessionStatus(sessionId) {
        return this.activeSessions.get(sessionId);
    }
    stopSession(sessionId) {
        this.activeSessions.delete(sessionId);
    }
}
exports.AgenticService = AgenticService;
//# sourceMappingURL=AgenticService.js.map