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

export function getSnippet(id: number) {
  return getApiClient().get(`snippets/${id}`).json<Snippet>()
}

export function addSnippet(body: SnippetsAdd) {
  return getApiClient().post('snippets', { json: body }).json<{ id: number }>()
}

export async function addSnippetContent(
  snippetId: number,
  body: SnippetContentsAdd,
) {
  const maxRetries = 5
  const delayMs = 1000
  const transientStatuses = [404, 408, 429, 500, 502, 503, 504]

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await getApiClient()
        .post(`snippets/${snippetId}/contents`, { json: body })
        .json<{ id: number }>()
    }
    catch (err: any) {
      const isTransient
        = err.name === 'HTTPError'
          && transientStatuses.includes(err.response?.status)
      if (isTransient && attempt < maxRetries) {
        console.warn(
          `Attempt ${attempt} to add snippet content failed. Retrying in ${delayMs}ms...`,
        )
        await new Promise(resolve => setTimeout(resolve, delayMs))
        continue
      }
      throw err
    }
  }
  throw new Error('Failed to add snippet content after max retries')
}

export function getFolders() {
  return getApiClient().get('folders').json<Folder[]>()
}
