'use client'

import { useState } from 'react'
import { ChatBubbleLeftIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline'
import { ChatUI } from '@/types'

interface ChatItemProps {
  chat: ChatUI
  depth?: number
  onRename: (chatId: string, newName: string) => void
  onDelete: (chatId: string) => void
  onSelect: (chatId: string) => void
  isSelected?: boolean
}

export function ChatItem({
  chat,
  depth = 0,
  onRename,
  onDelete,
  onSelect,
  isSelected = false
}: ChatItemProps) {
  const [isRenaming, setIsRenaming] = useState(false)
  const [newName, setNewName] = useState(chat.title)
  const [showActions, setShowActions] = useState(false)

  const handleRename = () => {
    if (newName.trim() && newName.trim() !== chat.title) {
      onRename(chat.id, newName.trim())
    }
    setIsRenaming(false)
    setNewName(chat.title)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRename()
    } else if (e.key === 'Escape') {
      setIsRenaming(false)
      setNewName(chat.title)
    }
  }

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', chat.id)
  }

  const getTypeIcon = () => {
    switch (chat.type) {
      case 'search':
        return '🔍'
      case 'canvas':
        return '📝'
      case 'document':
        return '📄'
      default:
        return ''
    }
  }

  const formatLastMessage = () => {
    if (!chat.lastMessageAt) return ''
    
    const now = new Date()
    const lastMessage = chat.lastMessageAt
    const diffInHours = Math.abs(now.getTime() - lastMessage.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 24) {
      return lastMessage.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else if (diffInHours < 48) {
      return 'Yesterday'
    } else {
      return lastMessage.toLocaleDateString([], { month: 'short', day: 'numeric' })
    }
  }

  return (
    <div
      className={`flex items-center gap-2 px-2 py-2 rounded cursor-pointer group transition-colors ${
        isSelected
          ? 'bg-blue-100 text-blue-900'
          : 'hover:bg-gray-100 text-gray-700'
      }`}
      style={{ paddingLeft: `${depth * 12 + 24}px` }}
      onClick={() => !isRenaming && onSelect(chat.id)}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      draggable={!isRenaming}
      onDragStart={handleDragStart}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <ChatBubbleLeftIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
        
        {chat.type !== 'general' && (
          <span className="text-xs" title={chat.type}>
            {getTypeIcon()}
          </span>
        )}

        <div className="flex-1 min-w-0">
          {isRenaming ? (
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onBlur={handleRename}
              onKeyDown={handleKeyPress}
              className="w-full px-1 py-0.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <div>
              <div className="text-sm truncate font-medium">
                {chat.title}
              </div>
              {chat.messageCount > 0 && (
                <div className="text-xs text-gray-500 flex items-center gap-1">
                  <span>{chat.messageCount} messages</span>
                  {chat.lastMessageAt && (
                    <>
                      <span>•</span>
                      <span>{formatLastMessage()}</span>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        {chat.isPinned && (
          <span className="text-xs text-yellow-500" title="Pinned">
            📌
          </span>
        )}

        {showActions && !isRenaming && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation()
                setIsRenaming(true)
              }}
              className="p-1 hover:bg-gray-200 rounded transition-colors"
              title="Rename chat"
            >
              <PencilIcon className="w-3 h-3 text-gray-500" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                if (confirm(`Delete "${chat.title}"?`)) {
                  onDelete(chat.id)
                }
              }}
              className="p-1 hover:bg-gray-200 rounded transition-colors"
              title="Delete chat"
            >
              <TrashIcon className="w-3 h-3 text-gray-500" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}