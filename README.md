# massCode assistant for Visual Studio Code

> **Version Compatibility:**
> - v2.2.0+ supports massCode v4 and massCode v5.8+ (Markdown Vault support)
> - For massCode v3, install extension version below v2.0.0

Quick access to massCode app

![](https://github.com/massCodeIO/assistant-vscode/raw/master/assets/command.png)

- Fetch snippets
- Search snippets
- Select to paste
- Create snippets

![](https://github.com/massCodeIO/assistant-vscode/raw/master/assets/demo.gif)

## Configuration

The extension contributes the following settings:

* `masscode-assistant.notify`: Controls whether a notification is shown after a snippet is created. (Default: `true`)
* `masscode-assistant.port`: The port number for massCode API connection. (Default: `4321`)
* `masscode-assistant.vaultPath`: Path to the massCode Markdown Vault. Required for massCode v5.8+ compatibility if empty/not using the default location. If left empty, it will auto-detect the default path at `~/massCode/markdown-vault`.
