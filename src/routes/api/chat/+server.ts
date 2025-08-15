import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { sessions } from '$lib/db/schema';
import { eq, and, gt } from 'drizzle-orm';
import { config } from '$lib/config/env';

export const POST: RequestHandler = async ({ request, cookies }) => {
	try {
		// Check authentication
		const sessionToken = cookies.get('authjs.session-token');

		if (!sessionToken) {
			return json({ error: 'Unauthorized' }, { status: 401 });
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
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const { messages } = await request.json();

		// Validate messages
		if (!messages || !Array.isArray(messages)) {
			return json({ error: 'Invalid messages format' }, { status: 400 });
		}

		// Check if GEMINI_API_KEY is set
		if (!config.GEMINI_API_KEY) {
			console.error('GEMINI_API_KEY not set');
			return json({ error: 'AI service not configured' }, { status: 500 });
		}

		// Generate response using Gemini
		const result = await generateText({
			model: google('gemini-2.0-flash'),
			messages: messages.map((msg: any) => ({
				role: msg.role,
				content: msg.content
			})),
			temperature: 0.7,
		});

		return json({
			role: 'assistant',
			content: result.text,
		});

	} catch (error) {
		console.error('Chat API error:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
