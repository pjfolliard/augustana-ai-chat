import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const folderId = searchParams.get('folderId')

    let query = supabase
      .from('chats')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_archived', false)
      .order('last_message_at', { ascending: false, nullsFirst: false })

    if (folderId !== null) {
      query = query.eq('folder_id', folderId === 'null' ? null : folderId)
    }

    const { data: chats, error } = await query

    if (error) {
      console.error('Error fetching chats:', error)
      return NextResponse.json({ error: 'Failed to fetch chats' }, { status: 500 })
    }

    return NextResponse.json({ chats })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error('Auth error:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Authenticated user:', { id: user.id, email: user.email })

    // Check if user profile exists, create if it doesn't
    const { data: existingProfile, error: profileCheckError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single()

    if (profileCheckError && profileCheckError.code === 'PGRST116') {
      // Profile doesn't exist, create it
      console.log('Profile not found, creating profile for user:', user.id)
      
      const profileData = {
        id: user.id,
        email: user.email!,
        name: user.user_metadata?.full_name || user.user_metadata?.name || null,
        avatar_url: user.user_metadata?.avatar_url || null,
        role: 'user' as const
      }

      const { error: profileCreateError } = await supabase
        .from('profiles')
        .insert(profileData)

      if (profileCreateError) {
        console.error('Error creating profile:', profileCreateError)
        return NextResponse.json({ 
          error: 'Failed to create user profile',
          details: profileCreateError.message
        }, { status: 500 })
      }

      console.log('Profile created successfully for user:', user.id)
    } else if (profileCheckError) {
      console.error('Error checking profile:', profileCheckError)
      return NextResponse.json({ 
        error: 'Error checking user profile',
        details: profileCheckError.message
      }, { status: 500 })
    } else {
      console.log('Profile exists for user:', user.id)
    }

    const body = await request.json()
    const { title = 'New Chat', folderId, type = 'general' } = body
    
    console.log('Creating chat with data:', { title, folderId, type, userId: user.id })

    const insertData = {
      title,
      folder_id: folderId || null,
      type,
      user_id: user.id
    }

    console.log('Insert data:', insertData)

    const { data: chat, error } = await supabase
      .from('chats')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('Supabase error creating chat:', error)
      console.error('Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
      return NextResponse.json({ 
        error: 'Failed to create chat',
        details: error.message,
        code: error.code
      }, { status: 500 })
    }

    console.log('Chat created successfully:', chat)
    return NextResponse.json({ chat })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}