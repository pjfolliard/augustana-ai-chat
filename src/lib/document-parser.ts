import * as mammoth from 'mammoth'
import { parsePDF } from './pdf-parser'

export async function parseDocument(file: File): Promise<string> {
  console.log('Parsing document:', file.name, file.type, file.size)
  
  try {
    const buffer = await file.arrayBuffer()
    console.log('Buffer created, size:', buffer.byteLength)
    
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      console.log('Parsing as PDF')
      return await parsePDF(buffer)
    } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.name.toLowerCase().endsWith('.docx')) {
      console.log('Parsing as DOCX')
      const result = await mammoth.extractRawText({ buffer: Buffer.from(buffer) })
      console.log('DOCX parsed, text length:', result.value.length)
      return result.value || '[DOCX contains no readable text]'
    } else if (file.type === 'application/msword' || file.name.toLowerCase().endsWith('.doc')) {
      console.log('Parsing as DOC')
      const result = await mammoth.extractRawText({ buffer: Buffer.from(buffer) })
      console.log('DOC parsed, text length:', result.value.length)
      return result.value || '[DOC contains no readable text]'
    } else if (file.type.startsWith('text/') || file.type === 'application/json') {
      console.log('Parsing as text file')
      const text = new TextDecoder().decode(buffer)
      return text
    } else {
      console.log('Unsupported file type:', file.type)
      return `[${file.type} file - content cannot be extracted]`
    }
  } catch (error) {
    console.error('Error parsing document:', error)
    return `[Error parsing ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}]`
  }
}