'use client'

import { useState, useEffect } from 'react'
import { Message, FileAttachment } from '@/types'
import { ChatMessage } from './chat-message'
import { ChatInput } from './chat-input'
import { CanvasPanel } from '../canvas/canvas-panel'

interface ChatInterfaceProps {
  chatId?: string
  onChatCreated?: (chatId: string) => void
}

export function ChatInterface({ chatId, onChatCreated }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [canvasMode, setCanvasMode] = useState(false)
  const [canvasContent, setCanvasContent] = useState('')
  const [canvasTitle, setCanvasTitle] = useState('Document')
  const [isCanvasOpen, setIsCanvasOpen] = useState(false)

  // Load messages when chatId changes
  useEffect(() => {
    if (chatId) {
      loadChatMessages(chatId)
    } else {
      setMessages([])
    }
  }, [chatId])

  const loadChatMessages = async (chatId: string) => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/chats/${chatId}/messages`)
      if (response.ok) {
        const data = await response.json()
        // Convert the messages to the expected format
        const loadedMessages: Message[] = data.messages?.map((msg: any) => ({
          id: msg.id,
          content: msg.content,
          role: msg.role,
          timestamp: new Date(msg.created_at),
          files: msg.attachments || []
        })) || []
        setMessages(loadedMessages)
      }
    } catch (error) {
      console.error('Error loading chat messages:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendMessage = async (content: string, files?: FileAttachment[], searchMode: boolean = false, canvasModeActive: boolean = false) => {
    // If no chat is selected, we need to create a new chat first
    let currentChatId = chatId
    if (!currentChatId) {
      try {
        const newChatResponse = await fetch('/api/chats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            title: content.substring(0, 50) || 'New Chat',
            type: canvasModeActive ? 'canvas' : searchMode ? 'search' : 'general'
          })
        })
        
        if (newChatResponse.ok) {
          const { chat } = await newChatResponse.json()
          currentChatId = chat.id
          // Notify parent component about the new chat
          onChatCreated?.(currentChatId)
        } else {
          throw new Error('Failed to create new chat')
        }
      } catch (error) {
        console.error('Error creating new chat:', error)
        alert('Failed to create new chat')
        return
      }
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      content,
      role: 'user',
      timestamp: new Date(),
      files: files || [],
    }

    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)

    try {
      console.log('Sending message with files:', { content, files })
      
      // Save user message to database if we have a chat ID
      if (currentChatId) {
        await fetch(`/api/chats/${currentChatId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content,
            role: 'user',
            attachments: files || [],
            metadata: { searchMode, canvasMode: canvasModeActive }
          })
        })
      }
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: content, files: files || [], searchMode, canvasMode: canvasModeActive }),
      })

      console.log('API response status:', response.status)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('API error response:', errorText)
        throw new Error(`Failed to send message: ${response.status} ${errorText}`)
      }

      const data = await response.json()
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: data.response,
        role: 'assistant',
        timestamp: new Date(),
      }

      setMessages(prev => [...prev, assistantMessage])

      // Save assistant message to database if we have a chat ID
      if (currentChatId) {
        await fetch(`/api/chats/${currentChatId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: data.response,
            role: 'assistant',
            metadata: { model: 'gpt-4o-mini' }
          })
        })
      }

      // If canvas mode is active, open the response in canvas
      if (canvasModeActive && data.response) {
        setCanvasContent(data.response)
        setCanvasTitle(content.substring(0, 50) || 'Generated Content')
        setIsCanvasOpen(true)
      }
    } catch (error) {
      console.error('Error sending message:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: 'Sorry, I encountered an error. Please try again.',
        role: 'assistant',
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleCanvasToggle = () => {
    setCanvasMode(prev => !prev)
  }

  const handleCanvasContentChange = (newContent: string) => {
    setCanvasContent(newContent)
  }

  const handleCanvasEditRequest = async (instruction: string) => {
    if (!canvasContent.trim()) return

    setIsLoading(true)
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message: `Edit the following content based on this instruction: "${instruction}"\n\nContent:\n${canvasContent}`,
          canvasMode: true
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setCanvasContent(data.response)
      }
    } catch (error) {
      console.error('Error editing canvas content:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto">
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            Start a conversation with the AI assistant
          </div>
        ) : (
          messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))
        )}
      </div>
      <ChatInput 
        onSendMessage={handleSendMessage} 
        isLoading={isLoading}
        onCanvasToggle={handleCanvasToggle}
        canvasMode={canvasMode}
      />
      
      <CanvasPanel
        isOpen={isCanvasOpen}
        onClose={() => setIsCanvasOpen(false)}
        content={canvasContent}
        title={canvasTitle}
        onContentChange={handleCanvasContentChange}
        onRequestEdit={handleCanvasEditRequest}
      />
    </div>
  )
}