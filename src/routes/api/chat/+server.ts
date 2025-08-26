import { google } from '@ai-sdk/google';
import { streamText } from 'ai';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { sessions, conversations, branches, messages } from '$lib/db/schema';
import { eq, and, gt, desc, asc } from 'drizzle-orm';
import { config } from '$lib/config/env';
import { ForkingService } from '$lib/utils/forking-service';

interface ChatMessage {
	id?: string;
	role: 'user' | 'assistant';
	content: string;
}

interface EditMessageRequest {
	messageId: string;
	newContent: string;
	conversationId: string;
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

		const { messages: chatMessages, conversationId, branchId, title }: { 
			messages: ChatMessage[]; 
			conversationId?: string;
			branchId?: string;
			title?: string;
		} = await request.json();

		// Validate messages
		if (!chatMessages || !Array.isArray(chatMessages)) {
			return new Response('Invalid messages format', { status: 400 });
		}

		// Check if GEMINI_API_KEY is set
		if (!config.GEMINI_API_KEY) {
			console.error('GEMINI_API_KEY not set');
			return new Response('AI service not configured', { status: 500 });
		}

		let actualConversationId = conversationId;
		let actualBranchId = branchId;

		// Create conversation if it doesn't exist
		if (!actualConversationId) {
			const conversation = await ForkingService.createConversation(
				session.user.id, 
				title || 'New Conversation'
			);
			actualConversationId = conversation.id;
			
			// Get the main branch
			const branches = await ForkingService.getConversationBranches(conversation.id);
			actualBranchId = branches[0].id;
		}

		// Get or create branch
		if (!actualBranchId) {
			const branches = await ForkingService.getConversationBranches(actualConversationId);
			actualBranchId = branches[0].id;
		}

		// Save user message
		const userMessage = chatMessages[chatMessages.length - 1];
		let savedUserMessageId: string | undefined;
		
		if (userMessage.role === 'user') {
			// Get the parent message ID (last message in the branch)
			const branchMessages = await ForkingService.getBranchMessages(actualBranchId);
			const parentId = branchMessages.length > 0 ? branchMessages[branchMessages.length - 1].id : undefined;

			// Add message to branch
			const savedMessage = await ForkingService.addMessage(
				actualBranchId,
				'user',
				userMessage.content,
				parentId
			);
			
			savedUserMessageId = savedMessage.id;
		}

		// Create a ReadableStream for streaming the response
		const stream = new ReadableStream({
			async start(controller) {
				try {
					// Generate streaming response using Gemini
					const result = await streamText({
						model: google('gemini-2.0-flash'),
						messages: chatMessages.map((msg: ChatMessage) => ({
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

					// Save assistant message
					if (fullContent.trim() && savedUserMessageId) {
						await ForkingService.addMessage(
							actualBranchId,
							'assistant',
							fullContent,
							savedUserMessageId
						);
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

// GET endpoint to fetch conversation data
export const GET: RequestHandler = async ({ cookies, url }) => {
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

		// Get query parameters
		const conversationId = url.searchParams.get('conversationId');
		const branchId = url.searchParams.get('branchId');

		if (conversationId) {
			// Get specific conversation data
			const branches = await ForkingService.getConversationBranches(conversationId);
			const activeBranchId = branchId || branches[0]?.id;
			
			if (activeBranchId) {
				const messages = await ForkingService.getBranchMessages(activeBranchId);
				const conversationTree = await ForkingService.getConversationTree(conversationId);

				return new Response(JSON.stringify({
					conversationId,
					branchId: activeBranchId,
					branches,
					messages,
					tree: conversationTree
				}), {
					headers: {
						'Content-Type': 'application/json',
					},
				});
			}
		} else {
			// Get all conversations for the user
			const userConversations = await ForkingService.getUserConversations(session.user.id);
			
			return new Response(JSON.stringify({
				conversations: userConversations
			}), {
				headers: {
					'Content-Type': 'application/json',
				},
			});
		}

		return new Response('Conversation not found', { status: 404 });

	} catch (error) {
		console.error('Chat history API error:', error);
		return new Response('Internal server error', { status: 500 });
	}
};

// PUT endpoint to edit a user message and fork the conversation
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

		const { messageId, newContent, branchName }: EditMessageRequest & { branchName?: string } = await request.json();

		// Validate request
		if (!messageId || !newContent) {
			return new Response('Invalid request: messageId and newContent are required', { status: 400 });
		}

		// Edit the message and fork the conversation
		const result = await ForkingService.editUserMessage(messageId, newContent, branchName);

		// Create a ReadableStream for streaming the regenerated response
		const stream = new ReadableStream({
			async start(controller) {
				try {
					// Prepare messages for AI (include the edited message)
					const messagesForAI = result.messages.map(msg => ({
						role: msg.role,
						content: msg.content
					}));

					// Generate streaming response using Gemini
					const aiResult = await streamText({
						model: google('gemini-2.0-flash'),
						messages: messagesForAI,
						temperature: 0.7,
					});

					let fullContent = '';

					// Stream the response chunks
					for await (const chunk of aiResult.textStream) {
						fullContent += chunk;
						const encoder = new TextEncoder();
						const data = encoder.encode(`data: ${JSON.stringify({ chunk })}\n\n`);
						controller.enqueue(data);
					}

					// Save the new AI response
					if (fullContent.trim()) {
						await ForkingService.addMessage(
							result.branch.id,
							'assistant',
							fullContent,
							result.messages[result.messages.length - 1].id
						);
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
