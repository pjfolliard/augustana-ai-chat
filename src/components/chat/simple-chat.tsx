'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { MessageUI, FileAttachment } from '@/types'
import { useAuth } from '@/components/auth/auth-provider'
import { EnhancedChatInput } from './enhanced-chat-input'
import { CanvasPanel } from '@/components/canvas/canvas-panel'
import { Markdown } from '@/components/ui/markdown'

interface SimpleChatProps {
  chatId?: string
  onChatCreated?: (chatId: string) => void
}

export function SimpleChat({ chatId, onChatCreated }: SimpleChatProps) {
  const [messages, setMessages] = useState<MessageUI[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [canvasContent, setCanvasContent] = useState('')
  const [canvasTitle, setCanvasTitle] = useState('')
  const [showCanvas, setShowCanvas] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { user } = useAuth()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadMessages = useCallback(async () => {
    if (!chatId) return

    try {
      console.log('SimpleChat: Starting to load messages for chatId:', chatId)
      setLoadingMessages(true)
      const response = await fetch(`/api/chats/${chatId}/messages`)
      
      if (response.ok) {
        const data = await response.json()
        console.log('SimpleChat: Received messages data:', data)
        const messagesUI: MessageUI[] = data.messages?.map((msg: any) => ({
          id: msg.id,
          content: msg.content,
          role: (msg.message_role || msg.role || 'assistant') as 'user' | 'assistant' | 'system',
          timestamp: new Date(msg.created_at),
          files: [], // Attachments handled separately for now
          isEdited: msg.is_edited || false,
          tokens: {
            input: msg.tokens_input || 0,
            output: msg.tokens_output || 0
          }
        })) || []
        console.log('SimpleChat: Mapped messages:', messagesUI.length, 'messages')
        setMessages(messagesUI)
      } else {
        console.error('SimpleChat: Failed to load messages, response not ok:', response.status)
      }
    } catch (error) {
      console.error('SimpleChat: Error loading messages:', error)
    } finally {
      setLoadingMessages(false)
    }
  }, [chatId])

  useEffect(() => {
    console.log('SimpleChat: chatId changed to:', chatId)
    if (chatId) {
      console.log('SimpleChat: Loading messages for chat:', chatId)
      loadMessages()
    } else {
      console.log('SimpleChat: No chatId, clearing messages')
      setMessages([])
    }
  }, [chatId, loadMessages])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const sendMessage = async (content: string, files?: FileAttachment[], searchMode?: boolean, canvasMode?: boolean) => {
    if (!content.trim() || loading) return

    const userMessage: MessageUI = {
      id: Date.now().toString(),
      content: content.trim(),
      role: 'user',
      timestamp: new Date(),
      files: files || []
    }

    setMessages(prev => [...prev, userMessage])
    setLoading(true)

    try {
      // If no chat exists, create one first
      let currentChatId = chatId
      if (!currentChatId) {
        const chatResponse = await fetch('/api/chats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: content.trim().substring(0, 50) || 'New Chat',
            type: 'general'
          })
        })

        if (chatResponse.ok) {
          const { chat } = await chatResponse.json()
          currentChatId = chat.id
          onChatCreated?.(currentChatId)
        } else {
          let errorData
          try {
            errorData = await chatResponse.json()
          } catch (parseError) {
            console.error('Failed to parse chat creation error:', parseError)
            throw new Error(`HTTP ${chatResponse.status}: ${chatResponse.statusText}`)
          }
          
          console.error('Chat creation failed in SimpleChat:', errorData)
          const errorMessage = errorData?.details || errorData?.error || 'Failed to create chat'
          throw new Error(errorMessage)
        }
      }

      // Save user message
      if (currentChatId) {
        console.log('SimpleChat: Saving user message to chat:', currentChatId)
        const userSaveResponse = await fetch(`/api/chats/${currentChatId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: userMessage.content,
            role: 'user'
          })
        })
        if (!userSaveResponse.ok) {
          const errorText = await userSaveResponse.text()
          console.error('SimpleChat: Failed to save user message:', userSaveResponse.status, errorText)
          // Continue anyway - don't let save failure break the chat flow
        } else {
          console.log('SimpleChat: User message saved successfully')
        }
      }

      // Get AI response (using existing chat API)
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          files: files || [],
          searchMode: searchMode || false,
          canvasMode: canvasMode || false,
          history: messages // Send conversation history
        })
      })

      if (response.ok) {
        let data
        try {
          const responseText = await response.text()
          console.log('Raw response:', responseText.substring(0, 200))
          data = JSON.parse(responseText)
        } catch (parseError) {
          console.error('Failed to parse JSON response:', parseError)
          throw new Error('Invalid response format from server')
        }

        const assistantMessage: MessageUI = {
          id: (Date.now() + 1).toString(),
          content: data.response || 'No response received',
          role: 'assistant',
          timestamp: new Date()
        }

        setMessages(prev => [...prev, assistantMessage])

        // Handle canvas mode response
        if (canvasMode && data.response) {
          setCanvasContent(data.response)
          setCanvasTitle(`Canvas: ${content.substring(0, 30)}...`)
          setShowCanvas(true)
        }

        // Save assistant message
        if (currentChatId) {
          console.log('SimpleChat: Saving assistant message to chat:', currentChatId)
          const assistantSaveResponse = await fetch(`/api/chats/${currentChatId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: assistantMessage.content,
              role: 'assistant'
            })
          })
          if (!assistantSaveResponse.ok) {
            const errorText = await assistantSaveResponse.text()
            console.error('SimpleChat: Failed to save assistant message:', assistantSaveResponse.status, errorText)
            // Continue anyway - don't let save failure break the chat flow
          } else {
            console.log('SimpleChat: Assistant message saved successfully')
          }
        }
      } else {
        let errorText
        try {
          const errorResponse = await response.text()
          console.log('Error response:', errorResponse.substring(0, 200))
          const errorData = JSON.parse(errorResponse)
          errorText = errorData.error || `HTTP ${response.status}: ${response.statusText}`
        } catch (parseError) {
          errorText = `HTTP ${response.status}: ${response.statusText}`
        }
        throw new Error(errorText)
      }
    } catch (error) {
      console.error('Error sending message:', error)
      const errorMessage: MessageUI = {
        id: (Date.now() + 2).toString(),
        content: 'Sorry, I encountered an error. Please try again.',
        role: 'assistant',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  const handleCanvasContentChange = (newContent: string) => {
    setCanvasContent(newContent)
  }

  const handleCanvasRequestEdit = (instruction: string) => {
    // Send edit request to AI
    sendMessage(`Please edit the following content: ${instruction}\n\nContent to edit:\n${canvasContent}`, [], false, true)
  }

  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-gray-500">
          <p>Please sign in to start chatting</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loadingMessages ? (
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <div className="text-6xl mb-4">💬</div>
              <h3 className="text-lg font-medium mb-2">Start a conversation</h3>
              <p className="text-sm">Ask me anything, and I&apos;ll do my best to help!</p>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-3xl px-4 py-3 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                {message.role === 'assistant' ? (
                  <Markdown content={message.content} />
                ) : (
                  <div className="whitespace-pre-wrap text-sm">
                    {message.content}
                  </div>
                )}
                <div className={`text-xs mt-1 ${
                  message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                }`}>
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))
        )}
        
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 px-4 py-3 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="text-sm text-gray-500">AI is thinking...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Enhanced Input area */}
      <EnhancedChatInput
        onSendMessage={sendMessage}
        isLoading={loading}
        disabled={false}
      />

      {/* Canvas Panel */}
      <CanvasPanel
        isOpen={showCanvas}
        onClose={() => setShowCanvas(false)}
        content={canvasContent}
        title={canvasTitle}
        onContentChange={handleCanvasContentChange}
        onRequestEdit={handleCanvasRequestEdit}
      />
    </div>
  )
}