'use client'

import { useState, useRef } from 'react'
import { FileAttachment } from '@/types'

interface FileUploadProps {
  onFilesSelected: (files: FileAttachment[]) => void
  disabled?: boolean
}

export function FileUpload({ onFilesSelected, disabled }: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (files: FileList) => {
    const fileAttachments: FileAttachment[] = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      
      // Limit file size to 10MB
      if (file.size > 10 * 1024 * 1024) {
        alert(`File ${file.name} is too large. Max size is 10MB.`)
        continue
      }

      // Read file content based on type
      let content = ''
      
      if (file.type.startsWith('image/')) {
        content = await readImageFile(file)
      } else if (
        file.type === 'application/pdf' ||
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        file.type === 'application/msword' ||
        file.name.endsWith('.pdf') ||
        file.name.endsWith('.docx') ||
        file.name.endsWith('.doc')
      ) {
        // Parse complex documents using server-side API
        content = await parseComplexDocument(file)
      } else if (file.type.startsWith('text/') || file.type === 'application/json') {
        content = await readTextFile(file)
      } else {
        content = `[${file.type} file - ${file.size} bytes]`
      }

      console.log('File processed:', { 
        name: file.name, 
        type: file.type, 
        size: file.size, 
        contentLength: content.length,
        contentPreview: content.substring(0, 100)
      })

      fileAttachments.push({
        id: Date.now().toString() + i,
        name: file.name,
        type: file.type,
        size: file.size,
        content
      })
    }

    onFilesSelected(fileAttachments)
  }

  const readTextFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target?.result as string)
      reader.onerror = reject
      reader.readAsText(file)
    })
  }

  const readImageFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target?.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const parseComplexDocument = async (file: File): Promise<string> => {
    try {
      console.log('Client: Starting to parse complex document:', file.name)
      
      const formData = new FormData()
      formData.append('file', file)
      
      const response = await fetch('/api/parse-document', {
        method: 'POST',
        body: formData,
      })
      
      console.log('Client: Parse API response status:', response.status)
      
      if (!response.ok) {
        console.warn(`Document parsing failed with ${response.status}, using file metadata instead`)
        return `[${file.name} - ${file.type} file, ${Math.round(file.size/1024)}KB - content parsing unavailable]`
      }
      
      const result = await response.json()
      console.log('Client: Parse API result:', {
        hasContent: !!result.content,
        contentLength: result.content?.length,
        contentPreview: result.content?.substring(0, 100)
      })
      
      return result.content || `[${file.name} - no readable content extracted]`
    } catch (error) {
      console.error('Error parsing complex document:', error)
      // Fallback to basic file info if parsing fails
      return `[${file.name} - ${file.type} file, ${Math.round(file.size/1024)}KB - parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}]`
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    if (!disabled && e.dataTransfer.files) {
      handleFileSelect(e.dataTransfer.files)
    }
  }

  const handleClick = () => {
    if (!disabled) {
      fileInputRef.current?.click()
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        className={`p-2 rounded-md transition-colors ${
          disabled 
            ? 'text-gray-400 cursor-not-allowed' 
            : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
        }`}
        title="Attach files"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
        </svg>
      </button>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
        accept="image/*,.txt,.md,.json,.csv,.pdf,.doc,.docx"
      />

      {isDragOver && (
        <div
          className="fixed inset-0 bg-blue-500 bg-opacity-10 border-2 border-dashed border-blue-500 flex items-center justify-center z-50"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="text-blue-600 text-xl font-semibold">
            Drop files here to attach
          </div>
        </div>
      )}
    </>
  )
}