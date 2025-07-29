// Database types matching our Supabase schema
export type UserRole = 'user' | 'admin' | 'moderator'
export type ChatType = 'general' | 'search' | 'canvas' | 'document'
export type MessageRole = 'user' | 'assistant' | 'system'

export interface Profile {
  id: string
  email: string
  name: string | null
  avatar_url: string | null
  role: UserRole
  settings: Record<string, any>
  created_at: string
  updated_at: string
}

export interface Folder {
  id: string
  user_id: string
  name: string
  description: string | null
  parent_id: string | null
  color: string
  icon: string
  sort_order: number
  is_archived: boolean
  created_at: string
  updated_at: string
  // Computed fields
  children?: Folder[]
  chat_count?: number
}

export interface Chat {
  id: string
  user_id: string
  folder_id: string | null
  title: string
  description: string | null
  type: ChatType
  is_pinned: boolean
  is_archived: boolean
  is_shared: boolean
  share_token: string | null
  settings: Record<string, any>
  metadata: Record<string, any>
  model_name: string
  model_settings: Record<string, any>
  message_count: number
  last_message_at: string | null
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  chat_id: string
  role: MessageRole
  content: string
  attachments: FileAttachment[]
  metadata: Record<string, any>
  model_name: string | null
  tokens_input: number
  tokens_output: number
  is_edited: boolean
  edit_history: any[]
  is_deleted: boolean
  created_at: string
  updated_at: string
}

export interface FileAttachment {
  id?: string
  name: string
  type: string
  size: number
  url?: string
  content?: string
}

// UI-friendly types (converted from database types)
export interface FolderUI {
  id: string
  name: string
  description?: string
  parentId?: string
  color: string
  icon: string
  sortOrder: number
  isArchived: boolean
  createdAt: Date
  updatedAt: Date
  children?: FolderUI[]
  chatCount?: number
}

export interface ChatUI {
  id: string
  title: string
  description?: string
  folderId?: string
  type: ChatType
  isPinned: boolean
  isArchived: boolean
  isShared: boolean
  shareToken?: string
  messageCount: number
  lastMessageAt?: Date
  createdAt: Date
  updatedAt: Date
}

export interface MessageUI {
  id: string
  content: string
  role: MessageRole
  timestamp: Date
  files?: FileAttachment[]
  isEdited?: boolean
  tokens?: {
    input: number
    output: number
  }
}

// Auth types
export interface AuthUser {
  id: string
  email: string
  name?: string
  avatar_url?: string
  role: UserRole
}