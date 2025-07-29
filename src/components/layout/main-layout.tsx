'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/sidebar/sidebar'
import { ChatInterface } from '@/components/chat/chat-interface'

export function MainLayout() {
  const [selectedChatId, setSelectedChatId] = useState<string | undefined>()
  const [refreshSidebar, setRefreshSidebar] = useState(0)

  const handleSelectChat = (chatId: string) => {
    setSelectedChatId(chatId)
  }

  const handleNewChat = () => {
    setSelectedChatId(undefined)
  }

  const handleChatCreated = (chatId: string) => {
    setSelectedChatId(chatId)
    setRefreshSidebar(prev => prev + 1) // Trigger sidebar refresh
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        key={refreshSidebar}
        selectedChatId={selectedChatId}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
      />
      <div className="flex-1 flex flex-col">
        <header className="bg-white shadow-sm border-b">
          <div className="px-6 py-4">
            <h1 className="text-2xl font-bold text-gray-900">AI Chatbot</h1>
            <p className="text-gray-600">Powered by OpenAI Assistant API</p>
          </div>
        </header>
        <main className="flex-1">
          <ChatInterface 
            key={selectedChatId || 'new'} 
            chatId={selectedChatId}
            onChatCreated={handleChatCreated}
          />
        </main>
      </div>
    </div>
  )
}