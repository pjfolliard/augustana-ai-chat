import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // First verify the user owns this chat
    const { data: chat, error: chatError } = await supabase
      .from('chats')
      .select('id')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    if (chatError || !chat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 })
    }

    // Get messages for this chat
    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', params.id)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching messages:', error)
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
    }

    return NextResponse.json({ messages })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // First verify the user owns this chat
    const { data: chat, error: chatError } = await supabase
      .from('chats')
      .select('id')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    if (chatError || !chat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 })
    }

    const { content, role } = await request.json()
    console.log('Messages API: Received data:', { content: content?.substring(0, 100), role, chatId: params.id })

    if (!content?.trim()) {
      console.log('Messages API: Missing content')
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 })
    }

    if (!['user', 'assistant', 'system'].includes(role)) {
      console.log('Messages API: Invalid role:', role)
      return NextResponse.json({ error: 'Invalid message role' }, { status: 400 })
    }

    console.log('Messages API: Creating message for chat:', params.id, 'user:', user.id, 'role:', role)
    
    const messageData = {
      chat_id: params.id,
      content: content.trim(),
      message_role: role || 'assistant'
    }
    
    console.log('Messages API: Inserting message data:', messageData)
    
    const { data: message, error } = await supabase
      .from('messages')
      .insert(messageData)
      .select()
      .single()

    if (error) {
      console.error('Messages API: Database error creating message:', error)
      console.error('Messages API: Error details:', JSON.stringify(error, null, 2))
      return NextResponse.json({ 
        error: 'Failed to create message', 
        details: process.env.NODE_ENV === 'development' ? error.message : undefined 
      }, { status: 500 })
    }

    console.log('Messages API: Message created successfully:', message?.id)

    return NextResponse.json({ message })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}