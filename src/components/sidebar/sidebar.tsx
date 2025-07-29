'use client'

import { useState, useEffect } from 'react'
import { PlusIcon, FolderPlusIcon } from '@heroicons/react/24/outline'
import { Folder, Chat } from '@/types'
import { FolderItem } from './folder-item'
import { ChatItem } from './chat-item'
import { getFolders, createFolder, updateFolder, deleteFolder, buildFolderTree } from '@/lib/folders'
import { getChats, createChat, updateChat, deleteChat, moveChat, getChatsByFolder } from '@/lib/chats'

interface SidebarProps {
  selectedChatId?: string
  onSelectChat: (chatId: string) => void
  onNewChat: () => void
}

export function Sidebar({ selectedChatId, onSelectChat, onNewChat }: SidebarProps) {
  const [folders, setFolders] = useState<Folder[]>([])
  const [chats, setChats] = useState<Chat[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = async () => {
    try {
      setLoading(true)
      const [foldersData, chatsData] = await Promise.all([
        getFolders(),
        getChats()
      ])
      
      const folderTree = buildFolderTree(foldersData)
      setFolders(folderTree)
      setChats(chatsData)
      setError(null)
    } catch (err) {
      console.error('Error loading sidebar data:', err)
      // Check if it's an authentication error
      if (err instanceof Error && err.message.includes('401')) {
        setError('Please log in to access your conversations')
      } else {
        setError('Failed to load folders and chats. Make sure you are logged in.')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleCreateFolder = async () => {
    try {
      const name = prompt('Enter folder name:')
      if (name?.trim()) {
        await createFolder(name.trim())
        await loadData()
      }
    } catch (err) {
      console.error('Error creating folder:', err)
      alert('Failed to create folder')
    }
  }

  const handleCreateChat = async (folderId?: string) => {
    try {
      const newChat = await createChat('New Chat', folderId)
      await loadData()
      onSelectChat(newChat.id)
    } catch (err) {
      console.error('Error creating chat:', err)
      alert('Failed to create chat')
    }
  }

  const handleRenameFolder = async (folderId: string, newName: string) => {
    try {
      await updateFolder(folderId, { name: newName })
      await loadData()
    } catch (err) {
      console.error('Error renaming folder:', err)
      alert('Failed to rename folder')
    }
  }

  const handleDeleteFolder = async (folderId: string) => {
    try {
      await deleteFolder(folderId)
      await loadData()
    } catch (err) {
      console.error('Error deleting folder:', err)
      alert('Failed to delete folder')
    }
  }

  const handleRenameChat = async (chatId: string, newName: string) => {
    try {
      await updateChat(chatId, { title: newName })
      await loadData()
    } catch (err) {
      console.error('Error renaming chat:', err)
      alert('Failed to rename chat')
    }
  }

  const handleDeleteChat = async (chatId: string) => {
    try {
      await deleteChat(chatId)
      await loadData()
      // If the deleted chat was selected, clear selection
      if (selectedChatId === chatId) {
        onNewChat()
      }
    } catch (err) {
      console.error('Error deleting chat:', err)
      alert('Failed to delete chat')
    }
  }

  const handleMoveChat = async (chatId: string, folderId?: string) => {
    try {
      await moveChat(chatId, folderId)
      await loadData()
    } catch (err) {
      console.error('Error moving chat:', err)
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
      <div className="w-64 bg-gray-50 border-r border-gray-200 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-64 bg-gray-50 border-r border-gray-200 flex items-center justify-center">
        <div className="text-red-500 text-sm p-4">
          {error}
          <button
            onClick={loadData}
            className="block mt-2 text-blue-500 hover:underline"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col h-full">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Conversations</h2>
          <div className="flex gap-1">
            <button
              onClick={() => handleCreateChat()}
              className="p-1.5 hover:bg-gray-200 rounded"
              title="New chat"
            >
              <PlusIcon className="w-4 h-4 text-gray-600" />
            </button>
            <button
              onClick={handleCreateFolder}
              className="p-1.5 hover:bg-gray-200 rounded"
              title="New folder"
            >
              <FolderPlusIcon className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>
      </div>

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
            onCreateChat={handleCreateChat}
            onRenameFolder={handleRenameFolder}
            onDeleteFolder={handleDeleteFolder}
            onMoveChat={handleMoveChat}
            onRenameChat={handleRenameChat}
            onDeleteChat={handleDeleteChat}
            onSelectChat={onSelectChat}
            selectedChatId={selectedChatId}
          />
        ))}

        {folders.length === 0 && rootChats.length === 0 && (
          <div className="text-center py-8 text-gray-500 text-sm">
            <p className="mb-2">No conversations yet</p>
            <button
              onClick={() => handleCreateChat()}
              className="text-blue-500 hover:underline"
            >
              Start your first chat
            </button>
          </div>
        )}
      </div>
    </div>
  )
}