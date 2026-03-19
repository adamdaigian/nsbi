import * as vscode from "vscode";
import { spawn, ChildProcess } from "child_process";

/**
 * Webview panel that runs an embedded nsbi dev server and shows the preview.
 */
export class PreviewPanel {
  private static instance: PreviewPanel | undefined;
  private static devServer: ChildProcess | undefined;
  private panel: vscode.WebviewPanel;
  private port = 3456;

  private constructor(extensionUri: vscode.Uri) {
    this.panel = vscode.window.createWebviewPanel(
      "nsbiPreview",
      "nsbi Preview",
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      },
    );

    this.panel.onDidDispose(() => {
      PreviewPanel.instance = undefined;
    });

    this.startDevServer();
  }

  static createOrShow(extensionUri: vscode.Uri) {
    if (PreviewPanel.instance) {
      PreviewPanel.instance.panel.reveal(vscode.ViewColumn.Beside);
      return;
    }
    PreviewPanel.instance = new PreviewPanel(extensionUri);
  }

  static refresh() {
    if (PreviewPanel.instance) {
      PreviewPanel.instance.updateContent();
    }
  }

  static dispose() {
    if (PreviewPanel.devServer) {
      PreviewPanel.devServer.kill();
      PreviewPanel.devServer = undefined;
    }
    if (PreviewPanel.instance) {
      PreviewPanel.instance.panel.dispose();
      PreviewPanel.instance = undefined;
    }
  }

  private startDevServer() {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders?.length) {
      vscode.window.showErrorMessage("nsbi: No workspace folder open");
      return;
    }

    const cwd = workspaceFolders[0]!.uri.fsPath;

    // Try to find nsbi binary
    PreviewPanel.devServer = spawn(
      "npx",
      ["nsbi", "dev", "--project", ".", "--port", String(this.port)],
      { cwd, shell: true },
    );

    PreviewPanel.devServer.on("error", (err) => {
      vscode.window.showErrorMessage(`nsbi: Failed to start dev server: ${err.message}`);
    });

    // Wait a moment for server to start, then show preview
    setTimeout(() => this.updateContent(), 3000);
  }

  private updateContent() {
    this.panel.webview.html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body, html { margin: 0; padding: 0; height: 100%; overflow: hidden; }
          iframe { width: 100%; height: 100%; border: none; }
        </style>
      </head>
      <body>
        <iframe src="http://localhost:${this.port}" id="preview"></iframe>
        <script>
          // Refresh iframe on message from extension
          window.addEventListener('message', (event) => {
            if (event.data.type === 'refresh') {
              document.getElementById('preview').src += '';
            }
          });
        </script>
      </body>
      </html>
    `;
  }
}
