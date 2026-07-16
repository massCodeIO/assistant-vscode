import type { Folder } from './types'
import * as vscode from 'vscode'

interface FolderQuickPickItem extends vscode.QuickPickItem {
  folderId?: number
  isSaveOption?: boolean
  isFolderOption?: boolean
}

export async function showFolderPicker(
  folders: Folder[],
): Promise<number | null | undefined> {
  const selection = await vscode.window.showQuickPick(
    [
      {
        label: '📦 Inbox',
        description: 'All snippets',
        id: 'inbox',
      },
      {
        label: '📁 Choose Folder...',
        id: 'choose_folder',
      },
    ],
    {
      placeHolder: 'Select destination',
    },
  )

  if (!selection) {
    return undefined
  }

  if (selection.id === 'inbox') {
    return null
  }

  // Show root folders
  return showRootFolderPicker(folders)
}

async function showRootFolderPicker(
  folders: Folder[],
): Promise<number | null | undefined> {
  const rootFolders = folders.filter(f => f.parentId === null)

  const items: FolderQuickPickItem[] = rootFolders.map(f => ({
    label: `📁 ${f.name}`,
    folderId: f.id,
    isFolderOption: true,
  }))

  const selected = await vscode.window.showQuickPick(items, {
    placeHolder: 'Choose Folder...',
  })

  if (!selected) {
    return undefined
  }

  return showFolderNavigation(folders, selected.folderId!)
}

async function showFolderNavigation(
  folders: Folder[],
  folderId: number,
): Promise<number | null | undefined> {
  const currentFolder = folders.find(f => f.id === folderId)
  if (!currentFolder) {
    return undefined
  }

  const children = folders.filter(f => f.parentId === folderId)

  const items: FolderQuickPickItem[] = [
    {
      label: `✔ Save in ${currentFolder.name}`,
      folderId: currentFolder.id,
      isSaveOption: true,
    },
  ]

  if (children.length > 0) {
    items.push({
      label: '',
      kind: vscode.QuickPickItemKind.Separator,
    })

    children.forEach((c) => {
      items.push({
        label: `📁 ${c.name}`,
        folderId: c.id,
        isFolderOption: true,
      })
    })
  }

  const selected = await vscode.window.showQuickPick(items, {
    placeHolder: `Save in ${currentFolder.name} or choose subfolder`,
  })

  if (!selected) {
    return undefined
  }

  if (selected.isSaveOption) {
    return selected.folderId!
  }

  if (selected.isFolderOption) {
    return showFolderNavigation(folders, selected.folderId!)
  }

  return undefined
}
