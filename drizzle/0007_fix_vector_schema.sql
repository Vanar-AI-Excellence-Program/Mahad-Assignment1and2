-- Enable pgvector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Drop existing index if it exists
DROP INDEX IF EXISTS chunks_embedding_idx;

-- Alter the chunks table to change embedding column from text to vector(768)
-- First, create a temporary column
ALTER TABLE chunks ADD COLUMN embedding_vector vector(768);

-- Convert existing text embeddings to vector format
-- This assumes the text embeddings are stored as comma-separated numbers in brackets
UPDATE chunks 
SET embedding_vector = embedding::vector(768)
WHERE embedding IS NOT NULL AND embedding != '';

-- Drop the old text column
ALTER TABLE chunks DROP COLUMN embedding;

-- Rename the new vector column to embedding
ALTER TABLE chunks RENAME COLUMN embedding_vector TO embedding;

-- Make the embedding column NOT NULL
ALTER TABLE chunks ALTER COLUMN embedding SET NOT NULL;

-- Create proper vector index for similarity search
CREATE INDEX chunks_embedding_idx ON chunks 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);

-- Create index on document_id for faster lookups
CREATE INDEX IF NOT EXISTS chunks_document_id_idx ON chunks(document_id);

-- Verify the changes
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'chunks' AND column_name = 'embedding';
