# massCode assistant fo Visual Studio Code

> **Version Compatibility:**
> - v2.1.0+ requires massCode v6.0.1+ and an API token (see [Setup](#setup))
> - v2.0.x works only with massCode versions before v5.6
> - For massCode v3, install extension version below v2.0.0

Quick access to massCode app

![](https://github.com/massCodeIO/assistant-vscode/raw/master/assets/command.png)

- Fetch snippets
- Search snippets
- Select to paste
- Create snippets

![](https://github.com/massCodeIO/assistant-vscode/raw/master/assets/demo.gif)

## Setup

1. In massCode, open **Preferences > API**, turn on **Enable API integrations** and click **Generate token**.
2. Copy the token, run **massCode: Set API Token** from the Command Palette and paste it. You can also set it in the `massCode Assistant: Token` setting.
3. If you changed the API port in massCode, update the `massCode Assistant: Port` setting too.
