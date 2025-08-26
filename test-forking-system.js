// Test script for the forking system
// Run with: node test-forking-system.js

console.log('🧪 Testing Forking System...\n');

// Simulate the forking system (since we can't import TypeScript directly)
class MockForkingSystem {
	constructor() {
		this.conversations = new Map();
	}

	createConversation(conversationId) {
		const tree = {
			conversationId,
			messages: new Map(),
			branches: new Map(),
			rootMessages: []
		};
		this.conversations.set(conversationId, tree);
		return tree;
	}

	getConversation(conversationId) {
		let tree = this.conversations.get(conversationId);
		if (!tree) {
			tree = this.createConversation(conversationId);
		}
		return tree;
	}

	addMessage(conversationId, parentId, role, content, messageId) {
		const tree = this.getConversation(conversationId);
		const id = messageId || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
		const now = new Date();

		const message = {
			id,
			parentId,
			role,
			content,
			children: [],
			createdAt: now,
			updatedAt: now
		};

		tree.messages.set(id, message);

		if (parentId) {
			const parent = tree.messages.get(parentId);
			if (parent) {
				parent.children.push(id);
			}
		} else {
			tree.rootMessages.push(id);
		}

		return message;
	}

	editMessage(conversationId, messageId, newContent) {
		const tree = this.getConversation(conversationId);
		const originalMessage = tree.messages.get(messageId);

		if (!originalMessage) {
			throw new Error(`Message ${messageId} not found`);
		}

		// Create new message with updated content
		const newMessage = this.addMessage(
			conversationId,
			originalMessage.parentId,
			originalMessage.role,
			newContent
		);

		// Get descendants to discard
		const discardedMessages = this.getDescendants(conversationId, messageId);

		// Remove discarded messages
		discardedMessages.forEach(id => {
			tree.messages.delete(id);
		});

		// Update parent's children
		if (originalMessage.parentId) {
			const parent = tree.messages.get(originalMessage.parentId);
			if (parent) {
				const index = parent.children.indexOf(messageId);
				if (index !== -1) {
					parent.children[index] = newMessage.id;
				}
			}
		} else {
			const index = tree.rootMessages.indexOf(messageId);
			if (index !== -1) {
				tree.rootMessages[index] = newMessage.id;
			}
		}

		// Remove original message
		tree.messages.delete(messageId);

		return { newMessage, discardedMessages };
	}

	getDescendants(conversationId, messageId) {
		const tree = this.getConversation(conversationId);
		const descendants = [];
		const queue = [messageId];
		const visited = new Set();

		while (queue.length > 0) {
			const currentId = queue.shift();
			if (visited.has(currentId)) continue;
			visited.add(currentId);

			const currentMessage = tree.messages.get(currentId);
			if (currentMessage) {
				descendants.push(currentId);
				queue.push(...currentMessage.children);
			}
		}

		return descendants.filter(id => id !== messageId);
	}

	getAllMessages(conversationId) {
		const tree = this.getConversation(conversationId);
		return Array.from(tree.messages.values()).sort((a, b) => 
			a.createdAt.getTime() - b.createdAt.getTime()
		);
	}

	clear() {
		this.conversations.clear();
	}
}

// Test the system
const forkingSystem = new MockForkingSystem();

console.log('📝 Test 1: Create a simple conversation');
const convId = 'test_conv_1';
forkingSystem.addMessage(convId, null, 'user', 'Hello, how are you?');
forkingSystem.addMessage(convId, 'msg_1', 'assistant', 'I\'m doing well, thank you!');
forkingSystem.addMessage(convId, 'msg_2', 'user', 'Can you help me with programming?');
forkingSystem.addMessage(convId, 'msg_3', 'assistant', 'Of course! I\'d be happy to help you with programming.');

const messages = forkingSystem.getAllMessages(convId);
console.log('Messages in conversation:', messages.length);
messages.forEach((msg, index) => {
	console.log(`  ${index + 1}. [${msg.role}] ${msg.content}`);
});

console.log('\n📝 Test 2: Edit a message and create fork');
try {
	const result = forkingSystem.editMessage(convId, 'msg_1', 'Hello, how are you doing today?');
	console.log('✅ Fork created successfully');
	console.log('New message ID:', result.newMessage.id);
	console.log('Discarded messages:', result.discardedMessages.length);
	
	const updatedMessages = forkingSystem.getAllMessages(convId);
	console.log('Updated messages in conversation:', updatedMessages.length);
	updatedMessages.forEach((msg, index) => {
		console.log(`  ${index + 1}. [${msg.role}] ${msg.content}`);
	});
} catch (error) {
	console.error('❌ Error creating fork:', error.message);
}

console.log('\n📝 Test 3: Test multiple forks');
// Create another fork
try {
	const result2 = forkingSystem.editMessage(convId, 'msg_1', 'Hi there! How are you feeling?');
	console.log('✅ Second fork created successfully');
	
	const finalMessages = forkingSystem.getAllMessages(convId);
	console.log('Final messages in conversation:', finalMessages.length);
	finalMessages.forEach((msg, index) => {
		console.log(`  ${index + 1}. [${msg.role}] ${msg.content}`);
	});
} catch (error) {
	console.error('❌ Error creating second fork:', error.message);
}

console.log('\n✅ Forking system test completed!');
