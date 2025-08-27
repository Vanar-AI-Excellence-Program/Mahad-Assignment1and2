import { config } from 'dotenv';

// Load environment variables
config();

async function testRAGSystem() {
  try {
    console.log('🧪 Testing complete RAG system...\n');
    
    // Test 1: Embedding service health
    console.log('1️⃣ Testing embedding service...');
    const embeddingHealth = await fetch('http://localhost:8000/health');
    if (embeddingHealth.ok) {
      const healthData = await embeddingHealth.json();
      console.log('✅ Embedding service:', healthData);
    } else {
      console.log('❌ Embedding service health check failed');
      return;
    }
    
    // Test 2: Test embedding endpoint
    console.log('\n2️⃣ Testing embedding endpoint...');
    const embeddingResponse = await fetch('http://localhost:8000/embed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'Hello world' })
    });
    
    if (embeddingResponse.ok) {
      const embeddingData = await embeddingResponse.json();
      console.log('✅ Embedding generated:', {
        dim: embeddingData.dim,
        vectorLength: embeddingData.embedding.length
      });
    } else {
      console.log('❌ Embedding generation failed');
      return;
    }
    
    // Test 3: Test SvelteKit API endpoints
    console.log('\n3️⃣ Testing SvelteKit API endpoints...');
    
    // Test upload endpoint (with a simple text file)
    const testFile = new File(['This is a test document for RAG testing.'], 'test.txt', { type: 'text/plain' });
    const formData = new FormData();
    formData.append('file', testFile);
    
    const uploadResponse = await fetch('http://localhost:5175/api/upload', {
      method: 'POST',
      body: formData
    });
    
    if (uploadResponse.ok) {
      const uploadData = await uploadResponse.json();
      console.log('✅ File upload successful:', uploadData);
      
      // Test retrieve endpoint
      console.log('\n4️⃣ Testing retrieve endpoint...');
      const retrieveResponse = await fetch('http://localhost:5175/api/retrieve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'test document', k: 3 })
      });
      
      if (retrieveResponse.ok) {
        const retrieveData = await retrieveResponse.json();
        console.log('✅ Document retrieval successful:', {
          matchesCount: retrieveData.matches.length,
          firstMatch: retrieveData.matches[0]?.content?.substring(0, 50) + '...'
        });
      } else {
        console.log('❌ Document retrieval failed');
        const errorText = await retrieveResponse.text();
        console.log('Error details:', errorText);
      }
    } else {
      console.log('❌ File upload failed');
      const errorText = await uploadResponse.text();
      console.log('Error details:', errorText);
    }
    
    console.log('\n🎉 RAG system test completed!');
    
  } catch (error) {
    console.error('❌ Error testing RAG system:', error);
  }
}

testRAGSystem();
