import { google } from '@ai-sdk/google';
import { streamText } from 'ai';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { sessions, chats } from '$lib/db/schema';
import { eq, and, gt } from 'drizzle-orm';
import { config } from '$lib/config/env';
import { buildChatTree } from '$lib/utils/chat-tree';

interface ChatMessage {
	id?: string;
	role: 'user' | 'assistant';
	content: string;
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
