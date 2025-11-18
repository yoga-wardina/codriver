import * as sqlite3 from 'sqlite3';
import * as path from 'path';
import { BaseService } from './BaseService';
import { logger } from '../utils/logger';

export interface Context {
  id: string;
  type: string;
  title: string;
  content: string;
  embedding?: number[];
  created_at: Date;
  updated_at: Date;
}

export interface Interaction {
  id: string;
  context_id: string;
  role: string;
  content: string;
  metadata?: any;
  created_at: Date;
}

export class ContextService implements BaseService {
  private db!: sqlite3.Database;
  private dbPath: string;

  constructor() {
    this.dbPath = process.env.CODRIVER_SQLITE_PATH || path.join(process.cwd(), 'data', 'codriver.db');
    this.ensureDirectoryExists();
  }

  private ensureDirectoryExists() {
    const dir = path.dirname(this.dbPath);
    require('fs').mkdirSync(dir, { recursive: true });
  }

  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          logger.error('Failed to open SQLite database', { error: err.message });
          reject(err);
          return;
        }

        this.initializeTables().then(resolve).catch(reject);
      });
    });
  }

  private async initializeTables(): Promise<void> {
    const tables = [
      `CREATE TABLE IF NOT EXISTS contexts (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        title TEXT,
        content TEXT,
        embedding TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS interactions (
        id TEXT PRIMARY KEY,
        context_id TEXT,
        role TEXT,
        content TEXT,
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS files (
        path TEXT PRIMARY KEY,
        hash TEXT,
        lang TEXT,
        size INTEGER,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS symbols (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        symbol TEXT,
        kind TEXT,
        file_path TEXT,
        range TEXT,
        container TEXT,
        signature TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS symbol_references (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        from_file TEXT,
        to_file TEXT,
        symbol TEXT,
        line_from INTEGER,
        line_to INTEGER
      )`,
      `CREATE TABLE IF NOT EXISTS call_graph (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        caller TEXT,
        callee TEXT,
        file TEXT,
        location TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS tool_calls (
        id TEXT PRIMARY KEY,
        tool TEXT,
        args_json TEXT,
        result_json TEXT,
        exit_code INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
    ];

    for (const sql of tables) {
      await this.runQuery(sql);
    }

    // Enable WAL mode for better concurrency
    await this.runQuery('PRAGMA journal_mode=WAL');
    logger.info('SQLite tables initialized');
  }

  private runQuery(sql: string, params: any[] = []): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  private getQuery(sql: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  private allQuery(sql: string, params: any[] = []): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  async shutdown(): Promise<void> {
    return new Promise((resolve) => {
      this.db.close((err) => {
        if (err) {
          logger.error('Error closing SQLite database', { error: err.message });
        } else {
          logger.info('SQLite database closed');
        }
        resolve();
      });
    });
  }

  isHealthy(): boolean {
    return !!this.db;
  }

  public async storeContext(context: Omit<Context, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
    const id = this.generateId();
    const embeddingJson = context.embedding ? JSON.stringify(context.embedding) : null;

    await this.runQuery(
      `INSERT INTO contexts (id, type, title, content, embedding, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [id, context.type, context.title, context.content, embeddingJson]
    );

    return id;
  }

  public async getContext(id: string): Promise<Context | null> {
    const row = await this.getQuery('SELECT * FROM contexts WHERE id = ?', [id]);
    if (!row) return null;

    return {
      ...row,
      embedding: row.embedding ? JSON.parse(row.embedding) : undefined,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
    };
  }

  public async searchContexts(query: string): Promise<Context[]> {
    const rows = await this.allQuery(
      `SELECT c.* FROM content_fts cfts
       JOIN contexts c ON c.id = cfts.rowid
       WHERE content_fts MATCH ?
       ORDER BY rank`,
      [query]
    );

    return rows.map((row) => ({
      ...row,
      embedding: row.embedding ? JSON.parse(row.embedding) : undefined,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
    }));
  }

  public async storeInteraction(interaction: Omit<Interaction, 'id' | 'created_at'>): Promise<string> {
    const id = this.generateId();

    await this.runQuery(
      `INSERT INTO interactions (id, context_id, role, content, metadata, created_at)
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [
        id,
        interaction.context_id,
        interaction.role,
        interaction.content,
        interaction.metadata ? JSON.stringify(interaction.metadata) : null,
      ]
    );

    return id;
  }

  public async getInteractions(contextId: string): Promise<Interaction[]> {
    const rows = await this.allQuery('SELECT * FROM interactions WHERE context_id = ? ORDER BY created_at', [contextId]);

    return rows.map((row) => ({
      ...row,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      created_at: new Date(row.created_at),
    }));
  }

  public async clearCache(): Promise<void> {
    // Clear temporary data, keep persistent context
    await this.runQuery('DELETE FROM tool_calls WHERE created_at < datetime("now", "-1 day")');
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}
