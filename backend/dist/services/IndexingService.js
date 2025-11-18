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
exports.IndexingService = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const logger_1 = require("../utils/logger");
class IndexingService {
    constructor() {
        this.supportedLanguages = new Set(['js', 'ts', 'py', 'go', 'rs']);
    }
    async initialize() {
        logger_1.logger.info('IndexingService initialized');
    }
    async shutdown() {
        logger_1.logger.info('IndexingService shutdown');
    }
    isHealthy() {
        return true;
    }
    async indexWorkspace(workspacePath) {
        logger_1.logger.info('Starting workspace indexing', { workspacePath });
        const files = await this.getFilesToIndex(workspacePath);
        logger_1.logger.info(`Found ${files.length} files to index`);
        for (const file of files) {
            try {
                await this.indexFile(file);
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                logger_1.logger.warn(`Failed to index ${file}`, { error: errorMessage });
            }
        }
        logger_1.logger.info('Workspace indexing completed');
    }
    async indexFile(filePath) {
        if (!this.shouldIndexFile(filePath))
            return;
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const hash = this.computeHash(content);
            // TODO: Check if file changed and update database
            // For now, just log
            logger_1.logger.debug(`Indexed file: ${filePath}`, { hash, size: content.length });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger_1.logger.warn(`Failed to index ${filePath}`, { error: errorMessage });
        }
    }
    async getFilesToIndex(workspacePath) {
        const files = [];
        const maxSizeKB = 800;
        const walk = (dir) => {
            try {
                const items = fs.readdirSync(dir);
                for (const item of items) {
                    const fullPath = path.join(dir, item);
                    const stat = fs.statSync(fullPath);
                    if (stat.isDirectory() && !this.shouldSkipDirectory(item)) {
                        walk(fullPath);
                    }
                    else if (stat.isFile() && this.shouldIndexFile(fullPath)) {
                        if (stat.size <= maxSizeKB * 1024) {
                            files.push(fullPath);
                        }
                    }
                }
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                logger_1.logger.warn(`Failed to read directory ${dir}`, { error: errorMessage });
            }
        };
        walk(workspacePath);
        return files;
    }
    shouldIndexFile(filePath) {
        const ext = path.extname(filePath).slice(1);
        return this.supportedLanguages.has(ext) && !this.shouldSkipFile(filePath);
    }
    shouldSkipDirectory(dirName) {
        const skipDirs = ['node_modules', '.git', 'dist', 'build', 'out', '.vscode'];
        return skipDirs.includes(dirName);
    }
    shouldSkipFile(filePath) {
        const skipPatterns = [/\.min\.js$/, /\.map$/, /package-lock\.json$/, /yarn\.lock$/];
        return skipPatterns.some((pattern) => pattern.test(filePath));
    }
    computeHash(content) {
        // Simple hash for now - in production use xxhash
        let hash = 0;
        for (let i = 0; i < content.length; i++) {
            const char = content.charCodeAt(i);
            hash = (hash << 5) - hash + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(16);
    }
    async searchSymbols(query) {
        // TODO: Implement symbol search in database
        logger_1.logger.debug('Searching symbols', { query });
        return [];
    }
    async findDefinition(symbol) {
        // TODO: Implement definition lookup
        logger_1.logger.debug('Finding definition', { symbol });
        return null;
    }
    async getCallGraph(symbol) {
        // TODO: Implement call graph
        logger_1.logger.debug('Getting call graph', { symbol });
        return [];
    }
    async findRelatedFiles(filePath) {
        // TODO: Implement related files search
        logger_1.logger.debug('Finding related files', { filePath });
        return [];
    }
}
exports.IndexingService = IndexingService;
//# sourceMappingURL=IndexingService.js.map