import { NextRequest, NextResponse } from 'next/server'
import { searchWeb } from '@/lib/web-search'

export async function GET(request: NextRequest) {
  try {
    console.log('Testing web search...')
    const results = await searchWeb('current weather', 2)
    
    return NextResponse.json({
      message: 'Search test completed',
      query: 'current weather',
      resultsCount: results.length,
      results: results,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Search test failed:', error)
    return NextResponse.json({
      error: 'Search test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json()
    
    if (!query) {
      return NextResponse.json({ error: 'Query required' }, { status: 400 })
    }
    
    console.log('Testing search for:', query)
    const results = await searchWeb(query, 3)
    
    return NextResponse.json({
      message: 'Search test completed',
      query: query,
      resultsCount: results.length,
      results: results,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Search test failed:', error)
    return NextResponse.json({
      error: 'Search test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}