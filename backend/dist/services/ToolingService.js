"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToolingService = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const logger_1 = require("../utils/logger");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class ToolingService {
    constructor() {
        this.lastExecution = new Map();
        // ContextStore will be injected
    }
    setContextStore(contextStore) {
        this.contextStore = contextStore;
    }
    async initialize() {
        logger_1.logger.info('ToolingService initialized');
    }
    async shutdown() {
        this.lastExecution.clear();
        logger_1.logger.info('ToolingService shutdown');
    }
    isHealthy() {
        return true;
    }
    async executeTool(toolName, args, context) {
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
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger_1.logger.error(`Tool execution failed: ${toolName}`, { error: errorMessage });
            return { success: false, error: errorMessage };
        }
    }
    async handleContextQuery(args, context) {
        try {
            const result = await context.contextStore.getContext(args.query);
            return { success: true, data: result };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return { success: false, error: errorMessage };
        }
    }
    async handleContextStore(args, context) {
        try {
            const id = await context.contextStore.storeContext({
                type: args.type,
                title: args.title || '',
                content: args.content,
            });
            return { success: true, data: { id } };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return { success: false, error: errorMessage };
        }
    }
    async handleContextSearch(args, context) {
        try {
            const results = await context.contextStore.searchContexts(args.query);
            const limited = args.limit ? results.slice(0, args.limit) : results;
            return { success: true, data: limited };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return { success: false, error: errorMessage };
        }
    }
    async handleFsReadFile(args, context) {
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
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return { success: false, error: errorMessage };
        }
    }
    async handleFsWriteFile(args, context) {
        try {
            if (!this.isPathAllowed(args.filePath, context.workspaceFolder)) {
                return { success: false, error: 'Path not allowed' };
            }
            fs.writeFileSync(args.filePath, args.content, 'utf8');
            return { success: true };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return { success: false, error: errorMessage };
        }
    }
    async handleFsListDir(args, context) {
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
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return { success: false, error: errorMessage };
        }
    }
    async handleExecShell(args, context) {
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
        }
        catch (error) {
            return {
                success: false,
                error: error.message,
                exitCode: error.code,
            };
        }
    }
    isPathAllowed(filePath, workspaceFolder) {
        // Basic security check - only allow paths within workspace
        const resolvedPath = path.resolve(filePath);
        const resolvedWorkspace = path.resolve(workspaceFolder);
        return resolvedPath.startsWith(resolvedWorkspace);
    }
}
exports.ToolingService = ToolingService;
//# sourceMappingURL=ToolingService.js.map