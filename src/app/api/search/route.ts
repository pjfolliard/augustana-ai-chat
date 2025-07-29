import { NextRequest, NextResponse } from 'next/server'
import { searchWeb, fetchPageContent } from '@/lib/web-search'

export async function POST(request: NextRequest) {
  try {
    const { query, fetchContent = false } = await request.json()

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      )
    }

    console.log('API: Searching for:', query)
    
    // Perform web search
    const searchResults = await searchWeb(query, 5)
    
    // Optionally fetch full content from top results
    if (fetchContent && searchResults.length > 0) {
      console.log('API: Fetching content from top results')
      
      for (let i = 0; i < Math.min(3, searchResults.length); i++) {
        const result = searchResults[i]
        if (result.url && result.url.startsWith('http')) {
          try {
            const content = await fetchPageContent(result.url)
            result.content = content
          } catch (error) {
            console.error(`Failed to fetch content from ${result.url}:`, error)
          }
        }
      }
    }
    
    return NextResponse.json({ 
      query,
      results: searchResults,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Search API error:', error)
    return NextResponse.json(
      { error: `Search failed: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    )
  }
}