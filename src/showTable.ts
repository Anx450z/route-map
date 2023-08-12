import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import pluralize from 'pluralize';

export class RubyTableCodeLensProvider implements vscode.CodeLensProvider {
  async provideCodeLenses(
      document: vscode.TextDocument,
      token: vscode.CancellationToken
  ): Promise<vscode.CodeLens[]> {

      const codeLenses: vscode.CodeLens[] = [];
      const isModelFile = /app[\/\\]models[\/\\](.*?)(?:\.rb)?$/.test(document.fileName);
      console.log("model file", isModelFile);
      if (!isModelFile) {
          console.log("not a model file");
          return codeLenses;
      }
      console.log("this is model file", isModelFile);
      const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
      const workspacePath = workspaceFolder?.uri.fsPath;

      try {
          const promises = document.getText().split('\n').map(async (lineText, lineIndex) => {
              const match = /class\s+(\w+)(?:\s+)?<(?:\s+)?ApplicationRecord/.exec(lineText);
              console.log("match: " + match);
              if (match) {
                  const model = match[1];
                  const table = await findTable(workspacePath!, model);
                  if (table) {
                      const codeLensRange = new vscode.Range(lineIndex, 0, lineIndex, 0);
                      const codeLens = new vscode.CodeLens(codeLensRange);
                      codeLens.command = {
                          title: `🗓️ TABLE: ${table.tableName}`,
                          arguments: [table.line],
                          command: 'extension.openTable',
                          tooltip: `Open table ${table.tableName}`
                      };
                      codeLenses.push(codeLens);
                  }
              }
          });

          await Promise.all(promises);

          return codeLenses;
      } catch (error) {
          console.error(`Error while gen code lens: ${error}`);
          vscode.window.showWarningMessage('An error occurred while generating code lenses.');
          return [];
      }
  }
}

function camelToSnakeCase(input: string): string {
    return input.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
}

async function findTable(workspacePath: string, model: string): Promise<Table | null> {
    const schemaPath = path.join(workspacePath, 'db', 'schema.rb');
    console.log("model",model);
    try {
        const schemaContent = await fs.promises.readFile(schemaPath, 'utf-8');
        const lines = schemaContent.split('\n');

        const snakeCaseModel = camelToSnakeCase(model);
        let tableDefinitionLine = -1;
        let tableName = '';

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            console.log('pluralized line ' + pluralize.plural(snakeCaseModel));
            if (line.includes(`create_table "${pluralize.plural(snakeCaseModel)}",`)) {
                tableDefinitionLine = i;
                tableName = line.match(/"(\w+)"/)?.[1] || '';
                break;
            }
        }

        if (tableDefinitionLine !== -1 && tableName !== '') {
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
