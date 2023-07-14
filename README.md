# Rails Routes CodeLens Extension for Visual Studio Code

This Visual Studio Code extension provides code lenses above Rails controller actions, displaying the corresponding routes defined in your Rails application. It allows you to easily navigate between routes and their associated controller actions within your Ruby files.

## Features

- Displays code lenses above Rails controller actions.
- Shows the route names in the code lenses.
- Clicking on a code lens navigates to the corresponding route declaration.

## Requirements

- Visual Studio Code

## Installation

1. Open Visual Studio Code.
2. Go to the Extensions view (Ctrl+Shift+X).
3. Search for "Rails Routes CodeLens" and click Install.
4. Reload Visual Studio Code to activate the extension.

## Usage

1. Open a Ruby file containing your Rails routes and corresponding controller actions.
2. The extension will analyze the file and display code lenses above the controller actions.
3. Click on a code lens to navigate to the corresponding route declaration.

## Customization

If your Rails conventions differ from the default assumptions made by the extension, you can customize the logic for finding controller actions and route declarations. Modify the `findControllerActionLine`, `findControllerLine`, and `findRouteLine` functions in the `extension.ts` file to fit your specific requirements.

## License

This extension is licensed under the [MIT License]

## Feedback

If you have any feedback or questions, please feel free to reach out. You can contact us at your-email@example.com.

Enjoy using the Rails Routes CodeLens Extension!

