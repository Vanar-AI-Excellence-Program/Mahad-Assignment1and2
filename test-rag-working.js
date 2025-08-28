import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { config } from 'dotenv';

// Load environment variables
config();

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/mydatabase';

async function testRAGWorking() {
  try {
    console.log('🧪 Testing RAG System...\n');
    
    const client = postgres(connectionString);
    
    // Check database state
    console.log('📊 Database Status:');
    const docCount = await client`SELECT COUNT(*) as count FROM documents`;
    const chunkCount = await client`SELECT COUNT(*) as count FROM chunks`;
    
    console.log(`- Documents: ${docCount[0].count}`);
    console.log(`- Chunks: ${chunkCount[0].count}`);
    
    // Check embedding column type
    const columnInfo = await client`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'chunks' AND column_name = 'embedding'
    `;
    
    console.log(`- Embedding column type: ${columnInfo[0].data_type}`);
    
    // Test vector similarity search
    console.log('\n🔍 Testing Vector Similarity Search...');
    
    try {
      // Get a sample chunk
      const sampleChunk = await client`SELECT content FROM chunks LIMIT 1`;
      
      if (sampleChunk.length > 0) {
        const content = sampleChunk[0].content;
        console.log(`Sample content: "${content.substring(0, 100)}..."`);
        
        // Test with a simple query about Mahad
        const testQuery = 'Mahad';
        console.log(`\nTesting query: "${testQuery}"`);
        
        // Test the retrieve endpoint
        const response = await fetch('http://localhost:5173/api/retrieve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: testQuery, top_k: 3 })
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log(`✅ Retrieve endpoint working! Found ${result.chunks.length} relevant chunks`);
          
          if (result.chunks.length > 0) {
            console.log('\n📄 Top results:');
            result.chunks.forEach((chunk, index) => {
              console.log(`${index + 1}. Document: ${chunk.document_name}`);
              console.log(`   Content: ${chunk.content.substring(0, 80)}...`);
              console.log(`   Similarity: ${chunk.similarity_score?.toFixed(4) || 'N/A'}`);
            });
          }
        } else {
          console.log(`❌ Retrieve endpoint error: ${response.status} ${response.statusText}`);
        }
      }
      
    } catch (error) {
      console.error('❌ Test failed:', error.message);
    }
    
    await client.end();
    
    console.log('\n🎯 RAG System Test Complete!');
    console.log('\n💡 Next Steps:');
    console.log('1. Open your chatbot in the browser');
    console.log('2. Ask a question like "Who is Mahad?"');
    console.log('3. The AI should now provide context-aware responses');
    console.log('4. Check browser console for RAG logs');
    
  } catch (error) {
    console.error('❌ Error testing RAG system:', error);
  }
}

testRAGWorking();
