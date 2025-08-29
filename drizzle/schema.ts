import { pgTable, text, timestamp, integer, uuid, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

// Create pgvector extension
export const createVectorExtension = sql`CREATE EXTENSION IF NOT EXISTS vector;`

// Documents table
export const documents = pgTable('documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  mime: text('mime').notNull(),
  size_bytes: integer('size_bytes').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
})

// Chunks table with vector support
export const chunks = pgTable('chunks', {
  id: uuid('id').primaryKey().defaultRandom(),
  document_id: uuid('document_id').references(() => documents.id, { onDelete: 'cascade' }).notNull(),
  content: text('content').notNull(),
  embedding: sql`vector(768)`.type('vector(768)').notNull(), // Default dimension for Gemini embeddings
  chunk_index: integer('chunk_index').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
})

// Create vector index for similarity search
export const createVectorIndex = sql`
  CREATE INDEX IF NOT EXISTS chunks_embedding_idx ON chunks 
  USING ivfflat (embedding vector_cosine_ops) 
  WITH (lists = 100);
`




