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
    console.log("this is view file");
    if (!isViewFile) {
      console.log('not view file');
      return codeLenses;
    }

    try {
      const workspacePath = vscode.workspace.getWorkspaceFolder(document.uri)?.uri.fsPath;

      if (!workspacePath) {
        return codeLenses;
      }

      const viewFilePath = document.uri.fsPath;
      const viewRelativePath = path.relative(path.join(workspacePath, "app", "views"), viewFilePath.split('.')[0]);
      console.log('view file path', viewRelativePath);
      const [controller, action] = this.extractControllerActionFromViewPath(viewRelativePath);

      if (controller && action) {
        const controllerFilePath = path.join(workspacePath, "app", "controllers", `${controller}_controller.rb`);
        
        if (fs.existsSync(controllerFilePath)) {
          const codeLensRange = new vscode.Range(0, 0, 0, 0);
          const codeLens = new vscode.CodeLens(codeLensRange);
          codeLens.command = {
            title: `🎮 CONTROLLER: ${controller}#${action}`,
            command: "vscode.open",
            arguments: [vscode.Uri.file(controllerFilePath)]
          };
          codeLenses.push(codeLens);
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
    // For example, convert "api/v1/users/index.json.jbuilder" to ["api/v1/users", "index"]
    const separatedPath =  viewRelativePath.split('/');
    console.log('separatedPath', separatedPath);
    const action = separatedPath.pop() || '';
    console.log('action: ' + action);
    const controller = separatedPath.join('/');
    console.log('controller: ' + controller);
    return [controller, action];
  }
}
