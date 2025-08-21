# Tree-Structured Chat System

This document describes the implementation of a tree-structured chat history system that allows users to edit messages and create conversation forks while preserving the original conversation branches.

## Overview

The chat system implements a tree structure where:
- Each message (user or AI) can have children
- Users can edit their own messages, creating new branches
- AI responses are regenerated when messages are edited
- Original conversation branches are preserved as forks
- The system maintains context consistency across branches

## Key Features

### 1. Message Editing
- **Only user messages can be edited** - AI responses remain immutable
- **Inline editing interface** - Click edit button to modify message content
- **Automatic AI regeneration** - When a message is edited, AI responses are regenerated from that point
- **Edit tracking** - Original content is preserved and marked as edited

### 2. Tree-Structured History
- **Parent-child relationships** - Messages can have multiple children (edited versions, AI responses)
- **Branch preservation** - Original conversations are never lost
- **Visual hierarchy** - Chat history sidebar shows the tree structure clearly
- **Fork creation** - Users can create new conversation branches from any point

### 3. Dynamic Regeneration
- **Context-aware responses** - AI responses are generated based on the current branch
- **Streaming updates** - Responses are streamed in real-time during regeneration
- **Branch consistency** - Each branch maintains its own conversation context

## Database Schema

The `chats` table has been extended with new fields:

```sql
CREATE TABLE chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES chats(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  is_edited BOOLEAN DEFAULT FALSE,
  original_content TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
```

### New Fields:
- `is_edited`: Boolean flag indicating if the message has been edited
- `original_content`: Stores the original content when a message is edited

## API Endpoints

### POST `/api/chat`
Creates new messages and generates AI responses.

**Request Body:**
```json
{
  "messages": [
    {"role": "user", "content": "Hello"},
    {"role": "assistant", "content": "Hi there!"}
  ],
  "parentId": "optional-parent-message-id"
}
```

### PUT `/api/chat`
Edits an existing user message and regenerates AI responses.

**Request Body:**
```json
{
  "messageId": "message-id-to-edit",
  "newContent": "Updated message content"
}
```

**Response:** Streaming response with regenerated AI content.

### GET `/api/chat`
Retrieves the complete tree-structured chat history for the authenticated user.

## Frontend Implementation

### Message Display
- **User messages** show edit and fork buttons
- **Edited messages** display an "Edited" indicator
- **Inline editing** with save/cancel buttons
- **Visual feedback** during editing operations

### Chat History Sidebar
- **Tree visualization** showing conversation branches
- **Edit indicators** for modified messages
- **Fork buttons** to create new branches
- **Nested display** of edited versions and responses

### State Management
- **Editing state** tracks which message is being edited
- **Branch tracking** maintains current conversation context
- **Real-time updates** reflect changes immediately

## Usage Examples

### 1. Editing a Message
1. Click the "Edit" button on any user message
2. Modify the content in the textarea
3. Click "Save" to apply changes
4. AI response is automatically regenerated
5. New branch is created in the conversation tree

### 2. Creating a Fork
1. Click "Fork from here" on any message
2. New conversation branch starts from that point
3. Original branch remains unchanged
4. Continue conversation in the new branch

### 3. Navigating Branches
1. Use the chat history sidebar to view all branches
2. Click on any conversation to load it
3. Edited messages show "Edited" indicators
4. Nested structure shows the complete conversation tree

## Technical Implementation

### Tree Building
The `buildChatTree` function converts flat database records into a tree structure:

```typescript
export function buildChatTree(messages: Chat[]): ChatTreeNode[] {
  const messageMap = new Map<string, ChatTreeNode>();
  
  // Initialize all messages with empty children arrays
  messages.forEach(msg => {
    messageMap.set(msg.id, { ...msg, children: [] });
  });
  
  // Build parent-child relationships
  messages.forEach(msg => {
    if (msg.parentId) {
      const parent = messageMap.get(msg.parentId);
      if (parent) parent.children.push(messageMap.get(msg.id)!);
    }
  });
  
  return rootMessages;
}
```

### Message Editing Flow
1. User clicks edit button → `startEditing()` function
2. Inline editing interface appears
3. User modifies content → `saveEditedMessage()` function
4. API call to PUT endpoint with new content
5. Original message marked as edited
6. New edited message created as child
7. AI response regenerated and saved
8. Chat history updated to show new branch

### Branch Management
- **Active branch**: Current conversation being viewed
- **Fork points**: Messages where new branches originate
- **Context preservation**: Each branch maintains its own conversation flow
- **History integrity**: Original conversations are never modified

## Benefits

1. **Non-destructive editing**: Original messages are preserved
2. **Context preservation**: Each branch maintains conversation coherence
3. **Flexible workflows**: Users can explore different conversation paths
4. **Audit trail**: Complete history of message changes
5. **Scalable structure**: Tree can handle complex conversation patterns

## Future Enhancements

1. **Branch merging**: Combine multiple conversation branches
2. **Version comparison**: View differences between message versions
3. **Collaborative editing**: Multiple users editing the same conversation
4. **Advanced branching**: Support for more complex conversation structures
5. **Export functionality**: Save specific conversation branches

## Migration

To apply the database changes:

```bash
# Run the migration
psql -d your_database -f drizzle/0004_add_message_editing.sql

# Or use your preferred migration tool
```

## Testing

Test the system by:
1. Creating a new conversation
2. Editing a user message
3. Verifying AI response regeneration
4. Checking branch creation in history
5. Navigating between different branches
6. Confirming edit indicators display correctly

## Troubleshooting

### Common Issues:
1. **Edit button not appearing**: Ensure message role is 'user'
2. **AI not regenerating**: Check API endpoint and authentication
3. **Branches not showing**: Verify database migration was applied
4. **Performance issues**: Check database indexes are created

### Debug Information:
- Check browser console for JavaScript errors
- Verify API responses in Network tab
- Confirm database schema matches expected structure
- Validate authentication tokens are valid
