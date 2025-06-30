import type { SnippetsAdd, SnippetWithMeta } from './types'
import * as vscode from 'vscode'
import { addSnippet, addSnippetContent, getSnippets } from './api'
import { MESSAGES } from './contants'

export function activate(context: vscode.ExtensionContext) {
  const search = vscode.commands.registerCommand(
    'masscode-assistant.search',
    async () => {
      try {
        const data = await getSnippets()

        const lastSelectedId = context.globalState.get('masscode:last-selected')

        const options = data.reduce((acc: SnippetWithMeta[], snippet) => {
          snippet.contents.forEach((content) => {
            acc.push({
              label: snippet.name,
              detail: `${content.label} • ${content.language}`,
              description: `${snippet.folder?.name || 'Inbox'}`,
              picked: lastSelectedId === content.id,
              meta: {
                snippedId: snippet.id,
                contentId: content.id,
                contentValue: content.value || '',
              },
            })
          })
          return acc
        }, [])

        const latestPicked = options.find(i => i.picked)

        if (latestPicked) {
          options.sort(i => (i.picked ? -1 : 1))
          options.unshift({
            ...latestPicked,
            kind: -1,
            label: 'Last selected',
          })
        }

        const picked = await vscode.window.showQuickPick(options, {
          placeHolder: 'Type to search...',
        })

        if (picked) {
          vscode.env.clipboard.writeText(picked.meta.contentValue)
          vscode.commands.executeCommand('editor.action.clipboardPasteAction')
          context.globalState.update(
            'masscode:last-selected',
            picked.meta.contentId,
          )
        }
      }
      catch (err) {
        console.error(err)
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

      if (editor) {
        const selection = editor.selection
        content = editor.document.getText(selection).trim()
      }

      if (content.length <= 1) {
        vscode.window.showErrorMessage(MESSAGES.NO_CONTENT)
        return
      }

      const name = await vscode.window.showInputBox()

      if (!name)
        return

      const body: SnippetsAdd = {
        name,
        folderId: null,
      }

      try {
        const { id } = await addSnippet(body)

        if (id) {
          await addSnippetContent(id, {
            label: 'Fragment 1',
            value: content,
            language: 'plain_text',
          })
        }

        if (isNotify) {
          vscode.window.showInformationMessage(MESSAGES.SUCCESS)
        }
      }
      catch (err) {
        console.error(err)
        vscode.window.showErrorMessage(MESSAGES.ERROR)
      }
    },
  )

  context.subscriptions.push(search)
  context.subscriptions.push(create)
}

export function deactivate() {}
