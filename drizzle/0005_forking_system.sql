-- Migration: Implement forking system with conversations, branches, and messages
-- This migration restructures the chat system to support conversation branching

-- Step 1: Create new tables
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  parent_branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  is_edited BOOLEAN DEFAULT FALSE,
  original_content TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Step 2: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_branches_conversation_id ON branches(conversation_id);
CREATE INDEX IF NOT EXISTS idx_branches_parent_branch_id ON branches(parent_branch_id);
CREATE INDEX IF NOT EXISTS idx_messages_branch_id ON messages(branch_id);
CREATE INDEX IF NOT EXISTS idx_messages_parent_id ON messages(parent_id);
CREATE INDEX IF NOT EXISTS idx_messages_role ON messages(role);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- Step 3: Migrate existing data from chats table (only if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'chats') THEN
    -- Create a default conversation for each user with existing chats
    INSERT INTO conversations (id, user_id, title, created_at, updated_at)
    SELECT DISTINCT 
      gen_random_uuid(),
      user_id,
      'Migrated Conversation',
      MIN(created_at),
      MAX(created_at)
    FROM chats
    GROUP BY user_id;

    -- Create a default branch for each conversation
    INSERT INTO branches (id, conversation_id, name, created_at)
    SELECT 
      gen_random_uuid(),
      c.id,
      'Main Branch',
      c.created_at
    FROM conversations c;

    -- Migrate existing chat messages to the new messages table
    INSERT INTO messages (id, branch_id, parent_id, role, content, is_edited, original_content, created_at)
    SELECT 
      ch.id,
      b.id,
      ch.parent_id,
      ch.role,
      ch.content,
      COALESCE(ch.is_edited, FALSE),
      ch.original_content,
      ch.created_at
    FROM chats ch
    JOIN branches b ON b.conversation_id = (
      SELECT c.id FROM conversations c WHERE c.user_id = ch.user_id
    );

    -- Update foreign key references in messages table
    UPDATE messages 
    SET parent_id = NULL 
    WHERE parent_id NOT IN (SELECT id FROM messages);
  END IF;
END $$;

-- Step 4: Add constraints after data migration
ALTER TABLE messages 
ADD CONSTRAINT messages_role_check CHECK (role IN ('user', 'assistant'));

-- Step 5: Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Step 6: Create triggers for updated_at
CREATE TRIGGER update_conversations_updated_at 
  BEFORE UPDATE ON conversations 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Step 7: Add comments for documentation
COMMENT ON TABLE conversations IS 'Represents a chat session that can have multiple branches';
COMMENT ON TABLE branches IS 'Represents different conversation paths within a conversation';
COMMENT ON TABLE messages IS 'Individual messages within a branch, supporting parent-child relationships';
