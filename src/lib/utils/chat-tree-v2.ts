import type { Chat } from '$lib/db/schema';

export interface ChatTreeNode {
  id: string;
  parentId: string | null;
  conversationId: string | null;
  role: 'user' | 'assistant';
  content: string;
  isEdited: boolean;
  originalContent: string | null;
  version: number;
  isActive: boolean;
  branchOrder: number;
  createdAt: Date;
  children: string[]; // Array of child message IDs
}

export interface ChatTree {
  [messageId: string]: ChatTreeNode;
}

export interface ConversationState {
  chatTree: ChatTree;
  currentNodeId: string | null;
  rootConversationId: string | null;
}

/**
 * Convert database Chat objects to ChatTreeNode format
 */
export function dbChatsToTree(dbChats: Chat[]): ChatTree {
  const tree: ChatTree = {};
  
  // First pass: create all nodes
  dbChats.forEach(chat => {
    tree[chat.id] = {
      id: chat.id,
      parentId: chat.parentId,
      conversationId: chat.conversationId,
      role: chat.role as 'user' | 'assistant',
      content: chat.content,
      isEdited: chat.isEdited || false,
      originalContent: chat.originalContent,
      version: chat.version || 1,
      isActive: chat.isActive || true,
      branchOrder: chat.branchOrder || 0,
      createdAt: new Date(chat.createdAt),
      children: []
    };
  });
  
  // Second pass: build parent-child relationships
  dbChats.forEach(chat => {
    if (chat.parentId && tree[chat.parentId]) {
      tree[chat.parentId].children.push(chat.id);
    }
  });
  
  return tree;
}

/**
 * Get the active path from root to current node
 */
export function getActivePath(chatTree: ChatTree, currentNodeId: string | null): ChatTreeNode[] {
  if (!currentNodeId || !chatTree[currentNodeId]) {
    return [];
  }
  
  const path: ChatTreeNode[] = [];
  let nodeId = currentNodeId;
  
  while (nodeId) {
    const node = chatTree[nodeId];
    if (!node) break;
    
    path.unshift(node);
    nodeId = node.parentId;
  }
  
  return path;
}

/**
 * Get all messages in a conversation (including inactive branches)
 */
export function getConversationMessages(chatTree: ChatTree, conversationId: string): ChatTreeNode[] {
  return Object.values(chatTree).filter(node => 
    node.conversationId === conversationId
  );
}

/**
 * Get the root message of a conversation
 */
export function getConversationRoot(chatTree: ChatTree, conversationId: string): ChatTreeNode | null {
  const root = Object.values(chatTree).find(node => 
    node.conversationId === conversationId && node.parentId === null
  );
  return root || null;
}

/**
 * Get all branches in a conversation
 */
export function getConversationBranches(chatTree: ChatTree, conversationId: string): ChatTreeNode[][] {
  const messages = getConversationMessages(chatTree, conversationId);
  const branches: ChatTreeNode[][] = [];
  
  // Group messages by their branch path
  const branchPaths = new Map<string, ChatTreeNode[]>();
  
  messages.forEach(message => {
    const path = getActivePath(chatTree, message.id);
    const pathKey = path.map(n => n.id).join('->');
    
    if (!branchPaths.has(pathKey)) {
      branchPaths.set(pathKey, []);
    }
    branchPaths.get(pathKey)!.push(message);
  });
  
  return Array.from(branchPaths.values());
}

/**
 * Create a new fork when editing a message
 */
export function createFork(
  chatTree: ChatTree,
  editedMessageId: string,
  newContent: string,
  conversationId: string
): { newTree: ChatTree; newNodeId: string } {
  const editedMessage = chatTree[editedMessageId];
  if (!editedMessage) {
    throw new Error('Edited message not found');
  }
  
  // Create new edited user message
  const newUserMessageId = crypto.randomUUID();
  const newUserMessage: ChatTreeNode = {
    id: newUserMessageId,
    parentId: editedMessage.parentId, // Same parent as original
    conversationId: conversationId,
    role: 'user',
    content: newContent,
    isEdited: true,
    originalContent: editedMessage.content,
    version: editedMessage.version + 1,
    isActive: true,
    branchOrder: editedMessage.branchOrder,
    createdAt: new Date(),
    children: []
  };
  
  // Create new tree with the new message
  const newTree = { ...chatTree };
  newTree[newUserMessageId] = newUserMessage;
  
  // Add new message as child of the parent
  if (editedMessage.parentId && newTree[editedMessage.parentId]) {
    newTree[editedMessage.parentId].children.push(newUserMessageId);
  }
  
  return { newTree, newNodeId: newUserMessageId };
}

/**
 * Add an AI response to a message
 */
export function addAIResponse(
  chatTree: ChatTree,
  parentMessageId: string,
  content: string,
  conversationId: string
): { newTree: ChatTree; newNodeId: string } {
  const parentMessage = chatTree[parentMessageId];
  if (!parentMessage) {
    throw new Error('Parent message not found');
  }
  
  const newMessageId = crypto.randomUUID();
  const newMessage: ChatTreeNode = {
    id: newMessageId,
    parentId: parentMessageId,
    conversationId: conversationId,
    role: 'assistant',
    content: content,
    isEdited: false,
    originalContent: null,
    version: 1,
    isActive: true,
    branchOrder: parentMessage.branchOrder + 1,
    createdAt: new Date(),
    children: []
  };
  
  const newTree = { ...chatTree };
  newTree[newMessageId] = newMessage;
  newTree[parentMessageId].children.push(newMessageId);
  
  return { newTree, newNodeId: newMessageId };
}

/**
 * Navigate to parent message
 */
export function goToParent(chatTree: ChatTree, currentNodeId: string): string | null {
  const currentNode = chatTree[currentNodeId];
  return currentNode?.parentId || null;
}

/**
 * Navigate to next sibling or child
 */
export function goToNext(chatTree: ChatTree, currentNodeId: string): string | null {
  const currentNode = chatTree[currentNodeId];
  if (!currentNode) return null;
  
  // If has children, go to first child
  if (currentNode.children.length > 0) {
    return currentNode.children[0];
  }
  
  // If has parent, look for next sibling
  if (currentNode.parentId) {
    const parent = chatTree[currentNode.parentId];
    if (parent) {
      const currentIndex = parent.children.indexOf(currentNodeId);
      if (currentIndex < parent.children.length - 1) {
        return parent.children[currentIndex + 1];
      }
    }
  }
  
  return null;
}

/**
 * Get all available navigation options
 */
export function getNavigationInfo(chatTree: ChatTree, currentNodeId: string): {
  hasParent: boolean;
  hasNext: boolean;
  hasChildren: boolean;
  parentId: string | null;
  nextId: string | null;
  childIds: string[];
} {
  const currentNode = chatTree[currentNodeId];
  if (!currentNode) {
    return {
      hasParent: false,
      hasNext: false,
      hasChildren: false,
      parentId: null,
      nextId: null,
      childIds: []
    };
  }
  
  const parentId = currentNode.parentId;
  const nextId = goToNext(chatTree, currentNodeId);
  const childIds = currentNode.children;
  
  return {
    hasParent: !!parentId,
    hasNext: !!nextId,
    hasChildren: childIds.length > 0,
    parentId,
    nextId,
    childIds
  };
}
