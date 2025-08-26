import { ForkingSystem, createConversation, forkConversation, getConversationTree } from './forking-system';
import { ForkingDBAdapter } from './forking-db-adapter';

/**
 * Example usage of the forking system
 * This demonstrates the core functionality
 */

// Example 1: Basic forking system usage (in-memory)
export function basicForkingExample() {
  console.log('=== Basic Forking System Example ===');
  
  const forkingSystem = new ForkingSystem();
  
  // Create a conversation
  const conversationId = 'conv_1';
  const branchId = createConversation(forkingSystem, conversationId, [
    { role: 'user', content: 'Hello, how are you?' },
    { role: 'assistant', content: 'I\'m doing well, thank you for asking!' },
    { role: 'user', content: 'Can you help me with programming?' },
    { role: 'assistant', content: 'Of course! I\'d be happy to help you with programming.' }
  ]);
  
  console.log('Created conversation with branch:', branchId);
  
  // Get the conversation tree
  const conversationTree = getConversationTree(forkingSystem, conversationId);
  console.log('Conversation tree:', conversationTree.map(msg => ({
    id: msg.id,
    role: msg.role,
    content: msg.content.substring(0, 30) + '...',
    branch_id: msg.branch_id
  })));
  
  // Edit a message to create a fork
  const messageToEdit = conversationTree[0]; // First user message
  const editedMessage = forkingSystem.edit_message(messageToEdit.id, 'Hello, how are you today?');
  
  console.log('Created fork from message:', messageToEdit.id);
  console.log('New edited message:', editedMessage.id);
  
  // Get all branches
  const branches = forkingSystem.get_conversation_branches(conversationId);
  console.log('All branches:', branches.map(b => ({
    branch_id: b.branch_id,
    branch_name: b.branch_name,
    is_active: b.is_active
  })));
  
  // Get the forked branch
  const forkedBranch = forkingSystem.get_branch(conversationId, editedMessage.branch_id);
  console.log('Forked branch messages:', forkedBranch.map(msg => ({
    id: msg.id,
    role: msg.role,
    content: msg.content.substring(0, 30) + '...',
    is_edited: msg.is_edited
  })));
}

// Example 2: Database integration with forking
export async function databaseForkingExample(userId: string) {
  console.log('=== Database Forking Example ===');
  
  const forkingAdapter = new ForkingDBAdapter();
  
  // Create a new conversation
  const conversationId = `conv_${userId}_${Date.now()}`;
  const branchId = `branch_${Date.now()}`;
  
  // Add initial messages
  const userMessage = await forkingAdapter.addMessage(
    userId,
    null, // root message
    'user',
    'What is the capital of France?',
    conversationId,
    branchId
  );
  
  const assistantMessage = await forkingAdapter.addMessage(
    userId,
    userMessage.id,
    'assistant',
    'The capital of France is Paris.',
    conversationId,
    branchId
  );
  
  console.log('Created conversation:', conversationId);
  console.log('User message ID:', userMessage.id);
  console.log('Assistant message ID:', assistantMessage.id);
  
  // Edit the user message to create a fork
  const editedMessage = await forkingAdapter.editMessage(
    userId,
    userMessage.id,
    'What is the capital of France and what is it known for?'
  );
  
  console.log('Created fork with edited message:', editedMessage.id);
  console.log('New branch ID:', editedMessage.branch_id);
  
  // Get all branches for this conversation
  const branches = await forkingAdapter.getConversationBranches(userId, conversationId);
  console.log('Conversation branches:', branches.map(b => ({
    branch_id: b.branch_id,
    branch_name: b.branch_name,
    is_active: b.is_active
  })));
  
  // Switch to the new branch
  await forkingAdapter.switchBranch(userId, conversationId, editedMessage.branch_id);
  console.log('Switched to new branch');
  
  // Get the active branch
  const activeBranch = await forkingAdapter.getConversationTree(userId, conversationId);
  console.log('Active branch messages:', activeBranch.map(msg => ({
    id: msg.id,
    role: msg.role,
    content: msg.content.substring(0, 40) + '...',
    is_edited: msg.is_edited
  })));
  
  return {
    conversationId,
    originalBranchId: branchId,
    forkedBranchId: editedMessage.branch_id,
    branches
  };
}

// Example 3: Complex forking scenario
export function complexForkingExample() {
  console.log('=== Complex Forking Example ===');
  
  const forkingSystem = new ForkingSystem();
  const conversationId = 'conv_complex';
  
  // Create initial conversation
  const branch1 = createConversation(forkingSystem, conversationId, [
    { role: 'user', content: 'Tell me about machine learning' },
    { role: 'assistant', content: 'Machine learning is a subset of artificial intelligence...' },
    { role: 'user', content: 'What are the main types?' },
    { role: 'assistant', content: 'The main types are supervised, unsupervised, and reinforcement learning.' }
  ]);
  
  console.log('Created initial conversation with branch:', branch1);
  
  // Fork from the second user message
  const conversationTree = getConversationTree(forkingSystem, conversationId);
  const secondUserMessage = conversationTree[2]; // "What are the main types?"
  
  const fork1 = forkingSystem.edit_message(
    secondUserMessage.id,
    'What are the main types and give examples?'
  );
  
  console.log('Created first fork:', fork1.id);
  
  // Fork again from the first user message
  const firstUserMessage = conversationTree[0]; // "Tell me about machine learning"
  
  const fork2 = forkingSystem.edit_message(
    firstUserMessage.id,
    'Tell me about deep learning specifically'
  );
  
  console.log('Created second fork:', fork2.id);
  
  // Get all branches
  const allBranches = forkingSystem.get_conversation_branches(conversationId);
  console.log('All branches:', allBranches.map(b => ({
    branch_id: b.branch_id,
    branch_name: b.branch_name,
    parent_branch_id: b.parent_branch_id
  })));
  
  // Show branch relationships
  allBranches.forEach(branch => {
    if (branch.parent_branch_id) {
      const parent = allBranches.find(b => b.branch_id === branch.parent_branch_id);
      console.log(`Branch ${branch.branch_name} forked from ${parent?.branch_name || 'unknown'}`);
    } else {
      console.log(`Branch ${branch.branch_name} is the original`);
    }
  });
  
  return {
    conversationId,
    originalBranch: branch1,
    fork1: fork1.branch_id,
    fork2: fork2.branch_id,
    branches: allBranches
  };
}

// Example 4: Message versioning
export function messageVersioningExample() {
  console.log('=== Message Versioning Example ===');
  
  const forkingSystem = new ForkingSystem();
  const conversationId = 'conv_versions';
  
  // Create conversation
  const branchId = createConversation(forkingSystem, conversationId, [
    { role: 'user', content: 'What is 2+2?' },
    { role: 'assistant', content: '2+2 equals 4.' }
  ]);
  
  // Edit the user message multiple times
  const conversationTree = getConversationTree(forkingSystem, conversationId);
  const userMessage = conversationTree[0];
  
  const edit1 = forkingSystem.edit_message(userMessage.id, 'What is 2+2? Please explain.');
  const edit2 = forkingSystem.edit_message(userMessage.id, 'What is 2+2? Show me the math.');
  const edit3 = forkingSystem.edit_message(userMessage.id, 'What is 2+2? Give me a detailed explanation.');
  
  console.log('Original message ID:', userMessage.id);
  console.log('Edit 1 ID:', edit1.id);
  console.log('Edit 2 ID:', edit2.id);
  console.log('Edit 3 ID:', edit3.id);
  
  // Get all versions of the same message
  const versions = forkingSystem.get_message_versions(userMessage.id);
  console.log('Message versions:', versions);
  
  // Get all branches
  const branches = forkingSystem.get_conversation_branches(conversationId);
  console.log('All version branches:', branches.map(b => ({
    branch_id: b.branch_id,
    branch_name: b.branch_name,
    created_at: b.created_at
  })));
  
  return {
    conversationId,
    originalMessage: userMessage.id,
    edits: [edit1.id, edit2.id, edit3.id],
    versions,
    branches
  };
}

// Example 5: Branch switching and navigation
export function branchNavigationExample() {
  console.log('=== Branch Navigation Example ===');
  
  const forkingSystem = new ForkingSystem();
  const conversationId = 'conv_navigation';
  
  // Create conversation with multiple forks
  const branch1 = createConversation(forkingSystem, conversationId, [
    { role: 'user', content: 'Hello' },
    { role: 'assistant', content: 'Hi there!' },
    { role: 'user', content: 'How are you?' },
    { role: 'assistant', content: 'I\'m doing well, thanks!' }
  ]);
  
  // Create fork
  const conversationTree = getConversationTree(forkingSystem, conversationId);
  const userMessage = conversationTree[2]; // "How are you?"
  
  const forkBranch = forkingSystem.edit_message(
    userMessage.id,
    'How are you today?'
  );
  
  console.log('Original branch:', branch1);
  console.log('Fork branch:', forkBranch.branch_id);
  
  // Check active branch
  let activeBranch = forkingSystem.get_active_branch(conversationId);
  console.log('Active branch:', activeBranch?.branch_id);
  
  // Switch to fork branch
  forkingSystem.switch_branch(conversationId, forkBranch.branch_id);
  
  activeBranch = forkingSystem.get_active_branch(conversationId);
  console.log('Active branch after switch:', activeBranch?.branch_id);
  
  // Get messages from active branch
  const activeMessages = forkingSystem.get_branch(conversationId, activeBranch!.branch_id);
  console.log('Active branch messages:', activeMessages.map(msg => ({
    id: msg.id,
    role: msg.role,
    content: msg.content.substring(0, 30) + '...'
  })));
  
  return {
    conversationId,
    originalBranch: branch1,
    forkBranch: forkBranch.branch_id,
    activeBranch: activeBranch?.branch_id
  };
}

// Run examples
export function runAllExamples() {
  console.log('Running all forking system examples...\n');
  
  try {
    basicForkingExample();
    console.log('\n' + '='.repeat(50) + '\n');
    
    complexForkingExample();
    console.log('\n' + '='.repeat(50) + '\n');
    
    messageVersioningExample();
    console.log('\n' + '='.repeat(50) + '\n');
    
    branchNavigationExample();
    console.log('\n' + '='.repeat(50) + '\n');
    
    console.log('All examples completed successfully!');
  } catch (error) {
    console.error('Error running examples:', error);
  }
}
