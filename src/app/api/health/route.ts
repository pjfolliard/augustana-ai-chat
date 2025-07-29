import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    // Check environment variables
    const envCheck = {
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      OPENAI_API_KEY: !!process.env.OPENAI_API_KEY
    }

    console.log('Environment variables check:', envCheck)

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return NextResponse.json({
        status: 'error',
        message: 'Missing required environment variables',
        env: envCheck
      }, { status: 500 })
    }

    const supabase = await createClient()
    
    // Test basic connection
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    console.log('Auth check - User:', user?.id, 'Error:', authError)

    if (authError) {
      return NextResponse.json({
        status: 'error',
        message: 'Authentication error',
        details: authError,
        env: envCheck
      }, { status: 401 })
    }

    if (!user) {
      return NextResponse.json({
        status: 'no_user',
        message: 'No authenticated user',
        env: envCheck
      })
    }

    // Check if tables exist by attempting simple queries
    const tableChecks = {}
    
    try {
      const { error: profilesError } = await supabase.from('profiles').select('count').limit(0)
      tableChecks['profiles'] = profilesError ? { status: 'error', details: profilesError } : { status: 'ok' }
    } catch (e) {
      tableChecks['profiles'] = { status: 'error', details: e }
    }

    try {
      const { error: foldersError } = await supabase.from('folders').select('count').limit(0)
      tableChecks['folders'] = foldersError ? { status: 'error', details: foldersError } : { status: 'ok' }
    } catch (e) {
      tableChecks['folders'] = { status: 'error', details: e }
    }

    try {
      const { error: chatsError } = await supabase.from('chats').select('count').limit(0)
      tableChecks['chats'] = chatsError ? { status: 'error', details: chatsError } : { status: 'ok' }
    } catch (e) {
      tableChecks['chats'] = { status: 'error', details: e }
    }

    try {
      const { error: messagesError } = await supabase.from('messages').select('count').limit(0)
      tableChecks['messages'] = messagesError ? { status: 'error', details: messagesError } : { status: 'ok' }
    } catch (e) {
      tableChecks['messages'] = { status: 'error', details: e }
    }

    console.log('Table checks:', tableChecks)

    return NextResponse.json({
      status: 'success',
      message: 'Health check completed',
      user: {
        id: user.id,
        email: user.email,
        authenticated: true
      },
      env: envCheck,
      tables: tableChecks
    })

  } catch (error) {
    console.error('Health check error:', error)
    return NextResponse.json({
      status: 'error',
      message: 'Health check failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}