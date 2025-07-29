// Simple PDF parser fallback for when full PDF.js causes build issues
export async function parsePDF(buffer: ArrayBuffer): Promise<string> {
  try {
    console.log('PDF: Starting basic PDF parse, buffer size:', buffer.byteLength)
    
    // For now, return a placeholder. In production, you might want to use a different
    // PDF parsing library or implement a server-side service
    const fileSize = Math.round(buffer.byteLength / 1024)
    return `[PDF document - ${fileSize}KB - Text extraction temporarily disabled for build compatibility. Please use a text file or copy/paste the content directly.]`
    
  } catch (error) {
    console.error('PDF: Error with basic PDF handling:', error)
    throw new Error(`Failed to parse PDF: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}