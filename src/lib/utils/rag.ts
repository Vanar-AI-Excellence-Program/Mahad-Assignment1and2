interface RetrievedChunk {
  id: string;
  content: string;
  document_name: string;
  similarity: number;
}

interface RetrieveResponse {
  matches: RetrievedChunk[];
  query: string;
  k: number;
}

/**
 * Retrieve relevant context for a user query using the RAG system
 * @param userQuery - The user's question or query
 * @param k - Number of top chunks to retrieve (default: 5)
 * @returns Concatenated context from top-k most similar chunks
 */
export async function retrieveContext(userQuery: string, k: number = 5): Promise<string> {
  try {
    const response = await fetch('/api/retrieve', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: userQuery, k }),
    });

    if (!response.ok) {
      console.warn('Failed to retrieve context, proceeding without RAG');
      return '';
    }

    const data: RetrieveResponse = await response.json();
    
    if (!data.matches || data.matches.length === 0) {
      return '';
    }

    // Format the context with document sources
    const contextParts = data.matches.map((chunk, index) => {
      return `[Source ${index + 1}: ${chunk.document_name}]\n${chunk.content}`;
    });

    const context = contextParts.join('\n\n');
    
    console.log(`Retrieved ${data.matches.length} relevant chunks for query: "${userQuery}"`);
    
    return context;
  } catch (error) {
    console.error('Error retrieving context:', error);
    return '';
  }
}

/**
 * Get a formatted system prompt that includes retrieved context
 * @param basePrompt - The base system prompt
 * @param context - Retrieved context from RAG system
 * @returns Enhanced system prompt with context
 */
export function buildEnhancedPrompt(basePrompt: string, context: string): string {
  if (!context.trim()) {
    return basePrompt;
  }

  return `${basePrompt}

IMPORTANT CONTEXT FROM UPLOADED DOCUMENTS:
${context}

When answering questions, use the above context when relevant. If the context doesn't contain information needed to answer the question, say so and provide a general answer based on your knowledge.`;
}
