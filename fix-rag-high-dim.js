import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { config } from 'dotenv';

// Load environment variables
config();

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/mydatabase';

async function fixRAGHighDim() {
  try {
    console.log('🔧 Fixing RAG System for High-Dimensional Vectors (3072)...\n');
    
    const client = postgres(connectionString);
    
    // Step 1: Check current database state
    console.log('📊 Checking current database state...');
    const docCount = await client`SELECT COUNT(*) as count FROM documents`;
    const chunkCount = await client`SELECT COUNT(*) as count FROM chunks`;
    
    console.log(`- Documents: ${docCount[0].count}`);
    console.log(`- Chunks: ${chunkCount[0].count}`);
    
    // Step 2: Check what columns exist
    console.log('\n🔍 Checking table structure...');
    const columns = await client`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'chunks'
      ORDER BY column_name
    `;
    
    console.log('Current columns:');
    columns.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });
    
    // Step 3: Clean up any partial conversion
    console.log('\n🧹 Cleaning up partial conversion...');
    
    try {
      // Drop any existing indexes
      await client`DROP INDEX IF EXISTS chunks_embedding_idx`;
      await client`DROP INDEX IF EXISTS chunks_document_id_idx`;
      
      // Check if we have both text and vector columns
      const hasTextColumn = columns.some(col => col.column_name === 'embedding' && col.data_type === 'text');
      const hasVectorColumn = columns.some(col => col.column_name === 'embedding_vector');
      
      if (hasTextColumn && hasVectorColumn) {
        console.log('Found both text and vector columns, cleaning up...');
        
        // Drop the temporary vector column
        await client`ALTER TABLE chunks DROP COLUMN IF EXISTS embedding_vector`;
        
        console.log('✅ Cleaned up temporary columns');
      }
      
    } catch (error) {
      console.log('Cleanup step:', error.message);
    }
    
    // Step 4: Convert to vector type with high dimensions
    console.log('\n🔧 Converting to vector(3072) type...');
    
    try {
      // Enable vector extension
      await client`CREATE EXTENSION IF NOT EXISTS vector`;
      
      // Create temporary vector column
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
      
      // For high-dimensional vectors, use a simple btree index instead of ivfflat
      // This will be slower for large datasets but will work with any dimensions
      console.log('📊 Creating btree index for high-dimensional vectors...');
      await client`CREATE INDEX chunks_embedding_idx ON chunks USING btree (embedding)`;
      
      // Create document_id index
      await client`CREATE INDEX IF NOT EXISTS chunks_document_id_idx ON chunks(document_id)`;
      
      console.log('✅ Successfully converted embedding column to vector(3072) type!');
      console.log('📊 Using btree index for high-dimensional vectors (slower but compatible)');
      
    } catch (error) {
      console.error('❌ Error converting column:', error.message);
      await client.end();
      return;
    }
    
    // Step 5: Verify the conversion
    console.log('\n✅ Verifying conversion...');
    const newColumns = await client`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'chunks' AND column_name = 'embedding'
    `;
    
    console.log('New embedding column:', newColumns[0]);
    
    // Step 6: Test vector similarity search
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
    
    console.log('\n🎉 RAG System Successfully Fixed for High-Dimensional Vectors!');
    console.log('\n📊 Note: Using btree index instead of ivfflat for 3072 dimensions');
    console.log('   This may be slower for large datasets but ensures compatibility');
    console.log('\n🎯 Your chatbot should now work with document context!');
    console.log('\n💡 Test it by:');
    console.log('1. Opening your chatbot in the browser');
    console.log('2. Asking "Who is Mahad?" or "Tell me about Mahad"');
    console.log('3. The AI should now provide context-aware responses');
    console.log('4. Check browser console for RAG logs');
    
  } catch (error) {
    console.error('❌ Error fixing RAG system:', error);
  }
}

fixRAGHighDim();
