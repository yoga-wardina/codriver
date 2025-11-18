import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { BaseService } from './BaseService';
import { ContextService } from './ContextService';
import { logger } from '../utils/logger';

const execAsync = promisify(exec);

export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
  exitCode?: number;
}

export interface ToolContext {
  workspaceFolder: string;
  contextStore: ContextService;
  redisCache?: any; // TODO: Define RedisCache interface
}

export class ToolingService implements BaseService {
  private contextStore!: ContextService;
  private lastExecution: Map<string, number> = new Map();

  constructor() {
    // ContextStore will be injected
  }

  public setContextStore(contextStore: ContextService) {
    this.contextStore = contextStore;
  }

  async initialize(): Promise<void> {
    logger.info('ToolingService initialized');
  }

  async shutdown(): Promise<void> {
    this.lastExecution.clear();
    logger.info('ToolingService shutdown');
  }

  isHealthy(): boolean {
    return true;
  }

  public async executeTool(toolName: string, args: any, context: ToolContext): Promise<ToolResult> {
    try {
      // Check cooldown (basic implementation)
      const lastExec = this.lastExecution.get(toolName);
      if (lastExec && Date.now() - lastExec < 1000) {
        // 1 second cooldown
        return { success: false, error: 'Tool on cooldown' };
      }

      this.lastExecution.set(toolName, Date.now());

      switch (toolName) {
        case 'context.query':
          return await this.handleContextQuery(args, context);
        case 'context.store':
          return await this.handleContextStore(args, context);
        case 'context.search':
          return await this.handleContextSearch(args, context);
        case 'fs.readFile':
          return await this.handleFsReadFile(args, context);
        case 'fs.writeFile':
          return await this.handleFsWriteFile(args, context);
        case 'fs.listDir':
          return await this.handleFsListDir(args, context);
        case 'exec.shell':
          return await this.handleExecShell(args, context);
        default:
          return { success: false, error: `Unknown tool: ${toolName}` };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Tool execution failed: ${toolName}`, { error: errorMessage });
      return { success: false, error: errorMessage };
    }
  }

  private async handleContextQuery(args: { query: string }, context: ToolContext): Promise<ToolResult> {
    try {
      const result = await context.contextStore.getContext(args.query);
      return { success: true, data: result };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  }

  private async handleContextStore(args: { type: string; title?: string; content: string }, context: ToolContext): Promise<ToolResult> {
    try {
      const id = await context.contextStore.storeContext({
        type: args.type,
        title: args.title || '',
        content: args.content,
      });
      return { success: true, data: { id } };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  }

  private async handleContextSearch(args: { query: string; limit?: number }, context: ToolContext): Promise<ToolResult> {
    try {
      const results = await context.contextStore.searchContexts(args.query);
      const limited = args.limit ? results.slice(0, args.limit) : results;
      return { success: true, data: limited };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  }

  private async handleFsReadFile(
    args: { filePath: string; startLine?: number; endLine?: number },
    context: ToolContext
  ): Promise<ToolResult> {
    try {
      if (!this.isPathAllowed(args.filePath, context.workspaceFolder)) {
        return { success: false, error: 'Path not allowed' };
      }

      const content = fs.readFileSync(args.filePath, 'utf8');
      let result = content;

      if (args.startLine !== undefined && args.endLine !== undefined) {
        const lines = content.split('\n');
        result = lines.slice(args.startLine - 1, args.endLine).join('\n');
      }

      return { success: true, data: result };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  }

  private async handleFsWriteFile(args: { filePath: string; content: string }, context: ToolContext): Promise<ToolResult> {
    try {
      if (!this.isPathAllowed(args.filePath, context.workspaceFolder)) {
        return { success: false, error: 'Path not allowed' };
      }

      fs.writeFileSync(args.filePath, args.content, 'utf8');
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  }

  private async handleFsListDir(args: { dirPath: string }, context: ToolContext): Promise<ToolResult> {
    try {
      if (!this.isPathAllowed(args.dirPath, context.workspaceFolder)) {
        return { success: false, error: 'Path not allowed' };
      }

      const items = fs.readdirSync(args.dirPath);
      const result = items.map((item) => {
        const fullPath = path.join(args.dirPath, item);
        const stat = fs.statSync(fullPath);
        return {
          name: item,
          type: stat.isDirectory() ? 'directory' : 'file',
          size: stat.size,
        };
      });

      return { success: true, data: result };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  }

  private async handleExecShell(args: { command: string; cwd?: string; timeout?: number }, context: ToolContext): Promise<ToolResult> {
    try {
      const timeout = args.timeout || 8000;
      const cwd = args.cwd || context.workspaceFolder;

      const { stdout, stderr } = await execAsync(args.command, {
        cwd,
        timeout,
        maxBuffer: 1024 * 1024, // 1MB buffer
      });

      const output = stdout.toString() + stderr.toString();
      const truncated = output.length > 8000;

      return {
        success: true,
        data: {
          output: truncated ? output.substring(0, 8000) + '...' : output,
          truncated,
        },
        exitCode: 0,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        exitCode: error.code,
      };
    }
  }

  private isPathAllowed(filePath: string, workspaceFolder: string): boolean {
    // Basic security check - only allow paths within workspace
    const resolvedPath = path.resolve(filePath);
    const resolvedWorkspace = path.resolve(workspaceFolder);
    return resolvedPath.startsWith(resolvedWorkspace);
  }
}
