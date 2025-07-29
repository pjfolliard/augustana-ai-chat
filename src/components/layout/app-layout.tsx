'use client'

import { useState } from 'react'
import { FolderTree } from '@/components/folder-tree/folder-tree'
import { SimpleChat } from '@/components/chat/simple-chat'
import { useAuth } from '@/components/auth/auth-provider'
import { MemoryPanel } from '@/components/memory/memory-panel'
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline'

export function AppLayout() {
  const [selectedChatId, setSelectedChatId] = useState<string | undefined>()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [memoryOpen, setMemoryOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const { user, signOut } = useAuth()

  const handleSelectChat = (chatId: string) => {
    console.log('AppLayout: Selecting chat:', chatId)
    setSelectedChatId(chatId)
  }

  const handleNewChat = () => {
    setSelectedChatId(undefined)
  }

  const handleChatCreated = (chatId: string) => {
    setSelectedChatId(chatId)
    setRefreshKey(prev => prev + 1) // Trigger folder tree refresh
  }

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{backgroundColor: 'var(--background)'}}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{borderColor: 'var(--secondary)'}}></div>
      </div>
    )
  }

  return (
    <div className="flex h-screen" style={{backgroundColor: 'var(--background)'}}>
      {/* Sidebar */}
      <div className={`${
        sidebarOpen ? 'w-80' : 'w-0'
      } transition-all duration-300 ease-in-out overflow-hidden border-r flex flex-col`} style={{backgroundColor: 'var(--background)', borderColor: 'var(--accent)'}}>
        <div className="flex-1 overflow-hidden">
          <FolderTree
            key={refreshKey}
            selectedChatId={selectedChatId}
            onSelectChat={handleSelectChat}
            onNewChat={handleNewChat}
            className="h-full"
          />
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="border-b px-6 py-4" style={{backgroundColor: 'var(--primary)', borderColor: 'var(--accent)'}}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-lg transition-colors"
                style={{'&:hover': {backgroundColor: 'rgba(255, 221, 0, 0.1)'}}}
              >
                {sidebarOpen ? (
                  <XMarkIcon className="w-5 h-5" style={{color: 'var(--text-secondary)'}} />
                ) : (
                  <Bars3Icon className="w-5 h-5" style={{color: 'var(--text-secondary)'}} />
                )}
              </button>
              <div className="flex items-center space-x-3">
                <img src="/augustana-logo.jpg" alt="Augustana University" className="h-8 w-auto" />
                <div>
                  <h1 className="text-xl font-semibold" style={{color: 'var(--text-secondary)'}}>Augustana AI Chat</h1>
                  <p className="text-sm" style={{color: 'var(--secondary)'}}>Academic Assistant for Students & Faculty</p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={() => setMemoryOpen(true)}
                className="px-3 py-1 text-sm rounded-md transition-colors"
                style={{backgroundColor: 'var(--secondary)', color: 'var(--primary)'}}
                title="View my memory"
              >
                🧠 Memory
              </button>
              
              {user.avatar_url && (
                <img
                  src={user.avatar_url}
                  alt={user.name || 'User'}
                  className="w-8 h-8 rounded-full"
                />
              )}
              <div className="text-right">
                <p className="text-sm font-medium" style={{color: 'var(--text-secondary)'}}>
                  {user.name || user.email}
                </p>
                <p className="text-xs capitalize" style={{color: 'var(--secondary)'}}>{user.role}</p>
              </div>
              <button
                onClick={handleSignOut}
                className="text-sm transition-colors"
                style={{color: 'var(--text-secondary)'}}
              >
                Sign out
              </button>
            </div>
          </div>
        </header>

        {/* Chat area */}
        <main className="flex-1 overflow-hidden">
          <SimpleChat
            key={selectedChatId} // Force re-mount when chat changes
            chatId={selectedChatId}
            onChatCreated={handleChatCreated}
          />
        </main>
      </div>

      {/* Memory Panel */}
      <MemoryPanel
        isOpen={memoryOpen}
        onClose={() => setMemoryOpen(false)}
      />
    </div>
  )
}