# Chatbot Forking System

A clean, modular implementation of a forking feature for chatbots, similar to ChatGPT's conversation branching system.

## Features

### 1. Conversation History Structure
- **Tree-based storage**: Messages are stored as a tree instead of a flat list
- **Message properties**: Each message has:
  - `id`: Unique identifier
  - `parent_id`: Points to the message it replies to
  - `role`: "user" or "assistant"
  - `content`: Message text
  - `children`: List of message IDs that forked from it
  - `conversation_id`: Groups messages into conversations
  - `branch_id`: Unique ID for each fork branch

### 2. Forking on Edit
- **Automatic forking**: When a user edits a past message:
  - Creates a new message node with updated content
  - Attaches it to the same parent as the original message
  - Discards all messages that followed the old version in that branch
  - Runs the model again starting from the edited message
- **Branch preservation**: Old branches are kept in memory (not overwritten)

### 3. Branching Metadata
- **Navigable branches**: Each branch tracks:
  - `conversation_id`: Conversation identifier
  - `message_id`: Root message of the branch
  - `parent_id`: Parent message ID
  - `branch_id`: Unique ID for each fork
  - `branch_name`: Human-readable branch name
  - `is_active`: Whether this is the currently active branch

### 4. Efficiency Features
- **Smart regeneration**: Only regenerates from the fork point onward
- **Caching**: Reuses earlier conversation up to the fork point
- **Memory management**: Efficient tree traversal and branch switching

## Architecture

### Core Components

1. **`ForkingSystem`** (`src/lib/utils/forking-system.ts`)
   - Main class that manages the message tree and branches
   - Handles all forking logic and tree operations
   - In-memory operations for performance

2. **`ForkingDBAdapter`** (`src/lib/utils/forking-db-adapter.ts`)
   - Database integration layer
   - Persists forking system state to database
   - Handles database operations and data conversion

3. **Updated Chat API** (`src/routes/api/chat/+server.ts`)
   - RESTful endpoints for chat operations
   - Integrates with the forking system
   - Supports conversation and branch management

### Data Flow

```
User Action → Chat API → ForkingDBAdapter → ForkingSystem → Database
     ↓
Response ← Chat API ← ForkingDBAdapter ← ForkingSystem ← Database
```

## Usage Examples

### Basic Usage

```typescript
import { ForkingSystem } from '$lib/utils/forking-system';

// Create a new forking system
const forkingSystem = new ForkingSystem();

// Add messages to create a conversation
const message1 = forkingSystem.add_message(
  null, // root message
  'user',
  'Hello, how are you?',
  'conv_1',
  'branch_1'
);

const message2 = forkingSystem.add_message(
  message1.id,
  'assistant',
  'I\'m doing well, thank you!',
  'conv_1',
  'branch_1'
);

// Edit a message to create a fork
const editedMessage = forkingSystem.edit_message(
  message1.id,
  'Hello, how are you today?'
);

// Get all branches
const branches = forkingSystem.get_conversation_branches('conv_1');
```

### Database Integration

```typescript
import { ForkingDBAdapter } from '$lib/utils/forking-db-adapter';

// Create database adapter
const forkingAdapter = new ForkingDBAdapter();

// Add message to database
const message = await forkingAdapter.addMessage(
  userId,
  parentId,
  'user',
  'Hello world',
  conversationId,
  branchId
);

// Edit message (creates fork)
const editedMessage = await forkingAdapter.editMessage(
  userId,
  messageId,
  'Hello world!'
);

// Get conversation tree
const conversation = await forkingAdapter.getConversationTree(
  userId,
  conversationId
);

// Switch branches
await forkingAdapter.switchBranch(userId, conversationId, branchId);
```

### API Endpoints

#### POST `/api/chat`
Send a new message and get AI response.

**Request:**
```json
{
  "messages": [
    {"role": "user", "content": "Hello"}
  ],
  "conversationId": "conv_123",
  "branchId": "branch_456"
}
```

#### GET `/api/chat?conversationId=conv_123&branchId=branch_456`
Get conversation history for a specific branch.

#### PUT `/api/chat`
Edit a message and regenerate AI response.

**Request:**
```json
{
  "messageId": "msg_123",
  "newContent": "Updated message",
  "conversationId": "conv_123"
}
```

#### PATCH `/api/chat`
Switch to a different branch.

**Request:**
```json
{
  "conversationId": "conv_123",
  "branchId": "branch_789"
}
```

## Database Schema

The system extends your existing `chats` table with forking-specific fields:

```sql
-- Existing fields
id, userId, parentId, role, content, createdAt

-- New forking fields
isEdited, originalContent, forkId, branchType, parentBranchId
```

## Key Functions

### Core Forking System

- `add_message(parent_id, role, content, conversation_id, branch_id)`: Add new message
- `edit_message(message_id, new_content)`: Edit message and create fork
- `get_branch(conversation_id, branch_id)`: Get messages for a specific branch
- `get_conversation_branches(conversation_id)`: Get all branches for a conversation
- `switch_branch(conversation_id, branch_id)`: Switch to a different branch
- `get_messages_up_to_fork(conversation_id, fork_message_id)`: Get messages up to fork point

### Database Adapter

- `addMessage(userId, parentId, role, content, conversationId, branchId)`: Add message to DB
- `editMessage(userId, messageId, newContent)`: Edit message in DB
- `getConversationTree(userId, conversationId, branchId?)`: Get conversation tree
- `switchBranch(userId, conversationId, branchId)`: Switch branch in DB
- `loadFromDatabase(userId, conversationId?)`: Load data from DB
- `saveToDatabase(userId)`: Save data to DB

## Example Scenarios

### Scenario 1: Simple Message Edit
1. User asks: "What is the capital of France?"
2. AI responds: "The capital of France is Paris."
3. User edits: "What is the capital of France and what is it known for?"
4. System creates fork and regenerates AI response
5. Original branch is preserved

### Scenario 2: Multiple Forks
1. User asks about machine learning
2. AI explains machine learning
3. User asks about types
4. AI explains types
5. User edits first question to ask about deep learning
6. System creates fork and regenerates entire conversation
7. Both branches are preserved and navigable

### Scenario 3: Branch Navigation
1. User can switch between different conversation branches
2. Each branch shows "Version 1", "Version 2", etc.
3. User can see all versions of their questions
4. System maintains conversation context for each branch

## Benefits

1. **Non-destructive editing**: Original conversations are never lost
2. **Efficient regeneration**: Only regenerates from fork point
3. **Branch navigation**: Users can explore different conversation paths
4. **Clean architecture**: Modular, testable, and maintainable code
5. **Database agnostic**: Can be adapted to any database system
6. **LLM agnostic**: Works with any AI model/API

## Testing

Run the example functions to test the system:

```typescript
import { runAllExamples } from '$lib/utils/forking-example';

// Run all examples
runAllExamples();

// Or run specific examples
import { basicForkingExample, complexForkingExample } from '$lib/utils/forking-example';
basicForkingExample();
complexForkingExample();
```

## Future Enhancements

1. **Branch merging**: Combine multiple branches
2. **Branch comparison**: Visual diff between branches
3. **Branch sharing**: Share specific conversation branches
4. **Advanced navigation**: Tree view of conversation structure
5. **Performance optimization**: Lazy loading for large conversations
6. **Real-time collaboration**: Multiple users editing same conversation

## Implementation Notes

- The system is designed to be backend-agnostic
- Can be easily integrated with any LLM API
- Supports both in-memory and persistent storage
- Handles complex branching scenarios efficiently
- Maintains data integrity and consistency
- Provides clean, intuitive API for frontend integration

## Troubleshooting

### Common Issues

1. **Message not found**: Ensure message ID exists and belongs to user
2. **Branch not found**: Check conversation ID and branch ID validity
3. **Database errors**: Verify database connection and schema
4. **Performance issues**: Consider implementing pagination for large conversations

### Debug Mode

Enable debug logging by setting environment variable:
```bash
DEBUG_FORKING=true
```

This will log detailed information about forking operations and tree traversal.
