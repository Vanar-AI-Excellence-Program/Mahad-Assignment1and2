import { pgTable, text, timestamp, uuid, boolean, varchar, primaryKey, integer } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { relations } from 'drizzle-orm';

// Users table
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  hashedPassword: text('hashed_password').notNull(),
  role: varchar('role', { length: 20 }).notNull().default('user'),
  emailVerified: boolean('email_verified').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Sessions table for Auth.js DrizzleAdapter
export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  sessionToken: text('session_token').notNull().unique(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { withTimezone: true }).notNull(),
});

// Verification tokens for email verification and password reset
export const verificationTokens = pgTable('verification_tokens', {
  identifier: text('identifier').notNull(),
  token: text('token').notNull(),
  expires: timestamp('expires', { withTimezone: true }).notNull(),
  type: varchar('type', { length: 50 }).default('email-verification').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  compoundKey: primaryKey(table.identifier, table.token),
}));

// User profiles table
export const userProfiles = pgTable('user_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  avatar: text('avatar'),
  bio: text('bio'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Conversations table - separates conversations from individual messages
export const conversations = pgTable('conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  title: text('title'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Chat messages table - updated for proper tree structure
export const chats = pgTable('chats', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id')
    .references(() => conversations.id, { onDelete: 'cascade' }),
  parentId: uuid('parent_id').references(() => chats.id, { onDelete: 'cascade' }),
  role: text('role', { enum: ['user', 'assistant'] }).notNull(),
  content: text('content').notNull(),
  children: text('children').default('[]'), // JSON array of child message IDs
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Conversation branches table - stores branch metadata for navigation
export const conversationBranches = pgTable('conversation_branches', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  conversationId: uuid('conversation_id').notNull(), // Root message ID of the conversation
  branchName: text('branch_name').notNull(),
  forkPointMessageId: uuid('fork_point_message_id'), // The message where this branch was forked from
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  isEdited: boolean('is_edited').default(false),
  version: integer('version').default(1),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(userProfiles, {
    fields: [users.id],
    references: [userProfiles.userId],
  }),
  sessions: many(sessions),
  conversations: many(conversations),
  conversationBranches: many(conversationBranches),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const userProfilesRelations = relations(userProfiles, ({ one }) => ({
  user: one(users, {
    fields: [userProfiles.userId],
    references: [users.id],
  }),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  user: one(users, {
    fields: [conversations.userId],
    references: [users.id],
  }),
  chats: many(chats),
}));

export const chatsRelations = relations(chats, ({ one, many }) => ({
  conversation: one(conversations, {
    fields: [chats.conversationId],
    references: [conversations.id],
  }),
  parent: one(chats, {
    fields: [chats.parentId],
    references: [chats.id],
    relationName: 'chat_parent_child',
  }),
  children: many(chats, {
    relationName: 'chat_parent_child',
  }),

}));

export const conversationBranchesRelations = relations(conversationBranches, ({ one, many }) => ({
  user: one(users, {
    fields: [conversationBranches.userId],
    references: [users.id],
  }),
  messages: many(chats),
}));

// RAG System Tables
export const documents = pgTable('documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  mime: text('mime').notNull(),
  size_bytes: integer('size_bytes').notNull(),
  conversation_id: uuid('conversation_id').references(() => chats.id, { onDelete: 'cascade' }),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const chunks = pgTable('chunks', {
  id: uuid('id').primaryKey().defaultRandom(),
  document_id: uuid('document_id').notNull().references(() => documents.id, { onDelete: 'cascade' }),
  conversation_id: uuid('conversation_id').references(() => chats.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  embedding: text('embedding').notNull(), // Store as text, will be converted to vector(3072) in database
  chunk_index: integer('chunk_index').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// RAG Relations
export const documentsRelations = relations(documents, ({ many }) => ({
  chunks: many(chunks),
}));

export const chunksRelations = relations(chunks, ({ one }) => ({
  document: one(documents, {
    fields: [chunks.document_id],
    references: [documents.id],
  }),
}));

// Types for TypeScript
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type VerificationToken = typeof verificationTokens.$inferSelect;
export type NewVerificationToken = typeof verificationTokens.$inferInsert;
export type UserProfile = typeof userProfiles.$inferSelect;
export type NewUserProfile = typeof userProfiles.$inferInsert;
export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
export type Chat = typeof chats.$inferSelect;
export type NewChat = typeof chats.$inferInsert;
export type ConversationBranch = typeof conversationBranches.$inferSelect;
export type NewConversationBranch = typeof conversationBranches.$inferInsert;
export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
export type Chunk = typeof chunks.$inferSelect;
export type NewChunk = typeof chunks.$inferInsert;

// SQL functions for pgvector
export const createVectorExtension = sql`CREATE EXTENSION IF NOT EXISTS vector`;
export const createVectorIndex = sql`CREATE INDEX IF NOT EXISTS chunks_embedding_idx ON chunks USING ivfflat (embedding::vector(3072)) WITH (lists = 100)`;