# massCode assistant for Visual Studio Code

> **Version Compatibility:**
> - Supports massCode v4 and massCode v5.9 (using the public Integration API only)
> - For massCode v3, install extension version below v2.0.0

Quick access to massCode app

![](https://github.com/massCodeIO/assistant-vscode/raw/master/assets/command.png)

## Features

- **Fetch & Search Snippets**: Quickly search your snippets from the command palette.
- **Direct Insertion**: Inserts selected snippet directly into the active editor via `editor.edit` API, falling back to clipboard if no editor is open.
- **Folder Selection**: Choose the destination folder (with full recursive navigation) before creating a new snippet.
- **Automatic Language Detection**: Automatically detects the active editor's language mode when creating a snippet.

![](https://github.com/massCodeIO/assistant-vscode/raw/master/assets/demo.gif)

## Configuration

The extension contributes the following settings:

* `masscode-assistant.notify`: Controls whether a notification is shown after a snippet is created. (Default: `true`)
* `masscode-assistant.port`: The port number for the massCode API connection. (Default: `4321`)
