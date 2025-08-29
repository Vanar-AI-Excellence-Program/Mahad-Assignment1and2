import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { documents, chunks } from '$lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { config } from '$lib/config/env';

const EMBEDDING_API_URL = config.EMBEDDING_API_URL;

interface RetrieveRequest {
  query: string;
  top_k?: number;
}

interface RetrieveResponse {
  chunks: Array<{
    id: string;
    content: string;
    document_name: string;
    chunk_index: number;
    similarity_score: number;
  }>;
  total_chunks: number;
  query: string;
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

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body: RetrieveRequest = await request.json();
    const { query, top_k = 5 } = body;

    if (!query || typeof query !== 'string') {
      return json({ error: 'Query string is required' }, { status: 400 });
    }

    if (top_k < 1 || top_k > 20) {
      return json({ error: 'top_k must be between 1 and 20' }, { status: 400 });
    }

    console.log(`🔍 Processing query: "${query}" (top_k: ${top_k})`);

    // Get embedding for the query
    const { embedding } = await getEmbedding(query);
    console.log(`✅ Query embedded successfully (${embedding.length} dimensions)`);

    // Use pgvector cosine similarity to find most relevant chunks
    // Convert the embedding array to a proper vector format for pgvector
    const embeddingString = `[${embedding.join(',')}]`;
    
    const relevantChunks = await db
      .select({
        id: chunks.id,
        content: chunks.content,
        document_name: documents.name,
        chunk_index: chunks.chunk_index,
        similarity_score: sql<number>`
          (1 - (embedding::vector(3072) <=> ${embeddingString}::vector(3072))) as similarity_score
        `
      })
      .from(chunks)
      .innerJoin(documents, eq(chunks.document_id, documents.id))
      .orderBy(sql`similarity_score DESC`)
      .limit(top_k);

    console.log(`📄 Found ${relevantChunks.length} relevant chunks using vector similarity`);

    if (relevantChunks.length === 0) {
      // Fallback to text-based similarity if no vector results
      console.log('⚠️ No vector results, falling back to text similarity');
      
      const allChunks = await db
        .select({
          id: chunks.id,
          content: chunks.content,
          document_name: documents.name,
          chunk_index: chunks.chunk_index,
        })
        .from(chunks)
        .innerJoin(documents, eq(chunks.document_id, documents.id));

      // Calculate text similarity as fallback
      const chunksWithScores = allChunks
        .map(chunk => ({
          ...chunk,
          similarity_score: calculateTextSimilarity(query, chunk.content)
        }))
        .filter(chunk => chunk.similarity_score > 0.1) // Only include chunks with some relevance
        .sort((a, b) => b.similarity_score - a.similarity_score)
        .slice(0, top_k);

      console.log(`📄 Found ${chunksWithScores.length} chunks using text similarity fallback`);
      
      return json({
        chunks: chunksWithScores,
        total_chunks: chunksWithScores.length,
        query,
      } as RetrieveResponse);
    }

    return json({
      chunks: relevantChunks,
      total_chunks: relevantChunks.length,
      query,
    } as RetrieveResponse);

  } catch (error) {
    console.error('Retrieve error:', error);
    return json(
      { error: 'Failed to retrieve relevant content. Please try again.' },
      { status: 500 }
    );
  }
};

// Helper function to calculate text similarity (fallback method)
function calculateTextSimilarity(query: string, content: string): number {
  const queryWords = query.toLowerCase().split(/\s+/).filter(word => word.length > 2);
  const contentLower = content.toLowerCase();
  
  if (queryWords.length === 0) return 0;
  
  let matchCount = 0;
  for (const word of queryWords) {
    if (contentLower.includes(word)) {
      matchCount++;
    }
  }
  
  return matchCount / queryWords.length;
}
