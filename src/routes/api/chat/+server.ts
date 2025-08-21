import { google } from '@ai-sdk/google';
import { streamText } from 'ai';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { sessions, chats } from '$lib/db/schema';
import { eq, and, gt, desc, inArray } from 'drizzle-orm';
import { config } from '$lib/config/env';
import { buildChatTree } from '$lib/utils/chat-tree';

interface ChatMessage {
	id?: string;
	role: 'user' | 'assistant';
	content: string;
}

interface EditMessageRequest {
	messageId: string;
	newContent: string;
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

		const { messages, parentId }: { messages: ChatMessage[]; parentId?: string } = await request.json();

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
			await db.insert(chats).values({
				userId: session.user.id,
				parentId: parentId || null, // null for new conversation, parent_id for forking
				role: 'user',
				content: userMessage.content
			});
			
			// Get the ID of the just-inserted message
			const savedMessage = await db.query.chats.findFirst({
				where: and(
					eq(chats.userId, session.user.id),
					eq(chats.content, userMessage.content),
					eq(chats.role, 'user')
				),
				orderBy: chats.createdAt,
			});
			
			savedUserMessageId = savedMessage?.id;
		}

		// Create a ReadableStream for streaming the response
		const stream = new ReadableStream({
			async start(controller) {
				try {
					// Generate streaming response using Gemini
					const result = await streamText({
						model: google('gemini-2.0-flash'),
						messages: messages.map((msg: ChatMessage) => ({
							role: msg.role,
							content: msg.content
						})),
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
					if (fullContent.trim() && savedUserMessageId) {
						await db.insert(chats).values({
							userId: session.user.id,
							parentId: savedUserMessageId, // Link to the user message
							role: 'assistant',
							content: fullContent
						});
					}

					// Send end signal
					const encoder = new TextEncoder();
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

// GET endpoint to fetch tree-structured chat history
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

		// Fetch all chat messages for the user
		const userMessages = await db.query.chats.findMany({
			where: eq(chats.userId, session.user.id),
			orderBy: chats.createdAt,
		});

		// Build tree structure
		const chatTree = buildChatTree(userMessages);

		return new Response(JSON.stringify(chatTree), {
			headers: {
				'Content-Type': 'application/json',
			},
		});

	} catch (error) {
		console.error('Chat history API error:', error);
		return new Response('Internal server error', { status: 500 });
	}
};

// PUT endpoint to edit a user message and regenerate responses
export const PUT: RequestHandler = async ({ request, cookies }) => {
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

		const { messageId, newContent }: EditMessageRequest = await request.json();

		// Validate request
		if (!messageId || !newContent) {
			return new Response('Invalid request: messageId and newContent are required', { status: 400 });
		}

		// Find the message to edit
		const messageToEdit = await db.query.chats.findFirst({
			where: and(
				eq(chats.id, messageId),
				eq(chats.userId, session.user.id),
				eq(chats.role, 'user') // Only user messages can be edited
			)
		});

		if (!messageToEdit) {
			return new Response('Message not found or not editable', { status: 404 });
		}

		// Get all messages in the current branch up to this message (excluding the message being edited)
		const branchMessages = await getBranchMessagesUpTo(messageId, session.user.id, false);
		
		// Delete all child nodes (AI responses and subsequent messages) under the edited message
		await deleteBranchFromMessage(messageId, session.user.id);
		
		// Update the original message with new content
		await db.update(chats)
			.set({
				content: newContent,
				isEdited: true,
				originalContent: messageToEdit.content
			})
			.where(eq(chats.id, messageId));

		// Create a ReadableStream for streaming the regenerated response
		const stream = new ReadableStream({
			async start(controller) {
				try {
					// Prepare messages for AI (include the edited message)
					const messagesForAI = [
						...branchMessages.map(msg => ({
							role: msg.role,
							content: msg.content
						})),
						{ role: 'user', content: newContent }
					];

					// Generate streaming response using Gemini
					const result = await streamText({
						model: google('gemini-2.0-flash'),
						messages: messagesForAI,
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

					// Save the new AI response as a child of the edited message
					if (fullContent.trim()) {
						await db.insert(chats).values({
							userId: session.user.id,
							parentId: messageId,
							role: 'assistant',
							content: fullContent
						});
					}

					// Send end signal
					const encoder = new TextEncoder();
					const endData = encoder.encode(`data: [DONE]\n\n`);
					controller.enqueue(endData);
					controller.close();

				} catch (error) {
					console.error('Streaming error during edit:', error);
					const encoder = new TextEncoder();
					const errorData = encoder.encode(`data: ${JSON.stringify({ error: 'Streaming failed during edit' })}\n\n`);
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
		return new Response('Internal server error', { status: 500 });
	}
};

// Helper function to get all messages in a branch up to a specific message
async function getBranchMessagesUpTo(messageId: string, userId: string, includeTarget: boolean = true): Promise<any[]> {
	const messages: any[] = [];
	const messageMap = new Map<string, any>();
	
	// Get all messages for the user
	const allMessages = await db.query.chats.findMany({
		where: eq(chats.userId, userId),
		orderBy: chats.createdAt,
	});

	// Build lookup map
	allMessages.forEach(msg => messageMap.set(msg.id, msg));

	// Find the target message and collect all ancestors
	let currentMessage = messageMap.get(messageId);
	while (currentMessage && currentMessage.parentId) {
		if (includeTarget || currentMessage.id !== messageId) {
			messages.unshift(currentMessage);
		}
		currentMessage = messageMap.get(currentMessage.parentId);
	}
	
	// Add the root message if it exists and we should include it
	if (currentMessage && (includeTarget || currentMessage.id !== messageId)) {
		messages.unshift(currentMessage);
	}

	return messages;
}

// Helper function to delete all child nodes under a specific message
async function deleteBranchFromMessage(messageId: string, userId: string): Promise<void> {
	// Get all messages that are descendants of the edited message
	const allMessages = await db.query.chats.findMany({
		where: eq(chats.userId, userId),
		orderBy: chats.createdAt,
	});

	// Find all descendant message IDs
	const descendantIds = new Set<string>();
	
	function collectDescendants(parentId: string): void {
		allMessages.forEach(msg => {
			if (msg.parentId === parentId) {
				descendantIds.add(msg.id);
				collectDescendants(msg.id);
			}
		});
	}
	
	collectDescendants(messageId);
	
	// Delete all descendant messages
	if (descendantIds.size > 0) {
		const descendantIdsArray = Array.from(descendantIds);
		await db.delete(chats)
			.where(inArray(chats.id, descendantIdsArray));
		
		console.log(`Deleted ${descendantIds.size} descendant messages under message ${messageId}`);
	}
}
