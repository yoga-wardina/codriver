import * as vscode from 'vscode';
import { BackendClient } from './BackendClient';

interface ChatMessage {
  id: string;
  role: string;
  content: string;
  metadata?: any;
  created_at: string;
}

interface ChatConversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export class ChatPanel {
  public static currentPanel: ChatPanel | undefined;
  public static readonly viewType = 'codriverChat';

  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private readonly _backendClient: BackendClient;
  private _disposables: vscode.Disposable[] = [];
  private _currentConversationId: string | null = null;

  public static createOrShow(extensionUri: vscode.Uri, backendClient: BackendClient) {
    const column = vscode.ViewColumn.One;

    if (ChatPanel.currentPanel) {
      ChatPanel.currentPanel._panel.reveal(column);
      return;
    }

    const panel = vscode.window.createWebviewPanel(ChatPanel.viewType, 'Codriver Chat', column, {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')],
    });

    ChatPanel.currentPanel = new ChatPanel(panel, extensionUri, backendClient);
  }

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, backendClient: BackendClient) {
    this._panel = panel;
    this._extensionUri = extensionUri;
    this._backendClient = backendClient;

    this._update();

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    this._panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.type) {
          case 'sendMessage':
            await this._handleSendMessage(message.text);
            break;
          case 'newConversation':
            await this._handleNewConversation();
            break;
          case 'loadConversation':
            await this._handleLoadConversation(message.conversationId);
            break;
          case 'listConversations':
            await this._handleListConversations();
            break;
        }
      },
      null,
      this._disposables
    );
  }

  public dispose() {
    ChatPanel.currentPanel = undefined;

    this._panel.dispose();

    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) {
        x.dispose();
      }
    }
  }

  private async _handleSendMessage(text: string) {
    try {
      // Create conversation if none exists
      if (!this._currentConversationId) {
        this._currentConversationId = await this._backendClient.createConversation('New Chat');
      }

      // Add user message
      await this._backendClient.addMessage(this._currentConversationId, 'user', text);

      // Send to agentic processing
      const result = await this._backendClient.processAgenticQuery(text, this._currentConversationId);

      // Add assistant response
      if (result.success) {
        await this._backendClient.addMessage(this._currentConversationId, 'assistant', JSON.stringify(result.result));
      } else {
        await this._backendClient.addMessage(this._currentConversationId, 'assistant', `Error: ${result.error}`);
      }

      // Refresh conversation
      await this._handleLoadConversation(this._currentConversationId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      vscode.window.showErrorMessage(`Failed to send message: ${errorMessage}`);
    }
  }

  private async _handleNewConversation() {
    try {
      this._currentConversationId = await this._backendClient.createConversation('New Chat');
      this._panel.webview.postMessage({ type: 'conversationLoaded', conversation: { messages: [] } });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      vscode.window.showErrorMessage(`Failed to create conversation: ${errorMessage}`);
    }
  }

  private async _handleLoadConversation(conversationId: string) {
    try {
      const result = await this._backendClient.getConversation(conversationId);
      this._currentConversationId = conversationId;
      this._panel.webview.postMessage({ type: 'conversationLoaded', conversation: result });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      vscode.window.showErrorMessage(`Failed to load conversation: ${errorMessage}`);
    }
  }

  private async _handleListConversations() {
    try {
      const conversations = await this._backendClient.listConversations();
      this._panel.webview.postMessage({ type: 'conversationsListed', conversations });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      vscode.window.showErrorMessage(`Failed to list conversations: ${errorMessage}`);
    }
  }

  private _update() {
    const webview = this._panel.webview;
    this._panel.title = 'Codriver Chat';
    this._panel.webview.html = this._getHtmlForWebview(webview);
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    const nonce = getNonce();

    return `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Codriver Chat</title>
        <style>
          body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            margin: 0;
            padding: 0;
            height: 100vh;
            display: flex;
            flex-direction: column;
          }

          .header {
            padding: 10px;
            border-bottom: 1px solid var(--vscode-panel-border);
            display: flex;
            gap: 10px;
          }

          .messages {
            flex: 1;
            overflow-y: auto;
            padding: 10px;
          }

          .message {
            margin-bottom: 15px;
            padding: 8px 12px;
            border-radius: 6px;
            max-width: 80%;
          }

          .message.user {
            background-color: var(--vscode-textLink-foreground);
            color: var(--vscode-editor-background);
            margin-left: auto;
            text-align: right;
          }

          .message.assistant {
            background-color: var(--vscode-input-background);
            border: 1px solid var(--vscode-input-border);
          }

          .input-area {
            padding: 10px;
            border-top: 1px solid var(--vscode-panel-border);
            display: flex;
            gap: 10px;
          }

          .input {
            flex: 1;
            padding: 8px;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 3px;
          }

          .button {
            padding: 8px 16px;
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 3px;
            cursor: pointer;
          }

          .button:hover {
            background-color: var(--vscode-button-hoverBackground);
          }
        </style>
      </head>
      <body>
        <div class="header">
          <button class="button" onclick="newConversation()">New Chat</button>
          <button class="button" onclick="listConversations()">Load Chat</button>
        </div>

        <div class="messages" id="messages"></div>

        <div class="input-area">
          <input type="text" class="input" id="messageInput" placeholder="Ask Codriver..." onkeypress="handleKeyPress(event)">
          <button class="button" onclick="sendMessage()">Send</button>
        </div>

        <script nonce="${nonce}">
          const vscode = acquireVsCodeApi();
          const messagesDiv = document.getElementById('messages');
          const messageInput = document.getElementById('messageInput');

          window.addEventListener('message', event => {
            const message = event.data;

            switch (message.type) {
              case 'conversationLoaded':
                displayConversation(message.conversation);
                break;
              case 'conversationsListed':
                showConversationSelector(message.conversations);
                break;
            }
          });

          function displayConversation(data) {
            messagesDiv.innerHTML = '';
            if (data.messages) {
              data.messages.forEach(msg => {
                const messageDiv = document.createElement('div');
                messageDiv.className = 'message ' + msg.role;

                let content = msg.content;
                try {
                  const parsed = JSON.parse(content);
                  content = JSON.stringify(parsed, null, 2);
                } catch (e) {
                  // Content is not JSON, use as-is
                }

                messageDiv.textContent = content;
                messagesDiv.appendChild(messageDiv);
              });
            }
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
          }

          function showConversationSelector(conversations) {
            const selector = document.createElement('div');
            selector.innerHTML = '<h3>Select Conversation:</h3>';
            conversations.forEach(conv => {
              const button = document.createElement('button');
              button.className = 'button';
              button.textContent = conv.title || 'Untitled';
              button.onclick = () => {
                vscode.postMessage({ type: 'loadConversation', conversationId: conv.id });
                selector.remove();
              };
              selector.appendChild(button);
              selector.appendChild(document.createElement('br'));
            });

            const closeButton = document.createElement('button');
            closeButton.className = 'button';
            closeButton.textContent = 'Cancel';
            closeButton.onclick = () => selector.remove();
            selector.appendChild(closeButton);

            document.body.appendChild(selector);
          }

          function sendMessage() {
            const text = messageInput.value.trim();
            if (text) {
              vscode.postMessage({ type: 'sendMessage', text });
              messageInput.value = '';
            }
          }

          function newConversation() {
            vscode.postMessage({ type: 'newConversation' });
          }

          function listConversations() {
            vscode.postMessage({ type: 'listConversations' });
          }

          function handleKeyPress(event) {
            if (event.key === 'Enter') {
              sendMessage();
            }
          }
        </script>
      </body>
      </html>`;
  }
}

function getNonce() {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
