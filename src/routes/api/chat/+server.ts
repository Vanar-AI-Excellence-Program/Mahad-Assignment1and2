import { google } from '@ai-sdk/google';
import { streamText } from 'ai';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { sessions, chats, conversations, documents, chunks, embeddings, type Chat, type Conversation } from '$lib/db/schema';
import { eq, and, gt, desc, inArray } from 'drizzle-orm';
import { config } from '$lib/config/env';

import { EMBEDDING_API_URL } from '$lib/config/env';

// Use hardcoded URL for testing
const embeddingApiUrl = 'http://localhost:8000';
console.log('Chat API - Using embedding API URL:', embeddingApiUrl);

interface ChatMessage {
	id?: string;
	role: 'user' | 'assistant';
	content: string;
}

interface EditMessageRequest {
	messageId: string;
	newContent: string;
}

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
        return [];
    }
}

// Helper function to calculate cosine similarity
function cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
        return 0;
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

// Helper function to retrieve relevant document chunks
async function retrieveRelevantChunks(query: string, conversationId: string, userId: string, limit: number = 3): Promise<{ chunks: string[], sources: Array<{filename: string, content: string, similarity: number}> }> {
    try {
        // Generate embedding for the query
        const queryEmbedding = await generateQueryEmbedding(query);
        if (queryEmbedding.length === 0) {
            return { chunks: [], sources: [] };
        }

        // Get all embeddings for the user's documents in this conversation
        const allEmbeddings = await db.select({
            embedding: embeddings.embedding,
            chunkContent: chunks.content,
            documentFilename: documents.filename
        })
        .from(embeddings)
        .innerJoin(chunks, eq(embeddings.chunkId, chunks.id))
        .innerJoin(documents, eq(chunks.documentId, documents.id))
        .where(and(
            eq(documents.userId, userId),
            eq(documents.conversationId, conversationId)
        ));

        if (allEmbeddings.length === 0) {
            return { chunks: [], sources: [] };
        }

        // Calculate similarities and sort by relevance
        const similarities = allEmbeddings.map(item => {
            const storedEmbedding = JSON.parse(item.embedding);
            const similarity = cosineSimilarity(queryEmbedding, storedEmbedding);
            
            return {
                content: item.chunkContent,
                filename: item.documentFilename,
                similarity
            };
        });

        // Sort by similarity (highest first) and take top results
        const topResults = similarities
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, limit);

        const contextChunks = topResults.map(result => 
            `[From ${result.filename}]: ${result.content}`
        );
        
        const sources = topResults.map(result => ({
            filename: result.filename,
            content: result.content.length > 200 ? result.content.substring(0, 200) + '...' : result.content,
            similarity: Math.round(result.similarity * 100)
        }));

        return { chunks: contextChunks, sources };

    } catch (error) {
        console.error('Error retrieving relevant chunks:', error);
        return { chunks: [], sources: [] };
    }
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

		// Save user message to database with parent_id
		const userMessage = messages[messages.length - 1];
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
					
					// Retrieve relevant document chunks for RAG
					const relevantChunks = await retrieveRelevantChunks(
						userMessage.content, 
						validConversationId!, 
						session.user.id
					);

					// Prepare messages for AI with RAG context
					let messagesForAI = [
						...ancestorMessages.map((msg: any) => ({ role: msg.role, content: msg.content }))
					];

					// Add RAG context if available
					if (relevantChunks.chunks.length > 0) {
						const ragContext = `Based on the following document context, please answer the user's question:\n\n${relevantChunks.chunks.join('\n\n')}\n\nUser question: ${userMessage.content}`;
						messagesForAI.push({ role: 'user', content: ragContext });
					} else {
						messagesForAI.push({ role: 'user', content: userMessage.content });
					}

					console.log('POST context size:', messagesForAI.length);
					console.log('RAG chunks found:', relevantChunks.chunks.length);
					
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

					// Send source information if available
					if (relevantChunks.sources && relevantChunks.sources.length > 0) {
						const encoder = new TextEncoder();
						const sourceData = encoder.encode(`data: ${JSON.stringify({ type: 'sources', sources: relevantChunks.sources })}\n\n`);
						safeEnqueue(sourceData);
					}

					// Send end signal
					const encoder = new TextEncoder();
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


