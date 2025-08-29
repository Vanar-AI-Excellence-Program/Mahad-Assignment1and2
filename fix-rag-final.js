import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { config } from 'dotenv';

// Load environment variables
config();

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/mydatabase';

async function fixRAGFinal() {
  try {
    console.log('🔧 Final RAG System Fix...\n');
    
    const client = postgres(connectionString);
    
    // Step 1: Check current database state
    console.log('📊 Checking current database state...');
    const docCount = await client`SELECT COUNT(*) as count FROM documents`;
    const chunkCount = await client`SELECT COUNT(*) as count FROM chunks`;
    
    console.log(`- Documents: ${docCount[0].count}`);
    console.log(`- Chunks: ${chunkCount[0].count}`);
    
    if (chunkCount[0].count === 0) {
      console.log('\n⚠️  No chunks found!');
      await client.end();
      return;
    }
    
    // Step 2: Check current embedding column type
    console.log('\n🔍 Checking embedding column type...');
    const columnInfo = await client`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'chunks' AND column_name = 'embedding'
    `;
    
    console.log('Current embedding column:', columnInfo[0]);
    
    // Step 3: Check if we need to convert to vector type
    if (columnInfo[0].data_type === 'text') {
      console.log('\n🔧 Converting text column to vector(3072) type...');
      
      try {
        // Enable vector extension
        await client`CREATE EXTENSION IF NOT EXISTS vector`;
        
        // Drop existing index if it exists
        await client`DROP INDEX IF EXISTS chunks_embedding_idx`;
        
        // Create temporary vector column with correct dimensions (3072)
        await client`ALTER TABLE chunks ADD COLUMN embedding_vector vector(3072)`;
        
        // Convert existing text embeddings to vector format
        await client`
          UPDATE chunks 
          SET embedding_vector = embedding::vector(3072)
          WHERE embedding IS NOT NULL AND embedding != ''
        `;
        
        // Drop old text column
        await client`ALTER TABLE chunks DROP COLUMN embedding`;
        
        // Rename vector column to embedding
        await client`ALTER TABLE chunks RENAME COLUMN embedding_vector TO embedding`;
        
        // Make NOT NULL
        await client`ALTER TABLE chunks ALTER COLUMN embedding SET NOT NULL`;
        
        // Create proper vector index
        await client`
          CREATE INDEX chunks_embedding_idx ON chunks 
          USING ivfflat (embedding vector_cosine_ops) 
          WITH (lists = 100)
        `;
        
        // Create document_id index
        await client`CREATE INDEX IF NOT EXISTS chunks_document_id_idx ON chunks(document_id)`;
        
        console.log('✅ Successfully converted embedding column to vector(3072) type!');
        
      } catch (error) {
        console.error('❌ Error converting column:', error.message);
        await client.end();
        return;
      }
    } else {
      console.log('✅ Embedding column is already vector type');
    }
    
    // Step 4: Test vector similarity search
    console.log('\n🧪 Testing Vector Similarity Search...');
    
    try {
      // Create a test vector with 3072 dimensions
      const testVector = Array(3072).fill(0.1).join(',');
      
      // Test vector similarity search
      const similarityResults = await client`
        SELECT 
          c.content,
          d.name as document_name,
          (1 - (c.embedding <=> '[${testVector}]'::vector(3072))) as similarity_score
        FROM chunks c
        INNER JOIN documents d ON c.document_id = d.id
        ORDER BY similarity_score DESC
        LIMIT 3
      `;
      
      console.log(`✅ Vector similarity search working! Found ${similarityResults.length} results`);
      
      if (similarityResults.length > 0) {
        console.log('Top result similarity score:', similarityResults[0].similarity_score);
        console.log('Content preview:', similarityResults[0].content.substring(0, 100) + '...');
      }
      
    } catch (error) {
      console.error('❌ Vector similarity test failed:', error.message);
    }
    
    await client.end();
    
    console.log('\n✅ RAG System Fix Completed!');
    console.log('\n🎯 Your chatbot should now work with document context!');
    console.log('\n💡 Test it by:');
    console.log('1. Opening your chatbot in the browser');
    console.log('2. Asking "Who is Mahad?" or "Tell me about Mahad"');
    console.log('3. The AI should now provide context-aware responses');
    
  } catch (error) {
    console.error('❌ Error fixing RAG system:', error);
  }
}

fixRAGFinal();
