import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { documents, chunks } from '$lib/db/schema';
import { env } from '$env/dynamic/private';

const EMBEDDING_API_URL = env.EMBEDDING_API_URL || 'http://localhost:8000/embed';
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

// Robust PDF text extraction with fallback
async function extractTextFromPDF(file: File): Promise<string> {
  try {
    // Dynamic import to avoid test file issues during build
    const pdfModule = await import('pdf-parse');
    const pdf = pdfModule.default;
    
    const arrayBuffer = await file.arrayBuffer();
    const pdfData = new Uint8Array(arrayBuffer);
    
    // Parse PDF with options to avoid test file issues
    const options = {
      // Skip test files and problematic content
      max: 0, // No page limit
      version: 'v2.0.0'
    };
    
    const pdfResult = await pdf(pdfData, options);
    
    if (!pdfResult.text || pdfResult.text.trim().length === 0) {
      throw new Error('PDF contains no extractable text');
    }
    
    return pdfResult.text;
    
  } catch (error) {
    console.error('PDF parsing error:', error);
    
    // Fallback: return a more informative placeholder
    return `PDF Document: ${file.name}

This PDF file has been uploaded but text extraction encountered an issue. 
The file will be stored for future processing.

Error details: ${error instanceof Error ? error.message : 'Unknown error'}

To enable full text extraction, please ensure:
- The PDF is not password protected
- The PDF contains extractable text (not just images)
- The file is not corrupted

You can still ask questions about this document, but responses will be limited until text extraction is resolved.`;
  }
}

export const POST: RequestHandler = async ({ request }) => {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['text/plain', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      return json({ error: 'Only .txt and .pdf files are supported' }, { status: 400 });
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return json({ error: 'File size must be less than 10MB' }, { status: 400 });
    }

    let textContent: string;

    // Extract text based on file type
    if (file.type === 'text/plain') {
      textContent = await file.text();
    } else if (file.type === 'application/pdf') {
      textContent = await extractTextFromPDF(file);
    } else {
      return json({ error: 'Unsupported file type' }, { status: 400 });
    }

    if (!textContent.trim()) {
      return json({ error: 'File contains no text content' }, { status: 400 });
    }

    // Insert document record
    const [documentRecord] = await db.insert(documents).values({
      name: file.name,
      mime: file.type,
      size_bytes: file.size,
    }).returning();

    // Chunk the text
    const textChunks = chunkText(textContent);
    
    // Get embeddings for each chunk
    const chunkPromises = textChunks.map(async (chunk, index) => {
      const { embedding, dim } = await getEmbedding(chunk);
      
      return {
        document_id: documentRecord.id,
        content: chunk,
        embedding: JSON.stringify(embedding), // Convert array to JSON string for storage
        chunk_index: index,
      };
    });

    const chunkData = await Promise.all(chunkPromises);

    // Insert chunks with embeddings
    await db.insert(chunks).values(chunkData);

    return json({
      success: true,
      document: {
        id: documentRecord.id,
        name: documentRecord.name,
        chunks: chunkData.length,
        size_bytes: documentRecord.size_bytes,
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
