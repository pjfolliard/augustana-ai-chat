'use client'

import { useState } from 'react'
import { ChevronDownIcon, ChevronRightIcon, FolderIcon, PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline'
import { FolderUI, ChatUI } from '@/types'
import { ChatItem } from './chat-item'

interface FolderItemProps {
  folder: FolderUI
  chats: ChatUI[]
  depth?: number
  onCreateChat: (folderId: string) => void
  onRenameFolder: (folderId: string, newName: string) => void
  onDeleteFolder: (folderId: string) => void
  onMoveChat: (chatId: string, folderId?: string) => void
  onRenameChat: (chatId: string, newName: string) => void
  onDeleteChat: (chatId: string) => void
  onSelectChat: (chatId: string) => void
  selectedChatId?: string
}

export function FolderItem({
  folder,
  chats,
  depth = 0,
  onCreateChat,
  onRenameFolder,
  onDeleteFolder,
  onMoveChat,
  onRenameChat,
  onDeleteChat,
  onSelectChat,
  selectedChatId
}: FolderItemProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [isRenaming, setIsRenaming] = useState(false)
  const [newName, setNewName] = useState(folder.name)
  const [showActions, setShowActions] = useState(false)

  const handleRename = () => {
    if (newName.trim() && newName.trim() !== folder.name) {
      onRenameFolder(folder.id, newName.trim())
    }
    setIsRenaming(false)
    setNewName(folder.name)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRename()
    } else if (e.key === 'Escape') {
      setIsRenaming(false)
      setNewName(folder.name)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const chatId = e.dataTransfer.getData('text/plain')
    if (chatId) {
      onMoveChat(chatId, folder.id)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const folderChats = chats.filter(chat => chat.folderId === folder.id)

  return (
    <div className="select-none">
      <div
        className="flex items-center gap-2 px-2 py-1 hover:bg-gray-100 rounded cursor-pointer group"
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-0.5 hover:bg-gray-200 rounded"
        >
          {isExpanded ? (
            <ChevronDownIcon className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronRightIcon className="w-4 h-4 text-gray-500" />
          )}
        </button>

        <div className="w-4 h-4 flex items-center justify-center">
          <div
            className="w-3 h-3 rounded"
            style={{ backgroundColor: folder.color }}
          />
        </div>

        {isRenaming ? (
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={handleKeyPress}
            className="flex-1 px-1 py-0.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            autoFocus
          />
        ) : (
          <span className="flex-1 text-sm text-gray-700 truncate">
            {folder.name}
          </span>
        )}

        <span className="text-xs text-gray-400 ml-auto">
          {folderChats.length}
        </span>

        {showActions && !isRenaming && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onCreateChat(folder.id)
              }}
              className="p-1 hover:bg-gray-200 rounded"
              title="New chat"
            >
              <PlusIcon className="w-3 h-3 text-gray-500" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setIsRenaming(true)
              }}
              className="p-1 hover:bg-gray-200 rounded"
              title="Rename folder"
            >
              <PencilIcon className="w-3 h-3 text-gray-500" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                if (confirm(`Delete "${folder.name}" folder? Chats will be moved to the root level.`)) {
                  onDeleteFolder(folder.id)
                }
              }}
              className="p-1 hover:bg-gray-200 rounded"
              title="Delete folder"
            >
              <TrashIcon className="w-3 h-3 text-gray-500" />
            </button>
          </div>
        )}
      </div>

      {isExpanded && (
        <div>
          {/* Render chats in this folder */}
          {folderChats.map(chat => (
            <ChatItem
              key={chat.id}
              chat={chat}
              depth={depth + 1}
              onRename={onRenameChat}
              onDelete={onDeleteChat}
              onSelect={onSelectChat}
              isSelected={selectedChatId === chat.id}
            />
          ))}

          {/* Render child folders */}
          {folder.children?.map(childFolder => (
            <FolderItem
              key={childFolder.id}
              folder={childFolder}
              chats={chats}
              depth={depth + 1}
              onCreateChat={onCreateChat}
              onRenameFolder={onRenameFolder}
              onDeleteFolder={onDeleteFolder}
              onMoveChat={onMoveChat}
              onRenameChat={onRenameChat}
              onDeleteChat={onDeleteChat}
              onSelectChat={onSelectChat}
              selectedChatId={selectedChatId}
            />
          ))}
        </div>
      )}
    </div>
  )
}