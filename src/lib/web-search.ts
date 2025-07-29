import axios from 'axios'
import * as cheerio from 'cheerio'

export interface SearchResult {
  title: string
  url: string
  snippet: string
  content?: string
}

// Simple web search using DuckDuckGo (no API key required)
export async function searchWeb(query: string, maxResults: number = 5): Promise<SearchResult[]> {
  try {
    console.log('Searching web for:', query)
    
    // Use DuckDuckGo instant answers API (free, no key required)
    const searchUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`
    
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ChatBot/1.0)'
      },
      timeout: 10000
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
    
    console.log(`Found ${results.length} search results`)
    return results.slice(0, maxResults)
    
  } catch (error) {
    console.error('Web search error:', error)
    return [{
      title: 'Search Error',
      url: '',
      snippet: `Unable to search the web: ${error instanceof Error ? error.message : 'Unknown error'}`,
      content: 'Web search is currently unavailable. Please try again later.'
    }]
  }
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