import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { config } from 'dotenv';

// Load environment variables
config();

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/mydatabase';

async function testRAGDatabase() {
  try {
    console.log('🔍 Testing RAG database connection...');
    
    const client = postgres(connectionString);
    const db = drizzle(client);
    
    // Test basic connection
    console.log('✅ Database connection successful');
    
    // Check if RAG tables exist
    const tables = await client`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('documents', 'chunks')
      ORDER BY table_name;
    `;
    
    console.log('📋 Found tables:', tables.map(t => t.table_name));
    
    // Check if pgvector extension is enabled
    const extensions = await client`
      SELECT extname FROM pg_extension WHERE extname = 'vector';
    `;
    
    if (extensions.length > 0) {
      console.log('✅ pgvector extension is enabled');
    } else {
      console.log('❌ pgvector extension is not enabled');
    }
    
    // Check table schemas
    if (tables.length >= 2) {
      console.log('\n📊 Table schemas:');
      
      for (const table of tables) {
        const columns = await client`
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns
          WHERE table_name = ${table.table_name}
          ORDER BY ordinal_position;
        `;
        
        console.log(`\n${table.table_name}:`);
        columns.forEach(col => {
          console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
        });
      }
    }
    
    // Check for existing documents and chunks
    console.log('\n📚 Checking existing documents and chunks...');
    
    const documents = await client`
      SELECT id, name, mime, size_bytes, created_at
      FROM documents
      ORDER BY created_at DESC;
    `;
    
    if (documents.length > 0) {
      console.log(`✅ Found ${documents.length} document(s):`);
      documents.forEach(doc => {
        console.log(`  - ${doc.name} (${doc.mime}, ${doc.size_bytes} bytes)`);
      });
      
      // Check chunks for each document
      for (const doc of documents) {
        const chunks = await client`
          SELECT id, chunk_index, content, created_at
          FROM chunks
          WHERE document_id = ${doc.id}
          ORDER BY chunk_index;
        `;
        
        console.log(`    📄 Document "${doc.name}" has ${chunks.length} chunk(s)`);
        if (chunks.length > 0) {
          console.log(`    First chunk preview: "${chunks[0].content.substring(0, 100)}..."`);
        }
      }
    } else {
      console.log('📝 No documents found in database');
      console.log('💡 Upload some documents to test the RAG system!');
    }
    
    await client.end();
    console.log('\n✅ RAG database test completed successfully!');
    
  } catch (error) {
    console.error('❌ Error testing RAG database:', error);
  }
}

testRAGDatabase();
