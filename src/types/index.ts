import type { QuickPickItem } from 'vscode'

export interface Snippet {
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
  contents: {
    id: number
    label: string
    value: string | null
    language: string
  }[]
  isFavorites: number
  isDeleted: number
  createdAt: number
  updatedAt: number
}

export interface SnippetWithMeta extends QuickPickItem {
  meta: {
    snippedId: number
    contentId: number
    contentValue: string
  }
}

export interface SnippetsAdd {
  name: string
  folderId: number | null
}

export interface SnippetContentsAdd {
  label: string
  value: string | null
  language: string
}
