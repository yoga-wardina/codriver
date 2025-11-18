import * as fs from 'fs';
import * as path from 'path';
import { BaseService } from './BaseService';
import { logger } from '../utils/logger';

export interface SymbolInfo {
  symbol: string;
  kind: string;
  file_path: string;
  range: { start: { line: number; column: number }; end: { line: number; column: number } };
  container?: string;
  signature?: string;
}

export class IndexingService implements BaseService {
  private supportedLanguages: Set<string>;

  constructor() {
    this.supportedLanguages = new Set(['js', 'ts', 'py', 'go', 'rs']);
  }

  async initialize(): Promise<void> {
    logger.info('IndexingService initialized');
  }

  async shutdown(): Promise<void> {
    logger.info('IndexingService shutdown');
  }

  isHealthy(): boolean {
    return true;
  }

  public async indexWorkspace(workspacePath: string): Promise<void> {
    logger.info('Starting workspace indexing', { workspacePath });

    const files = await this.getFilesToIndex(workspacePath);
    logger.info(`Found ${files.length} files to index`);

    for (const file of files) {
      try {
        await this.indexFile(file);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.warn(`Failed to index ${file}`, { error: errorMessage });
      }
    }

    logger.info('Workspace indexing completed');
  }

  public async indexFile(filePath: string): Promise<void> {
    if (!this.shouldIndexFile(filePath)) return;

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const hash = this.computeHash(content);

      // TODO: Check if file changed and update database
      // For now, just log
      logger.debug(`Indexed file: ${filePath}`, { hash, size: content.length });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.warn(`Failed to index ${filePath}`, { error: errorMessage });
    }
  }

  private async getFilesToIndex(workspacePath: string): Promise<string[]> {
    const files: string[] = [];
    const maxSizeKB = 800;

    const walk = (dir: string) => {
      try {
        const items = fs.readdirSync(dir);
        for (const item of items) {
          const fullPath = path.join(dir, item);
          const stat = fs.statSync(fullPath);

          if (stat.isDirectory() && !this.shouldSkipDirectory(item)) {
            walk(fullPath);
          } else if (stat.isFile() && this.shouldIndexFile(fullPath)) {
            if (stat.size <= maxSizeKB * 1024) {
              files.push(fullPath);
            }
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.warn(`Failed to read directory ${dir}`, { error: errorMessage });
      }
    };

    walk(workspacePath);
    return files;
  }

  private shouldIndexFile(filePath: string): boolean {
    const ext = path.extname(filePath).slice(1);
    return this.supportedLanguages.has(ext) && !this.shouldSkipFile(filePath);
  }

  private shouldSkipDirectory(dirName: string): boolean {
    const skipDirs = ['node_modules', '.git', 'dist', 'build', 'out', '.vscode'];
    return skipDirs.includes(dirName);
  }

  private shouldSkipFile(filePath: string): boolean {
    const skipPatterns = [/\.min\.js$/, /\.map$/, /package-lock\.json$/, /yarn\.lock$/];
    return skipPatterns.some((pattern) => pattern.test(filePath));
  }

  private computeHash(content: string): string {
    // Simple hash for now - in production use xxhash
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  public async searchSymbols(query: string): Promise<SymbolInfo[]> {
    // TODO: Implement symbol search in database
    logger.debug('Searching symbols', { query });
    return [];
  }

  public async findDefinition(symbol: string): Promise<SymbolInfo | null> {
    // TODO: Implement definition lookup
    logger.debug('Finding definition', { symbol });
    return null;
  }

  public async getCallGraph(symbol: string): Promise<any[]> {
    // TODO: Implement call graph
    logger.debug('Getting call graph', { symbol });
    return [];
  }

  public async findRelatedFiles(filePath: string): Promise<string[]> {
    // TODO: Implement related files search
    logger.debug('Finding related files', { filePath });
    return [];
  }
}
