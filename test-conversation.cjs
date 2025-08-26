const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');
const { chats } = require('./src/lib/db/schema');
const { eq, desc } = require('drizzle-orm');

// Database connection
const sql = postgres('postgresql://postgres:postgres@localhost:5433/mydatabase');
const db = drizzle(sql);

async function testConversationStructure() {
  try {
    console.log('Testing conversation structure...\n');
    
    // Get all chat messages
    const allMessages = await db.select().from(chats).orderBy(chats.createdAt);
    console.log(`Found ${allMessages.length} total messages\n`);
    
    if (allMessages.length === 0) {
      console.log('No messages found. This is expected for a fresh database.');
      return;
    }
    
    // Display the structure of existing messages
    console.log('Current message structure:');
    allMessages.forEach((msg, index) => {
      console.log(`${index + 1}. ID: ${msg.id}`);
      console.log(`   Role: ${msg.role}`);
      console.log(`   Content: ${msg.content.substring(0, 50)}...`);
      console.log(`   Parent ID: ${msg.parentId || 'null (root)'}`);
      console.log(`   Created: ${msg.createdAt}`);
      console.log('');
    });
    
    // Test the tree building logic
    console.log('Testing tree structure...');
    const { buildChatTree } = require('./src/lib/utils/chat-tree');
    const chatTree = buildChatTree(allMessages);
    
    console.log(`\nBuilt ${chatTree.length} root conversations:`);
    chatTree.forEach((conv, index) => {
      console.log(`\nConversation ${index + 1}:`);
      console.log(`  Root: ${conv.content.substring(0, 50)}...`);
      console.log(`  Children: ${conv.children?.length || 0}`);
      
      if (conv.children && conv.children.length > 0) {
        conv.children.forEach((child, childIndex) => {
          console.log(`    ${childIndex + 1}. ${child.role}: ${child.content.substring(0, 40)}...`);
        });
      }
    });
    
  } catch (error) {
    console.error('Error testing conversation structure:', error);
  } finally {
    await sql.end();
  }
}

// Run the test
testConversationStructure();
