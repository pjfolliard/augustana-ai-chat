import { Chat } from '@/types'

export async function getChats(folderId?: string): Promise<Chat[]> {
  const url = folderId !== undefined ? `/api/chats?folderId=${folderId}` : '/api/chats'
  const response = await fetch(url)

  if (!response.ok) {
    const error = await response.text()
    console.error('Error fetching chats:', error)
    throw new Error(`Failed to fetch chats: ${response.status}`)
  }

  const { chats } = await response.json()

  return chats?.map((chat: any) => ({
    id: chat.id,
    title: chat.title,
    description: chat.description,
    folderId: chat.folder_id,
    type: chat.type,
    isPinned: chat.is_pinned,
    isArchived: chat.is_archived,
    isShared: chat.is_shared,
    shareToken: chat.share_token,
    messageCount: chat.message_count,
    lastMessageAt: chat.last_message_at ? new Date(chat.last_message_at) : undefined,
    createdAt: new Date(chat.created_at),
    updatedAt: new Date(chat.updated_at)
  })) || []
}

export async function createChat(title: string = 'New Chat', folderId?: string, type: 'general' | 'search' | 'canvas' | 'document' = 'general'): Promise<Chat> {
  const response = await fetch('/api/chats', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, folderId, type })
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('Error creating chat:', error)
    throw new Error(`Failed to create chat: ${response.status}`)
  }

  const { chat } = await response.json()

  return {
    id: chat.id,
    title: chat.title,
    description: chat.description,
    folderId: chat.folder_id,
    type: chat.type,
    isPinned: chat.is_pinned,
    isArchived: chat.is_archived,
    isShared: chat.is_shared,
    shareToken: chat.share_token,
    messageCount: chat.message_count,
    lastMessageAt: chat.last_message_at ? new Date(chat.last_message_at) : undefined,
    createdAt: new Date(chat.created_at),
    updatedAt: new Date(chat.updated_at)
  }
}

export async function updateChat(id: string, updates: Partial<Pick<Chat, 'title' | 'description' | 'isPinned'>>): Promise<void> {
  const response = await fetch(`/api/chats/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('Error updating chat:', error)
    throw new Error(`Failed to update chat: ${response.status}`)
  }
}

export async function moveChat(chatId: string, folderId?: string): Promise<void> {
  const response = await fetch(`/api/chats/${chatId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ folderId })
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('Error moving chat:', error)
    throw new Error(`Failed to move chat: ${response.status}`)
  }
}

export async function deleteChat(id: string): Promise<void> {
  const response = await fetch(`/api/chats/${id}`, {
    method: 'DELETE'
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('Error deleting chat:', error)
    throw new Error(`Failed to delete chat: ${response.status}`)
  }
}

export async function getChatsByFolder(): Promise<Record<string, Chat[]>> {
  const response = await fetch('/api/chats')

  if (!response.ok) {
    const error = await response.text()
    console.error('Error fetching chats by folder:', error)
    throw new Error(`Failed to fetch chats: ${response.status}`)
  }

  const { chats } = await response.json()

  const chatsMapped = chats?.map((chat: any) => ({
    id: chat.id,
    title: chat.title,
    description: chat.description,
    folderId: chat.folder_id,
    type: chat.type,
    isPinned: chat.is_pinned,
    isArchived: chat.is_archived,
    isShared: chat.is_shared,
    shareToken: chat.share_token,
    messageCount: chat.message_count,
    lastMessageAt: chat.last_message_at ? new Date(chat.last_message_at) : undefined,
    createdAt: new Date(chat.created_at),
    updatedAt: new Date(chat.updated_at)
  })) || []

  // Group chats by folder
  const chatsByFolder: Record<string, Chat[]> = {}
  
  chatsMapped.forEach((chat: Chat) => {
    const key = chat.folderId || 'root'
    if (!chatsByFolder[key]) {
      chatsByFolder[key] = []
    }
    chatsByFolder[key].push(chat)
  })

  return chatsByFolder
}