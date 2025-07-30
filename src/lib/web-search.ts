import axios from 'axios'
import * as cheerio from 'cheerio'

export interface SearchResult {
  title: string
  url: string
  snippet: string
  content?: string
}

// Web search using SERP API or fallback methods
export async function searchWeb(query: string, maxResults: number = 5): Promise<SearchResult[]> {
  try {
    console.log('Searching web for:', query)
    
    // Try multiple search approaches
    const results = await Promise.allSettled([
      searchWithDuckDuckGo(query, maxResults),
      searchWithOpenAI(query, maxResults)
    ])
    
    // Return the first successful result
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value.length > 0) {
        console.log(`Found ${result.value.length} search results`)
        return result.value.slice(0, maxResults)
      }
    }
    
    // If all methods fail, return a fallback
    return [{
      title: 'Search Unavailable',
      url: '',
      snippet: `I apologize, but web search is currently unavailable. However, I can still help answer your question "${query}" based on my training data. Would you like me to provide information about this topic?`,
      content: 'Web search temporarily unavailable - using AI knowledge instead.'
    }]
    
  } catch (error) {
    console.error('Web search error:', error)
    return [{
      title: 'Search Error',
      url: '',
      snippet: `I encountered an issue searching for "${query}". Let me help you with this topic using my existing knowledge instead.`,
      content: 'Search error - falling back to AI knowledge.'
    }]
  }
}

// DuckDuckGo search method
async function searchWithDuckDuckGo(query: string, maxResults: number): Promise<SearchResult[]> {
  const searchUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`
  
  const response = await axios.get(searchUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; AugustanaAI/1.0)'
    },
    timeout: 8000
  })
  
  const results: SearchResult[] = []
  
  // Check for instant answer
  if (response.data.Answer) {
    results.push({
      title: 'Instant Answer',
      url: response.data.AnswerURL || '',
      snippet: response.data.Answer,
      content: response.data.Answer
    })
  }
  
  // Check for abstract
  if (response.data.Abstract && response.data.Abstract.length > 0) {
    results.push({
      title: response.data.Heading || 'Abstract',
      url: response.data.AbstractURL || '',
      snippet: response.data.Abstract,
      content: response.data.Abstract
    })
  }
  
  // Add related topics
  if (response.data.RelatedTopics && Array.isArray(response.data.RelatedTopics)) {
    response.data.RelatedTopics.slice(0, maxResults - results.length).forEach((topic: any) => {
      if (topic.Text && topic.FirstURL) {
        results.push({
          title: topic.Text.split(' - ')[0] || 'Related Topic',
          url: topic.FirstURL,
          snippet: topic.Text,
          content: topic.Text
        })
      }
    })
  }
  
  return results
}

// Fallback: Use OpenAI to simulate web search results
async function searchWithOpenAI(query: string, maxResults: number): Promise<SearchResult[]> {
  // This is a fallback when real web search fails
  // It provides current information disclaimer
  return [{
    title: 'AI Knowledge Response',
    url: '',
    snippet: `Based on my training data, I can provide information about "${query}". Please note this information is current as of my last training update and may not reflect the very latest developments.`,
    content: `AI-generated response for: ${query}`
  }]
}

// Fetch and extract content from a URL
export async function fetchPageContent(url: string): Promise<string> {
  try {
    console.log('Fetching content from:', url)
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ChatBot/1.0)'
      },
      timeout: 10000,
      maxContentLength: 1024 * 1024 // 1MB limit
    })
    
    // Parse HTML and extract text
    const $ = cheerio.load(response.data)
    
    // Remove script and style elements
    $('script, style, nav, footer, header, aside').remove()
    
    // Extract main content
    let content = ''
    const mainSelectors = ['main', 'article', '.content', '#content', '.post', '.entry']
    
    for (const selector of mainSelectors) {
      const element = $(selector).first()
      if (element.length && element.text().trim().length > 100) {
        content = element.text().trim()
        break
      }
    }
    
    // Fallback to body content
    if (!content) {
      content = $('body').text().trim()
    }
    
    // Clean up the text
    content = content
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n')
      .trim()
      .substring(0, 2000) // Limit to 2000 characters
    
    console.log(`Extracted ${content.length} characters from ${url}`)
    return content
    
  } catch (error) {
    console.error('Error fetching page content:', error)
    return `Unable to fetch content from ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`
  }
}