import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { documents, chunks, embeddings } from '$lib/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '$lib/server/auth';

import { EMBEDDING_API_URL } from '$lib/config/env';

// Use hardcoded URL for testing
const embeddingApiUrl = 'http://localhost:8000';
console.log('Using embedding API URL:', embeddingApiUrl);

// Helper function to chunk text
function chunkText(text: string, chunkSize: number = 1000, overlap: number = 200): string[] {
    const chunks: string[] = [];
    let start = 0;
    
    // Safety check for empty or very short text
    if (!text || text.length === 0) {
        return [];
    }
    
    // Limit chunk size to prevent memory issues
    const maxChunkSize = Math.min(chunkSize, 5000);
    const maxOverlap = Math.min(overlap, maxChunkSize - 100);
    
    console.log(`Chunking text of length ${text.length} with chunk size ${maxChunkSize} and overlap ${maxOverlap}`);
    
    while (start < text.length) {
        const end = Math.min(start + maxChunkSize, text.length);
        const chunk = text.slice(start, end);
        
        // Only add non-empty chunks
        if (chunk.trim().length > 0) {
            chunks.push(chunk);
        }
        
        // Move to next chunk position
        start = end;
        
        // If we have overlap and there's more text, adjust start position
        if (maxOverlap > 0 && start < text.length) {
            start = Math.max(0, start - maxOverlap);
        }
        
        // Safety check to prevent infinite loops
        if (start >= text.length) break;
        
        // Additional safety check to prevent too many chunks
        if (chunks.length > 100) {
            console.warn('Too many chunks generated, stopping at 100');
            break;
        }
    }
    
    console.log(`Generated ${chunks.length} chunks`);
    return chunks;
}

// Helper function to generate embeddings
async function generateEmbeddings(texts: string[]): Promise<number[][]> {
    try {
        console.log('Embedding API URL:', embeddingApiUrl);
        console.log('Making request to:', `${embeddingApiUrl}/embed/batch`);
        
        const response = await fetch(`${embeddingApiUrl}/embed/batch`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                texts: texts,
                model: 'text-embedding-004'
            })
        });

        console.log('Response status:', response.status);
        console.log('Response status text:', response.statusText);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error response body:', errorText);
            throw new Error(`Embedding API error: ${response.statusText}`);
        }

        const result = await response.json();
        console.log('Successfully generated embeddings for', texts.length, 'texts');
        return result.embeddings;
    } catch (error) {
        console.error('Error generating embeddings:', error);
        throw new Error('Failed to generate embeddings');
    }
}

export const POST: RequestHandler = async ({ request, cookies }) => {
    try {
        // Get the authenticated user
        const session = await auth(cookies);
        if (!session?.user?.id) {
            return json({ error: 'Unauthorized' }, { status: 401 });
        }

        const formData = await request.formData();
        const file = formData.get('file') as File;
        const conversationId = formData.get('conversationId') as string;

        if (!file) {
            return json({ error: 'No file provided' }, { status: 400 });
        }

        // Validate file type
        const allowedTypes = ['text/plain', 'application/pdf'];
        if (!allowedTypes.includes(file.type)) {
            return json({ error: 'Only .txt and .pdf files are supported' }, { status: 400 });
        }

        // Read file content
        let content: string;
        if (file.type === 'text/plain') {
            content = await file.text();
        } else if (file.type === 'application/pdf') {
            // Parse PDF using the embedding service
            try {
                console.log('Parsing PDF file:', file.name);
                
                const formData = new FormData();
                formData.append('file', file);
                
                const pdfResponse = await fetch(`${embeddingApiUrl}/parse-pdf`, {
                    method: 'POST',
                    body: formData
                });
                
                if (!pdfResponse.ok) {
                    const errorText = await pdfResponse.text();
                    console.error('PDF parsing error:', errorText);
                    throw new Error(`PDF parsing failed: ${pdfResponse.statusText}`);
                }
                
                const pdfResult = await pdfResponse.json();
                content = pdfResult.text;
                console.log(`Successfully parsed PDF: ${pdfResult.pages} pages, ${content.length} characters`);
            } catch (error) {
                console.error('Error parsing PDF:', error);
                return json({ 
                    error: 'Failed to parse PDF file',
                    details: error instanceof Error ? error.message : 'Unknown error'
                }, { status: 400 });
            }
        } else {
            return json({ error: 'Unsupported file type' }, { status: 400 });
        }

        // Create document record
        const [document] = await db.insert(documents).values({
            userId: session.user.id,
            conversationId: conversationId || null,
            filename: file.name,
            originalContent: content,
            fileType: file.type,
            fileSize: file.size,
            status: 'processing'
        }).returning();

        // Chunk the content
        console.log('Document content length:', content.length);
        const textChunks = chunkText(content);
        console.log(`Created ${textChunks.length} chunks from document`);
        console.log('First chunk preview:', textChunks[0]?.substring(0, 100));

        // Generate embeddings for chunks
        const chunkEmbeddings = await generateEmbeddings(textChunks);
        console.log(`Generated ${chunkEmbeddings.length} embeddings`);

        // Store chunks and embeddings
        for (let i = 0; i < textChunks.length; i++) {
            const chunk = textChunks[i];
            const embedding = chunkEmbeddings[i];

            // Insert chunk
            const [chunkRecord] = await db.insert(chunks).values({
                documentId: document.id,
                content: chunk,
                chunkIndex: i,
                startChar: content.indexOf(chunk),
                endChar: content.indexOf(chunk) + chunk.length,
                metadata: JSON.stringify({
                    filename: file.name,
                    chunkIndex: i,
                    totalChunks: textChunks.length
                })
            }).returning();

            // Insert embedding
            await db.insert(embeddings).values({
                chunkId: chunkRecord.id,
                embedding: JSON.stringify(embedding),
                model: 'text-embedding-004',
                dimensions: embedding.length
            });
        }

        // Update document status to completed
        await db.update(documents)
            .set({ status: 'completed' })
            .where(eq(documents.id, document.id));

        return json({
            success: true,
            documentId: document.id,
            chunks: textChunks.length,
            message: 'Document uploaded and processed successfully'
        });

    } catch (error) {
        console.error('Upload error:', error);
        return json({ 
            error: 'Failed to upload document',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
};

// Get documents for a conversation
export const GET: RequestHandler = async ({ request, url, cookies }) => {
    try {
        const session = await auth(cookies);
        if (!session?.user?.id) {
            return json({ error: 'Unauthorized' }, { status: 401 });
        }

        const conversationId = url.searchParams.get('conversationId');

        let query = db.select().from(documents).where(eq(documents.userId, session.user.id));
        
        if (conversationId) {
            query = query.where(eq(documents.conversationId, conversationId));
        }

        const userDocuments = await query;

        return json({
            documents: userDocuments
        });

    } catch (error) {
        console.error('Error fetching documents:', error);
        return json({ error: 'Failed to fetch documents' }, { status: 500 });
    }
};
