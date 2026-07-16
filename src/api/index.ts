import type { KyInstance } from 'ky'
import type {
  Folder,
  Snippet,
  SnippetContentsAdd,
  SnippetsAdd,
} from '../types/'
import ky from 'ky'
import * as vscode from 'vscode'
import { log } from '../logger'
import { loadSnippetsFromVault, resolveVaultPath } from '../vault'

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

export async function loadSnippets(): Promise<Snippet[]> {
  log('Loading snippets from API...')
  try {
    const snippets = await getSnippets()
    log('Successfully loaded snippets from API')
    return snippets.filter(s => s.isDeleted === 0)
  }
  catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err))
    log(`Failed to load snippets from API: ${error.message}`, 'Error')
    log('Falling back to Markdown Vault...')

    const preferences = vscode.workspace.getConfiguration('masscode-assistant')
    const configuredVaultPath = preferences.get<string>('vaultPath', '')
    const resolvedVaultPath = resolveVaultPath(configuredVaultPath)

    try {
      const snippets = await loadSnippetsFromVault(resolvedVaultPath)
      log(
        `Successfully scanned Markdown Vault. Found ${snippets.length} snippets.`,
      )
      return snippets.filter(s => s.isDeleted === 0)
    }
    catch (vaultErr: unknown) {
      const vError
        = vaultErr instanceof Error ? vaultErr : new Error(String(vaultErr))
      log(
        `Failed to load snippets from Markdown Vault: ${vError.message}`,
        'Error',
      )
      throw vError
    }
  }
}

export function addSnippet(body: SnippetsAdd) {
  return getApiClient()
    .post('snippets', { json: body })
    .json<{ id: number | string }>()
}

export function addSnippetContent(
  snippetId: number | string,
  body: SnippetContentsAdd,
) {
  return getApiClient()
    .post(`snippets/${snippetId}/contents`, { json: body })
    .json<{ id: number | string }>()
}

export function getFolders() {
  return getApiClient().get('folders').json<Folder[]>()
}
