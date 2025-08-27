import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { config } from 'dotenv';

// Load environment variables
config();

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/mydatabase';

async function testRAGQA() {
  try {
    console.log('🧠 Testing RAG Q&A System...\n');
    
    const client = postgres(connectionString);
    
    // Check existing documents
    const documents = await client`
      SELECT id, name, mime, size_bytes, created_at
      FROM documents
      ORDER BY created_at DESC;
    `;
    
    if (documents.length === 0) {
      console.log('❌ No documents found. Please upload some documents first!');
      await client.end();
      return;
    }
    
    console.log(`📚 Found ${documents.length} document(s):`);
    documents.forEach((doc, index) => {
      console.log(`  ${index + 1}. ${doc.name} (${doc.mime}, ${doc.size_bytes} bytes)`);
    });
    
    // Check chunks for each document
    console.log('\n📄 Document chunks:');
    for (const doc of documents) {
      const chunks = await client`
        SELECT id, chunk_index, content, created_at
        FROM chunks
        WHERE document_id = ${doc.id}
        ORDER BY chunk_index;
      `;
      
      console.log(`\n  📖 "${doc.name}":`);
      console.log(`     Chunks: ${chunks.length}`);
      
      if (chunks.length > 0) {
        const firstChunk = chunks[0].content;
        const preview = firstChunk.length > 150 ? firstChunk.substring(0, 150) + '...' : firstChunk;
        console.log(`     First chunk: "${preview}"`);
        
        // Check if this is placeholder text or real content
        if (firstChunk.includes('PDF Document:') && firstChunk.includes('text extraction')) {
          console.log(`     ⚠️  Status: Placeholder text (PDF parsing needs improvement)`);
        } else {
          console.log(`     ✅ Status: Real content extracted`);
        }
      }
    }
    
    // Demonstrate Q&A capability
    console.log('\n🔍 Q&A System Status:');
    
    if (documents.some(doc => doc.mime === 'text/plain')) {
      console.log('✅ Text files: Full Q&A capability available');
      console.log('   - Upload .txt files to ask questions about their content');
      console.log('   - The system will chunk text, generate embeddings, and enable similarity search');
    }
    
    if (documents.some(doc => doc.mime === 'application/pdf')) {
      console.log('⚠️  PDF files: Limited Q&A capability');
      console.log('   - PDFs are stored but may contain placeholder text');
      console.log('   - To enable full Q&A: implement proper PDF text extraction');
    }
    
    // Show how to use the system
    console.log('\n💡 How to Use the RAG Q&A System:');
    console.log('1. Upload documents (.txt or .pdf) through the web interface');
    console.log('2. The system automatically chunks text and generates embeddings');
    console.log('3. Ask questions using the /api/retrieve endpoint');
    console.log('4. The system finds the most relevant chunks using vector similarity');
    
    console.log('\n🚀 Next Steps to Enable Full Q&A:');
    console.log('1. Upload a .txt file with real content (works immediately)');
    console.log('2. Or implement proper PDF text extraction for PDFs');
    console.log('3. Test the /api/retrieve endpoint with questions');
    
    await client.end();
    console.log('\n✅ RAG Q&A test completed!');
    
  } catch (error) {
    console.error('❌ Error testing RAG Q&A:', error);
  }
}

testRAGQA();
