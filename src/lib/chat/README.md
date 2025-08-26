# Chat Forking System

A comprehensive forking system for chatbots that implements ChatGPT-like branching functionality with tree-structured conversations, efficient caching, and database persistence.

## Features

- **Tree-structured conversations**: Messages are stored as a tree with parent-child relationships
- **Automatic forking**: Editing a message creates a new branch while preserving the original
- **Efficient caching**: Reuses conversation context up to fork points
- **Database persistence**: All conversations and branches are stored in PostgreSQL
- **Branch navigation**: Switch between different conversation branches
- **Backend-agnostic**: Can be easily integrated with any LLM API
- **Type-safe**: Full TypeScript support with comprehensive interfaces

## Architecture

The system consists of three main layers:

1. **Forking System** (`forking-system.ts`): Core logic for tree management and branching
2. **Database Adapter** (`database-adapter.ts`): Handles persistence with PostgreSQL
3. **Chat Service** (`chat-service.ts`): High-level API that integrates everything

## Quick Start

### Basic Usage

```typescript
import { chatService } from '$lib/chat/chat-service';

// Create a conversation
const conversation = await chatService.createConversation('user123');

// Send a message
const { message, response } = await chatService.sendMessage(
  conversation.id,
  'Hello! Can you help me with programming?',
  'user123'
);

// Edit a message (creates a fork)
const { originalBranch, newBranch, editedMessage, response: newResponse } = 
  await chatService.editMessage(
    message.id,
    'Hello! Can you help me with JavaScript instead?',
    'user123'
  );

// Switch between branches
const originalMessages = await chatService.getBranch(conversation.id, originalBranch.id);
const newMessages = await chatService.getBranch(conversation.id, newBranch.id);
```

### Low-level Usage

```typescript
import { forkingSystem } from '$lib/chat/forking-system';

// Create a conversation
const conversation = forkingSystem.createConversation();

// Add messages
const msg1 = forkingSystem.addMessage(conversation.id, null, 'user', 'Hello!');
const resp1 = forkingSystem.addMessage(conversation.id, msg1.id, 'assistant', 'Hi there!');

// Edit a message
const { originalBranch, newBranch, editedMessage } = forkingSystem.editMessage(
  msg1.id,
  'Hello! Can you help me?'
);

// Get messages in a branch
const messages = forkingSystem.getBranch(conversation.id, branchId);
```

## API Reference

### ChatService

#### Core Operations

- `sendMessage(conversationId, content, userId, parentId?, branchId?)`: Send a message and get AI response
- `editMessage(messageId, newContent, userId)`: Edit a message and create a fork
- `createConversation(userId)`: Create a new conversation
- `getConversation(conversationId)`: Get a conversation by ID

#### Branch Operations

- `getBranch(conversationId, branchId)`: Get all messages in a specific branch
- `getAllBranches(conversationId)`: Get all branches for a conversation
- `createBranch(conversationId, parentMessageId, name?)`: Create a new branch

#### Utility Functions

- `getCachedContext(messageId)`: Get conversation context up to a specific message
- `getSiblingBranches(messageId)`: Get branches that forked from the same parent

### ForkingSystem

#### Message Operations

- `addMessage(conversationId, parentId, role, content, branchId?)`: Add a message to a conversation
- `editMessage(messageId, newContent)`: Edit a message and create a fork
- `getMessage(messageId)`: Get a message by ID
- `getMessagePath(messageId)`: Get the path from root to a specific message

#### Branch Operations

- `createBranch(conversationId, parentMessageId, name?)`: Create a new branch
- `getBranch(conversationId, branchId)`: Get all messages in a specific branch
- `getAllBranches(conversationId)`: Get all branches for a conversation
- `getSiblingBranches(messageId)`: Get sibling branches

#### Conversation Operations

- `createConversation(id?)`: Create a new conversation
- `getConversation(conversationId)`: Get a conversation by ID

## Data Structures

### ChatMessage

```typescript
interface ChatMessage {
  id: string;
  parentId: string | null;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
  children: string[]; // IDs of messages that forked from this message
  branchId: string; // Which branch this message belongs to
  conversationId: string;
}
```

### Branch

```typescript
interface Branch {
  id: string;
  conversationId: string;
  parentMessageId: string | null; // The message this branch forked from
  rootMessageId: string; // The first message in this branch
  createdAt: Date;
  name?: string; // Optional branch name
}
```

### Conversation

```typescript
interface Conversation {
  id: string;
  rootMessageId: string;
  branches: Map<string, Branch>;
  messages: Map<string, ChatMessage>;
  createdAt: Date;
  updatedAt: Date;
}
```

## Database Schema

The system uses two main tables:

### chats
- `id`: Primary key
- `userId`: User who owns the message
- `conversationId`: Conversation this message belongs to
- `parentId`: Parent message ID (null for root messages)
- `role`: 'user' or 'assistant'
- `content`: Message content
- `branchId`: Branch this message belongs to
- `createdAt`: Timestamp

### conversation_branches
- `id`: Primary key
- `userId`: User who owns the branch
- `conversationId`: Conversation this branch belongs to
- `forkPointMessageId`: Message where this branch forked from
- `rootMessageId`: First message in this branch
- `branchName`: Human-readable branch name
- `createdAt`: Timestamp

## Efficiency Features

### Context Caching

The system efficiently caches conversation context up to fork points:

```typescript
// Get cached context up to a specific message
const context = await chatService.getCachedContext(messageId);

// This context can be reused when regenerating responses
// without recomputing the entire conversation history
```

### Branch Management

- Only regenerates responses from the fork point onward
- Preserves original branches in memory
- Efficient tree traversal for message retrieval

## Integration with Existing Code

### Replace Existing Chat API

```typescript
// Old way
const response = await fetch('/api/chat', {
  method: 'POST',
  body: JSON.stringify({ messages, parentId })
});

// New way
const { message, response } = await chatService.sendMessage(
  conversationId,
  content,
  userId,
  parentId
);
```

### Add Forking to Frontend

```typescript
// In your Svelte component
async function handleEditMessage(messageId: string, newContent: string) {
  const { originalBranch, newBranch, editedMessage, response } = 
    await chatService.editMessage(messageId, newContent, userId);
  
  // Update UI to show new branch
  messages = await chatService.getBranch(conversationId, newBranch.id);
}
```

## Examples

See `example-usage.ts` for comprehensive examples of:

- Creating conversations and sending messages
- Editing messages to create forks
- Switching between branches
- Getting sibling branches
- Using cached context
- Creating additional branches

## Testing

Run the example to see the system in action:

```typescript
import { exampleUsage } from '$lib/chat/example-usage';

// Run the example
await exampleUsage();
```

## Benefits

1. **ChatGPT-like Experience**: Users can edit messages and see different conversation branches
2. **Efficient**: Only regenerates responses from fork points
3. **Persistent**: All conversations and branches are stored in the database
4. **Scalable**: Tree structure allows for complex conversation histories
5. **Type-safe**: Full TypeScript support prevents runtime errors
6. **Modular**: Easy to integrate with different LLM providers

## Future Enhancements

- Branch merging capabilities
- Branch comparison tools
- Advanced branch naming and organization
- Branch sharing between users
- Branch templates and presets
