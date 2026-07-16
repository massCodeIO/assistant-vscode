import type { SnippetsAdd, SnippetWithMeta } from './types'
import * as vscode from 'vscode'
import { addSnippet, addSnippetContent, getFolders, getSnippets } from './api'
import { MESSAGES } from './contants'
import { showFolderPicker } from './folderPicker'
import { findSnippetInVault, resolveVaultPath } from './vault'

let logChannel: vscode.OutputChannel | undefined

export function activate(context: vscode.ExtensionContext) {
  logChannel = vscode.window.createOutputChannel('massCode Assistant')
  context.subscriptions.push(logChannel)
  const search = vscode.commands.registerCommand(
    'masscode-assistant.search',
    async () => {
      try {
        const data = await getSnippets()

        const lastSelectedId = context.globalState.get('masscode:last-selected')

        const options = data.reduce<SnippetWithMeta[]>((acc, snippet) => {
          snippet.contents.forEach((content) => {
            acc.push({
              label: snippet.name,
              detail: `${content.label} • ${content.language}`,
              description: `${snippet.folder?.name || 'Inbox'}`,
              picked: lastSelectedId === content.id,
              meta: {
                snippetId: snippet.id,
                contentId: content.id,
                contentValue: content.value || '',
              },
            })
          })
          return acc
        }, [])

        const latestPicked = options.find(i => i.picked)

        if (latestPicked) {
          options.sort((a, b) => {
            const aPicked = a.picked ? 1 : 0
            const bPicked = b.picked ? 1 : 0
            return bPicked - aPicked
          })
          options.unshift({
            ...latestPicked,
            kind: vscode.QuickPickItemKind.Default,
            label: 'Last selected',
          })
        }

        const picked = await vscode.window.showQuickPick<SnippetWithMeta>(
          options,
          {
            placeHolder: 'Type to search...',
          },
        )

        if (picked) {
          let resolvedContent = picked.meta.contentValue

          if (!resolvedContent) {
            const preferences
              = vscode.workspace.getConfiguration('masscode-assistant')
            const configuredVaultPath = preferences.get<string>('vaultPath', '')
            const resolvedVaultPath = resolveVaultPath(configuredVaultPath)

            try {
              resolvedContent = await findSnippetInVault(
                resolvedVaultPath,
                picked.meta.snippetId,
                picked.meta.contentId,
              )
            }
            catch (error: unknown) {
              const err = error as any
              const errMsg
                = `massCode Assistant: Failed to resolve snippet content.\n`
                  + `Resolved Vault Path: ${resolvedVaultPath}\n`
                  + `Snippet ID: ${picked.meta.snippetId}\n`
                  + `Content ID: ${picked.meta.contentId}\n`
                  + `Error: ${err?.message || err}`
              logChannel?.appendLine(
                `[Error] [${new Date().toISOString()}] ${errMsg}`,
              )
              vscode.window.showErrorMessage(errMsg)
              return
            }
          }

          const editor = vscode.window.activeTextEditor
          if (editor) {
            await editor.edit((editBuilder) => {
              editBuilder.replace(editor.selection, resolvedContent)
            })
          }
          else {
            await vscode.env.clipboard.writeText(resolvedContent)
          }

          context.globalState.update(
            'masscode:last-selected',
            picked.meta.contentId,
          )
        }
      }
      catch (err) {
        logChannel?.appendLine(
          `[Error] [${new Date().toISOString()}] Search command failed: ${err instanceof Error ? err.stack || err.message : String(err)}`,
        )
        vscode.window.showErrorMessage(MESSAGES.ERROR)
      }
    },
  )

  const create = vscode.commands.registerCommand(
    'masscode-assistant.create',
    async () => {
      const preferences
        = vscode.workspace.getConfiguration('masscode-assistant')
      const isNotify = preferences.get('notify')

      const editor = vscode.window.activeTextEditor

      let content = ''

      let language = 'plain_text'

      if (editor) {
        const selection = editor.selection
        content = editor.document.getText(selection).trim()

        const languageId = editor.document.languageId
        const lower = languageId ? languageId.toLowerCase() : ''
        const map: Record<string, string> = {
          typescriptreact: 'typescript',
          javascriptreact: 'javascript',
          shellscript: 'shell',
          jsonc: 'json',
        }
        language = map[lower] || lower || 'plain_text'
      }

      if (content.length <= 1) {
        vscode.window.showErrorMessage(MESSAGES.NO_CONTENT)
        return
      }

      const name = await vscode.window.showInputBox()

      if (!name)
        return

      let folders
      try {
        folders = await getFolders()
      }
      catch (err) {
        logChannel?.appendLine(
          `[Error] [${new Date().toISOString()}] Failed to load folders: ${err instanceof Error ? err.stack || err.message : String(err)}`,
        )
        vscode.window.showErrorMessage(
          'Failed to load folders. Make sure massCode is running.',
        )
        return
      }

      const folderId = await showFolderPicker(folders)

      if (folderId === undefined)
        return

      const body: SnippetsAdd = {
        name,
        folderId,
      }

      try {
        const { id } = await addSnippet(body)

        if (id) {
          await addSnippetContent(id, {
            label: 'Fragment 1',
            value: content,
            language,
          })
        }

        if (isNotify) {
          vscode.window.showInformationMessage(MESSAGES.SUCCESS)
        }
      }
      catch (err) {
        logChannel?.appendLine(
          `[Error] [${new Date().toISOString()}] Create command failed: ${err instanceof Error ? err.stack || err.message : String(err)}`,
        )
        vscode.window.showErrorMessage(MESSAGES.ERROR)
      }
    },
  )

  context.subscriptions.push(search)
  context.subscriptions.push(create)
}

export function deactivate() {}
