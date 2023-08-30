import * as vscode from "vscode";
import { exec } from "child_process";
import * as path from "path";
import { RubyTableCodeLensProvider } from "./showTable";
import { RubyModelCodeLensProvider } from "./showModel";
import { RubyMethodCodeLensProvider } from "./showRoute";
import { RubyControllerCodeLensProvider } from "./showController";
import fileExists from "./common";

export async function activate(context: vscode.ExtensionContext) {
  const config = vscode.workspace.getConfiguration("RailsRouteCodelens");

  const showRoute = config.get("showRoute", true);
  const showTables = config.get("showTables", true);
  const showModels = config.get("showModels", true);
  const showControllers = config.get("showControllers", true);
  const run = await isRailsProject(context);
  if (showRoute && run) {
    await initializeExtension(context);
    await runRouteExtension(context);
  }
  if (showModels && run) {
    await runModelExtension(context);
  }
  if (showTables && run) {
    await runTableExtension(context);
  }
  if (showControllers && run) {
    await runControllerExtension(context);
  }
}

async function isRailsProject(context: vscode.ExtensionContext) {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  const workspacePath = workspaceFolder?.uri.fsPath;
  const gemFilePath = path.join(workspacePath || "", "Gemfile");
  return fileExists(gemFilePath);
}

async function initializeExtension(context: vscode.ExtensionContext) {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  const workspacePath = workspaceFolder?.uri.fsPath;
  const outputFilePath = path.join(
    workspacePath || "",
    "tmp",
    "routes_file.txt"
  );

  if (!(await fileExists(outputFilePath))) {
    await updateRailsRoutesCommand();
  }
}

async function runRouteExtension(context: vscode.ExtensionContext) {
  const codeLensRouteProvider = new RubyMethodCodeLensProvider();
  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider("ruby", codeLensRouteProvider)
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "extension.openView",
      (filePath: string) => {
        vscode.workspace
          .openTextDocument(filePath)
          .then((document) => vscode.window.showTextDocument(document));
      }
    )
  );

  vscode.workspace.onDidSaveTextDocument(
    async (document: vscode.TextDocument) => {
      if (document.fileName.endsWith("routes.rb")) {
        try {
          await updateRailsRoutesCommand();
        } catch (error) {
          console.error(`Error updating routes file: ${error}`);
        }
      }
    }
  );
}
async function runTableExtension(context: vscode.ExtensionContext) {
  const codeLensTableProvider = new RubyTableCodeLensProvider();
  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider("ruby", codeLensTableProvider)
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "extension.openTable",
      async (line: number) => {
        if (vscode.workspace.workspaceFolders) {
          const schemaUri = vscode.Uri.file(
            path.join(
              vscode.workspace.workspaceFolders[0].uri.fsPath,
              "db",
              "schema.rb"
            )
          );
          const schemaDocument = await vscode.workspace.openTextDocument(
            schemaUri
          );
          const schemaPosition = new vscode.Position(line - 1, 0); // Line number is 1-based, position is 0-based
          await vscode.window.showTextDocument(schemaDocument, {
            selection: new vscode.Range(schemaPosition, schemaPosition),
          });
        }
      }
    )
  );
}

async function runModelExtension(context: vscode.ExtensionContext) {
  const codeLensModelProvider = new RubyModelCodeLensProvider();
  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider("ruby", codeLensModelProvider)
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "extension.openModel",
      (filePath: string) => {
        vscode.workspace
          .openTextDocument(filePath)
          .then((document) => vscode.window.showTextDocument(document));
      }
    )
  );
}

async function runControllerExtension(context: vscode.ExtensionContext) {
  const codeLensControllerProvider = new RubyControllerCodeLensProvider();
  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider("ruby", codeLensControllerProvider)
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "extension.openController",
      (filePath: string) => {
        vscode.workspace
          .openTextDocument(filePath)
          .then((document) => vscode.window.showTextDocument(document));
      }
    )
  );
}

async function updateRailsRoutesCommand(): Promise<string> {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  const workspacePath = workspaceFolder?.uri.fsPath;
  const outputFilePath = path.join(
    workspacePath || "",
    "tmp",
    "routes_file.txt"
  );
  return new Promise<string>((resolve, reject) => {
    exec(
      "rails routes > " + outputFilePath,
      { cwd: workspacePath },
      (error, stdout, stderr) => {
        if (error) {
          console.error("error running rails routes command: ", stderr);
          vscode.window.showWarningMessage(
            "Failed to execute rails route command"
          );
          reject(error);
        } else {
          resolve(stdout);
        }
      }
    );
  });
}

export function deactivate() {}
