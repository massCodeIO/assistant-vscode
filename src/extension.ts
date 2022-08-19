import * as vscode from 'vscode'
import axios from 'axios'
import type { Snippet } from './types'

export function activate (context: vscode.ExtensionContext) {
  const search = vscode.commands.registerCommand(
    'masscode-assistant.search',
    async () => {
      try {
        const { data } = await axios.get<Snippet[]>(
          'http://localhost:3033/snippets/embed-folder'
        )

        let options:vscode.QuickPickItem[] = []
        for (let snippet of data) {
          if (snippet.isDeleted) continue

          for (let fragment of snippet.content) {
            let fragmentLabel = ''
            if (snippet.content.length > 1) {
              fragmentLabel = fragment.label
            }
            options.push({
              label: `${snippet.name || ''}`,
              detail: `${fragmentLabel}`,
              description: `${fragment.language} • ${
                snippet.folder?.name || 'Inbox'
              }`
            })
          }
        }
        let fragmentContent = ''

        const picked = await vscode.window.showQuickPick(options, {
          placeHolder: 'Type to search...',
          onDidSelectItem (item: vscode.QuickPickItem) {
            const snippet = data.find(i => i.name === item.label)
            if (snippet) {
              if (snippet.content.length == 1) {
                fragmentContent = snippet.content[0].value
              }
              else {
              fragmentContent = snippet.content.
                find(i => i.label === item.detail)?.value || ''
              }
            } else {
              fragmentContent = ''
            }
          }
        })

        if (!picked) return

        if (fragmentContent.length) {
          vscode.env.clipboard.writeText(fragmentContent)
          vscode.commands.executeCommand('editor.action.clipboardPasteAction')
        }
      } catch (err) {
        vscode.window.showErrorMessage('massCode app is not running.')
      }
    }
  )

  const create = vscode.commands.registerCommand(
    'masscode-assistant.create',
    async () => {
      vscode.commands.executeCommand('editor.action.clipboardCopyAction')

      const preferences = vscode.workspace.getConfiguration('masscode-assistant')
      const isNotify = preferences.get('notify')

      const content = await vscode.env.clipboard.readText()
      content.trim()

      if (content.length <= 1) return

      const name = await vscode.window.showInputBox()
      const body: Partial<Snippet> = {}

      body.name = name
      body.content = [
        {
          label: 'Fragment 1',
          value: content,
          language: 'plain_text'
        }
      ]

      try {
        await axios.post('http://localhost:3033/snippets/create', body)

        if (isNotify) {
          vscode.window.showInformationMessage('Snippet successfully created')
        }
      } catch (err) {
        vscode.window.showErrorMessage('massCode app is not running.')
      }
    }
  )

  context.subscriptions.push(search)
  context.subscriptions.push(create)
}

export function deactivate () {}
