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
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { key, value, category = 'fact' } = await request.json()

    if (!key?.trim() || !value?.trim()) {
      return NextResponse.json({ error: 'Key and value are required' }, { status: 400 })
    }

    const memoryManager = await createMemoryManager()
    const result = await memoryManager.setMemory(user.id, key.trim(), value.trim(), category)

    if (!result) {
      return NextResponse.json({ error: 'Failed to save memory' }, { status: 500 })
    }

    return NextResponse.json({ success: true, memory: result })
  } catch (error) {
    console.error('Memory API POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
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