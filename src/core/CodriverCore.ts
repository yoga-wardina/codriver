import * as vscode from 'vscode';
import { BackendClient } from './BackendClient';

export class CodriverCore {
  private context: vscode.ExtensionContext;
  private backendClient: BackendClient;
  private isEnabled: boolean = true;
  private agenticMode: boolean = false;
  private currentSessionId: string = 'default';

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.backendClient = new BackendClient();

    // Setup event listeners
    this.setupEventListeners();

    // Check backend connectivity
    this.checkBackendConnectivity();
  }

  private setupEventListeners() {
    // For now, we'll disable automatic indexing since it's handled by the backend
    // TODO: Implement file change notifications to backend if needed
  }

  private async checkBackendConnectivity() {
    try {
      const health = await this.backendClient.healthCheck();
      console.log('Codriver backend connected:', health);
      vscode.window.showInformationMessage('Codriver backend connected successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Codriver backend connection failed:', errorMessage);
      vscode.window.showErrorMessage(`Codriver backend connection failed: ${errorMessage}`);
    }
  }

  public toggle() {
    this.isEnabled = !this.isEnabled;
    vscode.window.showInformationMessage(`Codriver ${this.isEnabled ? 'enabled' : 'disabled'}`);
  }

  public async ask() {
    const query = await vscode.window.showInputBox({
      prompt: 'Ask Codriver a question',
      placeHolder: 'What would you like to know?',
    });

    if (query) {
      try {
        if (this.agenticMode) {
          const result = await this.backendClient.processAgenticQuery(query, this.currentSessionId);
          if (result.success) {
            vscode.window.showInformationMessage('Query processed successfully');
          } else {
            vscode.window.showErrorMessage(`Query failed: ${result.error}`);
          }
        } else {
          // For now, simple queries are not implemented in the backend
          vscode.window.showInformationMessage('Simple query mode not yet implemented with backend');
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        vscode.window.showErrorMessage(`Failed to process query: ${errorMessage}`);
      }
    }
  }

  public enableAgenticMode() {
    this.agenticMode = !this.agenticMode;
    vscode.window.showInformationMessage(`Agentic mode ${this.agenticMode ? 'enabled' : 'disabled'}`);
  }

  public async clearCache() {
    try {
      await this.backendClient.clearCache();
      vscode.window.showInformationMessage('Cache cleared');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      vscode.window.showErrorMessage(`Failed to clear cache: ${errorMessage}`);
    }
  }

  public async indexWorkspace() {
    if (!this.isEnabled) return;

    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      vscode.window.showErrorMessage('No workspace folder open');
      return;
    }

    try {
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'Indexing workspace...',
          cancellable: false,
        },
        async (progress) => {
          const result = await this.backendClient.indexWorkspace(workspaceFolder.uri.fsPath);
          if (!result.success) {
            throw new Error(result.error || 'Indexing failed');
          }
        }
      );

      vscode.window.showInformationMessage('Workspace indexed successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      vscode.window.showErrorMessage(`Failed to index workspace: ${errorMessage}`);
    }
  }

  public openDebugPanel() {
    // TODO: Implement debug panel
    vscode.window.showInformationMessage('Debug panel not yet implemented');
  }

  public dispose() {
    // Backend client doesn't need explicit cleanup
  }
}
