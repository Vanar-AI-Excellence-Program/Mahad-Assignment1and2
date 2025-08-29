// Interface for retrieved context
export interface RetrievedContext {
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

// Interface for enhanced prompt
export interface EnhancedPrompt {
  systemPrompt: string;
  context: RetrievedContext | null;
  citations: string[];
}

/**
 * Build an enhanced system prompt that includes retrieved context
 */
export function buildEnhancedPrompt(basePrompt: string, context: RetrievedContext | null): string {
  if (!context || context.chunks.length === 0) {
    return basePrompt;
  }

  // Filter chunks with good similarity scores (above 0.3 for vector similarity, 0.2 for text)
  const relevantChunks = context.chunks.filter(chunk => chunk.similarity_score > 0.2);
  
  if (relevantChunks.length === 0) {
    console.log('[RAG] No chunks with sufficient relevance score, using base prompt');
    return basePrompt;
  }

  const contextSection = `
## 📚 Relevant Document Context

The user has uploaded documents that contain relevant information. Here are the most relevant excerpts:

${relevantChunks.map((chunk, index) => `
**Document ${index + 1}**: ${chunk.document_name}
**Content**: ${chunk.content}
**Relevance Score**: ${chunk.similarity_score.toFixed(4)}
`).join('\n')}

## 🎯 Instructions

IMPORTANT: Use the above document context to provide accurate, specific answers to the user's question. 

1. **Always reference the source documents** when providing information
2. **Cite the document name** when using information from it
3. **Be specific** about what information comes from which document
4. **If the context doesn't contain enough information** to fully answer the question, say so clearly and provide what information you can from the available context
5. **Don't make up information** that isn't supported by the documents
6. **Use the exact document names** when citing sources

## 📝 Response Format

When answering:
- Start with a direct answer based on the documents
- Cite specific documents: "According to [Document Name]..."
- If you need to clarify or expand, reference the relevant document sections
- End with a summary of which documents were most helpful

${basePrompt}`;

  return contextSection;
}

/**
 * Generate citations for the retrieved context
 */
export function generateCitations(context: RetrievedContext): string[] {
  return context.chunks.map((chunk, index) => 
    `[Document ${index + 1}]: ${chunk.document_name} (Chunk ${chunk.chunk_index + 1})`
  );
}

/**
 * Check if a query is asking about uploaded documents
 */
export function isDocumentQuery(query: string): boolean {
  const documentKeywords = [
    'document', 'file', 'upload', 'pdf', 'text', 'content', 'what does', 'what is in',
    'tell me about', 'explain', 'summarize', 'what says', 'according to', 'in the document',
    'what is', 'who is', 'where is', 'when is', 'how is', 'why is', 'describe', 'analyze',
    'find', 'search', 'look for', 'show me', 'give me', 'what can you tell me'
  ];
  
  const lowerQuery = query.toLowerCase();
  return documentKeywords.some(keyword => lowerQuery.includes(keyword));
}

/**
 * Smart context retrieval that adapts based on query type
 */
export async function smartRetrieveContext(query: string): Promise<RetrievedContext | null> {
  try {
    // For document-specific queries, use more chunks
    if (isDocumentQuery(query)) {
      console.log('[RAG] Document-specific query detected, retrieving more context');
      return null; // This will be handled by the calling function with direct database access
    }
    
    // For general queries, use fewer chunks
    return null; // This will be handled by the calling function with direct database access
  } catch (error) {
    console.error('[RAG] Error in smart context retrieval:', error);
    return null;
  }
}

/**
 * Retrieve relevant context from uploaded documents using direct database queries
 * This function is designed to be called from server-side code with database access
 */
export async function retrieveContextDirect(
  query: string, 
  db: any, 
  chunks: any, 
  documents: any, 
  sql: any, 
  eq: any,
  k: number = 5
): Promise<RetrievedContext | null> {
  try {
    console.log(`🔍 [RAG] Retrieving context directly from database for query: "${query}"`);
    
    // Get embedding for the query using the embedding service
    const embeddingResponse = await fetch(`${process.env.EMBEDDING_API_URL || 'http://localhost:8000/embed'}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: query }),
    });

    if (!embeddingResponse.ok) {
      console.warn(`[RAG] Embedding service error: ${embeddingResponse.status}`);
      return null;
    }

    const { embedding } = await embeddingResponse.json();
    
    // Use pgvector cosine similarity to find most relevant chunks
    const embeddingString = `[${embedding.join(',')}]`;
    
    const relevantChunks = await db
      .select({
        id: chunks.id,
        content: chunks.content,
        document_name: documents.name,
        chunk_index: chunks.chunk_index,
        similarity_score: sql<number>`
          (1 - (embedding <=> ${embeddingString}::vector)) as similarity_score
        `
      })
      .from(chunks)
      .innerJoin(documents, eq(chunks.document_id, documents.id))
      .orderBy(sql`similarity_score DESC`)
      .limit(k);

    console.log(`📄 Found ${relevantChunks.length} relevant chunks using vector similarity`);

    if (relevantChunks.length === 0) {
      console.log('[RAG] No vector results found');
      return null;
    }

    const context: RetrievedContext = {
      chunks: relevantChunks,
      total_chunks: relevantChunks.length,
      query
    };

    console.log(`✅ [RAG] Retrieved ${context.chunks.length} relevant chunks for query: "${query.substring(0, 50)}..."`);
    return context;

  } catch (error) {
    console.error('[RAG] Error retrieving context directly:', error);
    return null;
  }
}
