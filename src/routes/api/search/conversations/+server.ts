import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { sessions, chats, conversations } from '$lib/db/schema';
import { eq, and, gt, ilike, or, sql } from 'drizzle-orm';

interface SearchResult {
	id: string;
	title: string;
	lastMessage: string;
	createdAt: string;
	relevanceScore: number;
	matchedMessages?: {
		id: string;
		content: string;
		role: 'user' | 'assistant';
		snippet: string;
	}[];
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

		const { query }: { query: string } = await request.json();

		if (!query || query.trim().length < 2) {
			return new Response(JSON.stringify([]), {
				headers: { 'Content-Type': 'application/json' }
			});
		}

		const searchTerm = query.trim().toLowerCase();
		console.log('Searching for:', searchTerm);

		// Get all user conversations with their messages
		const userConversations = await db.query.conversations.findMany({
			where: eq(conversations.userId, session.user.id),
			with: {
				chats: {
					orderBy: chats.createdAt
				}
			}
		});

		console.log(`Found ${userConversations.length} conversations for user`);

		// Process and score conversations
		const searchResults: SearchResult[] = [];

		for (const conversation of userConversations) {
			let relevanceScore = 0;
			let matchedMessages: SearchResult['matchedMessages'] = [];

			// Check title match
			const titleMatches = conversation.title?.toLowerCase().includes(searchTerm);
			if (titleMatches) {
				relevanceScore += 0.4; // Title matches are highly relevant
			}

			// Check message content matches
			for (const message of conversation.chats) {
				const contentLower = message.content.toLowerCase();
				if (contentLower.includes(searchTerm)) {
					relevanceScore += message.role === 'user' ? 0.3 : 0.2; // User messages weighted higher
					
					// Create snippet with context
					const index = contentLower.indexOf(searchTerm);
					const start = Math.max(0, index - 50);
					const end = Math.min(message.content.length, index + searchTerm.length + 50);
					let snippet = message.content.slice(start, end);
					
					if (start > 0) snippet = '...' + snippet;
					if (end < message.content.length) snippet = snippet + '...';

					matchedMessages.push({
						id: message.id,
						content: message.content,
						role: message.role as 'user' | 'assistant',
						snippet
					});
				}
			}

			// Include conversation if it has any matches
			if (relevanceScore > 0) {
				// Get last message for preview
				const lastMessage = conversation.chats
					.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
					.pop();

				searchResults.push({
					id: conversation.id,
					title: conversation.title || 'New Conversation',
					lastMessage: lastMessage?.content?.slice(0, 100) + '...' || 'No messages',
					createdAt: conversation.createdAt.toISOString(),
					relevanceScore: Math.min(1, relevanceScore), // Cap at 1.0
					matchedMessages: matchedMessages.slice(0, 3) // Limit to top 3 matches per conversation
				});
			}
		}

		// Sort by relevance score (highest first)
		searchResults.sort((a, b) => b.relevanceScore - a.relevanceScore);

		console.log(`Returning ${searchResults.length} search results`);

		return new Response(JSON.stringify(searchResults), {
			headers: {
				'Content-Type': 'application/json',
			},
		});

	} catch (error) {
		console.error('Search API error:', error);
		return new Response('Internal server error', { status: 500 });
	}
};

// GET endpoint for search suggestions and history
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

		const type = url.searchParams.get('type');

		if (type === 'suggestions') {
			// Get common words/phrases from user's conversations for search suggestions
			const userConversations = await db.query.conversations.findMany({
				where: eq(conversations.userId, session.user.id),
				with: {
					chats: {
						orderBy: chats.createdAt
					}
				}
			});

			// Extract common terms (simple implementation)
			const wordFrequency: Record<string, number> = {};
			
			for (const conversation of userConversations) {
				for (const message of conversation.chats) {
					const words = message.content
						.toLowerCase()
						.replace(/[^\w\s]/g, ' ')
						.split(/\s+/)
						.filter(word => word.length > 3); // Only words longer than 3 chars
					
					for (const word of words) {
						wordFrequency[word] = (wordFrequency[word] || 0) + 1;
					}
				}
			}

			// Get top 10 most frequent words as suggestions
			const suggestions = Object.entries(wordFrequency)
				.sort(([, a], [, b]) => b - a)
				.slice(0, 10)
				.map(([word]) => word);

			return new Response(JSON.stringify({ suggestions }), {
				headers: { 'Content-Type': 'application/json' }
			});
		}

		return new Response(JSON.stringify({ message: 'Unknown type' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});

	} catch (error) {
		console.error('Search suggestions API error:', error);
		return new Response('Internal server error', { status: 500 });
	}
};
