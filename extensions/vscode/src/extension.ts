import * as vscode from "vscode";
import { PreviewPanel } from "./preview/preview-panel";
import { ComponentCompletionProvider } from "./completion/component-provider";

export function activate(context: vscode.ExtensionContext) {
  // Register preview command
  context.subscriptions.push(
    vscode.commands.registerCommand("polaris.openPreview", () => {
      PreviewPanel.createOrShow(context.extensionUri);
    }),
  );

  // Register component autocomplete
  const completionProvider = new ComponentCompletionProvider();
  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider(
      { language: "polaris-mdx" },
      completionProvider,
      "<", " ",
    ),
  );

  // Auto-refresh preview on save
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument((doc) => {
      if (doc.languageId === "polaris-mdx") {
        PreviewPanel.refresh();
      }
    }),
  );
}

export function deactivate() {
  PreviewPanel.dispose();
}
