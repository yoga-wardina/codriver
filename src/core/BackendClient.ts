import * as vscode from 'vscode';

interface HealthResponse {
  status: string;
  timestamp: string;
  services: {
    agentic: boolean;
    indexing: boolean;
    context: boolean;
    tooling: boolean;
  };
}

interface AgentProcessRequest {
  query: string;
  sessionId?: string;
}

interface AgentProcessResponse {
  success: boolean;
  result?: any;
  error?: string;
}

interface IndexWorkspaceRequest {
  workspacePath: string;
}

interface IndexWorkspaceResponse {
  success: boolean;
  error?: string;
}

export class BackendClient {
  private baseUrl: string;
  private wsUrl: string;

  constructor() {
    const config = vscode.workspace.getConfiguration('codriver.backend');
    this.baseUrl = config.get('url', 'http://localhost:3001');
    this.wsUrl = config.get('wsUrl', 'ws://localhost:3001');
  }

  public async healthCheck(): Promise<HealthResponse> {
    const response = await fetch(`${this.baseUrl}/api/health`);
    if (!response.ok) {
      throw new Error(`Health check failed: ${response.status}`);
    }
    return response.json() as Promise<HealthResponse>;
  }

  public async processAgenticQuery(query: string, sessionId?: string): Promise<AgentProcessResponse> {
    const response = await fetch(`${this.baseUrl}/api/agent/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        sessionId: sessionId || 'default',
      }),
    });

    if (!response.ok) {
      throw new Error(`Agent process failed: ${response.status}`);
    }

    return response.json() as Promise<AgentProcessResponse>;
  }

  public async indexWorkspace(workspacePath: string): Promise<IndexWorkspaceResponse> {
    const response = await fetch(`${this.baseUrl}/api/index/workspace`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        workspacePath,
      }),
    });

    if (!response.ok) {
      throw new Error(`Index workspace failed: ${response.status}`);
    }

    return response.json() as Promise<IndexWorkspaceResponse>;
  }

  public async getAgentStatus(sessionId: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/agent/status/${sessionId}`);
    if (!response.ok) {
      throw new Error(`Get agent status failed: ${response.status}`);
    }
    return response.json();
  }

  public async stopAgentSession(sessionId: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/agent/stop/${sessionId}`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error(`Stop agent session failed: ${response.status}`);
    }

    return response.json();
  }

  public async clearCache(): Promise<any> {
    // This would need to be implemented in the backend
    // For now, we'll just return success
    return { success: true };
  }
}
