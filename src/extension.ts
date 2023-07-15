import * as vscode from 'vscode';
import { exec } from 'child_process';

export function activate(context: vscode.ExtensionContext) {
    // Register a CodeLens provider
    const codeLensProvider = new RubyMethodCodeLensProvider();
    context.subscriptions.push(
        vscode.languages.registerCodeLensProvider('ruby', codeLensProvider)
    );
    // Register the command to handle code lens actions
    context.subscriptions.push(
        vscode.commands.registerCommand('extension.gotoRoute', (routeUrl: string) => {
            // Handle the code lens action, e.g., opening the route URL in the browser
            vscode.env.openExternal(vscode.Uri.parse(routeUrl));
        })
    );
}

class RubyMethodCodeLensProvider implements vscode.CodeLensProvider {
    provideCodeLenses(
        document: vscode.TextDocument,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.CodeLens[]> {
        const codeLenses: vscode.CodeLens[] = [];

        const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
        const workspacePath = workspaceFolder?.uri.fsPath;
        exec('rails routes', { cwd: workspacePath }, (error, stdout) => {
            if (error) {
                vscode.window.showErrorMessage(`Error running 'rails routes' command: ${error.message}`);
                return;
            }
            //  console.log("exec: ",stdout);
                const routes = parseRoutes(stdout);
                // Iterate over each line in the document
                for (let line = 0; line < document.lineCount; line++) {
                    const { text } = document.lineAt(line);
    
                    // Match the controller action
                    const match = /def\s+(\w+)/.exec(text);
                    const controllerFile = document.fileName.split('/').pop();
                    const controller = /(.+)_controller\.rb/.exec(controllerFile!)![1];
                    console.log("captured, controller",controllerFile, controller);
                    if (match) {
                        const action = match[1];
                        // Find the corresponding route
                        const route = findRouteForAction(routes, action, controller);
                        if (route) {
                            console.log("ROUTES: " + route.pattern);
                            const codeLensRange = new vscode.Range(line, 0, line, 0);
                            const codeLens = new vscode.CodeLens(codeLensRange);
                            // Set the code lens command and its title
                            codeLens.command = {
                                title: `${route.url}: ${route.pattern}`,
                                command: 'extension.gotoRoute',
                                arguments: [route.url],
                            };
                            console.log('codeLens.command', codeLens.command);
                            codeLenses.push(codeLens);
                        }
                    }
                }
                return;
        });
        console.log("CodeLense",codeLenses);
        return codeLenses;
    }
}

function parseRoutes(routesOutput: string): Route[] {
    const routes: Route[] = [];
    const lines = routesOutput.split('\n');

    // Remove the header line
    lines.shift();

    for (const line of lines) {
        const [, verb, url, pattern, controllerAction] = line.split(/\s+/);
        if (verb && url && controllerAction) {
            const [controller, action] = controllerAction.split('#');
            routes.push({ verb, url, pattern, controller, action });
        }
    }
    // console.log('ROUTES: ', routes);
    return routes;
}

function findRouteForAction(routes: Route[], action: string, controller: string): Route | undefined {
    // Implement the logic to find the route for the given controller action
    // You may use a custom logic or matching patterns to find the route

    // Here's a sample implementation that matches the action with the route controller and action names
    return routes.find((route) => route.action === action && route.controller === controller);
}

interface Route {
    verb: string;
    url: string;
    controller: string;
    action: string;
    pattern: string;
}

export function deactivate() {}
