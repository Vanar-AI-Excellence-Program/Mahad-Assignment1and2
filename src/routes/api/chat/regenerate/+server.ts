import { google } from '@ai-sdk/google';
import { streamText } from 'ai';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { sessions, chats } from '$lib/db/schema';
import { eq, and, gt } from 'drizzle-orm';
import { config } from '$lib/config/env';

interface RegenerateRequest {
	messageId: string;
	forkId?: string;
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

		const { messageId, forkId }: RegenerateRequest = await request.json();

		// Validate request
		if (!messageId) {
			return new Response('Invalid request: messageId is required', { status: 400 });
		}

		// Find the AI message to regenerate
		const messageToRegenerate = await db.query.chats.findFirst({
			where: and(
				eq(chats.id, messageId),
				eq(chats.userId, session.user.id),
				eq(chats.role, 'assistant') // Only AI messages can be regenerated
			)
		});

		if (!messageToRegenerate) {
			return new Response('Message not found or not regeneratable', { status: 404 });
		}

		// Get the parent user message
		const parentMessage = await db.query.chats.findFirst({
			where: and(
				eq(chats.id, messageToRegenerate.parentId!),
				eq(chats.userId, session.user.id),
				eq(chats.role, 'user')
			)
		});

		if (!parentMessage) {
			return new Response('Parent message not found', { status: 404 });
		}

		// Get all messages in the current branch up to the parent message
		const branchMessages = await getBranchMessagesUpTo(parentMessage.id, session.user.id, true);
		
		// If this is a fork operation, create a new branch
		if (forkId) {
			// Create a new AI message as a child of the parent
			const newAIMessage = await db.insert(chats).values({
				userId: session.user.id,
				parentId: parentMessage.id, // Link to the parent user message
				role: 'assistant',
				content: '' // Will be filled by streaming
			});
			
			// Get the ID of the newly created AI message
			const savedAIMessage = await db.query.chats.findFirst({
				where: and(
					eq(chats.userId, session.user.id),
					eq(chats.parentId, parentMessage.id),
					eq(chats.role, 'assistant')
				),
				orderBy: chats.createdAt,
			});
			
			if (!savedAIMessage) {
				return new Response('Failed to create AI message', { status: 500 });
			}
			
			// Create a ReadableStream for streaming the regenerated response
			const stream = new ReadableStream({
				async start(controller) {
					try {
						// Prepare messages for AI
						const messagesForAI = branchMessages.map(msg => ({
							role: msg.role,
							content: msg.content
						}));

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

						// Update the AI message with the final content
						if (fullContent.trim()) {
							await db.update(chats)
								.set({ content: fullContent })
								.where(eq(chats.id, savedAIMessage.id));
						}

						// Send end signal
						const encoder = new TextEncoder();
						const endData = encoder.encode(`data: [DONE]\n\n`);
						controller.enqueue(endData);
						controller.close();

					} catch (error) {
						console.error('Streaming error during regeneration:', error);
						const encoder = new TextEncoder();
						const errorData = encoder.encode(`data: ${JSON.stringify({ error: 'Streaming failed during regeneration' })}\n\n`);
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
		} else {
			// Legacy behavior: overwrite the original message
			// Update the original message with empty content (will be filled by streaming)
			await db.update(chats)
				.set({ content: '' })
				.where(eq(chats.id, messageId));

			// Create a ReadableStream for streaming the regenerated response
			const stream = new ReadableStream({
				async start(controller) {
					try {
						// Prepare messages for AI
						const messagesForAI = branchMessages.map(msg => ({
							role: msg.role,
							content: msg.content
						}));

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

						// Update the AI message with the final content
						if (fullContent.trim()) {
							await db.update(chats)
								.set({ content: fullContent })
								.where(eq(chats.id, messageId));
						}

						// Send end signal
						const encoder = new TextEncoder();
						const endData = encoder.encode(`data: [DONE]\n\n`);
						controller.enqueue(endData);
						controller.close();

					} catch (error) {
						console.error('Streaming error during regeneration:', error);
						const encoder = new TextEncoder();
						const errorData = encoder.encode(`data: ${JSON.stringify({ error: 'Streaming failed during regeneration' })}\n\n`);
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
		}

	} catch (error) {
		console.error('Regenerate message API error:', error);
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
