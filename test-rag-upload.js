import fs from 'fs';
import FormData from 'form-data';

async function testUpload() {
    try {
        console.log('🧪 Testing RAG Upload Functionality...');
        
        // Read the test document
        const testDocument = fs.readFileSync('test-document.txt');
        
        // Create form data
        const formData = new FormData();
        formData.append('file', testDocument, {
            filename: 'test-document.txt',
            contentType: 'text/plain'
        });
        formData.append('conversationId', 'test-conversation-123');
        
        console.log('📤 Uploading test document...');
        
        // Upload the document
        const response = await fetch('http://localhost:5175/api/upload', {
            method: 'POST',
            body: formData
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log('✅ Upload successful!');
            console.log('📊 Result:', result);
            
            // Test retrieval
            console.log('\n🔍 Testing retrieval...');
            const retrieveResponse = await fetch('http://localhost:5175/api/retrieve', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    query: 'What is machine learning?',
                    conversationId: 'test-conversation-123',
                    limit: 3
                })
            });
            
            if (retrieveResponse.ok) {
                const retrieveResult = await retrieveResponse.json();
                console.log('✅ Retrieval successful!');
                console.log('📊 Retrieved chunks:', retrieveResult.retrievedChunks);
                console.log('📄 Sample content:', retrieveResult.results[0]?.chunks[0]?.content?.substring(0, 100) + '...');
            } else {
                console.log('❌ Retrieval failed:', await retrieveResponse.text());
            }
            
        } else {
            console.log('❌ Upload failed:', await response.text());
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

// Run the test
testUpload();
