'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  ChevronDownIcon, 
  ChevronRightIcon, 
  FolderIcon, 
  PlusIcon,
  FolderPlusIcon,
  ChatBubbleLeftIcon
} from '@heroicons/react/24/outline'
import { FolderUI, ChatUI } from '@/types'
import { FolderItem } from './folder-item'
import { ChatItem } from './chat-item'
import { useAuth } from '@/components/auth/auth-provider'

interface FolderTreeProps {
  selectedChatId?: string
  onSelectChat: (chatId: string) => void
  onNewChat: () => void
  className?: string
}

export function FolderTree({ 
  selectedChatId, 
  onSelectChat, 
  onNewChat,
  className = '' 
}: FolderTreeProps) {
  const [folders, setFolders] = useState<FolderUI[]>([])
  const [chats, setChats] = useState<ChatUI[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()

  const loadData = useCallback(async () => {
    if (!user) {
      setFolders([])
      setChats([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const [foldersResponse, chatsResponse] = await Promise.all([
        fetch('/api/folders'),
        fetch('/api/chats')
      ])

      if (!foldersResponse.ok) {
        throw new Error(`Failed to fetch folders: ${foldersResponse.status}`)
      }

      if (!chatsResponse.ok) {
        throw new Error(`Failed to fetch chats: ${chatsResponse.status}`)
      }

      const foldersData = await foldersResponse.json()
      const chatsData = await chatsResponse.json()

      // Convert database types to UI types
      const foldersUI: FolderUI[] = foldersData.folders?.map((folder: any) => ({
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

      const chatsUI: ChatUI[] = chatsData.chats?.map((chat: any) => ({
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

      // Build folder tree
      const folderTree = buildFolderTree(foldersUI)
      setFolders(folderTree)
      setChats(chatsUI)
    } catch (err) {
      console.error('Error loading folder tree data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    loadData()
  }, [loadData])

  const buildFolderTree = (folders: FolderUI[]): FolderUI[] => {
    const folderMap = new Map<string, FolderUI>()
    const rootFolders: FolderUI[] = []

    // Create map and initialize children arrays
    folders.forEach(folder => {
      folderMap.set(folder.id, { ...folder, children: [] })
    })

    // Build tree structure
    folders.forEach(folder => {
      const folderWithChildren = folderMap.get(folder.id)!
      
      if (folder.parentId) {
        const parent = folderMap.get(folder.parentId)
        if (parent) {
          parent.children!.push(folderWithChildren)
        } else {
          rootFolders.push(folderWithChildren)
        }
      } else {
        rootFolders.push(folderWithChildren)
      }
    })

    return rootFolders.sort((a, b) => a.sortOrder - b.sortOrder)
  }

  const handleCreateFolder = async (name: string, parentId?: string) => {
    try {
      const response = await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, parentId })
      })

      if (!response.ok) {
        throw new Error('Failed to create folder')
      }

      await loadData()
    } catch (error) {
      console.error('Error creating folder:', error)
      alert('Failed to create folder')
    }
  }

  const handleCreateChat = async (title: string, folderId?: string) => {
    try {
      const response = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, folderId })
      })

      if (!response.ok) {
        let errorData
        try {
          errorData = await response.json()
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError)
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        
        console.error('Chat creation failed:', errorData)
        console.error('Response status:', response.status, response.statusText)
        
        const errorMessage = errorData?.details || errorData?.error || `HTTP ${response.status}: ${response.statusText}`
        throw new Error(errorMessage)
      }

      const { chat } = await response.json()
      await loadData()
      onSelectChat(chat.id)
    } catch (error) {
      console.error('Error creating chat:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to create chat'
      alert(`Error: ${errorMessage}`)
    }
  }

  const handleRenameFolder = async (folderId: string, newName: string) => {
    try {
      const response = await fetch(`/api/folders/${folderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName })
      })

      if (!response.ok) {
        throw new Error('Failed to rename folder')
      }

      await loadData()
    } catch (error) {
      console.error('Error renaming folder:', error)
      alert('Failed to rename folder')
    }
  }

  const handleDeleteFolder = async (folderId: string) => {
    try {
      const response = await fetch(`/api/folders/${folderId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete folder')
      }

      await loadData()
    } catch (error) {
      console.error('Error deleting folder:', error)
      alert('Failed to delete folder')
    }
  }

  const handleRenameChat = async (chatId: string, newTitle: string) => {
    try {
      const response = await fetch(`/api/chats/${chatId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle })
      })

      if (!response.ok) {
        throw new Error('Failed to rename chat')
      }

      await loadData()
    } catch (error) {
      console.error('Error renaming chat:', error)
      alert('Failed to rename chat')
    }
  }

  const handleDeleteChat = async (chatId: string) => {
    try {
      const response = await fetch(`/api/chats/${chatId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete chat')
      }

      await loadData()
      
      if (selectedChatId === chatId) {
        onNewChat()
      }
    } catch (error) {
      console.error('Error deleting chat:', error)
      alert('Failed to delete chat')
    }
  }

  const handleMoveChat = async (chatId: string, folderId?: string) => {
    try {
      const response = await fetch(`/api/chats/${chatId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId })
      })

      if (!response.ok) {
        throw new Error('Failed to move chat')
      }

      await loadData()
    } catch (error) {
      console.error('Error moving chat:', error)
      alert('Failed to move chat')
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const chatId = e.dataTransfer.getData('text/plain')
    if (chatId) {
      handleMoveChat(chatId, undefined) // Move to root level
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  // Get chats that are not in any folder (root level)
  const rootChats = chats.filter(chat => !chat.folderId)

  if (loading) {
    return (
      <div className={`flex items-center justify-center py-8 ${className}`}>
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="text-red-600 text-sm text-center">
          {error}
          <button
            onClick={loadData}
            className="block mt-2 text-blue-600 hover:underline"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h2 className="font-semibold text-gray-900">Conversations</h2>
        <div className="flex gap-1">
          <button
            onClick={() => handleCreateChat('New Chat')}
            className="p-1.5 hover:bg-gray-200 rounded transition-colors"
            title="New chat"
          >
            <PlusIcon className="w-4 h-4 text-gray-600" />
          </button>
          <button
            onClick={() => {
              const name = prompt('Enter folder name:')
              if (name?.trim()) {
                handleCreateFolder(name.trim())
              }
            }}
            className="p-1.5 hover:bg-gray-200 rounded transition-colors"
            title="New folder"
          >
            <FolderPlusIcon className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div
        className="flex-1 overflow-y-auto p-2"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        {/* Root level chats */}
        {rootChats.map(chat => (
          <ChatItem
            key={chat.id}
            chat={chat}
            onRename={handleRenameChat}
            onDelete={handleDeleteChat}
            onSelect={onSelectChat}
            isSelected={selectedChatId === chat.id}
          />
        ))}

        {/* Folders */}
        {folders.map(folder => (
          <FolderItem
            key={folder.id}
            folder={folder}
            chats={chats}
            onCreateChat={(folderId) => {
              const title = `New Chat`
              handleCreateChat(title, folderId)
            }}
            onRenameFolder={handleRenameFolder}
            onDeleteFolder={handleDeleteFolder}
            onMoveChat={handleMoveChat}
            onRenameChat={handleRenameChat}
            onDeleteChat={handleDeleteChat}
            onSelectChat={onSelectChat}
            selectedChatId={selectedChatId}
          />
        ))}

        {/* Empty state */}
        {folders.length === 0 && rootChats.length === 0 && (
          <div className="text-center py-8 text-gray-500 text-sm">
            <ChatBubbleLeftIcon className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p className="mb-2">No conversations yet</p>
            <button
              onClick={() => handleCreateChat('New Chat')}
              className="text-blue-600 hover:underline"
            >
              Start your first chat
            </button>
          </div>
        )}
      </div>
    </div>
  )
}