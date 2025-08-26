const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');
const { chats } = require('../src/lib/db/schema');
const { eq } = require('drizzle-orm');

// Database connection
const sql = postgres('postgresql://postgres:postgres@localhost:5433/mydatabase');
const db = drizzle(sql);

async function fixChatStructure() {
  try {
    console.log('Starting chat structure fix...');
    
    // Get all chat messages ordered by creation time
    const allMessages = await db.select().from(chats).orderBy(chats.createdAt);
    console.log(`Found ${allMessages.length} messages`);
    
    // Group messages by user and find conversation boundaries
    const userConversations = new Map();
    
    allMessages.forEach((message, index) => {
      const userId = message.userId;
      if (!userConversations.has(userId)) {
        userConversations.set(userId, []);
      }
      userConversations.get(userId).push(message);
    });
    
    // Fix each user's conversations
    for (const [userId, messages] of userConversations) {
      console.log(`\nProcessing user ${userId} with ${messages.length} messages`);
      
      let currentConversationRoot = null;
      let lastMessageId = null;
      
      for (let i = 0; i < messages.length; i++) {
        const message = messages[i];
        
        if (message.role === 'user') {
          if (currentConversationRoot === null) {
            // This is the start of a new conversation
            currentConversationRoot = message.id;
            lastMessageId = message.id;
            console.log(`  New conversation started: ${message.content.substring(0, 50)}...`);
          } else {
            // This should be linked to the previous message
            if (message.parentId !== lastMessageId) {
              console.log(`  Fixing user message link: ${message.content.substring(0, 50)}...`);
              console.log(`    Old parentId: ${message.parentId}, New parentId: ${lastMessageId}`);
              
              // Update the parentId
              await db.update(chats)
                .set({ parentId: lastMessageId })
                .where(eq(chats.id, message.id));
              
              message.parentId = lastMessageId;
            }
            lastMessageId = message.id;
          }
        } else if (message.role === 'assistant') {
          // AI responses should be linked to the user message that triggered them
          if (message.parentId !== lastMessageId) {
            console.log(`  Fixing AI response link: ${message.content.substring(0, 50)}...`);
            console.log(`    Old parentId: ${message.parentId}, New parentId: ${lastMessageId}`);
            
            // Update the parentId
            await db.update(chats)
              .set({ parentId: lastMessageId })
              .where(eq(chats.id, message.id));
            
            message.parentId = lastMessageId;
          }
          lastMessageId = message.id;
        }
      }
    }
    
    console.log('\nChat structure fix completed!');
    
  } catch (error) {
    console.error('Error fixing chat structure:', error);
  } finally {
    await sql.end();
  }
}

// Run the fix
fixChatStructure();
