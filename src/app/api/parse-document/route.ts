import { NextRequest, NextResponse } from 'next/server'
import { parseDocument } from '@/lib/document-parser'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    console.log('Parsing document:', file.name, file.type, file.size)
    
    const content = await parseDocument(file)
    
    return NextResponse.json({ 
      content,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size
    })
  } catch (error) {
    console.error('Document parsing error:', error)
    return NextResponse.json(
      { error: `Failed to parse document: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    )
  }
}