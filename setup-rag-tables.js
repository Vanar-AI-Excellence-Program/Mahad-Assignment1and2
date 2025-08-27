import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { config } from 'dotenv';

// Load environment variables
config();

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/mydatabase';

async function setupRAGTables() {
  try {
    console.log('🔧 Setting up RAG database tables...');
    
    const client = postgres(connectionString);
    
    // Enable pgvector extension
    console.log('📦 Enabling pgvector extension...');
    await client`CREATE EXTENSION IF NOT EXISTS vector;`;
    console.log('✅ pgvector extension enabled');
    
    // Create documents table
    console.log('📄 Creating documents table...');
    await client`
      CREATE TABLE IF NOT EXISTS documents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        mime TEXT NOT NULL,
        size_bytes INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `;
    console.log('✅ documents table created');
    
    // Create chunks table with vector support
    console.log('🧩 Creating chunks table...');
    await client`
      CREATE TABLE IF NOT EXISTS chunks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        embedding vector(768) NOT NULL,
        chunk_index INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `;
    console.log('✅ chunks table created');
    
    // Create vector index for similarity search
    console.log('🔍 Creating vector index...');
    await client`
      CREATE INDEX IF NOT EXISTS chunks_embedding_idx ON chunks 
      USING ivfflat (embedding vector_cosine_ops) 
      WITH (lists = 100);
    `;
    console.log('✅ vector index created');
    
    // Create index on document_id for faster lookups
    console.log('📊 Creating document_id index...');
    await client`
      CREATE INDEX IF NOT EXISTS chunks_document_id_idx ON chunks(document_id);
    `;
    console.log('✅ document_id index created');
    
    // Verify tables were created
    const tables = await client`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('documents', 'chunks')
      ORDER BY table_name;
    `;
    
    console.log('\n📋 Verification - Found tables:', tables.map(t => t.table_name));
    
    // Check if pgvector extension is enabled
    const extensions = await client`
      SELECT extname FROM pg_extension WHERE extname = 'vector';
    `;
    
    if (extensions.length > 0) {
      console.log('✅ pgvector extension is enabled');
    } else {
      console.log('❌ pgvector extension is not enabled');
    }
    
    await client.end();
    console.log('\n🎉 RAG database setup completed successfully!');
    
  } catch (error) {
    console.error('❌ Error setting up RAG database:', error);
  }
}

setupRAGTables();
