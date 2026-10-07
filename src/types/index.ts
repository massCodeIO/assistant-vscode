import type { QuickPickItem } from 'vscode'

interface SnippetBase {
  id: number
  name: string
  description: string | null
  tags: {
    id: number
    name: string
  }[]
  folder: {
    id: number
    name: string
  } | null
  isFavorites: number
  isDeleted: number
  createdAt: number
  updatedAt: number
}

// GET /snippets отдаёт фрагменты без value
export interface SnippetListItem extends SnippetBase {
  contents: {
    id: number
    label: string
    language: string
  }[]
}

export interface Snippet extends SnippetBase {
  contents: {
    id: number
    label: string
    // null, если содержимое недоступно (например, файл ещё не скачан из облака)
    value: string | null
    language: string
  }[]
}

export interface SnippetWithMeta extends QuickPickItem {
  meta: {
    snippetId: number
    contentId: number
  }
}
