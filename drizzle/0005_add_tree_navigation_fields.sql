-- Add fields for tree-based navigation
ALTER TABLE chats ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE chats ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE chats ADD COLUMN IF NOT EXISTS conversation_id UUID;
ALTER TABLE chats ADD COLUMN IF NOT EXISTS branch_order INTEGER DEFAULT 0;

-- Create index for faster tree traversal
CREATE INDEX IF NOT EXISTS idx_chats_conversation_parent ON chats(conversation_id, parent_id);
CREATE INDEX IF NOT EXISTS idx_chats_user_conversation ON chats(user_id, conversation_id);
CREATE INDEX IF NOT EXISTS idx_chats_active_path ON chats(conversation_id, is_active, branch_order);

-- Add constraint to ensure conversation_id is set for root messages
ALTER TABLE chats ADD CONSTRAINT check_root_conversation_id 
CHECK ((parent_id IS NULL AND conversation_id IS NOT NULL) OR (parent_id IS NOT NULL));

-- Add constraint to ensure version is positive
ALTER TABLE chats ADD CONSTRAINT check_version_positive CHECK (version > 0);
