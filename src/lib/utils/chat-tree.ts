import type { Chat } from '$lib/db/schema';

export interface ChatTreeNode extends Chat {
  children: ChatTreeNode[];
  isEdited?: boolean;
  originalContent?: string;
}

/**
 * Builds a tree structure from flat chat messages
 * @param messages - Array of chat messages from database
 * @returns Tree-structured chat history
 */
export function buildChatTree(messages: Chat[]): ChatTreeNode[] {
  // Create a map for quick lookup
  const messageMap = new Map<string, ChatTreeNode>();
  
  // Initialize all messages with empty children arrays
  messages.forEach(msg => {
    messageMap.set(msg.id, {
      ...msg,
      children: []
    });
  });
  
  const rootMessages: ChatTreeNode[] = [];
  
  // Build the tree structure
  messages.forEach(msg => {
    const node = messageMap.get(msg.id)!;
    
    if (msg.parentId) {
      // This is a child message
      const parent = messageMap.get(msg.parentId);
      if (parent) {
        parent.children.push(node);
      }
    } else {
      // This is a root message (starts a new conversation)
      rootMessages.push(node);
    }
  });
  
  // Sort messages chronologically at each level
  function sortMessages(nodes: ChatTreeNode[]): void {
    nodes.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    nodes.forEach(node => {
      if (node.children.length > 0) {
        sortMessages(node.children);
      }
    });
  }
  
  sortMessages(rootMessages);
  
  return rootMessages;
}

/**
 * Gets all messages in a conversation branch starting from a specific message
 * @param messages - All user messages
 * @param startMessageId - ID of the message to start from
 * @returns Array of messages in the branch
 */
export function getConversationBranch(messages: Chat[], startMessageId: string): Chat[] {
  const branch: Chat[] = [];
  const messageMap = new Map<string, Chat>();
  
  // Build lookup map
  messages.forEach(msg => messageMap.set(msg.id, msg));
  
  // Collect all messages in the branch
  function collectBranch(messageId: string): void {
    const message = messageMap.get(messageId);
    if (message) {
      branch.push(message);
      
      // Find all children of this message
      messages.forEach(msg => {
        if (msg.parentId === messageId) {
          collectBranch(msg.id);
        }
      });
    }
  }
  
  collectBranch(startMessageId);
  
  // Sort chronologically
  return branch.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

/**
 * Flattens a tree structure back to a linear array
 * Useful for sending to AI models that expect flat conversation history
 * @param tree - Tree-structured chat history
 * @returns Flat array of messages
 */
export function flattenChatTree(tree: ChatTreeNode[]): Chat[] {
  const result: Chat[] = [];
  
  function traverse(nodes: ChatTreeNode[]): void {
    nodes.forEach(node => {
      result.push({
        id: node.id,
        userId: node.userId,
        parentId: node.parentId,
        role: node.role,
        content: node.content,
        isEdited: node.isEdited,
        originalContent: node.originalContent,
        createdAt: node.createdAt
      });
      
      if (node.children.length > 0) {
        traverse(node.children);
      }
    });
  }
  
  traverse(tree);
  return result;
}

/**
 * Gets the active branch of a conversation (latest edited version)
 * @param tree - Tree-structured chat history
 * @returns Array of messages representing the active branch
 */
export function getActiveBranch(tree: ChatTreeNode[]): Chat[] {
  const result: Chat[] = [];
  
  function traverse(nodes: ChatTreeNode[]): void {
    nodes.forEach(node => {
      // For user messages, check if there are edited versions
      if (node.role === 'user' && node.children && node.children.length > 0) {
        // Find the latest edited version (most recent child)
        const editedVersions = node.children.filter(child => child.role === 'user');
        if (editedVersions.length > 0) {
          // Use the most recent edited version
          const latestEdit = editedVersions.sort((a, b) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )[0];
          
          result.push({
            id: latestEdit.id,
            userId: latestEdit.userId,
            parentId: latestEdit.parentId,
            role: latestEdit.role,
            content: latestEdit.content,
            isEdited: latestEdit.isEdited,
            originalContent: latestEdit.originalContent,
            createdAt: latestEdit.createdAt
          });
          
          // Continue with children of the edited version
          if (latestEdit.children && latestEdit.children.length > 0) {
            traverse(latestEdit.children);
          }
        } else {
          // No edited version, use original
          result.push({
            id: node.id,
            userId: node.userId,
            parentId: node.parentId,
            role: node.role,
            content: node.content,
            isEdited: node.isEdited,
            originalContent: node.originalContent,
            createdAt: node.createdAt
          });
          
          // Continue with original children
          if (node.children && node.children.length > 0) {
            traverse(node.children);
          }
        }
      } else {
        // For AI messages or user messages without edits, add as is
        result.push({
          id: node.id,
          userId: node.userId,
          parentId: node.parentId,
          role: node.role,
          content: node.content,
          isEdited: node.isEdited,
          originalContent: node.originalContent,
          createdAt: node.createdAt
        });
        
        // Continue with children
        if (node.children && node.children.length > 0) {
          traverse(node.children);
        }
      }
    });
  }
  
  traverse(tree);
  return result;
}

/**
 * Creates a fork from a specific message in the conversation
 * @param tree - Tree-structured chat history
 * @param messageId - ID of the message to fork from
 * @returns Array of messages up to the fork point
 */
export function createForkFromMessage(tree: ChatTreeNode[], messageId: string): Chat[] {
  const result: Chat[] = [];
  
  function findAndCollect(node: ChatTreeNode, targetId: string, collecting: boolean = false): boolean {
    if (node.id === targetId) {
      collecting = true;
    }
    
    if (collecting) {
      result.push({
        id: node.id,
        userId: node.userId,
        parentId: node.parentId,
        role: node.role,
        content: node.content,
        isEdited: node.isEdited,
        originalContent: node.originalContent,
        createdAt: node.createdAt
      });
    }
    
    // Search children
    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        if (findAndCollect(child, targetId, collecting)) {
          return true;
        }
      }
    }
    
    return collecting;
  }
  
  // Search through all root conversations
  for (const root of tree) {
    if (findAndCollect(root, messageId)) {
      break;
    }
  }
  
  // Sort chronologically
  return result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}
