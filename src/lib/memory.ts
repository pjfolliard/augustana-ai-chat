import { createClient } from '@/lib/supabase/server'
import { openai } from '@/lib/openai'

export interface UserMemory {
  id: string
  user_id: string
  key: string
  value: string
  category: 'preference' | 'fact' | 'context' | 'skill'
  created_at: string
  updated_at: string
}

export interface SemanticMemory {
  id: string
  user_id: string
  content: string
  embedding: number[]
  source_chat_id?: string
  source_message_id?: string
  created_at: string
}

export class MemoryManager {
  private supabase: any

  constructor(supabase: any) {
    this.supabase = supabase
  }

  // Key-Value Memory Management
  async setMemory(userId: string, key: string, value: string, category: UserMemory['category'] = 'fact') {
    const { data, error } = await this.supabase
      .from('user_memories')
      .upsert({
        user_id: userId,
        key,
        value,
        category,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,key'
      })
      .select()

    if (error) {
      console.error('Error saving memory:', error)
      return null
    }

    return data
  }

  async getMemory(userId: string, key: string): Promise<UserMemory | null> {
    const { data, error } = await this.supabase
      .from('user_memories')
      .select('*')
      .eq('user_id', userId)
      .eq('key', key)
      .single()

    if (error) {
      return null
    }

    return data
  }

  async getAllMemories(userId: string): Promise<UserMemory[]> {
    const { data, error } = await this.supabase
      .from('user_memories')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Error fetching memories:', error)
      return []
    }

    return data || []
  }

  async getMemoriesByCategory(userId: string, category: UserMemory['category']): Promise<UserMemory[]> {
    const { data, error } = await this.supabase
      .from('user_memories')
      .select('*')
      .eq('user_id', userId)
      .eq('category', category)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Error fetching memories by category:', error)
      return []
    }

    return data || []
  }

  // Semantic Memory Management
  async addSemanticMemory(userId: string, content: string, chatId?: string, messageId?: string) {
    try {
      // Generate embedding for the content
      const embedding = await this.generateEmbedding(content)
      
      const { data, error } = await this.supabase
        .from('semantic_memories')
        .insert({
          user_id: userId,
          content,
          embedding,
          source_chat_id: chatId,
          source_message_id: messageId
        })
        .select()

      if (error) {
        console.error('Error saving semantic memory:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error in addSemanticMemory:', error)
      return null
    }
  }

  async searchSemanticMemories(userId: string, query: string, limit: number = 5): Promise<SemanticMemory[]> {
    try {
      // Generate embedding for the query
      const queryEmbedding = await this.generateEmbedding(query)
      
      // Use PostgreSQL's vector similarity search (requires pgvector extension)
      const { data, error } = await this.supabase.rpc('search_semantic_memories', {
        user_id: userId,
        query_embedding: queryEmbedding,
        match_threshold: 0.7, // Similarity threshold
        match_count: limit
      })

      if (error) {
        console.error('Error searching semantic memories:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error in searchSemanticMemories:', error)
      return []
    }
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text.trim()
      })

      return response.data[0].embedding
    } catch (error) {
      console.error('Error generating embedding:', error)
      throw error
    }
  }

  // Memory extraction from conversations
  async extractMemoriesFromMessage(userId: string, message: string, role: 'user' | 'assistant', chatId?: string, messageId?: string) {
    try {
      // Use AI to extract key facts and preferences from the message
      const extractionPrompt = `
        Analyze this ${role} message and extract any important facts, preferences, or personal information that should be remembered about the user.
        
        Message: "${message}"
        
        Extract information in this JSON format:
        {
          "facts": [{"key": "descriptive_key", "value": "fact_value", "category": "fact|preference|skill|context"}],
          "should_remember": boolean,
          "semantic_summary": "brief summary if worth remembering semantically"
        }
        
        Only extract information that would be useful for future conversations. Return empty arrays if nothing significant.
      `

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: extractionPrompt }],
        max_tokens: 300,
        temperature: 0.1
      })

      const response = completion.choices[0]?.message?.content
      if (!response) return

      try {
        const extracted = JSON.parse(response)
        
        // Save key-value memories
        for (const fact of extracted.facts || []) {
          await this.setMemory(userId, fact.key, fact.value, fact.category)
        }

        // Save semantic memory if worth remembering
        if (extracted.should_remember && extracted.semantic_summary) {
          await this.addSemanticMemory(userId, extracted.semantic_summary, chatId, messageId)
        }
      } catch (parseError) {
        console.error('Error parsing memory extraction:', parseError)
      }
    } catch (error) {
      console.error('Error extracting memories:', error)
    }
  }

  // Generate memory context for AI
  async getMemoryContext(userId: string, currentMessage?: string): Promise<string> {
    try {
      const [keyValueMemories, semanticMemories] = await Promise.all([
        this.getAllMemories(userId),
        currentMessage ? this.searchSemanticMemories(userId, currentMessage, 3) : []
      ])

      let context = ''

      // Add key-value memories
      if (keyValueMemories.length > 0) {
        context += '## User Information:\n'
        const categorized = keyValueMemories.reduce((acc, memory) => {
          if (!acc[memory.category]) acc[memory.category] = []
          acc[memory.category].push(`${memory.key}: ${memory.value}`)
          return acc
        }, {} as Record<string, string[]>)

        for (const [category, memories] of Object.entries(categorized)) {
          context += `**${category.charAt(0).toUpperCase() + category.slice(1)}s**: ${memories.join(', ')}\n`
        }
        context += '\n'
      }

      // Add relevant semantic memories
      if (semanticMemories.length > 0) {
        context += '## Relevant Context:\n'
        semanticMemories.forEach((memory, idx) => {
          context += `${idx + 1}. ${memory.content}\n`
        })
        context += '\n'
      }

      return context
    } catch (error) {
      console.error('Error getting memory context:', error)
      return ''
    }
  }
}

// Helper function to create memory manager
export async function createMemoryManager() {
  const supabase = await createClient()
  return new MemoryManager(supabase)
}