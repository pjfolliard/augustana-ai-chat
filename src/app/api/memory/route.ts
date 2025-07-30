import { NextRequest, NextResponse } from 'next/server'
import { createMemoryManager } from '@/lib/memory'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const memoryManager = await createMemoryManager()
    const memories = await memoryManager.getAllMemories(user.id)

    return NextResponse.json({ memories })
  } catch (error) {
    console.error('Memory API GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check environment variables first
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error('Missing Supabase environment variables')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError) {
      console.error('Auth error:', authError)
      return NextResponse.json({ error: 'Authentication error: ' + authError.message }, { status: 401 })
    }
    
    if (!user) {
      return NextResponse.json({ error: 'No authenticated user' }, { status: 401 })
    }

    const { key, value, category = 'fact' } = await request.json()

    if (!key?.trim() || !value?.trim()) {
      return NextResponse.json({ error: 'Key and value are required' }, { status: 400 })
    }

    // Direct Supabase call instead of memory manager for debugging
    const { data, error } = await supabase
      .from('user_memories')
      .upsert({
        user_id: user.id,
        key: key.trim(),
        value: value.trim(),
        category,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,key'
      })
      .select()

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: 'Database error: ' + error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, memory: data })
  } catch (error) {
    console.error('Memory API POST error:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { key } = await request.json()

    if (!key?.trim()) {
      return NextResponse.json({ error: 'Key is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('user_memories')
      .delete()
      .eq('user_id', user.id)
      .eq('key', key.trim())

    if (error) {
      console.error('Error deleting memory:', error)
      return NextResponse.json({ error: 'Failed to delete memory' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Memory API DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}