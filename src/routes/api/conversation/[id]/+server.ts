import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { sessions, chats, conversations } from '$lib/db/schema';
import { eq, and, gt } from 'drizzle-orm';

export const DELETE: RequestHandler = async ({ params, cookies }) => {
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

		const conversationId = params.id;

		if (!conversationId) {
			return new Response('Conversation ID is required', { status: 400 });
		}

		// Verify the conversation belongs to the current user
		const conversation = await db.query.conversations.findFirst({
			where: and(
				eq(conversations.id, conversationId),
				eq(conversations.userId, session.user.id)
			)
		});

		if (!conversation) {
			return new Response('Conversation not found or access denied', { status: 404 });
		}

		// Delete all chats in this conversation first (due to foreign key constraints)
		await db.delete(chats).where(eq(chats.conversationId, conversationId));

		// Delete the conversation
		await db.delete(conversations).where(eq(conversations.id, conversationId));

		console.log(`Deleted conversation ${conversationId} and all associated chats`);

		return new Response(JSON.stringify({ success: true }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' }
		});

	} catch (error) {
		console.error('Error deleting conversation:', error);
		return new Response('Internal server error', { status: 500 });
	}
};
