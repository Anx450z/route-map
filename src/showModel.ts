import * as vscode from "vscode";
import * as path from "path";
import fileExists from "./common";
import pluralize from "pluralize";

export class RubyModelCodeLensProvider implements vscode.CodeLensProvider {
  async provideCodeLenses(
    document: vscode.TextDocument,
    token: vscode.CancellationToken
  ): Promise<vscode.CodeLens[]> {
    const codeLenses: vscode.CodeLens[] = [];
    const isSchemaFile = document.fileName.endsWith("schema.rb");
    if (!isSchemaFile) {
      return codeLenses;
    }
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
    const workspacePath = workspaceFolder?.uri.fsPath;
    try {
      const lines = document.getText().split("\n");
      for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        const lineText = lines[lineIndex];
        const match = /create_table(?:\s+)?\s+"([^"]+)"/.exec(lineText);
        if (match) {
          const table = match[1];
          const model = await findModel(workspacePath!, table);
          if (model) {
            const codeLensRange = new vscode.Range(lineIndex, 0, lineIndex, 0);
            const codeLens = new vscode.CodeLens(codeLensRange);
            codeLens.command = {
              title: `💎 MODEL: ${model.modelName} ⏿`,
              arguments: [model.modelPath],
              command: "extension.openModel",
              tooltip: `OPEN MODEL FILE → ${model.modelName}`,
            };
            codeLenses.push(codeLens);
          }
        }
      }

      return codeLenses;
    } catch (error) {
      console.error(`Error while gen code lens: ${error}`);
      return [];
    }
  }
}

interface Model {
  modelName: string;
  modelPath: string;
}

function snakeToPascalCase(input: string): string {
  const camelCase = input.replace(/_([a-z])/g, (_, character) =>
    character.toUpperCase()
  );
  return camelCase.charAt(0).toUpperCase() + camelCase.slice(1);
}

async function findModel(
  workspacePath: string,
  table: string
): Promise<Model | undefined> {
  const singularTable = pluralize.singular(table);
  const modelName = snakeToPascalCase(singularTable);
  const modelFileName = singularTable + ".rb";
  const modelFilePath = path.join(
    workspacePath,
    "app",
    "models",
    modelFileName
  );

  try {
    if (await fileExists(modelFilePath)) {
      return { modelName, modelPath: modelFilePath };
    }
  } catch (error) {
    console.error(`Error while finding model: ${error}`);
  }

  return undefined;
}
