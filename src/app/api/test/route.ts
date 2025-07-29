import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Test authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError) {
      return NextResponse.json({ 
        status: 'error',
        message: 'Auth error',
        details: authError 
      })
    }

    if (!user) {
      return NextResponse.json({ 
        status: 'error',
        message: 'No user found' 
      })
    }

    // Test database connection by checking if tables exist
    const tableChecks = await Promise.all([
      supabase.from('profiles').select('count').limit(0),
      supabase.from('folders').select('count').limit(0),
      supabase.from('chats').select('count').limit(0),
      supabase.from('messages').select('count').limit(0)
    ])

    const results = {
      profiles: tableChecks[0].error ? 'MISSING' : 'OK',
      folders: tableChecks[1].error ? 'MISSING' : 'OK',
      chats: tableChecks[2].error ? 'MISSING' : 'OK',
      messages: tableChecks[3].error ? 'MISSING' : 'OK'
    }

    const errors = tableChecks.map((check, index) => ({
      table: ['profiles', 'folders', 'chats', 'messages'][index],
      error: check.error
    })).filter(item => item.error)

    return NextResponse.json({
      status: 'success',
      user: {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.full_name || user.user_metadata?.name
      },
      tables: results,
      errors: errors.length > 0 ? errors : null
    })
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: 'Server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}