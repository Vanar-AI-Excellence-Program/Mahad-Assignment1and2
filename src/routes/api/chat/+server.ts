import { google } from '@ai-sdk/google';
import { streamText } from 'ai';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { sessions, chats, conversations, type Chat, type Conversation, documents, chunks } from '$lib/db/schema';
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

		const { messages, parentId, conversationId }: { messages: ChatMessage[]; parentId?: string; conversationId?: string } = await request.json();

		// Ensure we have a valid conversation ID
		let validConversationId = conversationId;

		// Check if conversation exists, create it if it doesn't
		if (!validConversationId) {
			const userMessage = messages[messages.length - 1];
			const title = userMessage.content.slice(0, 100);

			const [newConversation] = await db.insert(conversations).values({
				userId: session.user.id,
				title: title
			}).returning();

			validConversationId = newConversation.id;
		} else {
			// Check if the provided conversation ID exists
			const existingConversation = await db.query.conversations.findFirst({
				where: eq(conversations.id, validConversationId)
			});

			// If conversation doesn't exist, create it
			if (!existingConversation) {
				const userMessage = messages[messages.length - 1];
				const title = userMessage.content.slice(0, 100);

				const [newConversation] = await db.insert(conversations).values({
					id: validConversationId, // Use the provided ID
					userId: session.user.id,
					title: title
				}).returning();

				validConversationId = newConversation.id;
			}
		}

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
			// Insert user message and get the ID
			const [savedMessage] = await db.insert(chats).values({
				conversationId: validConversationId,
				parentId: parentId || null, // null for new conversation, parent_id for forking
				role: 'user',
				content: userMessage.content,
				version: 1
			}).returning();
			
			savedUserMessageId = savedMessage.id;
		}

		// Check if session is still valid before starting stream
		if (!session || !session.user) {
			return new Response('Session expired', { status: 401 });
		}
		
		// Create a ReadableStream for streaming the response
		const stream = new ReadableStream({
			async start(controller) {
				let controllerClosed = false;
				
				const safeEnqueue = (data: Uint8Array) => {
					if (!controllerClosed) {
						try {
							controller.enqueue(data);
						} catch (e) {
							console.error('Failed to enqueue data:', e);
							controllerClosed = true;
						}
					}
				};
				
				const safeClose = () => {
					if (!controllerClosed) {
						try {
							controller.close();
							controllerClosed = true;
						} catch (e) {
							console.error('Failed to close controller:', e);
							controllerClosed = true;
						}
					}
				};
				
				try {
					// Build strict ancestor context for this conversation + latest user message
					const ancestorMessages = await getAncestorMessages(validConversationId!, parentId ?? null, true);
					const messagesForAI = [
						...ancestorMessages.map((msg: any) => ({ role: msg.role, content: msg.content })),
						{ role: 'user', content: userMessage.content }
					];
					console.log('POST context size:', messagesForAI.length);
					
					// Generate streaming response using Gemini
					const result = await streamText({
						model: google('gemini-2.0-flash'),
						messages: messagesForAI,
						temperature: 0.7,
					});

					let fullContent = '';

					// Stream the response chunks
					for await (const chunk of result.textStream) {
						if (controllerClosed) break;
						
						fullContent += chunk;
						const encoder = new TextEncoder();
						const data = encoder.encode(`data: ${JSON.stringify({ chunk })}\n\n`);
						safeEnqueue(data);
					}

					// Save assistant message to database after streaming completes
					if (fullContent.trim() && savedUserMessageId) {
						try {
							await db.insert(chats).values({
								conversationId: validConversationId,
								parentId: savedUserMessageId, // Link to the user message
								role: 'assistant',
								content: fullContent,
								version: 1
							});
						} catch (dbError) {
							console.error('Failed to save assistant message:', dbError);
						}
					}

					// Send end signal
					const encoder = new TextEncoder();
					const conversationData = encoder.encode(`data: ${JSON.stringify({ conversationId })}\n\n`);
					controller.enqueue(conversationData);
					const endData = encoder.encode(`data: [DONE]\n\n`);
					safeEnqueue(endData);
					safeClose();

				} catch (error) {
					console.error('Streaming error:', error);
					
					if (!controllerClosed) {
						try {
							const encoder = new TextEncoder();
							let errorMessage = 'Streaming failed';
							
							// Provide more specific error messages
							if (error instanceof Error) {
								if (error.message.includes('Invalid state') || error.message.includes('Controller is already closed')) {
									errorMessage = 'Connection interrupted';
								} else if (error.message.includes('Unauthorized') || error.message.includes('session')) {
									errorMessage = 'Session expired, please refresh the page';
								} else {
									errorMessage = error.message;
								}
							}
							
							const errorData = encoder.encode(`data: ${JSON.stringify({ error: errorMessage })}\n\n`);
							safeEnqueue(errorData);
						} catch (e) {
							console.error('Failed to send error data:', e);
						}
					}
					
					safeClose();
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

// GET endpoint to fetch chat history (all or by conversationId)
export const GET: RequestHandler = async ({ url, cookies }) => {
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

		// Check if conversationId is provided in query parameters
		const conversationId = url.searchParams.get('conversationId');

		if (conversationId) {
			// Get messages for specific conversation
			const conversationMessages = await db.query.chats.findMany({
				where: eq(chats.conversationId, conversationId),
				orderBy: chats.createdAt,
			});

			console.log(`Retrieved ${conversationMessages.length} messages for conversation ${conversationId}`);

			return new Response(JSON.stringify(conversationMessages), {
				headers: {
					'Content-Type': 'application/json',
				},
			});
		} else {
			// Fetch all conversations for the user
			const userConversations = await db.query.conversations.findMany({
				where: eq(conversations.userId, session.user.id),
				orderBy: desc(conversations.updatedAt),
			});

			// For each conversation, get the messages
			const conversationsWithMessages = await Promise.all(
				userConversations.map(async (conversation) => {
					const messages = await db.query.chats.findMany({
						where: eq(chats.conversationId, conversation.id),
						orderBy: chats.createdAt,
					});
					
					return {
						...conversation,
						messages
					};
				})
			);

			return new Response(JSON.stringify(conversationsWithMessages), {
				headers: {
					'Content-Type': 'application/json',
				},
			});
		}

	} catch (error) {
		console.error('Chat history API error:', error);
		return new Response('Internal server error', { status: 500 });
	}
};

// PUT endpoint to edit a user message and create a new branch
export const PUT: RequestHandler = async ({ request, cookies }) => {
	try {
		console.log('PUT /api/chat - Edit message request received');
		
		// Check authentication
		const sessionToken = cookies.get('authjs.session-token');
		console.log('Session token present:', !!sessionToken);

		if (!sessionToken) {
			console.log('No session token found');
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

		console.log('Session found:', !!session, 'User found:', !!session?.user);

		if (!session || !session.user) {
			console.log('Invalid session or user');
			return new Response('Unauthorized', { status: 401 });
		}

		const { messageId, newContent }: EditMessageRequest = await request.json();
		console.log('Request payload:', { messageId, newContent: newContent?.substring(0, 50) + '...' });

		// Validate request
		if (!messageId || !newContent) {
			console.log('Invalid request payload:', { messageId, newContent });
			return new Response('Invalid request: messageId and newContent are required', { status: 400 });
		}

		// Find the message to edit
		console.log('Looking for message to edit:', messageId);
		const messageToEdit = await db.query.chats.findFirst({
			where: and(
				eq(chats.id, messageId),
				eq(chats.role, 'user') // Only user messages can be edited
			)
		}) as Chat | undefined;

		console.log('Message found:', !!messageToEdit, 'Message details:', messageToEdit ? { id: messageToEdit.id, content: messageToEdit.content.substring(0, 50) + '...' } : 'Not found');

		if (!messageToEdit) {
			console.error('Message not found for editing:', { messageId });
			return new Response('Message not found or not editable', { status: 404 });
		}

		// Get strict ancestor context (root -> parent of the edited message) within the same conversation
		console.log('Getting ancestor context for conversation', messageToEdit.conversationId, 'up to parent:', messageToEdit.parentId);
		const ancestorMessages = await getAncestorMessages(messageToEdit.conversationId!, messageToEdit.parentId ?? null, true);
		console.log('Ancestor messages found:', ancestorMessages.length, ancestorMessages.map(m => ({ id: m.id, role: m.role, snippet: (m.content || '').slice(0, 60) })));

		// Create a new version of the message (this preserves the old version)
		const newMessageId = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString() + Math.random().toString(36).substr(2, 9);
		console.log('Creating new message with ID:', newMessageId);
		
		try {
			await db.insert(chats).values({
				id: newMessageId,
				conversationId: messageToEdit.conversationId!,
				parentId: messageToEdit.parentId, // Same parent as original
				role: 'user',
				content: newContent,
				isEdited: true,
				version: (messageToEdit.version || 1) + 1
			});
			console.log('New message created successfully');
		} catch (dbError) {
			console.error('Database error creating new message:', dbError);
			return new Response('Database error creating new message', { status: 500 });
		}

		// Create a ReadableStream for streaming the new response
		const stream = new ReadableStream({
			async start(controller) {
				try {
					// Prepare messages for AI (include the new edited message)
					const messagesForAI = [
						...ancestorMessages.map(msg => ({
							role: msg.role,
							content: msg.content
						})),
						{ role: 'user', content: newContent }
					];

					// Generate streaming response using Gemini
					console.log('Calling Gemini API with messages:', messagesForAI.length);
					console.log('First message:', messagesForAI[0]);
					console.log('Last message:', messagesForAI[messagesForAI.length - 1]);
					
					const result = await streamText({
						model: google('gemini-2.0-flash'),
						messages: messagesForAI,
						temperature: 0.7,
					});
					
					console.log('Gemini API call successful, starting streaming');

					let fullContent = '';

					// Stream the response chunks
					for await (const chunk of result.textStream) {
						fullContent += chunk;
						const encoder = new TextEncoder();
						const data = encoder.encode(`data: ${JSON.stringify({ chunk })}\n\n`);
						controller.enqueue(data);
					}

					// Save the new AI response as a child of the new message
					if (fullContent.trim()) {
						await db.insert(chats).values({
							conversationId: messageToEdit.conversationId!,
							parentId: newMessageId,
							role: 'assistant',
							content: fullContent,
							version: 1
						});
					}

					// Send end signal
					const encoder = new TextEncoder();
					const endData = encoder.encode(`data: [DONE]\n\n`);
					controller.enqueue(endData);
					controller.close();

				} catch (error) {
					console.error('Streaming error during edit:', error);
					console.error('Streaming error details:', {
						messageId: messageId,
						newContent: newContent?.substring(0, 100),
						errorMessage: error instanceof Error ? error.message : 'Unknown error',
						errorStack: error instanceof Error ? error.stack : undefined
					});
					
					const encoder = new TextEncoder();
					const errorData = encoder.encode(`data: ${JSON.stringify({ error: 'Streaming failed during edit', details: error instanceof Error ? error.message : 'Unknown error' })}\n\n`);
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
		console.error('Edit message API error:', error);
		console.error('Error details:', {
			messageId: messageId || 'undefined',
			newContent: newContent?.substring(0, 100) || 'undefined',
			errorMessage: error instanceof Error ? error.message : 'Unknown error',
			errorStack: error instanceof Error ? error.stack : undefined
		});
		return new Response('Internal server error', { status: 500 });
	}
};

// Helper function to get all messages in a branch up to a specific message
async function getAncestorMessages(conversationId: string, targetId: string | null, includeTarget: boolean = true): Promise<any[]> {
	const messages: any[] = [];
	if (!targetId) return messages;
	const messageMap = new Map<string, any>();
	
	// Only load this conversation's messages
	const allMessages = await db.query.chats.findMany({
		where: eq(chats.conversationId, conversationId),
		orderBy: chats.createdAt,
	});

	allMessages.forEach(msg => messageMap.set(msg.id, msg));

	let currentMessage = messageMap.get(targetId);
	while (currentMessage && currentMessage.parentId) {
		if (includeTarget || currentMessage.id !== targetId) {
			messages.unshift(currentMessage);
		}
		currentMessage = messageMap.get(currentMessage.parentId);
	}
	
	if (currentMessage && (includeTarget || currentMessage.id !== targetId)) {
		messages.unshift(currentMessage);
	}

	return messages;
}


