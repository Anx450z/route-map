import * as vscode from 'vscode';
import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export async function activate(context: vscode.ExtensionContext) {
    await initializeExtension(context);
    await runExtension(context);
}

async function initializeExtension(context: vscode.ExtensionContext) {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    const workspacePath = workspaceFolder?.uri.fsPath;
    const outputFilePath = path.join(workspacePath || '', 'tmp', 'routes_file.txt');

    if (!await fileExists(outputFilePath)) {
        await updateRailsRoutesCommand();
    }
}

async function runExtension(context: vscode.ExtensionContext) {
    const codeLensProvider = new RubyMethodCodeLensProvider();
    context.subscriptions.push(
        vscode.languages.registerCodeLensProvider('ruby', codeLensProvider)
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

class RubyMethodCodeLensProvider implements vscode.CodeLensProvider {
    async provideCodeLenses(
        document: vscode.TextDocument,
        token: vscode.CancellationToken
    ): Promise<vscode.CodeLens[]> {

        const codeLenses: vscode.CodeLens[] = [];
        const isControllerFile = document.fileName.endsWith('_controller.rb');
        if (!isControllerFile) {
            return codeLenses;
        }

        const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
        const workspacePath = workspaceFolder?.uri.fsPath;

        try {
            const controller = /app\/controllers\/(.*?)_controller\.rb/.exec(document.fileName)![1];
            const routes = await this.getRoutes(workspacePath, controller);

            const promises = document.getText().split('\n').map(async (lineText, lineIndex) => {
                const match = /def\s+(\w+)/.exec(lineText);
                if (match) {
                    const action = match[1];
                    const route = findRouteForAction(routes, action, controller);
                    if (route) {
                        const codeLensRange = new vscode.Range(lineIndex, 0, lineIndex, 0);
                        const codeLens = new vscode.CodeLens(codeLensRange);
                        const viewFilePath = await getViewFilePath(workspacePath!, route.controller, route.action);
                        codeLens.command = {
                            title: `🌐 ${route.url} | ${route.refinedPattern} | ${route.verb}`,
                            command: ''
                        };
                        if (viewFilePath !== '') {
                            codeLens.command.title = `🌐 ${route.url} | ${route.refinedPattern} | ${route.verb} 👁️`;
                            codeLens.command.command = `extension.openView`;
                            codeLens.command.arguments = [viewFilePath];
                            codeLens.command.tooltip = `navigate to view: ${controller}#${action}`;
                        }
                        codeLenses.push(codeLens);
                    }
                }
            });

            await Promise.all(promises);

            return codeLenses;
        } catch (error) {
            console.error(`Error running 'rails routes' command: ${error}`);
            vscode.window.showWarningMessage('An error occurred while generating code lenses.');
            return [];
        }
    }
    
    private async getRoutes(workspacePath: string | undefined, controller: string): Promise<Route[]> {
        try {
            const stdout = await runRailsRoutesCommand(workspacePath, controller);
            const routes = parseRoutes(stdout);
            return routes;
        } catch (error) {
            console.error(`Error running 'rails routes' command: ${error}`);
            vscode.window.showWarningMessage('An error occurred while retrieving routes information.');
            return [];
        }
    }
}

async function updateRailsRoutesCommand(): Promise<string> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    const workspacePath = workspaceFolder?.uri.fsPath;
    const outputFilePath = path.join(workspacePath || '', 'tmp', 'routes_file.txt');
    return new Promise<string>((resolve, reject) => {
        exec('rails routes | grep / -s > ' + outputFilePath, { cwd: workspacePath }, (error, stdout, stderr) => {
            if (error) {
               vscode.window.showWarningMessage('Failed to execute rails route command');
               reject(error);
            }else {
                resolve(stdout);
            }
        });
    });
}

function runRailsRoutesCommand(workspacePath: string | undefined, controller: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        const routeFilePath = path.join(workspacePath || '', 'tmp', 'routes_file.txt');
        exec(`cat ${routeFilePath} | grep ${controller}#`, { cwd: workspacePath }, (error, stdout) => {
            if (error) {
                reject(error);
            } else {
                resolve(stdout);
            }
        });
    });
}

function parseRoutes(routesOutput: string): Route[] {
    const routes: Route[] = [];
    const lines = routesOutput.split('\n');

    for (const line of lines) {
        const count = line.split(/\s+/).length;

        if (count === 5) {
            const [, verb, url, pattern, controllerAction] = line.split(/\s+/);
            const [controller, action] = controllerAction.split('#');
            const refinedPattern = pattern.split('(.:format)')[0];
            routes.push({ verb, url, refinedPattern, controller, action });
        } else if (count === 4) {
            const [, url, pattern, controllerAction] = line.split(/\s+/);
            const [controller, action] = controllerAction.split('#');
            const verb = '';
            const refinedPattern = pattern.split('(.:format)')[0];
            routes.push({ verb, url, refinedPattern, controller, action });
        }
    }
    return routes;
}

function findRouteForAction(routes: Route[], action: string, controller: string): Route | undefined {
    return routes.find((route) => {
        const routeController = route.controller.toLowerCase();
        const routeAction = route.action.toLowerCase();
        const inputController = controller.toLowerCase();
        const inputAction = action.toLowerCase();

        return routeController === inputController && routeAction === inputAction;
    });
}

async function fileExists(filePath: string): Promise<boolean> {
    try {
        await fs.promises.access(filePath);
        return true;
    } catch {
        return false;
    }
}

async function getViewFilePath(workspacePath: string, controller: string, action: string): Promise<string> {
    const viewFilePath = path.join(workspacePath, 'app','views',controller,action);

    if (await fileExists(viewFilePath + '.html.erb')) {
        return viewFilePath + '.html.erb';
    } else if (await fileExists(viewFilePath + '.json.jbuilder')) {
        return viewFilePath + '.json.jbuilder';
    } else {
        return ``;
    }
}

interface Route {
    verb: string;
    url: string;
    controller: string;
    action: string;
    refinedPattern: string;
}

export function deactivate() {}
