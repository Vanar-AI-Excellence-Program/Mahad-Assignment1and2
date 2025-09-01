console.log('🧪 Testing RAG System Functionality');
console.log('====================================');

// Test the embedding service
async function testEmbeddingService() {
    console.log('\n1️⃣ Testing Embedding Service...');
    
    try {
        const response = await fetch('http://localhost:8000/health');
        const health = await response.json();
        console.log('✅ Health check:', health);
        
        const embedResponse = await fetch('http://localhost:8000/embed', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: 'test query',
                model: 'text-embedding-004'
            })
        });
        
        const embedding = await embedResponse.json();
        console.log('✅ Single embedding generated:', embedding.embedding.length, 'dimensions');
        
        return true;
    } catch (error) {
        console.log('❌ Embedding service error:', error.message);
        return false;
    }
}

// Test document retrieval
async function testDocumentRetrieval() {
    console.log('\n2️⃣ Testing Document Retrieval...');
    
    try {
        // First, get available documents
        const docsResponse = await fetch('http://localhost:5174/api/retrieve');
        const docsData = await docsResponse.json();
        
        console.log('📄 Available documents:', docsData.documents?.length || 0);
        
        if (docsData.documents && docsData.documents.length > 0) {
            console.log('✅ Documents found in database');
            
            // Test retrieval with a query
            const retrieveResponse = await fetch('http://localhost:5174/api/retrieve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: 'test query',
                    limit: 3
                })
            });
            
            const retrieveData = await retrieveResponse.json();
            console.log('🔍 Retrieval results:', retrieveData);
            
            return true;
        } else {
            console.log('⚠️ No documents found - upload a document first');
            return false;
        }
    } catch (error) {
        console.log('❌ Retrieval error:', error.message);
        return false;
    }
}

// Main test function
async function runTests() {
    console.log('🚀 Starting RAG System Tests...\n');
    
    const embeddingWorks = await testEmbeddingService();
    const retrievalWorks = await testDocumentRetrieval();
    
    console.log('\n📊 Test Results:');
    console.log('- Embedding Service:', embeddingWorks ? '✅ Working' : '❌ Failed');
    console.log('- Document Retrieval:', retrievalWorks ? '✅ Working' : '❌ Failed');
    
    if (embeddingWorks && retrievalWorks) {
        console.log('\n🎉 RAG System is working correctly!');
        console.log('\n📋 Next Steps:');
        console.log('1. Upload a document via the chatbot interface');
        console.log('2. Ask questions about the uploaded content');
        console.log('3. Verify AI responses include relevant document chunks');
    } else {
        console.log('\n⚠️ Some issues detected. Check the logs above.');
    }
}

// Run the tests
runTests().catch(console.error);
