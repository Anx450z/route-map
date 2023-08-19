import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import pluralize from "pluralize";

export class RubyTableCodeLensProvider implements vscode.CodeLensProvider {
  async provideCodeLenses(
    document: vscode.TextDocument,
    token: vscode.CancellationToken
  ): Promise<vscode.CodeLens[]> {
    const codeLenses: vscode.CodeLens[] = [];
    const isModelFile = /app[\/\\]models[\/\\][^\/\\]+\.rb$/.test(
      document.fileName
    );
    if (!isModelFile) {
      return codeLenses;
    }
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
    const workspacePath = workspaceFolder?.uri.fsPath;

    try {
      const lines = document.getText().split("\n");
      for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        const lineText = lines[lineIndex];
        const match = /class\s+(\w+)(?:\s+)?<(?:\s+)?\s+(\w+)/.exec(lineText);
        if (match) {
          const parentClassMatch = match[2];
          let model = match[1];
          if (parentClassMatch !== "ApplicationRecord") {
            // Check for parentClassMatch existence
            model = parentClassMatch;
          }
          const table = await findTable(workspacePath!, model);
          if (table) {
            const codeLensRange = new vscode.Range(lineIndex, 0, lineIndex, 0);
            const codeLens = new vscode.CodeLens(codeLensRange);
            codeLens.command = {
              title: `🗓️ TABLE: ${table.tableName} ⏿`,
              arguments: [table.line],
              command: "extension.openTable",
              tooltip: `SHOW SCHEMA → ${table.tableName}`,
            };
            codeLenses.push(codeLens);
            break; // Stop after first match
          }
        }
      }
      // const editor = vscode.window.activeTextEditor;
      // if (editor) {
      //     editor.setDecorations(codeLensDecorationType, codeLenses);
      // }

      return codeLenses;
    } catch (error) {
      console.error(`Error while gen code lens: ${error}`);
      return [];
    }
  }
}
// const codeLensDecorationType = vscode.window.createTextEditorDecorationType({
//     // before: {
//     //     // contentText: '▶:',
//     //     // margin: '0 5px',
//     //     // contentIconPath: '../images/icons8-table-48.png'
//     // },
//     gutterIconPath: 'src/images/icons8-table-48.png',
//     gutterIconSize: 'auto',
// });

function camelToSnakeCase(input: string): string {
  return input.replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase();
}

async function findTable(
  workspacePath: string,
  model: string
): Promise<Table | null> {
  const schemaPath = path.join(workspacePath, "db", "schema.rb");
  try {
    const schemaContent = await fs.promises.readFile(schemaPath, "utf-8");
    const lines = schemaContent.split("\n");

    const snakeCaseModel = camelToSnakeCase(model);
    let tableDefinitionLine = -1;
    let tableName = "";

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (
        line.includes(`create_table "${pluralize.plural(snakeCaseModel)}",`)
      ) {
        tableDefinitionLine = i;
        tableName = line.match(/"(\w+)"/)?.[1] || "";
        break;
      }
    }

    if (tableDefinitionLine !== -1 && tableName !== "") {
      return { model, tableName: tableName, line: tableDefinitionLine + 1 };
    } else {
      return null;
    }
  } catch (error) {
    console.error(`Error while reading schema.rb: ${error}`);
    return null;
  }
}

interface Table {
  model: string;
  tableName: string;
  line: number;
}
