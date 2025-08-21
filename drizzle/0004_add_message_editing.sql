-- Migration: Add message editing support to chats table
-- This migration adds fields to track when messages have been edited

ALTER TABLE chats 
ADD COLUMN is_edited BOOLEAN DEFAULT FALSE,
ADD COLUMN original_content TEXT;

-- Add index for better performance when querying edited messages
CREATE INDEX IF NOT EXISTS idx_chats_is_edited ON chats(is_edited);
CREATE INDEX IF NOT EXISTS idx_chats_parent_id_role ON chats(parent_id, role);
