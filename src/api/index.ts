import type { KyInstance } from 'ky'
import type { Snippet, SnippetContentsAdd, SnippetsAdd } from '../types/'
import ky from 'ky'
import * as vscode from 'vscode'

const apiCache = new Map<number, KyInstance>()

function getApiClient(): KyInstance {
  const port = vscode.workspace
    .getConfiguration('masscode-assistant')
    .get<number>('port', 4321)

  if (!apiCache.has(port)) {
    apiCache.set(
      port,
      ky.create({
        prefixUrl: `http://localhost:${port}`,
      }),
    )
  }

  return apiCache.get(port)!
}

vscode.workspace.onDidChangeConfiguration((e) => {
  if (e.affectsConfiguration('masscode-assistant.port')) {
    apiCache.clear()
  }
})

export function getSnippets() {
  return getApiClient()
    .get<Snippet[]>('snippets', { searchParams: { isDeleted: 0 } })
    .json()
}

export function addSnippet(body: SnippetsAdd) {
  return getApiClient().post<{ id: number }>('snippets', { json: body }).json()
}

export function addSnippetContent(snippetId: number, body: SnippetContentsAdd) {
  return getApiClient()
    .post<{ id: number }>(`snippets/${snippetId}/contents`, { json: body })
    .json()
}
