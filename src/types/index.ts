import type { QuickPickItem } from 'vscode'

export interface Snippet {
  id: number | string
  name: string
  description: string | null
  tags: {
    id: number | string
    name: string
  }[]
  folder: {
    id: number | string
    name: string
  } | null
  contents: {
    id: number | string
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
    snippetId: number | string
    contentId: number | string
    contentValue: string
  }
}

export interface SnippetsAdd {
  name: string
  folderId: number | string | null
}

export interface SnippetContentsAdd {
  label: string
  value: string | null
  language: string
}

export interface Folder {
  id: number | string
  name: string
  parentId: number | string | null
}
