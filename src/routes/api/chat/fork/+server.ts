import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { sessions, conversations, branches, messages } from '$lib/db/schema';
import { eq, and, gt } from 'drizzle-orm';
import { ForkingService } from '$lib/utils/forking-service';

interface ForkRequest {
	messageId: string;
	conversationId: string;
	branchName?: string;
}

interface RegenerateRequest {
	messageId: string;
	branchName?: string;
}

interface SwitchBranchRequest {
	conversationId: string;
	branchId: string;
}

// POST /api/chat/fork - Explicitly fork conversation from a message
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

		const { messageId, conversationId, branchName }: ForkRequest = await request.json();

		// Validate request
		if (!messageId || !conversationId) {
			return new Response('Invalid request: messageId and conversationId are required', { status: 400 });
		}

		// Validate that the conversation belongs to the user
		const conversationResult = await db
			.select()
			.from(conversations)
			.where(and(
				eq(conversations.id, conversationId),
				eq(conversations.userId, session.user.id)
			))
			.limit(1);

		if (!conversationResult.length) {
			return new Response('Conversation not found or access denied', { status: 404 });
		}

		const conversation = conversationResult[0];

		// Fork the conversation from the specified message
		const result = await ForkingService.forkFromMessage(conversationId, messageId, branchName);

		return new Response(JSON.stringify({
			success: true,
			branch: result.branch,
			messages: result.messages
		}), {
			headers: {
				'Content-Type': 'application/json',
			},
		});

	} catch (error) {
		console.error('Fork API error:', error);
		
		// Provide more specific error messages
		if (error instanceof Error) {
			if (error.message.includes('Source message not found')) {
				return new Response('Message not found', { status: 404 });
			}
			if (error.message.includes('Message not found in source branch')) {
				return new Response('Message not found in source branch', { status: 404 });
			}
		}
		
		return new Response('Internal server error', { status: 500 });
	}
};

// PUT /api/chat/fork/regenerate - Regenerate AI response and fork
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

		const { messageId, branchName }: RegenerateRequest = await request.json();

		// Validate request
		if (!messageId) {
			return new Response('Invalid request: messageId is required', { status: 400 });
		}

		// Get the message to regenerate
		const [message] = await db
			.select()
			.from(messages)
			.where(eq(messages.id, messageId))
			.limit(1);

		if (!message) {
			return new Response('Message not found', { status: 404 });
		}

		if (message.role !== 'assistant') {
			return new Response('Can only regenerate assistant messages', { status: 400 });
		}

		// Get the conversation ID
		const [branch] = await db
			.select({ conversationId: branches.conversationId })
			.from(branches)
			.where(eq(branches.id, message.branchId))
			.limit(1);

		// For now, return success - the actual regeneration will be handled by the frontend
		// calling the AI service and then this endpoint to save the result
		return new Response(JSON.stringify({
			success: true,
			message: 'Regeneration initiated. Use the returned branch ID for the new response.'
		}), {
			headers: {
				'Content-Type': 'application/json',
			},
		});

	} catch (error) {
		console.error('Regenerate API error:', error);
		return new Response('Internal server error', { status: 500 });
	}
};

// PATCH /api/chat/fork/switch - Switch to a different branch
export const PATCH: RequestHandler = async ({ request, cookies }) => {
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

		const { conversationId, branchId }: SwitchBranchRequest = await request.json();

		// Validate request
		if (!conversationId || !branchId) {
			return new Response('Invalid request: conversationId and branchId are required', { status: 400 });
		}

		// Get the branch messages
		const messages = await ForkingService.getBranchMessages(branchId);
		const branches = await ForkingService.getConversationBranches(conversationId);

		return new Response(JSON.stringify({
			success: true,
			branchId,
			messages,
			branches
		}), {
			headers: {
				'Content-Type': 'application/json',
			},
		});

	} catch (error) {
		console.error('Switch branch API error:', error);
		return new Response('Internal server error', { status: 500 });
	}
};

// DELETE /api/chat/fork - Delete a branch
export const DELETE: RequestHandler = async ({ request, cookies }) => {
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

		const { branchId }: { branchId: string } = await request.json();

		// Validate request
		if (!branchId) {
			return new Response('Invalid request: branchId is required', { status: 400 });
		}

		// Delete the branch
		await ForkingService.deleteBranch(branchId);

		return new Response(JSON.stringify({
			success: true,
			message: 'Branch deleted successfully'
		}), {
			headers: {
				'Content-Type': 'application/json',
			},
		});

	} catch (error) {
		console.error('Delete branch API error:', error);
		return new Response('Internal server error', { status: 500 });
	}
};
