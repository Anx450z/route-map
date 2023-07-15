import * as vscode from 'vscode';
import { exec } from 'child_process';
import * as fs from 'fs';

export function activate(context: vscode.ExtensionContext) {
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
}

class RubyMethodCodeLensProvider implements vscode.CodeLensProvider {
    private routesCache: Map<string, Route[]> = new Map<string, Route[]>();

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
            const controllerFile = document.fileName;
            const controller = /app\/controllers\/(.*?)_controller\.rb/.exec(controllerFile)![1];
            const routes = await this.getRoutes(workspacePath, controller);

            await Promise.all(
                document
                    .getText()
                    .split('\n')
                    .map(async (lineText, lineIndex) => {
                        const match = /def\s+(\w+)/.exec(lineText);
                        if (match) {
                            const action = match[1];
                            const route = findRouteForAction(routes, action, controller);
                            if (route) {
                                const codeLensRange = new vscode.Range(lineIndex, 0, lineIndex, 0);
                                const codeLens = new vscode.CodeLens(codeLensRange);
                                const viewFilePath = await getViewFilePath(workspacePath!, route.controller, route.action);
                                codeLens.command = {
                                    title: `🌐 ${route.url} | ${route.pattern}`,
                                    command: ''
                                };
                                if(viewFilePath !== ''){
                                    codeLens.command.command = `extension.openView`;
                                    codeLens.command.arguments = [viewFilePath];
                                    codeLens.command.tooltip = `navigate to view: ${controller}#${action}`;
                                }
                                codeLenses.push(codeLens);
                            }
                        }
                    })
            );
            return codeLenses;
        } catch (error) {
            console.error(`Error running 'rails routes' command: ${error}`);
            vscode.window.showWarningMessage('An error occurred while generating code lenses.');
            return [];
        }
    }

    private async getRoutes(workspacePath: string | undefined, controller: string): Promise<Route[]> {
        const cacheKey = `${workspacePath}:${controller}`;

        if (this.routesCache.has(cacheKey)) {
            return this.routesCache.get(cacheKey)!;
        }

        try {
            const stdout = await runRailsRoutesCommand(workspacePath, controller);
            const routes = parseRoutes(stdout);
            this.routesCache.set(cacheKey, routes);
            return routes;
        } catch (error) {
            console.error(`Error running 'rails routes' command: ${error}`);
            vscode.window.showWarningMessage('An error occurred while retrieving routes information.');
            return [];
        }
    }
}

function runRailsRoutesCommand(workspacePath: string | undefined, controller: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        exec(`rails routes | grep ${controller}#`, { cwd: workspacePath }, (error, stdout) => {
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
            routes.push({ verb, url, pattern, controller, action });
        } else if (count === 4) {
            const [, url, pattern, controllerAction] = line.split(/\s+/);
            const [controller, action] = controllerAction.split('#');
            const verb = 'not found';
            routes.push({ verb, url, pattern, controller, action });
        }
    }
    return routes;
}

function findRouteForAction(routes: Route[], action: string, controller: string): Route | undefined {
    const matchedRoutes = routes.filter((route) => {
        const routeController = route.controller.toLowerCase();
        const routeAction = route.action.toLowerCase();
        const inputController = controller.toLowerCase();
        const inputAction = action.toLowerCase();

        return routeController === inputController && routeAction === inputAction;
    });

    return matchedRoutes[0];
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
    const viewFilePath = `${workspacePath}/app/views/${controller}/${action}`;

    if (await fileExists(viewFilePath + '.html.erb')) {
        return viewFilePath + '.html.erb';
    } else if (await fileExists(viewFilePath + '.json.jbuilder')) {
        return viewFilePath + '.json.jbuilder';
    } else {
        vscode.window.showWarningMessage(`No view file found for ${controller}#${action}`);
        return ``;
    }
}

interface Route {
    verb: string;
    url: string;
    controller: string;
    action: string;
    pattern: string;
}

export function deactivate() {}
