import * as vscode from 'vscode';
import { exec } from 'child_process';
import * as fs from 'fs';

export function activate(context: vscode.ExtensionContext) {
    // Register a CodeLens provider
    const codeLensProvider = new RubyMethodCodeLensProvider();
    context.subscriptions.push(
        vscode.languages.registerCodeLensProvider('ruby', codeLensProvider)
    );
    // Register the command to handle code lens actions
    context.subscriptions.push(
        vscode.commands.registerCommand('extension.openView', (filePath: string) => {
            // Handle the code lens action, e.g., opening the view file
            vscode.workspace.openTextDocument(filePath)
                .then((document) => vscode.window.showTextDocument(document));
        })
    );
}

class RubyMethodCodeLensProvider implements vscode.CodeLensProvider {
    async provideCodeLenses(
        document: vscode.TextDocument,
        token: vscode.CancellationToken
    ): Promise<vscode.CodeLens[]> {
        const codeLenses: vscode.CodeLens[] = [];

        const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
        const workspacePath = workspaceFolder?.uri.fsPath;

        try {
            const controllerFile = document.fileName.split('/').pop();
            const controller = /(.+)_controller\.rb/.exec(controllerFile!)![1];
            const stdout = await runRailsRoutesCommand(workspacePath, controller);
            const routes = parseRoutes(stdout);

            for (let line = 0; line < document.lineCount; line++) {
                const { text } = document.lineAt(line);

                // Match the controller action
                const match = /def\s+(\w+)/.exec(text);
                if (match) {
                    const action = match[1];
                    // Find the corresponding route
                    const route = findRouteForAction(routes, action, controller);
                    if (route) {
                        const codeLensRange = new vscode.Range(line, 0, line, 0);
                        const codeLens = new vscode.CodeLens(codeLensRange);
                        // Set the code lens command and its title
                        const viewFilePath = getViewFilePath(route.controller, route.action);
                        codeLens.command = {
                            title: `🌐 ${route.url}: ${route.pattern}`,
                            command: 'extension.openView',
                            arguments: [viewFilePath],
                        };
                        codeLenses.push(codeLens);
                    }
                }
            }

            return codeLenses;
        } catch (error) {
            vscode.window.showErrorMessage(`Error running 'rails routes' command: ${error}`);
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
            const verb = "not found";
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

function getViewFilePath(controller: string, action: string): string {
    let viewFilePath = `app/views/${controller}/${action}.html.erb`; // Default view file path with .html.erb extension
    const jbuilderFilePath = `app/views/${controller}/${action}.json.jbuilder`; // View file path with .json.jbuilder extension

    // Check if the .html.erb file exists, otherwise fallback to .jbuilder
    if (!fs.existsSync(viewFilePath)) {
        if (fs.existsSync(jbuilderFilePath)) {
            viewFilePath = jbuilderFilePath;
        } else {
            // No view file found
            vscode.window.showWarningMessage(`No view file found for ${controller}#${action}`);
            return '';
        }
    }
    return viewFilePath;
}

interface Route {
    verb: string;
    url: string;
    controller: string;
    action: string;
    pattern: string;
}

export function deactivate() {}
