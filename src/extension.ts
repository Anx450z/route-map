import * as vscode from 'vscode';
import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { RubyTableCodeLensProvider } from './showTable';
import { RubyModelCodeLensProvider } from './showModel';
import { RubyMethodCodeLensProvider } from './showRoute';
import fileExists from './common';

export async function activate(context: vscode.ExtensionContext) {
                await initializeExtension(context);
                await runRouteExtension(context);
                await runTableExtension(context);
                await runModelExtension(context);
    }

async function initializeExtension(context: vscode.ExtensionContext) {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    const workspacePath = workspaceFolder?.uri.fsPath;
    const outputFilePath = path.join(workspacePath || '', 'tmp', 'routes_file.txt');
    const gemFilePath = path.join(workspacePath || '', 'Gemfile');

    if (!await fileExists(outputFilePath) && await fileExists(gemFilePath)) {
        await updateRailsRoutesCommand();
    }
}

async function runRouteExtension(context: vscode.ExtensionContext) {
    const codeLensRouteProvider = new RubyMethodCodeLensProvider();
    context.subscriptions.push(
        vscode.languages.registerCodeLensProvider('ruby', codeLensRouteProvider)
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('extension.openView', (filePath: string) => {
            vscode.workspace.openTextDocument(filePath)
                .then((document) => vscode.window.showTextDocument(document));
        })
    );

    vscode.workspace.onDidSaveTextDocument(async (document: vscode.TextDocument) => {
        if (document.fileName.endsWith('routes.rb')) {
            try {
                await updateRailsRoutesCommand();
            } catch (error) {
                console.error(`Error updating routes file: ${error}`);
            }
        }
    });
}
async function runTableExtension(context: vscode.ExtensionContext) {
    const codeLensTableProvider = new RubyTableCodeLensProvider();
    context.subscriptions.push(
        vscode.languages.registerCodeLensProvider('ruby', codeLensTableProvider)
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('extension.openTable', async (line: number) => {
            if (vscode.workspace.workspaceFolders) {
                const schemaUri = vscode.Uri.file(path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, 'db', 'schema.rb'));
                const schemaDocument = await vscode.workspace.openTextDocument(schemaUri);
                const schemaPosition = new vscode.Position(line - 1, 0); // Line number is 1-based, position is 0-based
                await vscode.window.showTextDocument(schemaDocument, { selection: new vscode.Range(schemaPosition, schemaPosition) });
            }
        })        
    );
}

async function runModelExtension(context: vscode.ExtensionContext) {
    const codeLensModelProvider = new RubyModelCodeLensProvider();
    context.subscriptions.push(
        vscode.languages.registerCodeLensProvider('ruby', codeLensModelProvider)
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('extension.openModel', (filePath: string) => {
            vscode.workspace.openTextDocument(filePath)
            .then((document) => vscode.window.showTextDocument(document));
        })        
    );
}



async function updateRailsRoutesCommand(): Promise<string> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    const workspacePath = workspaceFolder?.uri.fsPath;
    const outputFilePath = path.join(workspacePath || '', 'tmp', 'routes_file.txt');
    return new Promise<string>((resolve, reject) => {
        exec('rails routes > ' + outputFilePath, { cwd: workspacePath }, (error, stdout, stderr) => {
            if (error) {
               console.error('error running rails routes command: ', stderr);
               vscode.window.showWarningMessage('Failed to execute rails route command');
               reject(error);
            }else {
                resolve(stdout);
            }
        });
    });
}

export function deactivate() {}
