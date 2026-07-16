import type { KyInstance } from 'ky'
import type {
  Folder,
  Snippet,
  SnippetContentsAdd,
  SnippetsAdd,
} from '../types/'
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
    .get('snippets', { searchParams: { isDeleted: 0 } })
    .json<Snippet[]>()
}

export function addSnippet(body: SnippetsAdd) {
  return getApiClient().post('snippets', { json: body }).json<{ id: number }>()
}

export function addSnippetContent(snippetId: number, body: SnippetContentsAdd) {
  return getApiClient()
    .post(`snippets/${snippetId}/contents`, { json: body })
    .json<{ id: number }>()
}

export function getFolders() {
  return getApiClient().get('folders').json<Folder[]>()
}
