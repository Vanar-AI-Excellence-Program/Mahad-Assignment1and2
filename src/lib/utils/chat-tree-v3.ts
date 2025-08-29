import type { Chat, Conversation } from '$lib/db/schema';

export interface ChatTreeNode {
  id: string;
  parentId: string | null;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  children: string[];
  createdAt: string;
  isEdited?: boolean;
  version?: number;
}

export interface ChatTree {
  [messageId: string]: ChatTreeNode;
}

export interface ConversationState {
  id: string;
  title: string;
  chatTree: ChatTree;
  currentNodeId: string | null;
  createdAt: string;
  updatedAt: string;
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
      conversationId: chat.conversationId!,
      role: chat.role as 'user' | 'assistant',
      content: chat.content,
      createdAt: chat.createdAt instanceof Date ? chat.createdAt.toISOString() : new Date(chat.createdAt).toISOString(),
      isEdited: chat.isEdited || false,
      version: chat.version || 1,
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
  
  let path: ChatTreeNode[] = [];
  let nodeId: string | null = currentNodeId;
  
  while (nodeId) {
    const node: ChatTreeNode | undefined = chatTree[nodeId];
    if (!node) break;
    
    path.unshift(node);
    nodeId = node.parentId;
  }
  
  return path;
}

/**
 * Get all messages in a conversation
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
    version: (editedMessage.version || 1) + 1,
    createdAt: new Date().toISOString(),
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
    version: 1,
    createdAt: new Date().toISOString(),
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

/**
 * Get conversation title from first user message
 */
export function getConversationTitle(chatTree: ChatTree): string {
  const firstUserMessage = Object.values(chatTree).find(node => 
    node.role === 'user' && node.parentId === null
  );
  return firstUserMessage ? firstUserMessage.content.slice(0, 50) + '...' : 'New Conversation';
}

/**
 * Get last message in conversation
 */
export function getLastMessage(chatTree: ChatTree): string {
  const messages = Object.values(chatTree).sort((a, b) => 
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  return messages.length > 0 ? messages[messages.length - 1].content.slice(0, 100) + '...' : 'No messages';
}

/**
 * Get conversation creation date
 */
export function getConversationCreatedAt(chatTree: ChatTree): string {
  const rootMessage = Object.values(chatTree).find(node => node.parentId === null);
  return rootMessage ? rootMessage.createdAt : new Date().toISOString();
}

/**
 * Get all versions of a message (including the original and all edits)
 */
export function getMessageVersions(chatTree: ChatTree, messageId: string): ChatTreeNode[] {
  const message = chatTree[messageId];
  if (!message) return [];

  // ChatGPT-style "versions" are sibling user messages that occupy the same
  // position in the conversation tree. That means: same parentId, role=user.
  const siblingVersions = Object.values(chatTree).filter(node =>
    node.role === 'user' &&
    node.parentId === message.parentId &&
    node.conversationId === message.conversationId
  );

  // Sort by creation time so v1 is first
  siblingVersions.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  return siblingVersions;
}

/**
 * Get navigation info for message versions (ChatGPT-style)
 */
export function getVersionNavigationInfo(chatTree: ChatTree, messageId: string): {
  hasVersions: boolean;
  currentVersion: number;
  totalVersions: number;
  canGoToPrevious: boolean;
  canGoToNext: boolean;
  allVersions: ChatTreeNode[];
} {
  const allVersions = getMessageVersions(chatTree, messageId);
  if (allVersions.length <= 1) {
    return {
      hasVersions: false,
      currentVersion: 1,
      totalVersions: 1,
      canGoToPrevious: false,
      canGoToNext: false,
      allVersions: []
    };
  }

  // Versions list is already the sibling set; current index is within it
  const currentIndex = allVersions.findIndex(node => node.id === messageId);

  return {
    hasVersions: allVersions.length > 1,
    currentVersion: currentIndex + 1,
    totalVersions: allVersions.length,
    canGoToPrevious: currentIndex > 0,
    canGoToNext: currentIndex < allVersions.length - 1,
    allVersions
  };
}

/**
 * Navigate to previous version of a message
 */
export function goToPreviousVersion(chatTree: ChatTree, messageId: string): string | null {
  const navInfo = getVersionNavigationInfo(chatTree, messageId);
  if (!navInfo.canGoToPrevious) return null;

  const currentIndex = navInfo.allVersions.findIndex(node => node.id === messageId);
  return navInfo.allVersions[currentIndex - 1]?.id || null;
}

/**
 * Navigate to next version of a message
 */
export function goToNextVersion(chatTree: ChatTree, messageId: string): string | null {
  const navInfo = getVersionNavigationInfo(chatTree, messageId);
  if (!navInfo.canGoToNext) return null;

  const currentIndex = navInfo.allVersions.findIndex(node => node.id === messageId);
  return navInfo.allVersions[currentIndex + 1]?.id || null;
}
