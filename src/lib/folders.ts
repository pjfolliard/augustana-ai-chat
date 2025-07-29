import { Folder } from '@/types'

export async function getFolders(): Promise<Folder[]> {
  const response = await fetch('/api/folders')
  
  if (!response.ok) {
    const error = await response.text()
    console.error('Error fetching folders:', error)
    throw new Error(`Failed to fetch folders: ${response.status}`)
  }

  const { folders } = await response.json()
  
  return folders?.map((folder: any) => ({
    id: folder.id,
    name: folder.name,
    description: folder.description,
    parentId: folder.parent_id,
    color: folder.color,
    icon: folder.icon,
    sortOrder: folder.sort_order,
    isArchived: folder.is_archived,
    createdAt: new Date(folder.created_at),
    updatedAt: new Date(folder.updated_at)
  })) || []
}

export async function createFolder(name: string, parentId?: string, color: string = '#6B7280'): Promise<Folder> {
  const response = await fetch('/api/folders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, parentId, color, icon: 'folder' })
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('Error creating folder:', error)
    throw new Error(`Failed to create folder: ${response.status}`)
  }

  const { folder } = await response.json()

  return {
    id: folder.id,
    name: folder.name,
    description: folder.description,
    parentId: folder.parent_id,
    color: folder.color,
    icon: folder.icon,
    sortOrder: folder.sort_order,
    isArchived: folder.is_archived,
    createdAt: new Date(folder.created_at),
    updatedAt: new Date(folder.updated_at)
  }
}

export async function updateFolder(id: string, updates: Partial<Pick<Folder, 'name' | 'description' | 'color' | 'icon'>>): Promise<void> {
  const response = await fetch(`/api/folders/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('Error updating folder:', error)
    throw new Error(`Failed to update folder: ${response.status}`)
  }
}

export async function deleteFolder(id: string): Promise<void> {
  const response = await fetch(`/api/folders/${id}`, {
    method: 'DELETE'
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('Error deleting folder:', error)
    throw new Error(`Failed to delete folder: ${response.status}`)
  }
}

export async function moveFolderToParent(id: string, parentId?: string): Promise<void> {
  const response = await fetch(`/api/folders/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ parentId })
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('Error moving folder:', error)
    throw new Error(`Failed to move folder: ${response.status}`)
  }
}

export function buildFolderTree(folders: Folder[]): Folder[] {
  const folderMap = new Map<string, Folder>()
  const rootFolders: Folder[] = []

  // Create a map of folders and initialize children arrays
  folders.forEach(folder => {
    folderMap.set(folder.id, { ...folder, children: [] })
  })

  // Build the tree structure
  folders.forEach(folder => {
    const folderWithChildren = folderMap.get(folder.id)!
    
    if (folder.parentId) {
      const parent = folderMap.get(folder.parentId)
      if (parent) {
        parent.children!.push(folderWithChildren)
      } else {
        // Parent not found, treat as root
        rootFolders.push(folderWithChildren)
      }
    } else {
      rootFolders.push(folderWithChildren)
    }
  })

  return rootFolders
}