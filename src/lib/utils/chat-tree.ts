import type { Chat } from '$lib/db/schema';

export interface ChatTreeNode extends Chat {
  children: ChatTreeNode[];
  isEdited?: boolean;
  originalContent?: string;
  forkId?: string; // Unique identifier for each fork branch
  branchName?: string; // Human-readable name for the branch
  isActive?: boolean; // Whether this is the currently active branch
  branchType?: 'original' | 'user_edit' | 'ai_regeneration'; // Type of branch
  parentBranchId?: string; // ID of the parent branch this was forked from
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
      children: [],
      forkId: msg.forkId || `branch_${msg.id}`,
      branchName: generateBranchName(msg.content),
      isActive: false,
      branchType: 'original',
      parentBranchId: null
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
      } else {
        // Parent not found, treat as root message
        console.warn(`Parent message ${msg.parentId} not found for message ${msg.id}, treating as root`);
        rootMessages.push(node);
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
 * Generates a unique fork ID for a message
 * @param messageId - The message ID
 * @param branchType - Type of branch being created
 * @returns A unique fork identifier
 */
export function generateForkId(messageId: string, branchType: 'user_edit' | 'ai_regeneration' = 'user_edit'): string {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  return `${branchType}_${messageId}_${timestamp}_${randomSuffix}`;
}

/**
 * Generates a human-readable branch name from message content
 * @param content - The message content
 * @returns A readable branch name
 */
export function generateBranchName(content: string): string {
  const maxLength = 50;
  const cleanContent = content.replace(/\s+/g, ' ').trim();
  if (cleanContent.length <= maxLength) {
    return cleanContent;
  }
  return cleanContent.substring(0, maxLength) + '...';
}

/**
 * Creates a new fork from a specific message in the conversation
 * This replicates GPT's exact forking behavior for user message editing
 * @param tree - Tree-structured chat history
 * @param messageId - ID of the message to fork from
 * @param newContent - New content for the edited message
 * @returns New fork branch with messages up to the fork point
 */
export function createUserMessageFork(tree: ChatTreeNode[], messageId: string, newContent: string): ChatTreeNode[] {
  const result: ChatTreeNode[] = [];
  const forkId = generateForkId(messageId, 'user_edit');
  
  function findAndCollect(node: ChatTreeNode, targetId: string, collecting: boolean = false): boolean {
    if (node.id === targetId) {
      collecting = true;
      // Create the edited user message as the fork point
      const editedNode: ChatTreeNode = {
        ...node,
        id: forkId,
        content: newContent,
        isEdited: true,
        originalContent: node.content,
        forkId: forkId,
        branchName: `Edited: "${newContent.substring(0, 30)}..."`,
        isActive: true,
        branchType: 'user_edit',
        parentBranchId: node.id,
        children: [],
        createdAt: new Date().toISOString()
      };
      result.push(editedNode);
      return true;
    }
    
    if (collecting) {
      // Add all subsequent messages to the fork
      const forkNode: ChatTreeNode = {
        ...node,
        id: `${forkId}_${node.id}`,
        forkId: forkId,
        branchName: node.branchName,
        isActive: true,
        branchType: 'user_edit',
        parentBranchId: node.id,
        children: [],
        createdAt: new Date().toISOString()
      };
      result.push(forkNode);
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

/**
 * Creates a new fork from an AI message for regeneration
 * This replicates GPT's exact forking behavior for AI message regeneration
 * @param tree - Tree-structured chat history
 * @param messageId - ID of the AI message to regenerate from
 * @returns New fork branch with messages up to the AI message
 */
export function createAIMessageFork(tree: ChatTreeNode[], messageId: string): ChatTreeNode[] {
  const result: ChatTreeNode[] = [];
  const forkId = generateForkId(messageId, 'ai_regeneration');
  
  function findAndCollect(node: ChatTreeNode, targetId: string, collecting: boolean = false): boolean {
    if (node.id === targetId) {
      collecting = true;
      // Create the AI message as the fork point (will be regenerated)
      const aiNode: ChatTreeNode = {
        ...node,
        id: forkId,
        forkId: forkId,
        branchName: `Regenerate from: "${node.content.substring(0, 30)}..."`,
        isActive: true,
        branchType: 'ai_regeneration',
        parentBranchId: node.id,
        children: [],
        createdAt: new Date().toISOString()
      };
      result.push(aiNode);
      return true;
    }
    
    if (collecting) {
      // Add all subsequent messages to the fork
      const forkNode: ChatTreeNode = {
        ...node,
        id: `${forkId}_${node.id}`,
        forkId: forkId,
        branchName: node.branchName,
        isActive: true,
        branchType: 'ai_regeneration',
        parentBranchId: node.id,
        children: [],
        createdAt: new Date().toISOString()
      };
      result.push(forkNode);
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
 * Gets all branches of a conversation for display in UI
 * @param tree - Tree-structured chat history
 * @returns Array of branch arrays, each representing a conversation path
 */
export function getAllBranches(tree: ChatTreeNode[]): Chat[][] {
  const branches: Chat[][] = [];
  
  function collectBranch(node: ChatTreeNode, currentBranch: Chat[] = []): void {
    const branchNode: Chat = {
      id: node.id,
      userId: node.userId,
      parentId: node.parentId,
      role: node.role,
      content: node.content,
      isEdited: node.isEdited,
      originalContent: node.originalContent,
      createdAt: node.createdAt
    };
    
    const newBranch = [...currentBranch, branchNode];
    
    if (node.children && node.children.length > 0) {
      // For each child, create a new branch
      node.children.forEach(child => {
        collectBranch(child, newBranch);
      });
    } else {
      // This is a leaf node, add the complete branch
      branches.push(newBranch);
    }
  }
  
  tree.forEach(root => {
    collectBranch(root);
  });
  
  return branches;
}

/**
 * Finds a conversation tree node by message ID
 * @param conversations - Array of conversation trees
 * @param messageId - ID of the message to find
 * @returns The conversation tree node or null if not found
 */
export function findConversationByMessageId(conversations: ChatTreeNode[], messageId: string): ChatTreeNode | null {
  for (const conv of conversations) {
    if (conv.id === messageId) return conv;
    if (conv.children) {
      for (const child of conv.children) {
        if (child.id === messageId) return conv;
      }
    }
  }
  return null;
}

/**
 * Gets messages up to a specific fork point
 * @param conversation - The conversation tree
 * @param forkMessageId - ID of the message to fork from
 * @returns Array of messages up to the fork point
 */
export function getMessagesUpToFork(conversation: ChatTreeNode, forkMessageId: string): Chat[] {
  const result: Chat[] = [];
  
  function traverse(node: ChatTreeNode, includeThis: boolean = false) {
    if (includeThis || node.id === forkMessageId) {
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
      includeThis = true;
    }
    
    if (node.children && node.children.length > 0) {
      node.children.forEach(child => traverse(child, includeThis));
    }
  }
  
  traverse(conversation);
  return result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

/**
 * Creates a new branch from a fork point
 * @param originalBranch - The original branch
 * @param forkPointId - ID of the message to fork from
 * @returns New branch with updated IDs and fork metadata
 */
export function createNewBranchFromFork(originalBranch: ChatTreeNode, forkPointId: string): ChatTreeNode[] {
  const messages = getMessagesUpToFork(originalBranch, forkPointId);
  
  // Convert to tree structure with new IDs for the fork
  return messages.map((msg, index) => ({
    ...msg,
    id: `fork_${msg.id}_${Date.now()}_${index}`,
    parentId: index > 0 ? `fork_${messages[index - 1].id}_${Date.now()}_${index - 1}` : null,
    forkId: `fork_${forkPointId}_${Date.now()}`,
    branchName: `Fork from "${msg.content.substring(0, 30)}..."`,
    isActive: true,
    children: [],
    createdAt: new Date().toISOString()
  }));
}

/**
 * Merges multiple conversation branches
 * @param branches - Array of branch arrays
 * @returns Merged conversation tree
 */
export function mergeConversationBranches(branches: ChatTreeNode[][]): ChatTreeNode[] {
  // This is a placeholder for future branch merging functionality
  // For now, return the first branch as the main conversation
  if (branches.length === 0) return [];
  
  const mainBranch = branches[0];
  const result: ChatTreeNode[] = [];
  
  mainBranch.forEach((msg, index) => {
    const node: ChatTreeNode = {
      ...msg,
      children: [],
      forkId: msg.forkId || `main_${msg.id}`,
      branchName: msg.branchName || generateBranchName(msg.content),
      isActive: index === mainBranch.length - 1,
      branchType: 'original',
      parentBranchId: null
    };
    
    if (index > 0) {
      node.parentId = result[index - 1].id;
    }
    
    result.push(node);
  });
  
  return result;
}

/**
 * Finds common ancestors between multiple branches
 * @param branches - Array of branch arrays
 * @returns Array of common ancestor messages
 */
export function findCommonAncestors(branches: ChatTreeNode[][]): Chat[] {
  if (branches.length < 2) return [];
  
  const firstBranch = branches[0];
  const commonMessages: Chat[] = [];
  
  firstBranch.forEach((msg, index) => {
    let isCommon = true;
    
    for (let i = 1; i < branches.length; i++) {
      if (index >= branches[i].length || branches[i][index].content !== msg.content) {
        isCommon = false;
        break;
      }
    }
    
    if (isCommon) {
      commonMessages.push(msg);
    }
  });
  
  return commonMessages;
}
