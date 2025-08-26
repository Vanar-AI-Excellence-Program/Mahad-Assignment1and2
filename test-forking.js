// Test script for GPT-style forking functionality
// Run this in the browser console to test the forking system

console.log('🧪 Testing GPT-style forking functionality...');

// Test 1: Check if fork buttons exist
function testForkButtons() {
    console.log('\n📋 Test 1: Checking fork buttons...');
    
    const forkButtons = document.querySelectorAll('button[onclick*="forkConversation"]');
    console.log(`Found ${forkButtons.length} fork buttons`);
    
    if (forkButtons.length > 0) {
        console.log('✅ Fork buttons are present');
        forkButtons.forEach((btn, index) => {
            console.log(`  Button ${index + 1}: "${btn.textContent.trim()}"`);
        });
    } else {
        console.log('❌ No fork buttons found');
    }
}

// Test 2: Check if fork notification system exists
function testForkNotification() {
    console.log('\n📋 Test 2: Checking fork notification system...');
    
    const notificationContainer = document.querySelector('.bg-green-50.border-l-4.border-green-400');
    if (notificationContainer) {
        console.log('✅ Fork notification container found');
        console.log('  Content:', notificationContainer.textContent.trim());
    } else {
        console.log('❌ Fork notification container not found');
    }
}

// Test 3: Check if forked chat header indicator exists
function testForkedChatHeader() {
    console.log('\n📋 Test 3: Checking forked chat header indicator...');
    
    const header = document.querySelector('h1');
    if (header && header.textContent.includes('AI Assistant')) {
        console.log('✅ Chat header found');
        
        const forkedIndicator = header.querySelector('.text-green-600.bg-green-100');
        if (forkedIndicator) {
            console.log('✅ Forked chat indicator found');
            console.log('  Text:', forkedIndicator.textContent.trim());
        } else {
            console.log('ℹ️  Forked chat indicator not visible (normal for new chats)');
        }
    } else {
        console.log('❌ Chat header not found');
    }
}

// Test 4: Check if new chat button exists
function testNewChatButton() {
    console.log('\n📋 Test 4: Checking new chat button...');
    
    const newChatButton = document.querySelector('button[onclick*="startCompletelyNewChat"]');
    if (newChatButton) {
        console.log('✅ New chat button found');
        console.log('  Text:', newChatButton.textContent.trim());
        console.log('  Classes:', newChatButton.className);
    } else {
        console.log('❌ New chat button not found');
    }
}

// Test 5: Check if chat history sidebar shows fork indicators
function testForkIndicators() {
    console.log('\n📋 Test 5: Checking fork indicators in chat history...');
    
    const forkBadges = document.querySelectorAll('.text-green-600.bg-green-100');
    console.log(`Found ${forkBadges.length} fork badges`);
    
    if (forkBadges.length > 0) {
        console.log('✅ Fork badges are present');
        forkBadges.forEach((badge, index) => {
            console.log(`  Badge ${index + 1}: "${badge.textContent.trim()}"`);
        });
    } else {
        console.log('ℹ️  No fork badges found (normal for new chats)');
    }
}

// Test 6: Simulate fork creation (if possible)
function testForkCreation() {
    console.log('\n📋 Test 6: Testing fork creation simulation...');
    
    // Check if the forkConversation function exists
    if (typeof window.forkConversation === 'function') {
        console.log('✅ forkConversation function exists');
        console.log('  Function:', window.forkConversation.toString().substring(0, 100) + '...');
    } else {
        console.log('❌ forkConversation function not found');
    }
    
    // Check if the getMessagesUpToFork function exists
    if (typeof window.getMessagesUpToFork === 'function') {
        console.log('✅ getMessagesUpToFork function exists');
    } else {
        console.log('❌ getMessagesUpToFork function not found');
    }
}

// Test 7: Check CSS classes for fork styling
function testForkStyling() {
    console.log('\n📋 Test 7: Checking fork button styling...');
    
    const greenButtons = document.querySelectorAll('.text-green-600, .bg-green-100, .border-green-100');
    console.log(`Found ${greenButtons.length} green-themed elements`);
    
    if (greenButtons.length > 0) {
        console.log('✅ Green fork styling is present');
        greenButtons.forEach((el, index) => {
            if (el.tagName === 'BUTTON') {
                console.log(`  Button ${index + 1}: "${el.textContent.trim()}"`);
            }
        });
    } else {
        console.log('❌ Green fork styling not found');
    }
}

// Test 8: Check for GPT-style icons
function testGPTIcons() {
    console.log('\n📋 Test 8: Checking GPT-style icons...');
    
    const forkIcons = document.querySelectorAll('svg');
    let foundForkIcon = false;
    
    forkIcons.forEach((icon, index) => {
        const path = icon.querySelector('path');
        if (path && path.getAttribute('d') && path.getAttribute('d').includes('M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4')) {
            console.log(`✅ Found GPT-style fork icon at index ${index}`);
            foundForkIcon = true;
        }
    });
    
    if (!foundForkIcon) {
        console.log('❌ GPT-style fork icon not found');
    }
}

// Run all tests
function runAllTests() {
    console.log('🚀 Starting GPT-style forking tests...\n');
    
    testForkButtons();
    testForkNotification();
    testForkedChatHeader();
    testNewChatButton();
    testForkIndicators();
    testForkCreation();
    testForkStyling();
    testGPTIcons();
    
    console.log('\n✨ All tests completed!');
    console.log('\n📝 To test forking functionality:');
    console.log('1. Start a conversation');
    console.log('2. Look for "Start new chat from here" buttons');
    console.log('3. Click a fork button to create a new branch');
    console.log('4. Verify the green notification appears');
    console.log('5. Check that "Forked Chat" appears in the header');
}

// Auto-run tests after a short delay
setTimeout(runAllTests, 1000);

// Export functions for manual testing
window.testGPTForking = {
    testForkButtons,
    testForkNotification,
    testForkedChatHeader,
    testNewChatButton,
    testForkIndicators,
    testForkCreation,
    testForkStyling,
    testGPTIcons,
    runAllTests
};

console.log('🔧 Test functions available at window.testGPTForking');
console.log('💡 Run window.testGPTForking.runAllTests() to test again');
