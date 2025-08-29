// Test basic chat functionality
// Run this with: node test-basic-chat.js

const testBasicChat = async () => {
  try {
    console.log('Testing basic chat functionality...');
    
    // Test 1: Check if we can make HTTP requests
    console.log('\n1. Testing HTTP request capability:');
    try {
      const response = await fetch('http://localhost:5174/api/env-check');
      console.log('✅ HTTP request successful, status:', response.status);
    } catch (error) {
      console.log('❌ HTTP request failed:', error.message);
      console.log('Make sure your SvelteKit app is running on port 5174');
    }
    
    // Test 2: Check if we can access the chat endpoint
    console.log('\n2. Testing chat endpoint access:');
    try {
      const response = await fetch('http://localhost:5174/api/chat', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ Chat endpoint accessible, status:', response.status);
      if (response.status === 401) {
        console.log('   This is expected - endpoint requires authentication');
      }
    } catch (error) {
      console.log('❌ Chat endpoint access failed:', error.message);
    }
    
    // Test 3: Check if we can make a POST request to chat
    console.log('\n3. Testing chat POST endpoint:');
    try {
      const response = await fetch('http://localhost:5174/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: [
            { role: 'user', content: 'Hello' }
          ]
        })
      });
      console.log('✅ Chat POST endpoint accessible, status:', response.status);
      if (response.status === 401) {
        console.log('   This is expected - endpoint requires authentication');
      }
    } catch (error) {
      console.log('❌ Chat POST endpoint failed:', error.message);
    }
    
    console.log('\n✅ Basic connectivity tests completed');
    console.log('\nNext steps:');
    console.log('1. Make sure your app is running: npm run dev');
    console.log('2. Open http://localhost:5174 in your browser');
    console.log('3. Log in to your account');
    console.log('4. Try to edit a message in the chatbot');
    console.log('5. Check the terminal logs for detailed error information');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};

// Run the test
testBasicChat();
