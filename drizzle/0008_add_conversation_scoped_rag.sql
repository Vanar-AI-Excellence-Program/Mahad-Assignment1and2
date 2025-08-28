-- Migration: Add conversation-scoped RAG embeddings
-- This ensures each chat conversation only uses documents uploaded within that conversation

-- Add conversation_id to documents table
ALTER TABLE documents ADD COLUMN conversation_id UUID REFERENCES chats(id) ON DELETE CASCADE;

-- Add conversation_id to chunks table  
ALTER TABLE chunks ADD COLUMN conversation_id UUID REFERENCES chats(id) ON DELETE CASCADE;

-- Create indexes for better performance on conversation-scoped queries
CREATE INDEX IF NOT EXISTS idx_documents_conversation_id ON documents(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chunks_conversation_id ON chunks(conversation_id);

-- Create a composite index for efficient conversation + embedding queries
CREATE INDEX IF NOT EXISTS idx_chunks_conversation_embedding ON chunks(conversation_id, chunk_index);

-- Update existing documents to have a default conversation_id (optional - for existing data)
-- This is commented out as it might not be needed depending on your data
-- UPDATE documents SET conversation_id = (SELECT id FROM chats WHERE documents.created_at >= chats.created_at ORDER BY chats.created_at DESC LIMIT 1);

-- Add NOT NULL constraint after data migration (if needed)
-- ALTER TABLE documents ALTER COLUMN conversation_id SET NOT NULL;
-- ALTER TABLE chunks ALTER COLUMN conversation_id SET NOT NULL;
