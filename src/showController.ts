import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";

export class RubyControllerCodeLensProvider implements vscode.CodeLensProvider {
  async provideCodeLenses(
    document: vscode.TextDocument,
    token: vscode.CancellationToken
  ): Promise<vscode.CodeLens[]> {
    const codeLenses: vscode.CodeLens[] = [];
    const isViewFile = /app[\/\\]views[\/\\][^\/\\]+/.test(document.fileName);

    if (!isViewFile) {
      return codeLenses;
    }

    try {
      const workspacePath = vscode.workspace.getWorkspaceFolder(document.uri)?.uri.fsPath;

      if (!workspacePath) {
        return codeLenses;
      }

      const viewFilePath = document.uri.fsPath;
      const viewRelativePath = path.relative(path.join(workspacePath, "app", "views"), viewFilePath.split('.')[0]);
      const [controller, action] = this.extractControllerActionFromViewPath(viewRelativePath);

      if (controller && action) {
        const controllerFilePath = path.join(workspacePath, "app", "controllers", `${controller}_controller.rb`);

        if (fs.existsSync(controllerFilePath)) {
          const codeLensRange = new vscode.Range(0, 0, 0, 0);
          const controllerFileContent = fs.readFileSync(controllerFilePath, "utf-8");
          const actionExists = this.controllerActionExists(controllerFileContent, action);

          const codeLens = new vscode.CodeLens(codeLensRange);
          codeLens.command = {
            title: `🎮 CONTROLLER: ${controller}`,
            command: "vscode.open",
            arguments: [vscode.Uri.file(controllerFilePath)],
            tooltip: `NAVIGATE TO CONTROLLER → ${controller}`
          };
          codeLenses.push(codeLens);
          if (actionExists) {
            const codeLensAction = new vscode.CodeLens(codeLensRange);
            codeLensAction.command = {
              title: `${action}`,
              command: 'vscode.open',
              arguments: [vscode.Uri.file(controllerFilePath)],
              tooltip: `NAVIGATE TO ACTION → ${controller}#${action}`
            };
            codeLenses.push(codeLensAction);
          }
        }
      }

      return codeLenses;
    } catch (error) {
      console.error(`Error while generating code lens: ${error}`);
      return [];
    }
  }

  private extractControllerActionFromViewPath(viewRelativePath: string): [string, string] | [] {
    // Implement the logic to extract controller and action from the viewRelativePath
    const separatedPath =  viewRelativePath.split('/');
    const action = separatedPath.pop() || '';
    const controller = separatedPath.join('/');
    return [controller, action];
  }

  private controllerActionExists(controllerFileContent: string, action: string): boolean {
    // Implement the logic to check if the given action exists in the controller file content
    return controllerFileContent.includes(`def ${action}`);
  }
}
