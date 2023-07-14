import * as vscode from 'vscode';
import { exec } from 'child_process';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
    // Register a code lens provider
    const codeLensProvider = vscode.languages.registerCodeLensProvider('ruby', {
        provideCodeLenses(document: vscode.TextDocument, token: vscode.CancellationToken) {
            const codeLenses: vscode.CodeLens[] = [];

            const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
            if (workspaceFolder) {
                const workspacePath = workspaceFolder.uri.fsPath;
                console.log('document',document.fileName);
                    exec('rails routes', { cwd: workspacePath }, (error, stdout) => {
                        if (error) {
                            vscode.window.showErrorMessage(`Error running 'rails routes' command: ${error.message}`);
                            return;
                        }
                        // console.log("stdout: " + stdout);
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
                                console.log("route: " + route);
                                if (route) {
                                    console.log('route found', route);
                                    const codeLensRange = new vscode.Range(line, 0, line, 0);
                                    const codeLens = new vscode.CodeLens(codeLensRange);

                                    // Set the code lens command and its title
                                    console.log('route.url', route.url);
                                    codeLens.command = {
                                        title: `Go to route: ${route.url}`,
                                        command: 'extension.gotoRoute',
                                        arguments: [route.url],
                                    };

                                    codeLenses.push(codeLens);
                                }
                            }
                        }
                    });
            }

            return codeLenses;
        }
    });

    // Register the code lens provider
    context.subscriptions.push(codeLensProvider);

    // Register the command to handle code lens actions
    context.subscriptions.push(
        vscode.commands.registerCommand('extension.gotoRoute', (routeUrl: string) => {
            // Handle the code lens action, e.g., opening the route URL in the browser
            vscode.env.openExternal(vscode.Uri.parse(routeUrl));
        })
    );
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
    console.log('routes: ', routes);
    return routes;
}

function findRouteForAction(routes: Route[], action: string): Route | undefined {
    // Implement the logic to find the route for the given controller action
    // You may use a custom logic or matching patterns to find the route

    // Here's a sample implementation that matches the action with the route controller and action names
    console.log('matching: ', routes.find((route) => route.action === action), 'ACTION',action);
    return routes.find((route) => route.action === action);
}

interface Route {
    method: string;
    url: string;
    controller: string;
    action: string;
}

export function deactivate() {}
