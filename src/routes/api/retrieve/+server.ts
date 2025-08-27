import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';

const EMBEDDING_API_URL = env.EMBEDDING_API_URL || 'http://localhost:8000/embed';

interface RetrieveRequest {
  query: string;
  k?: number;
}

interface RetrieveResponse {
  matches: Array<{
    id: string;
    content: string;
    document_name: string;
    similarity: number;
  }>;
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
    const { query, k = 5 } = body;

    if (!query || typeof query !== 'string') {
      return json({ error: 'Query string is required' }, { status: 400 });
    }

    if (k < 1 || k > 20) {
      return json({ error: 'k must be between 1 and 20' }, { status: 400 });
    }

    // Get embedding for the query
    const { embedding } = await getEmbedding(query);

    // Use raw SQL for vector similarity search with pgvector
    const sql = `
      SELECT 
        c.id,
        c.content,
        d.name as document_name,
        1 - (c.embedding <=> $1::vector) as similarity
      FROM chunks c
      JOIN documents d ON c.document_id = d.id
      ORDER BY c.embedding <=> $1::vector
      LIMIT $2
    `;

    // Execute the query using the database client
    const { db } = await import('$lib/db');
    const result = await db.execute(sql, [embedding, k]);

    const matches = result.map((row: any) => ({
      id: row.id,
      content: row.content,
      document_name: row.document_name,
      similarity: parseFloat(row.similarity),
    }));

    return json({
      matches,
      query,
      k,
    } as RetrieveResponse);

  } catch (error) {
    console.error('Retrieve error:', error);
    return json(
      { error: 'Failed to retrieve relevant content. Please try again.' },
      { status: 500 }
    );
  }
};
