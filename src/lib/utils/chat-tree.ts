import type { Chat } from '$lib/db/schema';

export interface ChatTreeNode extends Chat {
  children: ChatTreeNode[];
  branches: ChatTreeNode[]; // Different conversation branches
  version: number; // Version number for this message
  isLatest: boolean; // Whether this is the latest version
}

export interface ConversationBranch {
  id: string;
  messages: ChatTreeNode[];
  createdAt: Date;
  isActive: boolean;
}

/**
 * Builds a tree structure from flat chat messages with support for multiple branches
 * @param messages - Array of chat messages from database
 * @returns Tree-structured chat history with branches
 */
export function buildChatTree(messages: Chat[]): ChatTreeNode[] {
  // Create a map for quick lookup
  const messageMap = new Map<string, ChatTreeNode>();
  
  // Initialize all messages with empty children and branches arrays
  messages.forEach(msg => {
    messageMap.set(msg.id, {
      ...msg,
      children: [],
      branches: [],
      version: 1,
      isLatest: true
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
  
  // Process branches and versions
  processBranchesAndVersions(rootMessages);
  
  // Sort messages chronologically at each level
  function sortMessages(nodes: ChatTreeNode[]): void {
    nodes.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    nodes.forEach(node => {
      if (node.children.length > 0) {
        sortMessages(node.children);
      }
      if (node.branches.length > 0) {
        sortMessages(node.branches);
      }
    });
  }
  
  sortMessages(rootMessages);
  
  return rootMessages;
}

/**
 * Processes branches and versions for each message
 */
function processBranchesAndVersions(nodes: ChatTreeNode[]): void {
  nodes.forEach(node => {
    if (node.children.length > 0) {
      // Group children by content similarity (different versions of the same message)
      const contentGroups = new Map<string, ChatTreeNode[]>();
      
      node.children.forEach(child => {
        if (child.role === 'user') {
          // For user messages, group by similar content (edited versions)
          const key = child.content.substring(0, 50); // Use first 50 chars as key
          if (!contentGroups.has(key)) {
            contentGroups.set(key, []);
          }
          contentGroups.get(key)!.push(child);
        } else {
          // For AI messages, they go to the main children
          contentGroups.set(child.id, [child]);
        }
      });
      
      // Process each content group
      contentGroups.forEach((group, key) => {
        if (group.length > 1 && group[0].role === 'user') {
          // Multiple versions of the same user message
          const sortedGroup = group.sort((a, b) => 
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
          
          // Mark versions
          sortedGroup.forEach((msg, index) => {
            msg.version = index + 1;
            msg.isLatest = index === sortedGroup.length - 1;
          });
          
          // Create branches for each version
          sortedGroup.forEach((msg, index) => {
            if (index < sortedGroup.length - 1) {
              // Create a branch for this version
              const branch = createBranchFromVersion(msg, sortedGroup.slice(index + 1));
              msg.branches.push(branch);
            }
          });
          
          // Keep only the latest version in main children
          const latestVersion = sortedGroup[sortedGroup.length - 1];
          node.children = node.children.filter(child => 
            child.id !== latestVersion.id || child.role !== 'user'
          );
          node.children.push(latestVersion);
        }
      });
      
      // Recursively process children
      processBranchesAndVersions(node.children);
      
      // Process branches
      node.branches.forEach(branch => {
        processBranchesAndVersions([branch]);
      });
    }
  });
}

/**
 * Creates a branch from a specific version of a message
 */
function createBranchFromVersion(version: ChatTreeNode, newerVersions: ChatTreeNode[]): ChatTreeNode {
  const branch: ChatTreeNode = {
    ...version,
    children: [],
    branches: [],
    version: version.version,
    isLatest: false
  };
  
  // Add newer versions as children in the branch
  newerVersions.forEach(newerVersion => {
    branch.children.push({
      ...newerVersion,
      children: [],
      branches: [],
      version: newerVersion.version,
      isLatest: newerVersion.isLatest
    });
  });
  
  return branch;
}

/**
 * Gets the active conversation branch (latest versions)
 */
export function getActiveBranch(tree: ChatTreeNode[]): Chat[] {
  const result: Chat[] = [];
  
  function traverse(nodes: ChatTreeNode[]): void {
    nodes.forEach(node => {
      // Add the message
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
      
      // Continue with children (latest versions)
      if (node.children.length > 0) {
        traverse(node.children);
      }
    });
  }
  
  traverse(tree);
  return result;
}

/**
 * Gets all available branches for a conversation
 */
export function getAllBranches(tree: ChatTreeNode[]): ConversationBranch[] {
  const branches: ConversationBranch[] = [];
  
  function collectBranches(nodes: ChatTreeNode[], parentPath: string = ''): void {
    nodes.forEach(node => {
      if (node.branches.length > 0) {
        node.branches.forEach(branch => {
          const branchId = `${parentPath}${node.id}-v${branch.version}`;
          const branchMessages = flattenBranch(branch);
          
          branches.push({
            id: branchId,
            messages: branchMessages,
            createdAt: branch.createdAt,
            isActive: false
          });
        });
      }
      
      if (node.children.length > 0) {
        collectBranches(node.children, `${parentPath}${node.id}-`);
      }
    });
  }
  
  collectBranches(tree);
  return branches;
}

/**
 * Flattens a branch to get all messages in sequence
 */
function flattenBranch(branch: ChatTreeNode): ChatTreeNode[] {
  const result: ChatTreeNode[] = [branch];
  
  function traverse(nodes: ChatTreeNode[]): void {
    nodes.forEach(node => {
      result.push(node);
      if (node.children.length > 0) {
        traverse(node.children);
      }
    });
  }
  
  traverse(branch.children);
  return result;
}

/**
 * Gets a specific branch by ID
 */
export function getBranchById(tree: ChatTreeNode[], branchId: string): ChatTreeNode[] | null {
  const parts = branchId.split('-v');
  if (parts.length < 2) return null;
  
  const messageId = parts[0];
  const version = parseInt(parts[1]);
  
  function findBranch(nodes: ChatTreeNode[]): ChatTreeNode[] | null {
    for (const node of nodes) {
      if (node.id === messageId) {
        // Find the specific version
        const targetBranch = node.branches.find(b => b.version === version);
        if (targetBranch) {
          return flattenBranch(targetBranch);
        }
      }
      
      if (node.children.length > 0) {
        const result = findBranch(node.children);
        if (result) return result;
      }
    }
    return null;
  }
  
  return findBranch(tree);
}

/**
 * Gets the next and previous branches for navigation
 */
export function getAdjacentBranches(tree: ChatTreeNode[], currentBranchId: string): {
  previous: string | null;
  next: string | null;
} {
  const allBranches = getAllBranches(tree);
  const currentIndex = allBranches.findIndex(b => b.id === currentBranchId);
  
  if (currentIndex === -1) {
    return { previous: null, next: null };
  }
  
  return {
    previous: currentIndex > 0 ? allBranches[currentIndex - 1].id : null,
    next: currentIndex < allBranches.length - 1 ? allBranches[currentIndex + 1].id : null
  };
}

/**
 * Creates a new branch when editing a message
 */
export function createNewBranch(
  tree: ChatTreeNode[], 
  messageId: string, 
  newContent: string
): { newBranchId: string; updatedTree: ChatTreeNode[] } {
  // Deep clone the tree
  const updatedTree = JSON.parse(JSON.stringify(tree)) as ChatTreeNode[];
  
  function findAndUpdate(nodes: ChatTreeNode[]): boolean {
    for (const node of nodes) {
      if (node.id === messageId) {
        // Create a new version
        const newVersion: ChatTreeNode = {
          ...node,
          id: crypto.randomUUID(),
          content: newContent,
          isEdited: true,
          originalContent: node.content,
          createdAt: new Date(),
          children: [],
          branches: [],
          version: node.version + 1,
          isLatest: true
        };
        
        // Mark old version as not latest
        node.isLatest = false;
        
        // Add new version to children
        node.children.push(newVersion);
        
        // Create a branch for the old version
        const oldBranch = {
          ...node,
          children: [],
          branches: [],
          version: node.version,
          isLatest: false
        };
        
        node.branches.push(oldBranch);
        
        return true;
      }
      
      if (node.children.length > 0) {
        if (findAndUpdate(node.children)) return true;
      }
    }
    return false;
  }
  
  findAndUpdate(updatedTree);
  
  // Return the new branch ID
  const newBranchId = `${messageId}-v${getMessageVersion(updatedTree, messageId) + 1}`;
  
  return { newBranchId, updatedTree };
}

/**
 * Gets the current version of a message
 */
function getMessageVersion(tree: ChatTreeNode[], messageId: string): number {
  let version = 1;
  
  function findVersion(nodes: ChatTreeNode[]): void {
    for (const node of nodes) {
      if (node.id === messageId) {
        version = node.version;
        return;
      }
      
      if (node.children.length > 0) {
        findVersion(node.children);
      }
    }
  }
  
  findVersion(tree);
  return version;
}
