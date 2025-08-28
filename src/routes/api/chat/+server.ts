import { google } from '@ai-sdk/google';
import { streamText } from 'ai';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { sessions, chats, documents, chunks } from '$lib/db/schema';
import { forkingSystem } from '$lib/forking-system';
import { forkingAdapter } from '$lib/db/forking-adapter';
import { eq, and, gt, inArray, sql } from 'drizzle-orm';
import { config } from '$lib/config/env';

interface ChatMessage {
	id?: string;
	role: 'user' | 'assistant' | 'system';
	content: string;
}

// Enhanced system prompt for better formatting and RAG integration
const BASE_SYSTEM_PROMPT = `You are a helpful AI assistant powered by Google Gemini. Please follow these guidelines for your responses:

## 🎯 Core Instructions

1. **Always use the provided document context** when available to answer questions accurately
2. **Cite specific documents** when referencing information: "According to [Document Name]..."
3. **Be honest about limitations** - if you don't have enough information, say so clearly
4. **Don't make up information** that isn't supported by the documents or your training

## 📝 Response Formatting

Always use proper markdown formatting for better readability:
- Use headers (# ## ###) for sections
- Use **bold** and *italic* for emphasis
- Use \`code\` for inline code and \`\`\`code blocks\`\`\` for longer code
- Use bullet points (- or *) for lists
- Use numbered lists (1. 2. 3.) for sequential items

## 📊 Tables

When presenting data in tables, use proper markdown table format:
\`\`\`
| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| Data 1   | Data 2   | Data 3   |
| Data 4   | Data 5   | Data 6   |
\`\`\`

## 💻 Code

Always use proper syntax highlighting when possible:
- JavaScript: \`\`\`javascript
- Python: \`\`\`python
- HTML: \`\`\`html
- CSS: \`\`\`css
- SQL: \`\`\`sql

## 🏗️ Structure

Organize your responses with clear sections and subsections using headers.

## 🎨 Style

- Be concise but thorough
- Use examples when helpful
- Maintain a professional and helpful tone
- When using document context, structure your response to clearly show what information comes from which source

Remember to always format your responses properly and cite your sources when using document context.`;

// System prompt for when no document context is available
const NO_CONTEXT_SYSTEM_PROMPT = `You are a helpful AI assistant powered by Google Gemini. 

## 🎯 Core Capabilities
I can help you with a wide variety of topics including:
- **Programming & Development**: Code review, debugging, best practices, architecture design
- **Writing & Communication**: Content creation, editing, grammar, style improvement
- **Analysis & Problem Solving**: Data analysis, logical reasoning, strategic thinking
- **General Knowledge**: Science, technology, history, current events, and more
- **Creative Tasks**: Brainstorming, idea generation, creative writing

## 📝 Response Formatting
- Use proper markdown formatting for better readability
- Use headers (# ## ###) for sections
- Use **bold** and *italic* for emphasis
- Use \`code\` for inline code and \`\`\`code blocks\`\`\` for longer code
- Use bullet points (- or *) for lists
- Use numbered lists (1. 2. 3.) for sequential items

## 💻 Code Examples
When providing code examples:
- Use proper syntax highlighting
- Include comments explaining the logic
- Provide complete, runnable examples when possible
- Suggest best practices and alternatives

## 🎨 Style Guidelines
- Be concise but thorough
- Use examples when helpful
- Maintain a professional and helpful tone
- Be honest about limitations
- Offer to help with follow-up questions

## 📚 Document Upload Feature
If the user asks about specific documents or files:
- Politely explain that you need documents to be uploaded first
- Suggest they can upload PDF or TXT files to get more specific assistance
- Offer to help with general questions about the topic instead

Remember: I'm here to help with any question you have, whether it's about programming, writing, analysis, or just having a friendly conversation!`;

// Helper function to retrieve context directly from database (conversation-scoped)
async function retrieveContextDirect(query: string, conversationId: string, k: number = 5) {
  try {
    console.log(`🔍 [RAG] Retrieving context for conversation: ${conversationId}, query: "${query}"`);
    
    // Get embedding for the query using the embedding service
    const embeddingResponse = await fetch(`${config.EMBEDDING_API_URL}`, {
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
    
    // Use pgvector cosine similarity to find most relevant chunks FROM THIS CONVERSATION ONLY
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
      .where(eq(chunks.conversation_id, conversationId)) // Only chunks from this conversation
      .orderBy(sql`similarity_score DESC`)
      .limit(k);

    console.log(`📄 Found ${relevantChunks.length} relevant chunks for conversation: ${conversationId}`);

    if (relevantChunks.length === 0) {
      console.log(`[RAG] No vector results found for conversation: ${conversationId}`);
      return null;
    }

    // Remove duplicate chunks based on content similarity
    const uniqueChunks = [];
    const seenContents = new Set();
    
    for (const chunk of relevantChunks) {
      // Create a normalized content key (remove extra whitespace, lowercase)
      const normalizedContent = chunk.content.trim().toLowerCase().replace(/\s+/g, ' ');
      
      if (!seenContents.has(normalizedContent)) {
        seenContents.add(normalizedContent);
        uniqueChunks.push(chunk);
      }
    }

    console.log(`📄 After deduplication: ${uniqueChunks.length} unique chunks for conversation: ${conversationId}`);

    const context = {
      chunks: uniqueChunks,
      total_chunks: uniqueChunks.length,
      query,
      conversation_id: conversationId
    };

    console.log(`✅ [RAG] Retrieved ${context.chunks.length} relevant chunks for conversation: ${conversationId}, query: "${query.substring(0, 50)}..."`);
    return context;

  } catch (error) {
    console.error(`[RAG] Error retrieving context for conversation ${conversationId}:`, error);
    return null;
  }
}

// Helper function to build enhanced prompt
function buildEnhancedPrompt(basePrompt: string, context: any): string {
  if (!context || context.chunks.length === 0) {
    return basePrompt;
  }

  // Filter chunks with good similarity scores (above 0.2)
  const relevantChunks = context.chunks.filter((chunk: any) => chunk.similarity_score > 0.2);
  
  if (relevantChunks.length === 0) {
    console.log('[RAG] No chunks with sufficient relevance score, using base prompt');
    return basePrompt;
  }

  const contextSection = `
## 📚 Relevant Document Context

The user has uploaded documents that contain relevant information. Here are the most relevant excerpts:

${relevantChunks.map((chunk: any, index: number) => `
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

export const POST: RequestHandler = async ({ request, cookies }) => {
	try {
		// Check authentication
		const sessionToken = cookies.get('authjs.session-token');

		if (!sessionToken) {
			return new Response('Unauthorized', { status: 401 });
		}

		// Check if session exists and is valid
		const session = await db.query.sessions.findFirst({
			where: and(
				eq(sessions.sessionToken, sessionToken),
				gt(sessions.expires, new Date())
			),
			with: {
				user: true
			}
		});

		if (!session || !session.user) {
			return new Response('Unauthorized', { status: 401 });
		}

		const { messages, parentId, isEditing = false, editMessageId }: {
			messages: ChatMessage[];
			parentId?: string;
			isEditing?: boolean;
			editMessageId?: string;
		} = await request.json();
		
		console.log('🔧 [API] Request details:', {
			isEditing,
			editMessageId,
			parentId,
			messageCount: messages.length
		});

		// Validate messages
		if (!messages || !Array.isArray(messages)) {
			return new Response('Invalid messages format', { status: 400 });
		}

		// Check if GEMINI_API_KEY is set
		if (!config.GEMINI_API_KEY) {
			console.error('GEMINI_API_KEY not set');
			return new Response('AI service not configured', { status: 500 });
		}

		// Handle forking system integration
		const userMessage = messages[messages.length - 1];

		// Retrieve relevant context using RAG if this is a user message
		let enhancedSystemPrompt = BASE_SYSTEM_PROMPT;
		let retrievedContext = null;
		let hasDocuments = false;
		
		if (userMessage.role === 'user') {
			try {
				// Check if there are any documents in the database FOR THIS CONVERSATION
				const conversationId = parentId || `conv_${Date.now()}`;
				const documentCount = await db.query.documents.findMany({
					where: eq(documents.conversation_id, conversationId),
					columns: { id: true }
				});
				
				hasDocuments = documentCount.length > 0;
				
				if (hasDocuments) {
					console.log(`🔧 [API] Documents found in conversation ${conversationId}, attempting RAG retrieval`);
					retrievedContext = await retrieveContextDirect(userMessage.content, conversationId);
					
					if (retrievedContext && retrievedContext.chunks.length > 0) {
						enhancedSystemPrompt = buildEnhancedPrompt(BASE_SYSTEM_PROMPT, retrievedContext);
						console.log(`🔧 [API] Retrieved RAG context for conversation ${conversationId}, query:`, userMessage.content.substring(0, 100));
						console.log(`🔧 [API] Enhanced prompt length:`, enhancedSystemPrompt.length);
						console.log(`🔧 [API] Context chunks:`, retrievedContext.chunks.length);
					} else {
						console.log(`🔧 [API] No relevant RAG context found for conversation ${conversationId}, using base prompt`);
						enhancedSystemPrompt = BASE_SYSTEM_PROMPT;
					}
				} else {
					console.log(`🔧 [API] No documents in conversation ${conversationId}, using no-context prompt`);
					enhancedSystemPrompt = NO_CONTEXT_SYSTEM_PROMPT;
				}
			} catch (error) {
				console.warn('🔧 [API] RAG context retrieval failed, using fallback prompt:', error);
				console.warn('🔧 [API] Error details:', error instanceof Error ? error.message : String(error));
				// Use appropriate fallback based on whether documents exist
				enhancedSystemPrompt = hasDocuments ? BASE_SYSTEM_PROMPT : NO_CONTEXT_SYSTEM_PROMPT;
			}
		}
		let conversationId: string | undefined;
		let savedUserMessageId: string | undefined;

		if (userMessage.role === 'user') {
			if (isEditing && editMessageId && parentId) {
				// Handle message editing with forking
				try {
					console.log('🔧 [API] Attempting to edit message with forking:', editMessageId);
					console.log('🔧 [API] Conversation ID (parentId):', parentId);
					console.log('🔧 [API] Edit message ID:', editMessageId);
					console.log('🔧 [API] New content:', userMessage.content);
					
					// First, get the original message to save it for forking
					const originalMessage = await db.query.chats.findFirst({
						where: and(
							eq(chats.id, editMessageId),
							eq(chats.userId, session.user.id)
						)
					});
					
					if (!originalMessage) {
						console.error('🔧 [API] Original message not found:', editMessageId);
						return new Response('Original message not found', { status: 404 });
					}
					
					// Create a fork by saving the original message with a new ID
					const forkId = `fork_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
					await db.insert(chats).values({
						id: forkId,
						userId: session.user.id,
						parentId: originalMessage.parentId,
						role: originalMessage.role,
						content: originalMessage.content,
						children: originalMessage.children,
						createdAt: originalMessage.createdAt,
						updatedAt: new Date()
					});
					
					console.log('🔧 [API] Created fork with ID:', forkId);
					
					// Update the original message with new content
					await db.update(chats)
						.set({
							content: userMessage.content,
							updatedAt: new Date()
						})
						.where(and(
							eq(chats.id, editMessageId),
							eq(chats.userId, session.user.id)
						));
					
					console.log('🔧 [API] Message updated in database');
					
					// Delete any assistant messages that came after this message
					// This ensures we regenerate the response from the edited point
					const editedMessage = await db.query.chats.findFirst({
						where: and(
							eq(chats.id, editMessageId),
							eq(chats.userId, session.user.id)
						)
					});
					
					if (editedMessage) {
						// For now, we'll let the frontend handle the conversation context
						// and the AI will generate a response based on the edited message
						// The forking system will handle the branching logic
						console.log('🔧 [API] Message edit completed, ready for AI response generation');
					}
					
					// Set conversation ID and message ID for response generation
					conversationId = parentId;
					savedUserMessageId = editMessageId;
					
					console.log('🔧 [API] Message edit with forking completed successfully');
				} catch (error) {
					console.error('🔧 [API] Error editing message:', error);
					return new Response('Error editing message', { status: 500 });
				}
			} else {
				// Normal message flow
				conversationId = parentId || `conv_${Date.now()}`;
				
				// Use simple database storage for normal messages
				const savedMessage = await db.insert(chats).values({
					userId: session.user.id,
					parentId: parentId || null,
					role: 'user',
					content: userMessage.content
				}).returning();
				
				savedUserMessageId = savedMessage[0]?.id;
				conversationId = parentId || savedUserMessageId;
				console.log('🔧 [API] Message saved to database, ID:', savedUserMessageId);
			}
		}

		// Create a ReadableStream for streaming the response
		const stream = new ReadableStream({
			async start(controller) {
				try {
					// Prepare messages with system prompt
					const enhancedMessages = [
						{ role: 'system' as const, content: enhancedSystemPrompt },
						...messages.map((msg: ChatMessage) => ({
							role: msg.role,
							content: msg.content
						}))
					];

					// Generate streaming response using Gemini
					const result = await streamText({
						model: google('gemini-2.0-flash'),
						messages: enhancedMessages,
						temperature: 0.7,
					});

					let fullContent = '';

					// Stream the response chunks
					for await (const chunk of result.textStream) {
						fullContent += chunk;
						const encoder = new TextEncoder();
						const data = encoder.encode(`data: ${JSON.stringify({ chunk })}\n\n`);
						controller.enqueue(data);
					}

					// Save assistant message to database after streaming completes
					if (fullContent.trim() && savedUserMessageId && conversationId) {
						try {
							await db.insert(chats).values({
								userId: session.user.id,
								parentId: savedUserMessageId,
								role: 'assistant',
								content: fullContent
							});
							console.log('🔧 [API] Assistant message saved to database');
						} catch (error) {
							console.error('🔧 [API] Error saving assistant message:', error);
						}
					}

					// Send context information if available
					if (retrievedContext) {
						const encoder = new TextEncoder();
						const contextData = encoder.encode(`data: ${JSON.stringify({ context: retrievedContext })}\n\n`);
						controller.enqueue(contextData);
					}
					
					// Send conversation ID and end signal
					const encoder = new TextEncoder();
					const conversationData = encoder.encode(`data: ${JSON.stringify({ conversationId })}\n\n`);
					controller.enqueue(conversationData);
					const endData = encoder.encode(`data: [DONE]\n\n`);
					controller.enqueue(endData);
					controller.close();

				} catch (error) {
					console.error('Streaming error:', error);
					const encoder = new TextEncoder();
					const errorData = encoder.encode(`data: ${JSON.stringify({ error: 'Streaming failed' })}\n\n`);
					controller.enqueue(errorData);
					controller.close();
				}
			}
		});

		// Return streaming response
		return new Response(stream, {
			headers: {
				'Content-Type': 'text/plain; charset=utf-8',
				'Cache-Control': 'no-cache',
				'Connection': 'keep-alive',
			},
		});

	} catch (error) {
		console.error('Chat API error:', error);
		return new Response('Internal server error', { status: 500 });
	}
};

// GET endpoint to fetch flat list of chat conversations
export const GET: RequestHandler = async ({ cookies }) => {
	try {
		// Check authentication
		const sessionToken = cookies.get('authjs.session-token');

		if (!sessionToken) {
			return new Response('Unauthorized', { status: 401 });
		}

		// Check if session exists and is valid
		const session = await db.query.sessions.findFirst({
			where: and(
				eq(sessions.sessionToken, sessionToken),
				gt(sessions.expires, new Date())
			),
			with: {
				user: true
			}
		});

		if (!session || !session.user) {
			return new Response('Unauthorized', { status: 401 });
		}

		// Get conversations using forking system
		let conversations;
		try {
			conversations = await forkingAdapter.getUserConversations(session.user.id);
		} catch (error) {
			console.error('🔧 [API] Error getting conversations from forking system:', error);
			// Fallback to simple database query
			const userMessages = await db.query.chats.findMany({
				where: eq(chats.userId, session.user.id),
				orderBy: chats.createdAt,
			});

			// Group messages by conversation (root messages and their descendants)
			const conversationMap = new Map();
			const processedIds = new Set();

			// Find all root messages (messages with no parent or parent is null)
			const rootMessages = userMessages.filter(msg => !msg.parentId);

			for (const rootMessage of rootMessages) {
				if (processedIds.has(rootMessage.id)) continue;

				// Get all messages in this conversation (root + all descendants)
				const conversationMessages = getAllDescendants(userMessages, rootMessage.id);
				
				// Mark all messages in this conversation as processed
				conversationMessages.forEach(msg => processedIds.add(msg.id));

				// Create conversation object
				const conversation = {
					id: rootMessage.id,
					title: rootMessage.content.substring(0, 50) + (rootMessage.content.length > 50 ? '...' : ''),
					content: rootMessage.content,
					createdAt: rootMessage.createdAt,
					updatedAt: getLatestMessageDate(conversationMessages),
					messageCount: conversationMessages.length,
					messages: conversationMessages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
				};

				conversationMap.set(rootMessage.id, conversation);
			}

			conversations = Array.from(conversationMap.values()).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
		}

		return new Response(JSON.stringify(conversations), {
			headers: {
				'Content-Type': 'application/json',
			},
		});

	} catch (error) {
		console.error('Chat history API error:', error);
		return new Response('Internal server error', { status: 500 });
	}
};

// Helper function to get all descendants of a message
function getAllDescendants(allMessages: any[], rootId: string): any[] {
	const descendants: any[] = [];
	const queue = [rootId];
	const visited = new Set<string>();

	while (queue.length > 0) {
		const currentId = queue.shift()!;
		if (visited.has(currentId)) continue;
		visited.add(currentId);

		// Find the current message
		const currentMessage = allMessages.find(msg => msg.id === currentId);
		if (currentMessage) {
			descendants.push(currentMessage);
		}

		// Find all children of the current message
		const children = allMessages.filter(msg => msg.parentId === currentId);
		children.forEach(child => {
			if (!visited.has(child.id)) {
				queue.push(child.id);
			}
		});
	}

	return descendants;
}

// Helper function to get the latest message date in a conversation
function getLatestMessageDate(messages: any[]): string {
	if (messages.length === 0) return new Date().toISOString();
	
	const latestMessage = messages.reduce((latest, current) => {
		return new Date(current.createdAt) > new Date(latest.createdAt) ? current : latest;
	});
	
	return latestMessage.createdAt;
}


