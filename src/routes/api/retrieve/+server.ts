import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { documents, chunks, embeddings } from '$lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { auth } from '$lib/server/auth';

import { EMBEDDING_API_URL } from '$lib/config/env';

// Use hardcoded URL for testing
const embeddingApiUrl = 'http://localhost:8000';
console.log('Retrieve API - Using embedding API URL:', embeddingApiUrl);

// Helper function to generate embedding for query
async function generateQueryEmbedding(query: string): Promise<number[]> {
    try {
        const response = await fetch(`${embeddingApiUrl}/embed`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text: query,
                model: 'text-embedding-004'
            })
        });

        if (!response.ok) {
            throw new Error(`Embedding API error: ${response.statusText}`);
        }

        const result = await response.json();
        return result.embedding;
    } catch (error) {
        console.error('Error generating query embedding:', error);
        throw new Error('Failed to generate query embedding');
    }
}

// Helper function to calculate cosine similarity
function cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
        throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
        return 0;
    }

    return dotProduct / (normA * normB);
}

export const POST: RequestHandler = async ({ request, cookies }) => {
    try {
        // Get the authenticated user
        const session = await auth(cookies);
        if (!session?.user?.id) {
            return json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { query, conversationId, limit = 5 } = await request.json();

        if (!query) {
            return json({ error: 'Query is required' }, { status: 400 });
        }

        // Generate embedding for the query
        const queryEmbedding = await generateQueryEmbedding(query);

        // Get all embeddings for the user's documents
        let whereCondition = eq(documents.userId, session.user.id);
        if (conversationId) {
            whereCondition = and(whereCondition, eq(documents.conversationId, conversationId));
        }

        const allEmbeddings = await db.select({
            embedding: embeddings.embedding,
            chunkId: embeddings.chunkId,
            chunkContent: chunks.content,
            chunkIndex: chunks.chunkIndex,
            documentId: chunks.documentId,
            documentFilename: documents.filename,
            metadata: chunks.metadata
        })
        .from(embeddings)
        .innerJoin(chunks, eq(embeddings.chunkId, chunks.id))
        .innerJoin(documents, eq(chunks.documentId, documents.id))
        .where(whereCondition);

        // Calculate similarities and sort by relevance
        const similarities = allEmbeddings.map(item => {
            const storedEmbedding = JSON.parse(item.embedding);
            const similarity = cosineSimilarity(queryEmbedding, storedEmbedding);
            
            return {
                ...item,
                similarity,
                chunkContent: item.chunkContent,
                metadata: JSON.parse(item.metadata || '{}')
            };
        });

        // Sort by similarity (highest first) and take top results
        const topResults = similarities
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, limit);

        // Group results by document
        const groupedResults = topResults.reduce((acc, result) => {
            const docId = result.documentId;
            if (!acc[docId]) {
                acc[docId] = {
                    documentId: docId,
                    filename: result.documentFilename,
                    chunks: []
                };
            }
            acc[docId].chunks.push({
                content: result.chunkContent,
                similarity: result.similarity,
                chunkIndex: result.chunkIndex,
                metadata: result.metadata
            });
            return acc;
        }, {} as Record<string, any>);

        // Convert to array and sort by average similarity
        const results = Object.values(groupedResults).map((doc: any) => ({
            ...doc,
            averageSimilarity: doc.chunks.reduce((sum: number, chunk: any) => sum + chunk.similarity, 0) / doc.chunks.length
        })).sort((a: any, b: any) => b.averageSimilarity - a.averageSimilarity);

        return json({
            query,
            results,
            totalChunks: allEmbeddings.length,
            retrievedChunks: topResults.length
        });

    } catch (error) {
        console.error('Retrieval error:', error);
        return json({ 
            error: 'Failed to retrieve relevant documents',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
};

// Get available documents for a user
export const GET: RequestHandler = async ({ url, cookies }) => {
    try {
        const session = await auth(cookies);
        if (!session?.user?.id) {
            return json({ error: 'Unauthorized' }, { status: 401 });
        }

        const conversationId = url.searchParams.get('conversationId');

        let whereCondition = eq(documents.userId, session.user.id);
        if (conversationId) {
            whereCondition = and(whereCondition, eq(documents.conversationId, conversationId));
        }

        const userDocuments = await db.select({
            id: documents.id,
            filename: documents.filename,
            fileType: documents.fileType,
            fileSize: documents.fileSize,
            status: documents.status,
            createdAt: documents.createdAt
        })
        .from(documents)
        .where(whereCondition);

        // Get chunk counts for each document
        const documentsWithChunkCounts = await Promise.all(
            userDocuments.map(async (doc) => {
                const chunkCount = await db.select().from(chunks).where(eq(chunks.documentId, doc.id));
                return {
                    ...doc,
                    chunkCount: chunkCount.length
                };
            })
        );

        return json({
            documents: documentsWithChunkCounts
        });

    } catch (error) {
        console.error('Error fetching documents:', error);
        return json({ error: 'Failed to fetch documents' }, { status: 500 });
    }
};
