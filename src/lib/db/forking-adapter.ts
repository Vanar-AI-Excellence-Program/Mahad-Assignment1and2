import { db } from '$lib/db';
import { chats, conversationBranches } from '$lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { forkingSystem, type Message, type ConversationTree } from '$lib/forking-system';

export class ForkingDatabaseAdapter {
	/**
	 * Load a conversation from database into the forking system
	 */
	async loadConversationFromDatabase(conversationId: string, userId: string): Promise<ConversationTree> {
		// Get all messages for this conversation
		const dbMessages = await db.query.chats.findMany({
			where: and(
				eq(chats.userId, userId),
				// We need to get all messages that are part of this conversation tree
				// For now, we'll get all messages and filter by conversation structure
			),
			orderBy: chats.createdAt,
		});

		console.log('🔧 [loadConversationFromDatabase] Loading conversation:', conversationId);
		console.log('🔧 [loadConversationFromDatabase] Found messages:', dbMessages.length);
		console.log('🔧 [loadConversationFromDatabase] Messages:', dbMessages.map(m => ({ id: m.id, content: m.content.substring(0, 50) })));

		// Create conversation tree
		const tree = forkingSystem.createConversation(conversationId);

		// Build the tree from database messages
		const messageMap = new Map<string, any>();
		
		// First pass: create all messages
		for (const dbMessage of dbMessages) {
			const message: Message = {
				id: dbMessage.id,
				parentId: dbMessage.parentId,
				role: dbMessage.role as 'user' | 'assistant',
				content: dbMessage.content,
				children: dbMessage.children ? JSON.parse(dbMessage.children) : [],
				createdAt: dbMessage.createdAt,
				updatedAt: dbMessage.updatedAt || dbMessage.createdAt
			};
			
			tree.messages.set(message.id, message);
			messageMap.set(message.id, message);
		}

		// Second pass: identify root messages
		for (const message of tree.messages.values()) {
			if (!message.parentId) {
				tree.rootMessages.push(message.id);
			}
		}

		return tree;
	}

	/**
	 * Save a message to the database
	 */
	async saveMessageToDatabase(
		userId: string,
		message: Message
	): Promise<void> {
		await db.insert(chats).values({
			id: message.id,
			userId,
			parentId: message.parentId,
			role: message.role,
			content: message.content,
			children: JSON.stringify(message.children),
			createdAt: message.createdAt,
			updatedAt: message.updatedAt
		});
	}

	/**
	 * Update a message in the database
	 */
	async updateMessageInDatabase(
		userId: string,
		message: Message
	): Promise<void> {
		await db.update(chats)
			.set({
				content: message.content,
				children: JSON.stringify(message.children),
				updatedAt: message.updatedAt
			})
			.where(and(
				eq(chats.id, message.id),
				eq(chats.userId, userId)
			));
	}

	/**
	 * Delete messages from the database
	 */
	async deleteMessagesFromDatabase(
		userId: string,
		messageIds: string[]
	): Promise<void> {
		if (messageIds.length === 0) return;

		await db.delete(chats)
			.where(and(
				eq(chats.userId, userId),
				// Note: This is a simplified delete. In production, you might want
				// to handle cascading deletes more carefully
			));
	}

	/**
	 * Save conversation structure to database
	 */
	async saveConversationToDatabase(
		userId: string,
		conversationId: string
	): Promise<void> {
		const tree = forkingSystem.getConversation(conversationId);
		
		// Save all messages
		for (const message of tree.messages.values()) {
			try {
				await this.saveMessageToDatabase(userId, message);
			} catch (error) {
				// Message might already exist, try to update
				await this.updateMessageInDatabase(userId, message);
			}
		}
	}

	/**
	 * Get conversation structure from database
	 */
	async getConversationFromDatabase(
		userId: string,
		conversationId: string
	): Promise<{
		id: string;
		title: string;
		messages: Message[];
		branches: Array<{
			id: string;
			parentId: string | null;
			messages: Message[];
		}>;
	} | null> {
		// Load conversation into forking system
		await this.loadConversationFromDatabase(conversationId, userId);
		
		// Get structure from forking system
		return forkingSystem.getConversationStructure(conversationId);
	}

	/**
	 * Get all conversations for a user
	 */
	async getUserConversations(userId: string): Promise<Array<{
		id: string;
		title: string;
		messageCount: number;
		createdAt: Date;
		updatedAt: Date;
	}>> {
		// Get all root messages (conversation starters)
		const rootMessages = await db.query.chats.findMany({
			where: and(
				eq(chats.userId, userId),
				eq(chats.parentId, null)
			),
			orderBy: chats.createdAt,
		});

		const conversations = [];

		for (const rootMessage of rootMessages) {
			// Load the conversation to get full structure
			await this.loadConversationFromDatabase(rootMessage.id, userId);
			const structure = forkingSystem.getConversationStructure(rootMessage.id);
			
			conversations.push({
				id: structure.id,
				title: structure.title,
				messageCount: structure.messages.length,
				createdAt: rootMessage.createdAt,
				updatedAt: structure.messages[structure.messages.length - 1]?.updatedAt || rootMessage.createdAt
			});
		}

		return conversations.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
	}

	/**
	 * Delete a conversation and all its messages
	 */
	async deleteConversation(userId: string, conversationId: string): Promise<void> {
		// Load conversation to get all message IDs
		await this.loadConversationFromDatabase(conversationId, userId);
		const tree = forkingSystem.getConversation(conversationId);
		const messageIds = Array.from(tree.messages.keys());

		// Delete all messages
		await this.deleteMessagesFromDatabase(userId, messageIds);

		// Clear from forking system
		forkingSystem.clear();
	}

	/**
	 * Sync forking system with database after operations
	 */
	async syncWithDatabase(
		userId: string,
		conversationId: string,
		operation: 'add' | 'edit' | 'delete'
	): Promise<void> {
		const tree = forkingSystem.getConversation(conversationId);

		switch (operation) {
			case 'add':
				// Save new messages to database
				for (const message of tree.messages.values()) {
					try {
						await this.saveMessageToDatabase(userId, message);
					} catch (error) {
						// Message might already exist
						console.warn('Message already exists in database:', message.id);
					}
				}
				break;

			case 'edit':
				// Update edited messages and delete discarded ones
				// This would need to be handled more carefully in a real implementation
				await this.saveConversationToDatabase(userId, conversationId);
				break;

			case 'delete':
				// Delete messages from database
				const messageIds = Array.from(tree.messages.keys());
				await this.deleteMessagesFromDatabase(userId, messageIds);
				break;
		}
	}
}

// Export singleton instance
export const forkingAdapter = new ForkingDatabaseAdapter();
