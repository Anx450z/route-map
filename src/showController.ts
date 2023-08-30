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
      const workspacePath = vscode.workspace.getWorkspaceFolder(document.uri)
        ?.uri.fsPath;

      if (!workspacePath) {
        return codeLenses;
      }

      const viewFilePath = document.uri.fsPath;
      const viewRelativePath = path.relative(
        path.join(workspacePath, "app", "views"),
        viewFilePath.split(".")[0]
      );
      const [controller, action] =
        this.extractControllerActionFromViewPath(viewRelativePath);

      if (controller && action) {
        const controllerFilePath = path.join(
          workspacePath,
          "app",
          "controllers",
          `${controller}_controller.rb`
        );

        if (fs.existsSync(controllerFilePath)) {
          const codeLensRange = new vscode.Range(0, 0, 0, 0);
          const controllerFileContent = fs.readFileSync(
            controllerFilePath,
            "utf-8"
          );
          const actionLine = this.getControllerActionLine(
            controllerFileContent,
            action
          );

          const codeLens = new vscode.CodeLens(codeLensRange);
          codeLens.command = {
            title: `🎮 CONTROLLER: ${controller}`,
            command: "vscode.open",
            arguments: [vscode.Uri.file(controllerFilePath)],
            tooltip: `NAVIGATE TO CONTROLLER → ${controller}`,
          };
          codeLenses.push(codeLens);

          if (actionLine !== -1) {
            const codeLensAction = new vscode.CodeLens(codeLensRange);
            codeLensAction.command = {
              title: `${action}`,
              command: "vscode.open",
              arguments: [
                vscode.Uri.file(controllerFilePath),
                { selection: new vscode.Range(actionLine, 0, actionLine, 0) },
              ],
              tooltip: `NAVIGATE TO ACTION → ${controller}#${action}`,
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

  private extractControllerActionFromViewPath(
    viewRelativePath: string
  ): [string, string] | [] {
    // Implement the logic to extract controller and action from the viewRelativePath
    const separatedPath = viewRelativePath.split("/");
    const action = separatedPath.pop() || "";
    const controller = separatedPath.join("/");
    return [controller, action];
  }

  private getControllerActionLine(
    controllerFileContent: string,
    action: string
  ): number {
    const lines = controllerFileContent.split("\n");
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(`def ${action}`)) {
        return i;
      }
    }
    return -1; // Action not found
  }
}
