import type { KyInstance } from 'ky'
import type { Snippet, SnippetListItem } from '../types/'
import ky, { HTTPError } from 'ky'
import * as vscode from 'vscode'
import { MESSAGES } from '../contants'

let apiClient: KyInstance | undefined

function getApiClient(): KyInstance {
  if (!apiClient) {
    const config = vscode.workspace.getConfiguration('masscode-assistant')
    const port = config.get<number>('port', 4321)
    const token = config.get<string>('token', '').trim()

    apiClient = ky.create({
      prefixUrl: `http://127.0.0.1:${port}`,
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    })
  }

  return apiClient
}

vscode.workspace.onDidChangeConfiguration((e) => {
  if (
    e.affectsConfiguration('masscode-assistant.port')
    || e.affectsConfiguration('masscode-assistant.token')
  ) {
    apiClient = undefined
  }
})

export async function getErrorMessage(err: unknown): Promise<string> {
  if (!(err instanceof HTTPError)) {
    return MESSAGES.ERROR
  }

  const { status } = err.response

  if (status === 401) {
    return MESSAGES.UNAUTHORIZED
  }

  // Тело может быть уже прочитано или не быть JSON, тогда показываем статус
  const body = await err.response.json().catch(() => null)

  if (typeof body?.message === 'string' && body.message) {
    return body.message
  }

  return MESSAGES.API_ERROR(status)
}

// Список приходит без value фрагментов, тело отдаёт только GET /snippets/:id
export function getSnippets() {
  return getApiClient()
    .get<SnippetListItem[]>('snippets', { searchParams: { isDeleted: 0 } })
    .json()
}

export function getSnippet(id: number) {
  return getApiClient().get<Snippet>(`snippets/${id}`).json()
}

// Сервер сам делает имя уникальным, кладёт сниппет в Inbox и обновляет UI
export function createSnippet(name: string, text: string) {
  return getApiClient()
    .post<{ id: number, target: 'code' }>('captures', {
      json: { target: 'code', name, text, language: 'plain_text' },
    })
    .json()
}
