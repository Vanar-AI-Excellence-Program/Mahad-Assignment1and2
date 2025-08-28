-- Create conversations table
CREATE TABLE IF NOT EXISTS "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid REFERENCES "users"("id") ON DELETE CASCADE,
	"title" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Add conversation_id column to chats table (if it doesn't exist)
ALTER TABLE "chats" ADD COLUMN IF NOT EXISTS "conversation_id" uuid REFERENCES "conversations"("id") ON DELETE CASCADE;

-- Remove old columns from chats table
ALTER TABLE "chats" DROP COLUMN IF EXISTS "user_id";
ALTER TABLE "chats" DROP COLUMN IF EXISTS "is_active";
ALTER TABLE "chats" DROP COLUMN IF EXISTS "branch_order";
ALTER TABLE "chats" DROP COLUMN IF EXISTS "original_content";

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "conversations_user_id_idx" ON "conversations"("user_id");
CREATE INDEX IF NOT EXISTS "chats_conversation_id_idx" ON "chats"("conversation_id");
CREATE INDEX IF NOT EXISTS "chats_parent_id_idx" ON "chats"("parent_id");
CREATE INDEX IF NOT EXISTS "chats_created_at_idx" ON "chats"("created_at");

-- Migrate existing data: create conversations for existing chats
INSERT INTO "conversations" ("id", "user_id", "title", "created_at", "updated_at")
SELECT DISTINCT 
    COALESCE("conversation_id", gen_random_uuid()) as id,
    (SELECT "user_id" FROM "users" LIMIT 1) as user_id, -- Fallback user ID
    'Migrated Conversation' as title,
    MIN("created_at") as created_at,
    MAX("created_at") as updated_at
FROM "chats" 
WHERE "conversation_id" IS NULL
GROUP BY "conversation_id";

-- Update existing chats to have proper conversation_id
UPDATE "chats" 
SET "conversation_id" = (
    SELECT "id" FROM "conversations" 
    WHERE "conversations"."id" = "chats"."conversation_id" 
    OR ("chats"."conversation_id" IS NULL AND "conversations"."title" = 'Migrated Conversation')
    LIMIT 1
)
WHERE "conversation_id" IS NULL OR "conversation_id" NOT IN (SELECT "id" FROM "conversations");

-- Make conversation_id NOT NULL after migration
ALTER TABLE "chats" ALTER COLUMN "conversation_id" SET NOT NULL;
