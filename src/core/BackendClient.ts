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

  public async createConversation(title?: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/api/chat/conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title }),
    });

    if (!response.ok) {
      throw new Error(`Create conversation failed: ${response.status}`);
    }

    const result = (await response.json()) as { success: boolean; conversationId: string };
    return result.conversationId;
  }

  public async addMessage(conversationId: string, role: string, content: string, metadata?: any): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/chat/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ role, content, metadata }),
    });

    if (!response.ok) {
      throw new Error(`Add message failed: ${response.status}`);
    }
  }

  public async getConversation(conversationId: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/chat/conversations/${conversationId}`);

    if (!response.ok) {
      throw new Error(`Get conversation failed: ${response.status}`);
    }

    const result = (await response.json()) as { success: boolean; conversation: any };
    return result.conversation;
  }

  public async listConversations(): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/api/chat/conversations`);

    if (!response.ok) {
      throw new Error(`List conversations failed: ${response.status}`);
    }

    const result = (await response.json()) as { success: boolean; conversations: any[] };
    return result.conversations;
  }
}
