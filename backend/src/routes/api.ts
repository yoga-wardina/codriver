import { Router } from 'express';
import { AgenticService } from '../services/AgenticService';
import { IndexingService } from '../services/IndexingService';
import { ContextService } from '../services/ContextService';
import { ToolingService } from '../services/ToolingService';
import { logger } from '../utils/logger';

export const createApiRoutes = (
  agenticService: AgenticService,
  indexingService: IndexingService,
  contextService: ContextService,
  toolingService: ToolingService
) => {
  const router = Router();

  // Health check
  router.get('/health', (req, res) => {
    res.json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        agentic: 'initialized',
        indexing: 'initialized',
        context: 'initialized',
        tooling: 'initialized',
      },
    });
  });
  router.post('/agent/process', async (req, res) => {
    try {
      const { query, sessionId } = req.body;
      const result = await agenticService.processQuery(query, sessionId || 'default');
      res.json(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Agent process error', { error: errorMessage });
      res.status(500).json({ success: false, error: errorMessage });
    }
  });

  router.get('/agent/status/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    const status = agenticService.getSessionStatus(sessionId);
    res.json({ success: true, data: status });
  });

  router.post('/agent/stop/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    agenticService.stopSession(sessionId);
    res.json({ success: true });
  });

  // Indexing routes
  router.post('/index/workspace', async (req, res) => {
    try {
      const { workspacePath } = req.body;
      await indexingService.indexWorkspace(workspacePath || process.cwd());
      res.json({ success: true });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Index workspace error', { error: errorMessage });
      res.status(500).json({ success: false, error: errorMessage });
    }
  });

  router.post('/index/file', async (req, res) => {
    try {
      const { filePath } = req.body;
      await indexingService.indexFile(filePath);
      res.json({ success: true });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Index file error', { error: errorMessage });
      res.status(500).json({ success: false, error: errorMessage });
    }
  });

  router.get('/index/symbols', async (req, res) => {
    try {
      const { query } = req.query;
      const symbols = await indexingService.searchSymbols(query as string);
      res.json({ success: true, data: symbols });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Search symbols error', { error: errorMessage });
      res.status(500).json({ success: false, error: errorMessage });
    }
  });

  // Context routes
  router.post('/context/store', async (req, res) => {
    try {
      const { type, title, content } = req.body;
      const id = await contextService.storeContext({ type, title, content });
      res.json({ success: true, data: { id } });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Store context error', { error: errorMessage });
      res.status(500).json({ success: false, error: errorMessage });
    }
  });

  router.get('/context/search', async (req, res) => {
    try {
      const { query, limit } = req.query;
      const results = await contextService.searchContexts(query as string);
      const limited = limit ? results.slice(0, parseInt(limit as string)) : results;
      res.json({ success: true, data: limited });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Search context error', { error: errorMessage });
      res.status(500).json({ success: false, error: errorMessage });
    }
  });

  // Tooling routes
  router.post('/tools/execute', async (req, res) => {
    try {
      const { toolName, args } = req.body;
      const result = await toolingService.executeTool(toolName, args, {
        workspaceFolder: process.cwd(),
        contextStore: contextService,
      });
      res.json(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Tool execution error', { error: errorMessage });
      res.status(500).json({ success: false, error: errorMessage });
    }
  });

  return router;
};
