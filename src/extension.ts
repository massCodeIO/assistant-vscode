import type { SnippetWithMeta } from './types'
import * as vscode from 'vscode'
import { createSnippet, getErrorMessage, getSnippet, getSnippets } from './api'
import { MESSAGES } from './contants'

async function showError(err: unknown) {
  console.error(err)
  const message = await getErrorMessage(err)

  if (message !== MESSAGES.UNAUTHORIZED) {
    vscode.window.showErrorMessage(message)
    return
  }

  const action = await vscode.window.showErrorMessage(
    message,
    MESSAGES.SET_TOKEN,
  )

  if (action === MESSAGES.SET_TOKEN)
    vscode.commands.executeCommand('masscode-assistant.setToken')
}

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
                snippetId: snippet.id,
                contentId: content.id,
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
          const snippet = await getSnippet(picked.meta.snippetId)
          const value = snippet.contents.find(
            i => i.id === picked.meta.contentId,
          )?.value

          // Пустая строка валидна, недоступен только отсутствующий фрагмент или null
          if (value === undefined || value === null) {
            vscode.window.showErrorMessage(MESSAGES.CONTENT_UNAVAILABLE)
            return
          }

          await vscode.env.clipboard.writeText(value)
          vscode.commands.executeCommand('editor.action.clipboardPasteAction')
          context.globalState.update(
            'masscode:last-selected',
            picked.meta.contentId,
          )
        }
      }
      catch (err) {
        await showError(err)
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

      try {
        await createSnippet(name, content)

        if (isNotify) {
          vscode.window.showInformationMessage(MESSAGES.SUCCESS)
        }
      }
      catch (err) {
        await showError(err)
      }
    },
  )

  const setToken = vscode.commands.registerCommand(
    'masscode-assistant.setToken',
    async () => {
      const token = await vscode.window.showInputBox({
        prompt: MESSAGES.TOKEN_PROMPT,
        placeHolder: 'mc_...',
        password: true,
        ignoreFocusOut: true,
      })

      if (!token?.trim())
        return

      await vscode.workspace
        .getConfiguration('masscode-assistant')
        .update('token', token.trim(), vscode.ConfigurationTarget.Global)

      vscode.window.showInformationMessage(MESSAGES.TOKEN_SAVED)
    },
  )

  context.subscriptions.push(search)
  context.subscriptions.push(create)
  context.subscriptions.push(setToken)
}

export function deactivate() {}
