// Core forking system for chatbot conversations
// Implements a tree-based message structure with branching capabilities

export interface Message {
	id: string;
	parentId: string | null;
	role: 'user' | 'assistant';
	content: string;
	children: string[];
	createdAt: Date;
	updatedAt: Date;
}

export interface Branch {
	id: string;
	conversationId: string;
	messageId: string;
	parentId: string | null;
	branchId: string;
	createdAt: Date;
}

export interface ConversationTree {
	conversationId: string;
	messages: Map<string, Message>;
	branches: Map<string, Branch>;
	rootMessages: string[];
}

export class ForkingSystem {
	private conversations: Map<string, ConversationTree> = new Map();

	/**
	 * Create a new conversation tree
	 */
	createConversation(conversationId: string): ConversationTree {
		const tree: ConversationTree = {
			conversationId,
			messages: new Map(),
			branches: new Map(),
			rootMessages: []
		};
		this.conversations.set(conversationId, tree);
		return tree;
	}

	/**
	 * Get or create a conversation tree
	 */
	getConversation(conversationId: string): ConversationTree {
		let tree = this.conversations.get(conversationId);
		if (!tree) {
			tree = this.createConversation(conversationId);
		}
		return tree;
	}

	/**
	 * Add a new message to the conversation tree
	 */
	addMessage(
		conversationId: string,
		parentId: string | null,
		role: 'user' | 'assistant',
		content: string,
		messageId?: string
	): Message {
		const tree = this.getConversation(conversationId);
		const id = messageId || this.generateId();
		const now = new Date();

		const message: Message = {
			id,
			parentId,
			role,
			content,
			children: [],
			createdAt: now,
			updatedAt: now
		};

		// Add message to tree
		tree.messages.set(id, message);

		// Update parent's children list
		if (parentId) {
			const parent = tree.messages.get(parentId);
			if (parent) {
				parent.children.push(id);
			}
		} else {
			// This is a root message
			tree.rootMessages.push(id);
		}

		return message;
	}

	/**
	 * Edit a message and create a fork
	 */
	editMessage(
		conversationId: string,
		messageId: string,
		newContent: string
	): { newMessage: Message; discardedMessages: string[] } {
		console.log('🔧 [editMessage] Starting edit for conversation:', conversationId);
		console.log('🔧 [editMessage] Message ID to edit:', messageId);
		console.log('🔧 [editMessage] New content:', newContent);
		
		const tree = this.getConversation(conversationId);
		console.log('🔧 [editMessage] Tree messages count:', tree.messages.size);
		console.log('🔧 [editMessage] Available message IDs:', Array.from(tree.messages.keys()));
		
		const originalMessage = tree.messages.get(messageId);

		if (!originalMessage) {
			console.error('🔧 [editMessage] Message not found in tree. Available messages:', Array.from(tree.messages.entries()).map(([id, msg]) => ({ id, content: msg.content.substring(0, 50) })));
			throw new Error(`Message ${messageId} not found in conversation ${conversationId}`);
		}
		
		console.log('🔧 [editMessage] Found original message:', { id: originalMessage.id, content: originalMessage.content.substring(0, 50) });

		// Create new message with updated content
		const newMessage = this.addMessage(
			conversationId,
			originalMessage.parentId,
			originalMessage.role,
			newContent
		);

		// Get all messages that need to be discarded (descendants of the original message)
		const discardedMessages = this.getDescendants(conversationId, messageId);

		// Remove discarded messages from the tree
		discardedMessages.forEach(id => {
			tree.messages.delete(id);
		});

		// Update parent's children list to replace the old message with the new one
		if (originalMessage.parentId) {
			const parent = tree.messages.get(originalMessage.parentId);
			if (parent) {
				const index = parent.children.indexOf(messageId);
				if (index !== -1) {
					parent.children[index] = newMessage.id;
				}
			}
		} else {
			// Update root messages
			const index = tree.rootMessages.indexOf(messageId);
			if (index !== -1) {
				tree.rootMessages[index] = newMessage.id;
			}
		}

		// Remove the original message
		tree.messages.delete(messageId);

		return { newMessage, discardedMessages };
	}

	/**
	 * Get all descendants of a message (messages that would be discarded when editing)
	 */
	getDescendants(conversationId: string, messageId: string): string[] {
		const tree = this.getConversation(conversationId);
		const descendants: string[] = [];
		const queue = [messageId];

		while (queue.length > 0) {
			const currentId = queue.shift()!;
			const message = tree.messages.get(currentId);
			
			if (message) {
				descendants.push(currentId);
				queue.push(...message.children);
			}
		}

		// Remove the original message from descendants
		return descendants.filter(id => id !== messageId);
	}

	/**
	 * Get a branch of messages (path from root to a specific message)
	 */
	getBranch(conversationId: string, messageId: string): Message[] {
		const tree = this.getConversation(conversationId);
		const branch: Message[] = [];
		let currentId = messageId;

		// Walk up the tree to build the branch
		while (currentId) {
			const message = tree.messages.get(currentId);
			if (message) {
				branch.unshift(message);
				currentId = message.parentId || '';
			} else {
				break;
			}
		}

		return branch;
	}

	/**
	 * Get all sibling branches (different responses to the same parent message)
	 */
	getSiblingBranches(conversationId: string, parentId: string): Message[][] {
		const tree = this.getConversation(conversationId);
		const parent = tree.messages.get(parentId);
		
		if (!parent) {
			return [];
		}

		return parent.children.map(childId => this.getBranch(conversationId, childId));
	}

	/**
	 * Get all messages in a conversation (flattened for display)
	 */
	getAllMessages(conversationId: string): Message[] {
		const tree = this.getConversation(conversationId);
		return Array.from(tree.messages.values()).sort((a, b) => 
			a.createdAt.getTime() - b.createdAt.getTime()
		);
	}

	/**
	 * Get conversation structure for API responses
	 */
	getConversationStructure(conversationId: string): {
		id: string;
		title: string;
		messages: Message[];
		branches: Array<{
			id: string;
			parentId: string | null;
			messages: Message[];
		}>;
	} {
		const tree = this.getConversation(conversationId);
		const messages = this.getAllMessages(conversationId);
		
		// Get the first user message as title
		const firstUserMessage = messages.find(m => m.role === 'user');
		const title = firstUserMessage ? 
			firstUserMessage.content.substring(0, 50) + (firstUserMessage.content.length > 50 ? '...' : '') :
			'Untitled Conversation';

		// Get all branches
		const branches = tree.rootMessages.map(rootId => ({
			id: rootId,
			parentId: null,
			messages: this.getBranch(conversationId, rootId)
		}));

		return {
			id: conversationId,
			title,
			messages,
			branches
		};
	}

	/**
	 * Check if a message has multiple versions (siblings)
	 */
	hasMultipleVersions(conversationId: string, parentId: string): boolean {
		const tree = this.getConversation(conversationId);
		const parent = tree.messages.get(parentId);
		return parent ? parent.children.length > 1 : false;
	}

	/**
	 * Get version information for a message
	 */
	getVersionInfo(conversationId: string, messageId: string): {
		version: number;
		totalVersions: number;
		siblings: string[];
	} {
		const tree = this.getConversation(conversationId);
		const message = tree.messages.get(messageId);
		
		if (!message || !message.parentId) {
			return { version: 1, totalVersions: 1, siblings: [] };
		}

		const parent = tree.messages.get(message.parentId);
		if (!parent) {
			return { version: 1, totalVersions: 1, siblings: [] };
		}

		const siblings = parent.children;
		const version = siblings.indexOf(messageId) + 1;

		return {
			version,
			totalVersions: siblings.length,
			siblings
		};
	}

	/**
	 * Generate a unique ID
	 */
	private generateId(): string {
		return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}

	/**
	 * Clear all conversations (for testing)
	 */
	clear(): void {
		this.conversations.clear();
	}
}

// Export a singleton instance
export const forkingSystem = new ForkingSystem();
