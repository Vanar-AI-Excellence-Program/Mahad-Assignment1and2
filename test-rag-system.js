import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { config } from 'dotenv';

// Load environment variables
config();

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/mydatabase';

async function testRAGSystem() {
  try {
    console.log('🧪 Testing RAG System...\n');
    
    const client = postgres(connectionString);
    
    // Check documents and chunks
    console.log('📊 Database Status:');
    const docCount = await client`SELECT COUNT(*) as count FROM documents`;
    const chunkCount = await client`SELECT COUNT(*) as count FROM chunks`;
    
    console.log(`- Documents: ${docCount[0].count}`);
    console.log(`- Chunks: ${chunkCount[0].count}`);
    
    if (chunkCount[0].count === 0) {
      console.log('\n⚠️  No chunks found! Documents need to be processed.');
      console.log('💡 Upload a text file to test the RAG system.');
      return;
    }
    
    // Test the retrieve endpoint
    console.log('\n🔍 Testing Retrieve Endpoint...');
    
    const testQueries = [
      'What is Mahad?',
      'Tell me about AI',
      'What documents are available?'
    ];
    
    for (const query of testQueries) {
      console.log(`\nQuery: "${query}"`);
      
      try {
        const response = await fetch('http://localhost:5173/api/retrieve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query, top_k: 3 })
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log(`✅ Found ${result.chunks.length} relevant chunks`);
          
          if (result.chunks.length > 0) {
            console.log('Top result:', result.chunks[0].document_name);
            console.log('Content preview:', result.chunks[0].content.substring(0, 100) + '...');
          }
        } else {
          console.log(`❌ Error: ${response.status} ${response.statusText}`);
        }
      } catch (error) {
        console.log(`❌ Network error: ${error.message}`);
      }
    }
    
    await client.end();
    console.log('\n✅ RAG system test completed!');
    
  } catch (error) {
    console.error('❌ Error testing RAG system:', error);
  }
}

testRAGSystem();
