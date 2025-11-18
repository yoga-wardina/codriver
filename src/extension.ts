import * as vscode from 'vscode';
import { CodriverCore } from './core/CodriverCore';

let codriverCore: CodriverCore | undefined;

export function activate(context: vscode.ExtensionContext) {
  console.log('Codriver extension is now active!');

  // Initialize Codriver Core
  codriverCore = new CodriverCore(context);

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('codriver.toggle', () => {
      codriverCore?.toggle();
    }),
    vscode.commands.registerCommand('codriver.ask', () => {
      codriverCore?.ask();
    }),
    vscode.commands.registerCommand('codriver.enableAgenticMode', () => {
      codriverCore?.enableAgenticMode();
    }),
    vscode.commands.registerCommand('codriver.clearCache', () => {
      codriverCore?.clearCache();
    }),
    vscode.commands.registerCommand('codriver.indexWorkspace', () => {
      codriverCore?.indexWorkspace();
    }),
    vscode.commands.registerCommand('codriver.openDebugPanel', () => {
      codriverCore?.openDebugPanel();
    })
  );
}

export function deactivate() {
  codriverCore?.dispose();
}
