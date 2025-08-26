-- Migration: Remove old chats table after forking system migration
-- This migration should be run after confirming data migration was successful

-- Step 1: Drop old indexes
DROP INDEX IF EXISTS idx_chats_is_edited;
DROP INDEX IF EXISTS idx_chats_parent_id_role;

-- Step 2: Drop old chats table
DROP TABLE IF EXISTS chats CASCADE;

-- Step 3: Clean up any remaining references
-- (This is handled by CASCADE, but included for clarity)
