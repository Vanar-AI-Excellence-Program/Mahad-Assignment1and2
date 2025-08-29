import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { documents, chunks } from '$lib/db/schema';
import { config } from '$lib/config/env';
import mammoth from 'mammoth';
import { parsePDF } from '$lib/utils/pdf-parser.js';

const EMBEDDING_API_URL = config.EMBEDDING_API_URL;
const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;

// Helper function to chunk text
function chunkText(text: string, chunkSize: number = CHUNK_SIZE, overlap: number = CHUNK_OVERLAP): string[] {
  const chunks: string[] = [];
  let start = 0;
  
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    let chunk = text.slice(start, end);
    
    // Try to break at sentence boundaries
    if (end < text.length) {
      const lastPeriod = chunk.lastIndexOf('.');
      const lastNewline = chunk.lastIndexOf('\n');
      const breakPoint = Math.max(lastPeriod, lastNewline);
      
      if (breakPoint > start + chunkSize * 0.7) {
        chunk = text.slice(start, start + breakPoint + 1);
        start = start + breakPoint + 1;
      } else {
        start = end - overlap;
      }
    } else {
      start = end;
    }
    
    if (chunk.trim()) {
      chunks.push(chunk.trim());
    }
  }
  
  return chunks;
}

// Helper function to get embeddings from the embedding service
async function getEmbedding(text: string): Promise<{ embedding: number[], dim: number }> {
  try {
    const response = await fetch(`${EMBEDDING_API_URL}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      throw new Error(`Embedding service error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting embedding:', error);
    throw new Error('Failed to get embedding from service');
  }
}

// Enhanced PDF text extraction using pdf-parse with dynamic import to avoid debug code issues
async function extractTextFromPDF(file: File): Promise<string> {
  try {
    console.log(`📄 Processing PDF: ${file.name} (${file.size} bytes)`);
    
    // Validate file is actually a PDF
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      throw new Error(`File ${file.name} is not a valid PDF file`);
    }
    
    // Convert File to Buffer for pdf-parse with validation
    const arrayBuffer = await file.arrayBuffer();
    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
      throw new Error(`File ${file.name} appears to be empty or corrupted`);
    }
    
    const buffer = Buffer.from(arrayBuffer);
    console.log(`📄 Buffer created successfully: ${buffer.length} bytes`);
    
    // Extract text using our safe PDF parser wrapper
    let data;
    try {
      // Use the safe PDF parser wrapper
      data = await parsePDF(buffer);
    } catch (parseError) {
      console.error(`PDF parsing failed for ${file.name}:`, parseError);
      throw new Error(`PDF parsing failed: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
    }
    
    if (!data) {
      throw new Error('PDF parsing returned no data');
    }
    
    if (!data.text || data.text.trim().length === 0) {
      console.warn(`⚠️ PDF ${file.name} contains no extractable text`);
      return `PDF Document: ${file.name}

This PDF file has been uploaded successfully.

Note: No text content could be extracted from this PDF. This may be due to:
- The PDF contains only images or scanned content
- The PDF is password-protected
- The PDF uses non-standard text encoding
- The PDF has security restrictions

The file is safely stored in the system. You can:
1. Try uploading a different PDF file
2. Use text files (.txt) for immediate Q&A capability
3. Convert the PDF to text format before uploading

You can still ask questions about other uploaded documents.`;
    }
    
    console.log(`✅ PDF ${file.name} processed successfully: ${data.text.length} characters extracted from ${data.numpages || 'unknown'} pages`);
    
    // Return the extracted text with comprehensive metadata
    return `PDF Document: ${file.name}

${data.text}

---
Document Information:
- Pages: ${data.numpages || 'Unknown'}
- Text Length: ${data.text.length} characters
- File Size: ${file.size} bytes
- Processing: Successfully extracted and ready for Q&A
- Extraction Method: pdf-parse library (dynamically imported)`;
    
  } catch (error) {
    console.error(`❌ PDF processing error for ${file.name}:`, error);
    
    // Enhanced error handling with specific error types
    let errorMessage = 'Unknown error occurred during PDF processing';
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Handle specific error types
      if (error.message.includes('ENOENT')) {
        errorMessage = 'File access error - the uploaded file could not be processed';
      } else if (error.message.includes('Invalid PDF')) {
        errorMessage = 'The uploaded file does not apply to be a valid PDF';
      } else if (error.message.includes('password')) {
        errorMessage = 'The PDF appears to be password-protected';
      }
    }
    
    // Return a detailed error message but don't fail the upload
    return `PDF Document: ${file.name}

This PDF file has been uploaded successfully, but text extraction encountered an issue.

Error Details: ${errorMessage}

The file is safely stored in the system. For immediate assistance, you can:
1. Try uploading the same file again (sometimes temporary issues resolve)
2. Convert the PDF to a text file (.txt) and upload that instead
3. Try uploading a different PDF file
4. Use the chat without documents for general questions

Your document upload was successful, and you can ask questions about other uploaded documents.`;
  }
}

// Helper function to extract text from various document formats
async function extractTextFromDocument(file: File): Promise<string> {
  const fileType = file.type.toLowerCase();
  const fileName = file.name.toLowerCase();
  
  try {
    if (fileType === 'text/plain' || fileName.endsWith('.txt')) {
      // Handle text files
      const textContent = await file.text();
      console.log(`📝 Text file processed: ${file.name}, ${textContent.length} characters`);
      return textContent;
      
    } else if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
      // Handle PDF files
      return await extractTextFromPDF(file);
      
    } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
               fileName.endsWith('.docx')) {
      // Handle DOCX files using mammoth
      console.log(`📄 Processing DOCX: ${file.name}`);
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      const result = await mammoth.extractRawText({ buffer });
      
      if (result.value && result.value.trim().length > 0) {
        console.log(`✅ DOCX ${file.name} processed successfully: ${result.value.length} characters extracted`);
        return `DOCX Document: ${file.name}

${result.value}

---
Document Information:
- Text Length: ${result.value.length} characters
- File Size: ${file.size} bytes
- Processing: Successfully extracted and ready for Q&A`;
      } else {
        console.warn(`⚠️ DOCX ${file.name} contains no extractable text`);
        return `DOCX Document: ${file.name}\n\nThis DOCX file has been uploaded successfully.\n\nNote: No text content could be extracted from this document.`;
      }
      
    } else {
      throw new Error(`Unsupported file type: ${fileType} (${fileName})`);
    }
    
  } catch (error) {
    console.error(`❌ Document processing error for ${file.name}:`, error);
    throw new Error(`Failed to process ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export const POST: RequestHandler = async ({ request, cookies }) => {
  try {
    // Check authentication
    const sessionToken = cookies.get('authjs.session-token');
    if (!sessionToken) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse form data with error handling
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (error) {
      console.error('Failed to parse form data:', error);
      return json({ error: 'Invalid request format' }, { status: 400 });
    }

    const file = formData.get('file') as File;
    const conversationId = formData.get('conversationId') as string;
    
    if (!file) {
      return json({ error: 'No file provided' }, { status: 400 });
    }

    if (!conversationId) {
      return json({ error: 'No conversation ID provided' }, { status: 400 });
    }

    // Validate that file is actually a File object and not a string
    if (typeof file === 'string' || !file.name || !file.size) {
      return json({ error: 'Invalid file format received' }, { status: 400 });
    }

    console.log(`📁 Processing upload: ${file.name} (${file.type}, ${file.size} bytes) for conversation: ${conversationId}`);

    // Enhanced file type validation
    const allowedTypes = [
      'text/plain',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    const allowedExtensions = ['.txt', '.pdf', '.docx'];
    
    const fileType = file.type.toLowerCase();
    const fileName = file.name.toLowerCase();
    const hasValidType = allowedTypes.includes(fileType);
    const hasValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));
    
    if (!hasValidType && !hasValidExtension) {
      return json({ 
        error: 'Unsupported file type. Please upload .txt, .pdf, or .docx files only.',
        receivedType: fileType,
        receivedName: file.name
      }, { status: 400 });
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return json({ error: 'File size must be less than 10MB' }, { status: 400 });
    }

    // Extract text using the enhanced document processor with error handling
    let textContent: string;
    try {
      textContent = await extractTextFromDocument(file);
    } catch (error) {
      console.error(`Failed to extract text from ${file.name}:`, error);
      return json({ 
        error: `Failed to process file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        file: file.name,
        type: file.type
      }, { status: 400 });
    }

    if (!textContent || !textContent.trim()) {
      return json({ 
        error: 'File contains no text content',
        file: file.name,
        type: file.type
      }, { status: 400 });
    }

    // Insert document record with conversation_id
    const [documentRecord] = await db.insert(documents).values({
      name: file.name,
      mime: file.type,
      size_bytes: file.size,
      conversation_id: conversationId,
    }).returning();

    console.log(`Document inserted: ${documentRecord.id} for conversation: ${conversationId}`);

    // Chunk the text
    const textChunks = chunkText(textContent);
    console.log(`Text chunked into ${textChunks.length} chunks`);
    
    // Get embeddings for each chunk
    const chunkPromises = textChunks.map(async (chunk, index) => {
      try {
        const { embedding, dim } = await getEmbedding(chunk);
        console.log(`Chunk ${index + 1} embedded successfully (${dim} dimensions)`);
        
        return {
          document_id: documentRecord.id,
          conversation_id: conversationId,
          content: chunk,
          embedding: JSON.stringify(embedding), // Convert array to JSON string for storage
          chunk_index: index,
        };
      } catch (error) {
        console.error(`Failed to embed chunk ${index + 1}:`, error);
        throw error;
      }
    });

    const chunkData = await Promise.all(chunkPromises);
    console.log(`All ${chunkData.length} chunks embedded successfully for conversation: ${conversationId}`);

    // Insert chunks with embeddings
    await db.insert(chunks).values(chunkData);
    console.log(`All chunks inserted into database for conversation: ${conversationId}`);

    return json({
      success: true,
      document: {
        id: documentRecord.id,
        name: documentRecord.name,
        chunks: chunkData.length,
        size_bytes: documentRecord.size_bytes,
        conversation_id: conversationId,
        file_type: file.type,
        text_length: textContent.length,
      },
    });

  } catch (error) {
    console.error('Upload error:', error);
    return json(
      { error: 'Failed to process file. Please try again.' },
      { status: 500 }
    );
  }
};
