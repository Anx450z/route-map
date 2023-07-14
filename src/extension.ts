import * as vscode from 'vscode';
import { exec } from 'child_process';

export function activate(context: vscode.ExtensionContext) {
    // Register a CodeLens provider
    const codeLensProvider = new RubyMethodCodeLensProvider();
    context.subscriptions.push(
        vscode.languages.registerCodeLensProvider('ruby', codeLensProvider)
    );
}

class RubyMethodCodeLensProvider implements vscode.CodeLensProvider {
    provideCodeLenses(
        document: vscode.TextDocument,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.CodeLens[]> {
        const codeLenses: vscode.CodeLens[] = [];

        const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
        if (workspaceFolder) {
            const workspacePath = workspaceFolder.uri.fsPath;
            exec('rails routes', { cwd: workspacePath }, (error, stdout) => {
                if (error) {
                    vscode.window.showErrorMessage(`Error running 'rails routes' command: ${error.message}`);
                    return;
                }

                const routes = parseRoutes(stdout);

                // Iterate over each line in the document
                for (let line = 0; line < document.lineCount; line++) {
                    const { text } = document.lineAt(line);

                    // Match the controller action
                    const match = /def\s+(\w+)/.exec(text);
                    if (match) {
                        const action = match[1];

                        // Find the corresponding route
                        const route = findRouteForAction(routes, action);
                        if (route) {
                            const codeLensRange = new vscode.Range(line, 0, line, 0);
                            const codeLens = new vscode.CodeLens(codeLensRange);
                            // Set the code lens command and its title
                            console.log(`${route.url}: /${route.controller}/${route.action}`);
                            codeLens.command = {
                                title: `${route.url}: /${route.controller}/${route.action}`,
                                command: 'extension.gotoRoute'
                            };
                            console.log("codeLens.command" + codeLens.command.title);
                            codeLenses.push(codeLens);
                        }
                    }
                }
            });
        }

        return codeLenses;
    }
}

function parseRoutes(routesOutput: string): Route[] {
    const routes: Route[] = [];
    const lines = routesOutput.split('\n');

    // Remove the header line
    lines.shift();

    for (const line of lines) {
        const [, method, url, , controllerAction] = line.split(/\s+/);
        if (method && url && controllerAction) {
            const [controller, action] = controllerAction.split('#');
            routes.push({ method, url, controller, action });
        }
    }
    console.log('ROUTES: ', routes);
    return routes;
}

function findRouteForAction(routes: Route[], action: string): Route | undefined {
    // Implement the logic to find the route for the given controller action
    // You may use a custom logic or matching patterns to find the route

    // Here's a sample implementation that matches the action with the route controller and action names
    return routes.find((route) => route.action === action);
}

interface Route {
    method: string;
    url: string;
    controller: string;
    action: string;
}

export function deactivate() {}
