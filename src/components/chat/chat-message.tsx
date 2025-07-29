import { Message } from '@/types'
import { cn } from '@/lib/utils'
import { Markdown } from '@/components/ui/markdown'

interface ChatMessageProps {
  message: Message
}

export function ChatMessage({ message }: ChatMessageProps) {
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className={cn(
      "flex w-full mb-4",
      message.role === 'user' ? 'justify-end' : 'justify-start'
    )}>
      <div className={cn(
        "max-w-[80%] rounded-lg px-4 py-2",
        message.role === 'user' 
          ? 'bg-blue-500 text-white' 
          : 'bg-gray-100 text-gray-900'
      )}>
        {message.files && message.files.length > 0 && (
          <div className="mb-2">
            {message.files.map((file) => (
              <div key={file.id} className="flex items-center gap-2 text-xs opacity-80 mb-1">
                <span>📎</span>
                <span className="truncate">{file.name}</span>
                <span>({formatFileSize(file.size)})</span>
              </div>
            ))}
          </div>
        )}
        {message.content && (
          <div className="text-sm">
            {message.role === 'assistant' ? (
              <Markdown 
                content={message.content} 
                className={message.role === 'user' ? 'prose-invert' : ''}
              />
            ) : (
              <p className="whitespace-pre-wrap">{message.content}</p>
            )}
          </div>
        )}
        <span className="text-xs opacity-70 mt-1 block">
          {message.timestamp.toLocaleTimeString()}
        </span>
      </div>
    </div>
  )
}