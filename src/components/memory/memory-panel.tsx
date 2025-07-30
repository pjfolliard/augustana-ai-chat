'use client'

import { useState, useEffect } from 'react'
import { UserMemory } from '@/lib/memory'
import { TrashIcon, PencilIcon } from '@heroicons/react/24/outline'

interface MemoryPanelProps {
  isOpen: boolean
  onClose: () => void
}

export function MemoryPanel({ isOpen, onClose }: MemoryPanelProps) {
  const [memories, setMemories] = useState<UserMemory[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [editingMemory, setEditingMemory] = useState<UserMemory | null>(null)
  const [newKey, setNewKey] = useState('')
  const [newValue, setNewValue] = useState('')
  const [newCategory, setNewCategory] = useState<UserMemory['category']>('fact')

  useEffect(() => {
    if (isOpen) {
      loadMemories()
    }
  }, [isOpen])

  const loadMemories = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/memory')
      if (response.ok) {
        const data = await response.json()
        setMemories(data.memories || [])
      }
    } catch (error) {
      console.error('Error loading memories:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveMemory = async (key: string, value: string, category: UserMemory['category']) => {
    try {
      const response = await fetch('/api/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value, category })
      })

      if (response.ok) {
        loadMemories()
        setNewKey('')
        setNewValue('')
        setEditingMemory(null)
      }
    } catch (error) {
      console.error('Error saving memory:', error)
    }
  }

  const deleteMemory = async (key: string) => {
    try {
      const response = await fetch('/api/memory', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key })
      })

      if (response.ok) {
        loadMemories()
      }
    } catch (error) {
      console.error('Error deleting memory:', error)
    }
  }

  const filteredMemories = selectedCategory === 'all' 
    ? memories 
    : memories.filter(m => m.category === selectedCategory)

  const categories = ['all', 'preference', 'fact', 'context', 'skill']

  if (!isOpen) return null

  return (
    <div className="fixed right-0 top-0 h-full z-50 flex">
      <div className="w-96 bg-white shadow-xl flex flex-col border-l border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gray-50">
          <h2 className="text-lg font-semibold">My Memory</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Category Filter */}
        <div className="p-4 border-b">
          <div className="flex gap-2 flex-wrap">
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-3 py-1 text-sm rounded-full ${
                  selectedCategory === category
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {category === 'all' ? 'All' : category.charAt(0).toUpperCase() + category.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Add New Memory */}
        <div className="p-4 border-b bg-gray-50">
          <h3 className="text-sm font-medium mb-2">Add New Memory</h3>
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Key (e.g., 'name', 'favorite_language')"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="Value (e.g., 'John', 'Python')"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex gap-2">
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as UserMemory['category'])}
                className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="fact">Fact</option>
                <option value="preference">Preference</option>
                <option value="skill">Skill</option>
                <option value="context">Context</option>
              </select>
              <button
                onClick={() => saveMemory(newKey, newValue, newCategory)}
                disabled={!newKey.trim() || !newValue.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Add
              </button>
            </div>
          </div>
        </div>

        {/* Memories List */}
        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredMemories.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="text-sm">No memories found</p>
              <p className="text-xs mt-1">Start chatting to build your knowledge base!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredMemories.map((memory) => (
                <div key={memory.id} className="border border-gray-200 rounded-lg p-3">
                  {editingMemory?.id === memory.id ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editingMemory.key}
                        onChange={(e) => setEditingMemory({...editingMemory, key: e.target.value})}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                      <input
                        type="text"
                        value={editingMemory.value}
                        onChange={(e) => setEditingMemory({...editingMemory, value: e.target.value})}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => saveMemory(editingMemory.key, editingMemory.value, editingMemory.category)}
                          className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingMemory(null)}
                          className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-xs hover:bg-gray-400"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{memory.key}</span>
                            <span className={`px-2 py-0.5 text-xs rounded-full ${
                              memory.category === 'preference' ? 'bg-green-100 text-green-700' :
                              memory.category === 'fact' ? 'bg-blue-100 text-blue-700' :
                              memory.category === 'skill' ? 'bg-purple-100 text-purple-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {memory.category}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{memory.value}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(memory.updated_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => setEditingMemory(memory)}
                            className="p-1 text-gray-400 hover:text-blue-600"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteMemory(memory.key)}
                            className="p-1 text-gray-400 hover:text-red-600"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}