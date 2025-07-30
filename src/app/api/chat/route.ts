import { NextRequest, NextResponse } from 'next/server'
import { openai } from '@/lib/openai'
import { FileAttachment } from '@/types'
import { searchWeb } from '@/lib/web-search'
import { createMemoryManager } from '@/lib/memory'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    console.log('API: Received request')
    const { message, files, searchMode, canvasMode, history } = await request.json()
    console.log('API: Parsed data:', { message, filesCount: files?.length, searchMode, canvasMode, historyLength: history?.length })

    // Get user for memory system
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!message && (!files || files.length === 0)) {
      console.log('API: Missing message and files')
      return NextResponse.json(
        { error: 'Message or files are required' },
        { status: 400 }
      )
    }

    // Perform web search if explicitly requested
    let searchResults = ''
    if (searchMode && message && message.length > 0) {
      console.log('API: Search mode enabled, performing web search for:', message)
      try {
        const results = await searchWeb(message, 3)
        if (results.length > 0) {
          searchResults = '\n\n🔍 **WEB SEARCH RESULTS** for "' + message + '":\n\n' + 
            results.map((result, index) => 
              `**${index + 1}. ${result.title}**\n${result.snippet}${result.url ? `\nSource: ${result.url}` : ''}\n`
            ).join('\n') + 
            '\n*Note: Please use this current web information to provide an accurate and up-to-date response.*'
          console.log(`API: Found ${results.length} search results`)
        } else {
          searchResults = '\n\n🔍 **WEB SEARCH**: No current results found for "' + message + '". Please provide information based on general knowledge.'
        }
      } catch (error) {
        console.error('Search failed:', error)
        searchResults = '\n\n🔍 **WEB SEARCH**: Currently unavailable. Please provide information based on general knowledge.'
      }
    }

    // Prepare the user content with files
    let userContent = message || 'Please analyze the attached files.'
    
    // Add search results if available
    if (searchResults) {
      userContent += searchResults
    }
    
    // Add file information to the message
    if (files && files.length > 0) {
      console.log('API: Processing files:', files.map(f => ({ name: f.name, type: f.type, contentLength: f.content?.length })))
      
      const fileInfo = files.map((file: FileAttachment) => {
        let fileContent = ''
        
        // Check if we have actual content
        if (file.content && file.content.length > 0) {
          if (file.type.startsWith('text/') || file.type === 'application/json') {
            fileContent = `\n\nFile: ${file.name}\nContent:\n${file.content}`
          } else if (file.type.startsWith('image/')) {
            fileContent = `\n\nImage: ${file.name} (image data provided)`
          } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.name.endsWith('.docx')) {
            fileContent = `\n\nDocument: ${file.name}\nExtracted Text:\n${file.content}`
          } else if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
            fileContent = `\n\nPDF: ${file.name}\nContent:\n${file.content}`
          } else {
            fileContent = `\n\nFile: ${file.name}\nContent:\n${file.content}`
          }
        } else {
          // No content extracted
          fileContent = `\n\nFile: ${file.name} (${file.type}, ${file.size} bytes) - No content extracted`
        }
        
        console.log('API: File content snippet:', { name: file.name, contentPreview: fileContent.substring(0, 200) })
        return fileContent
      }).join('')
      
      userContent += fileInfo
    }

    // Determine the model based on files
    const model = files?.some((f: FileAttachment) => f.type.startsWith('image/')) 
      ? 'gpt-4o-mini'  // Use 4o-mini for images (supports vision)
      : 'gpt-4o-mini'  // Use 4o-mini for text and documents

    console.log('API: Calling OpenAI with model:', model)
    console.log('API: User content length:', userContent.length)

    // Initialize memory manager and get user context
    const memoryManager = await createMemoryManager()
    const memoryContext = await memoryManager.getMemoryContext(user.id, message)
    console.log('API: Memory context length:', memoryContext.length)

    // Build system prompt with memory context
    let systemPrompt = canvasMode 
      ? 'You are a helpful AI assistant in canvas mode. Focus on creating well-structured, detailed content suitable for editing and iteration. Format your responses with proper headings, sections, and markdown when appropriate. Create comprehensive content that can be refined and edited. This content will be displayed in an editable panel for the user to modify and iterate on.'
      : 'You are a helpful AI assistant with web search capabilities. You can analyze text files, images, documents, and search the web for current information. When provided with search results, integrate them naturally into your response and cite sources when relevant. Provide clear and detailed responses based on all available information.'

    // Add memory context to system prompt
    if (memoryContext) {
      systemPrompt += '\n\n' + memoryContext + '\nUse this information to personalize your responses and reference relevant context from previous conversations.'
    }

    // Build conversation messages
    const conversationMessages = [
      {
        role: 'system' as const,
        content: systemPrompt
      }
    ]

    // Add conversation history if available
    if (history && Array.isArray(history)) {
      const historyMessages = history.map((msg: any) => ({
        role: msg.role === 'user' ? 'user' as const : 'assistant' as const,
        content: msg.content
      }))
      conversationMessages.push(...historyMessages)
      console.log('API: Added', historyMessages.length, 'history messages')
    }

    // Add the current user message
    conversationMessages.push({
      role: 'user' as const,
      content: userContent
    })

    console.log('API: Total conversation messages:', conversationMessages.length)
    console.log('API: Message structure:', conversationMessages.map(m => ({ role: m.role, contentLength: m.content.length })))

    let completion
    try {
      completion = await openai.chat.completions.create({
        model,
        messages: conversationMessages,
        max_tokens: 1500,
        temperature: 0.7,
      })
    } catch (openaiError: any) {
      console.error('OpenAI API Error:', openaiError)
      throw new Error(`OpenAI API Error: ${openaiError.message || 'Unknown OpenAI error'}`)
    }

    const response = completion.choices[0]?.message?.content || 'I apologize, but I could not generate a response.'
    console.log('API: OpenAI response received, length:', response.length)

    // Extract and store memories from user message (async, don't wait)
    memoryManager.extractMemoriesFromMessage(user.id, message || '', 'user').catch(err => {
      console.error('Error extracting memories:', err)
    })

    return NextResponse.json({ response })
  } catch (error) {
    console.error('API: Error occurred:', error)
    
    // Ensure we always return valid JSON
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    console.error('API: Returning error response:', errorMessage)
    
    return new NextResponse(
      JSON.stringify({ 
        error: `Failed to process your request: ${errorMessage}`,
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined
      }),
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        }
      }
    )
  }
}