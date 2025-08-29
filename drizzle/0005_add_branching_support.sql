-- Add branchId column to chats table
ALTER TABLE "chats" ADD COLUMN "branch_id" uuid;

-- Rename branch_data to fork_point_message_id in conversation_branches table
ALTER TABLE "conversation_branches" RENAME COLUMN "branch_data" TO "fork_point_message_id";

-- Change the data type from text to uuid for fork_point_message_id
ALTER TABLE "conversation_branches" ALTER COLUMN "fork_point_message_id" TYPE uuid USING fork_point_message_id::uuid;
