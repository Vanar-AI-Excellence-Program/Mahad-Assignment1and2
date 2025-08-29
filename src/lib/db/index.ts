import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '$env/dynamic/private';
import * as schema from './schema';

// Database connection
const connectionString = env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/mydatabase';

// Create postgres client
const client = postgres(connectionString, {
  max: 1,
  idle_timeout: 20,
  connect_timeout: 10,
});

// Create drizzle instance
export const db = drizzle(client, { schema });

// Export schema for migrations
export * from './schema';

// Initialize pgvector extension and tables
export async function initializeDatabase() {
  try {
    // Create pgvector extension
    await client.unsafe('CREATE EXTENSION IF NOT EXISTS vector');
    
    // Create vector index
    await client.unsafe('CREATE INDEX IF NOT EXISTS chunks_embedding_idx ON chunks USING ivfflat (embedding::vector(768)) WITH (lists = 100)');
    
    console.log('✅ Database initialized with pgvector support');
  } catch (error) {
    console.error('❌ Error initializing database:', error);
  }
} 