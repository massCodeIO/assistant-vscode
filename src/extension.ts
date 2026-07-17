import type { SnippetsAdd, SnippetWithMeta } from './types'
import * as vscode from 'vscode'
import {
  addSnippet,
  addSnippetContent,
  getFolders,
  getSnippet,
  getSnippets,
} from './api'
import { MESSAGES } from './contants'
import { showFolderPicker } from './folderPicker'

export function activate(context: vscode.ExtensionContext) {
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
          const snippetDetails = await getSnippet(picked.meta.snippetId)
          const content = snippetDetails.contents.find(
            c => c.id === picked.meta.contentId,
          )
          const resolvedContent = content?.value || ''

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
        console.error(err)
        await handleApiError(err, MESSAGES.ERROR)
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
        console.error(err)
        await handleApiError(
          err,
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
        console.error(err)
        await handleApiError(err, MESSAGES.ERROR)
      }
    },
  )

  context.subscriptions.push(search)
  context.subscriptions.push(create)
}

export function deactivate() {}

async function handleApiError(err: any, defaultMsg: string) {
  if (err && (err.name === 'HTTPError' || err.response)) {
    let details = ''
    try {
      const response = err.response.clone()
      const body = await response.json()
      details
        = body?.message || body?.error || (typeof body === 'string' ? body : '')
    }
    catch {
      try {
        const response = err.response.clone()
        details = await response.text()
      }
      catch {}
    }
    const suffix = details ? `: ${details}` : ''
    vscode.window.showErrorMessage(
      `massCode API Error (${err.response.status} ${err.response.statusText})${suffix}`,
    )
  }
  else {
    vscode.window.showErrorMessage(defaultMsg)
  }
}
