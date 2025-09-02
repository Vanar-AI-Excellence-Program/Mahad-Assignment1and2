// Test script to verify copy button functionality
// This can be run in the browser console to test the copy feature

console.log('Testing copy button functionality...');

// Test the copy function
function testCopyFunction() {
    // Create a mock AI response container
    const mockContainer = document.createElement('div');
    mockContainer.className = 'ai-response-container';
    
    const mockContent = document.createElement('div');
    mockContent.className = 'markdown-content';
    mockContent.textContent = 'This is a test AI response with some content to copy.';
    
    mockContainer.appendChild(mockContent);
    document.body.appendChild(mockContainer);
    
    // Create a mock button
    const mockButton = document.createElement('button');
    mockButton.className = 'copy-button';
    mockButton.innerHTML = `
        <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
        </svg>
        Copy
    `;
    
    mockContainer.appendChild(mockButton);
    
    // Test the copy functionality
    console.log('Mock AI response container created:', mockContainer);
    console.log('Mock copy button created:', mockButton);
    console.log('Test content:', mockContent.textContent);
    
    // Simulate click
    mockButton.click();
    
    // Clean up
    setTimeout(() => {
        document.body.removeChild(mockContainer);
        console.log('Test completed - mock elements removed');
    }, 2000);
}

// Export for use in browser console
if (typeof window !== 'undefined') {
    window.testCopyFunction = testCopyFunction;
    console.log('Test function available as window.testCopyFunction()');
}

module.exports = { testCopyFunction };
