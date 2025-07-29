'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { FileUpload } from './file-upload'
import { FilePreview } from './file-preview'
import { SearchButton } from './search-button'
import { CanvasButton } from './canvas-button'
import { FileAttachment } from '@/types'

interface ChatInputProps {
  onSendMessage: (message: string, files?: FileAttachment[], searchMode?: boolean, canvasMode?: boolean) => void
  isLoading?: boolean
  onCanvasToggle?: () => void
  canvasMode?: boolean
}

export function ChatInput({ onSendMessage, isLoading, onCanvasToggle, canvasMode }: ChatInputProps) {
  const [message, setMessage] = useState('')
  const [attachedFiles, setAttachedFiles] = useState<FileAttachment[]>([])
  const [searchMode, setSearchMode] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if ((message.trim() || attachedFiles.length > 0) && !isLoading) {
      onSendMessage(message.trim(), attachedFiles, searchMode, canvasMode)
      setMessage('')
      setAttachedFiles([])
      setSearchMode(false) // Reset search mode after sending
      // Note: Canvas mode doesn't reset automatically like search mode
    }
  }

  const handleFilesSelected = (files: FileAttachment[]) => {
    setAttachedFiles(prev => [...prev, ...files])
  }

  const handleRemoveFile = (fileId: string) => {
    setAttachedFiles(prev => prev.filter(f => f.id !== fileId))
  }

  const handleSearchClick = () => {
    setSearchMode(prev => !prev)
  }

  return (
    <div className="border-t bg-white">
      <FilePreview files={attachedFiles} onRemove={handleRemoveFile} />
      {searchMode && (
        <div className="px-4 py-2 bg-green-50 border-b border-green-200 text-green-800 text-sm flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span>Search mode active - Your message will search the web</span>
        </div>
      )}
      {canvasMode && (
        <div className="px-4 py-2 bg-purple-50 border-b border-purple-200 text-purple-800 text-sm flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span>Canvas mode active - Responses will open in an editable panel</span>
        </div>
      )}
      <form onSubmit={handleSubmit} className="flex gap-2 p-4">
        <FileUpload 
          onFilesSelected={handleFilesSelected}
          disabled={isLoading}
        />
        <SearchButton 
          onSearch={handleSearchClick}
          disabled={isLoading}
          isActive={searchMode}
        />
        <CanvasButton 
          onCanvas={onCanvasToggle || (() => {})}
          disabled={isLoading}
          isActive={canvasMode}
        />
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={
            searchMode 
              ? "Enter your search query..." 
              : canvasMode 
              ? "Ask for content creation (essays, documents, code, etc.)..."
              : "Type your message..."
          }
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isLoading}
          autoComplete="off"
        />
        <Button type="submit" disabled={(!message.trim() && attachedFiles.length === 0) || isLoading}>
          {isLoading ? 'Sending...' : 'Send'}
        </Button>
      </form>
    </div>
  )
}