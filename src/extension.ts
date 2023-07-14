import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    // Register a code lens provider
    const codeLensProvider = vscode.languages.registerCodeLensProvider('ruby', {
        provideCodeLenses(document: vscode.TextDocument, token: vscode.CancellationToken) {
            const codeLenses: vscode.CodeLens[] = [];

            // Regex pattern to match Rails routes
            const routePattern = /get|post|put|patch|delete.*(?=:)/g;

            // Iterate over each line in the document
            for (let line = 0; line < document.lineCount; line++) {
                const { text } = document.lineAt(line);

                // Match the route pattern
                const match = routePattern.exec(text);
                if (match) {
                    const routeName = match[0];

                    // Find the corresponding controller action
                    const actionLine = findControllerActionLine(document, line);
                    if (actionLine !== -1) {
                        const codeLensRange = new vscode.Range(actionLine, 0, actionLine, 0);
                        const codeLens = new vscode.CodeLens(codeLensRange);

                        // Set the code lens command and its title
                        codeLens.command = {
                            title: `Go to route: ${routeName}`,
                            command: 'extension.gotoRoute',
                            arguments: [routeName],
                        };

                        codeLenses.push(codeLens);
                    }
                }
            }

            return codeLenses;
        }
    });

    // Register the code lens provider
    context.subscriptions.push(codeLensProvider);

    // Register the command to handle code lens actions
    context.subscriptions.push(
        vscode.commands.registerCommand('extension.gotoRoute', (routeName: string) => {
            // Handle the code lens action, e.g., navigating to the route declaration
            vscode.window.showInformationMessage(`Go to route: ${routeName}`);
        })
    );
}

function findControllerActionLine(document: vscode.TextDocument, startLine: number): number {
    // Implement the logic to find the corresponding controller action based on the route
    // You may use a custom logic or regular expressions to find the controller and action names

    // Here's a sample implementation to find the controller action in a Rails convention
    const currentLine = document.lineAt(startLine).text;
    const controllerPattern = /def\s+(\w+)/g;
    const match = controllerPattern.exec(currentLine);
    if (match) {
        const action = match[1];
        const controllerLine = findControllerLine(document, startLine);
        if (controllerLine !== -1) {
            const controllerName = extractControllerName(document, controllerLine);
            if (controllerName) {
                // Assuming the controller and action are in the same line
                const controllerActionLine = document.lineAt(controllerLine).text.indexOf(`${controllerName}#${action}`);
                if (controllerActionLine !== -1) {
                    return controllerLine;
                }
            }
        }
    }

    return -1;
}

function findControllerLine(document: vscode.TextDocument, startLine: number): number {
    // Implement the logic to find the line number where the controller is defined
    // You may use a custom logic or regular expressions to find the controller name

    // Here's a sample implementation to find the controller line in a Rails convention
    for (let line = startLine - 1; line >= 0; line--) {
        const { text } = document.lineAt(line);
        if (text.includes('class') && text.includes('Controller')) {
            return line;
        }
    }

    return -1;
}

function extractControllerName(document: vscode.TextDocument, line: number): string | null {
    // Implement the logic to extract the controller name from the line
    // You may use a custom logic or regular expressions to extract the controller name

    // Here's a sample implementation to extract the controller name in a Rails convention
    const controllerPattern = /class\s+(\w+)Controller/g;
    const match = controllerPattern.exec(document.lineAt(line).text);
    if (match) {
        return match[1];
    }

    return null;
}

export function deactivate() {}
