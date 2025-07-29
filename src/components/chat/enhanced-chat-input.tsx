'use client'

import { useState, useRef, useEffect } from 'react'
import { PaperAirplaneIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { FileAttachment } from '@/types'
import { FileUpload } from './file-upload'
import { SearchButton } from './search-button'
import { CanvasButton } from './canvas-button'
import { FilePreview } from './file-preview'

interface EnhancedChatInputProps {
  onSendMessage: (content: string, files?: FileAttachment[], searchMode?: boolean, canvasMode?: boolean) => void
  isLoading?: boolean
  disabled?: boolean
}

export function EnhancedChatInput({ 
  onSendMessage, 
  isLoading = false, 
  disabled = false 
}: EnhancedChatInputProps) {
  const [inputValue, setInputValue] = useState('')
  const [files, setFiles] = useState<FileAttachment[]>([])
  const [searchMode, setSearchMode] = useState(false)
  const [canvasMode, setCanvasMode] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px'
    }
  }, [inputValue])

  const handleSend = () => {
    if ((!inputValue.trim() && files.length === 0) || isLoading || disabled) return

    onSendMessage(inputValue.trim(), files, searchMode, canvasMode)
    
    // Reset form
    setInputValue('')
    setFiles([])
    setSearchMode(false)
    setCanvasMode(false)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleFilesSelected = (newFiles: FileAttachment[]) => {
    setFiles(prev => [...prev, ...newFiles])
  }

  const handleRemoveFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId))
  }

  const toggleSearchMode = () => {
    setSearchMode(prev => !prev)
    if (canvasMode) setCanvasMode(false) // Only one mode at a time
  }

  const toggleCanvasMode = () => {
    setCanvasMode(prev => !prev)
    if (searchMode) setSearchMode(false) // Only one mode at a time
  }

  const getPlaceholderText = () => {
    if (canvasMode) return "Describe what you want to create or edit..."
    if (searchMode) return "Ask a question and I'll search the web for current information..."
    return "Type your message..."
  }

  const getModeIndicator = () => {
    if (canvasMode) return "🎨 Canvas Mode"
    if (searchMode) return "🔍 Search Mode"
    return null
  }

  return (
    <div className="border-t border-gray-200 bg-white">
      {/* Mode indicator */}
      {(searchMode || canvasMode) && (
        <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              {getModeIndicator()}
            </span>
            <button
              onClick={() => {
                setSearchMode(false)
                setCanvasMode(false)
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {canvasMode && "AI will create structured, editable content perfect for documents and iteration."}
            {searchMode && "AI will search the web for current information to answer your question."}
          </div>
        </div>
      )}

      {/* File previews */}
      {files.length > 0 && (
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <div className="flex flex-wrap gap-2">
            {files.map((file) => (
              <FilePreview
                key={file.id}
                file={file}
                onRemove={() => handleRemoveFile(file.id!)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="p-4">
        <div className="flex items-end space-x-3">
          {/* Action buttons */}
          <div className="flex items-center space-x-1">
            <FileUpload
              onFilesSelected={handleFilesSelected}
              disabled={isLoading || disabled}
            />
            <SearchButton
              onSearch={toggleSearchMode}
              disabled={isLoading || disabled}
              isActive={searchMode}
            />
            <CanvasButton
              onCanvas={toggleCanvasMode}
              disabled={isLoading || disabled}
              isActive={canvasMode}
            />
          </div>

          {/* Text input */}
          <div className="flex-1">
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={getPlaceholderText()}
              disabled={isLoading || disabled}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              rows={1}
              style={{
                minHeight: '44px',
                maxHeight: '120px'
              }}
            />
          </div>

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={(!inputValue.trim() && files.length === 0) || isLoading || disabled}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center min-w-[44px]"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <PaperAirplaneIcon className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Helper text */}
        {!searchMode && !canvasMode && (
          <div className="mt-2 text-xs text-gray-500">
            Press Enter to send, Shift+Enter for new line. Attach files, search the web, or use canvas mode.
          </div>
        )}
      </div>
    </div>
  )
}