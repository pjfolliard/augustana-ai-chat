'use client'

import { FileAttachment } from '@/types'

interface FilePreviewProps {
  file: FileAttachment
  onRemove: () => void
}

export function FilePreview({ file, onRemove }: FilePreviewProps) {

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) {
      return '🖼️'
    } else if (type.startsWith('text/') || type === 'application/json') {
      return '📄'
    } else if (type === 'application/pdf') {
      return '📕'
    } else {
      return '📎'
    }
  }

  return (
    <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-md border text-sm">
      <span className="text-lg">{getFileIcon(file.type)}</span>
      <div className="flex-1 min-w-0">
        <div className="truncate font-medium">{file.name}</div>
        <div className="text-gray-500 text-xs">{formatFileSize(file.size)}</div>
      </div>
      <button
        onClick={onRemove}
        className="text-gray-400 hover:text-red-600 transition-colors"
        title="Remove file"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}