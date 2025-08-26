import type { Chat } from '$lib/db/schema';

// Core message structure for the forking system
export interface ForkingMessage {
  id: string; // This will be a UUID
  parent_id: string | null; // This will be a UUID
  role: 'user' | 'assistant';
  content: string;
  children: string[]; // List of message IDs that forked from this message
  conversation_id: string;
  branch_id: string; // Unique ID for each fork branch
  created_at: Date;
  is_edited?: boolean;
  original_content?: string;
}

// Branch metadata for navigation
export interface BranchMetadata {
  branch_id: string;
  conversation_id: string;
  root_message_id: string;
  parent_branch_id?: string;
  branch_name: string;
  created_at: Date;
  is_active: boolean;
}

// Main forking system class
export class ForkingSystem {
  private messageTree: Map<string, ForkingMessage> = new Map();
  private branches: Map<string, BranchMetadata> = new Map();
  private conversationRoots: Map<string, string[]> = new Map(); // conversation_id -> root message IDs

  constructor() {
    this.messageTree = new Map();
    this.branches = new Map();
    this.conversationRoots = new Map();
  }

  /**
   * Add a new message to the conversation tree
   * @param parent_id - ID of the parent message (null for root)
   * @param role - Role of the message sender
   * @param content - Message content
   * @param conversation_id - ID of the conversation
   * @param branch_id - ID of the branch this message belongs to
   * @returns The created message
   */
  add_message(
    parent_id: string | null,
    role: 'user' | 'assistant',
    content: string,
    conversation_id: string,
    branch_id: string
  ): ForkingMessage {
    const message_id = this.generateMessageId();
    
    const message: ForkingMessage = {
      id: message_id,
      parent_id,
      role,
      content,
      children: [],
      conversation_id,
      branch_id,
      created_at: new Date(),
      is_edited: false
    };

    // Add to message tree
    this.messageTree.set(message_id, message);

    // Update parent's children list
    if (parent_id) {
      const parent = this.messageTree.get(parent_id);
      if (parent) {
        parent.children.push(message_id);
      }
    } else {
      // This is a root message
      if (!this.conversationRoots.has(conversation_id)) {
        this.conversationRoots.set(conversation_id, []);
      }
      this.conversationRoots.get(conversation_id)!.push(message_id);
    }

    // Create or update branch metadata
    this.ensureBranchExists(branch_id, conversation_id, message_id, parent_id);

    return message;
  }

  /**
   * Edit a message and create a fork
   * @param message_id - ID of the message to edit
   * @param new_content - New content for the message
   * @returns The new forked message
   */
  edit_message(message_id: string, new_content: string): ForkingMessage {
    const original_message = this.messageTree.get(message_id);
    if (!original_message) {
      throw new Error(`Message ${message_id} not found`);
    }

    if (original_message.role !== 'user') {
      throw new Error('Only user messages can be edited');
    }

    // Create new branch ID for the fork
    const new_branch_id = this.generateBranchId();
    
    // Create the edited message
    const edited_message = this.add_message(
      original_message.parent_id,
      'user',
      new_content,
      original_message.conversation_id,
      new_branch_id
    );

    // Mark as edited and store original content
    edited_message.is_edited = true;
    edited_message.original_content = original_message.content;

    // Create branch metadata
    this.createBranch(new_branch_id, original_message.conversation_id, edited_message.id, original_message.branch_id);

    // Discard all messages that followed the old version in that branch
    this.discardBranchFromMessage(message_id);

    return edited_message;
  }

  /**
   * Get all messages for a specific branch
   * @param conversation_id - ID of the conversation
   * @param branch_id - ID of the branch
   * @returns Array of messages in the branch
   */
  get_branch(conversation_id: string, branch_id: string): ForkingMessage[] {
    const branch = this.branches.get(branch_id);
    if (!branch || branch.conversation_id !== conversation_id) {
      return [];
    }

    const messages: ForkingMessage[] = [];
    const visited = new Set<string>();

    // Find the root message of this branch
    const root_message = this.messageTree.get(branch.root_message_id);
    if (!root_message) return [];

    // Traverse the branch
    this.traverseBranch(root_message.id, messages, visited, branch_id);

    // Sort by creation time
    return messages.sort((a, b) => a.created_at.getTime() - b.created_at.getTime());
  }

  /**
   * Get all branches for a conversation
   * @param conversation_id - ID of the conversation
   * @returns Array of branch metadata
   */
  get_conversation_branches(conversation_id: string): BranchMetadata[] {
    return Array.from(this.branches.values())
      .filter(branch => branch.conversation_id === conversation_id)
      .sort((a, b) => a.created_at.getTime() - b.created_at.getTime());
  }

  /**
   * Get the active branch for a conversation
   * @param conversation_id - ID of the conversation
   * @returns The active branch metadata or null
   */
  get_active_branch(conversation_id: string): BranchMetadata | null {
    const conversation_branches = this.get_conversation_branches(conversation_id);
    return conversation_branches.find(branch => branch.is_active) || null;
  }

  /**
   * Switch to a different branch
   * @param conversation_id - ID of the conversation
   * @param branch_id - ID of the branch to switch to
   */
  switch_branch(conversation_id: string, branch_id: string): void {
    // Deactivate all branches in this conversation
    this.get_conversation_branches(conversation_id).forEach(branch => {
      branch.is_active = false;
    });

    // Activate the target branch
    const target_branch = this.branches.get(branch_id);
    if (target_branch && target_branch.conversation_id === conversation_id) {
      target_branch.is_active = true;
    }
  }

  /**
   * Get messages up to a fork point for AI regeneration
   * @param conversation_id - ID of the conversation
   * @param fork_message_id - ID of the message to fork from
   * @returns Array of messages up to the fork point
   */
  get_messages_up_to_fork(conversation_id: string, fork_message_id: string): ForkingMessage[] {
    const fork_message = this.messageTree.get(fork_message_id);
    if (!fork_message || fork_message.conversation_id !== conversation_id) {
      return [];
    }

    const messages: ForkingMessage[] = [];
    const visited = new Set<string>();

    // Collect all ancestors of the fork message
    this.collectAncestors(fork_message_id, messages, visited);

    // Sort by creation time
    return messages.sort((a, b) => a.created_at.getTime() - b.created_at.getTime());
  }

  /**
   * Check if a message has multiple versions (forks)
   * @param message_id - ID of the message to check
   * @returns Array of message IDs that are versions of the same message
   */
  get_message_versions(message_id: string): string[] {
    const message = this.messageTree.get(message_id);
    if (!message) return [];

    const versions: string[] = [];
    
    // Find all messages with the same parent and role
    this.messageTree.forEach((msg) => {
      if (msg.parent_id === message.parent_id && 
          msg.role === message.role && 
          msg.id !== message_id) {
        versions.push(msg.id);
      }
    });

    return versions;
  }

  // Private helper methods

  private generateMessageId(): string {
    // Generate a proper UUID v4
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  private generateBranchId(): string {
    // Generate a proper UUID v4 for branch IDs
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  private ensureBranchExists(
    branch_id: string, 
    conversation_id: string, 
    root_message_id: string, 
    parent_branch_id?: string
  ): void {
    if (!this.branches.has(branch_id)) {
      const branch: BranchMetadata = {
        branch_id,
        conversation_id,
        root_message_id,
        parent_branch_id,
        branch_name: `Branch ${this.branches.size + 1}`,
        created_at: new Date(),
        is_active: true
      };
      this.branches.set(branch_id, branch);
    }
  }

  private createBranch(
    branch_id: string, 
    conversation_id: string, 
    root_message_id: string, 
    parent_branch_id?: string
  ): void {
    const branch: BranchMetadata = {
      branch_id,
      conversation_id,
      root_message_id,
      parent_branch_id,
      branch_name: `Fork ${this.branches.size + 1}`,
      created_at: new Date(),
      is_active: false
    };
    this.branches.set(branch_id, branch);
  }

  private discardBranchFromMessage(message_id: string): void {
    const message = this.messageTree.get(message_id);
    if (!message) return;

    // Recursively remove all descendants
    const toRemove = new Set<string>();
    this.collectDescendants(message_id, toRemove);

    // Remove messages from tree
    toRemove.forEach(id => {
      this.messageTree.delete(id);
    });

    // Clear children list of the original message
    message.children = [];
  }

  private collectDescendants(message_id: string, descendants: Set<string>): void {
    const message = this.messageTree.get(message_id);
    if (!message) return;

    message.children.forEach(child_id => {
      descendants.add(child_id);
      this.collectDescendants(child_id, descendants);
    });
  }

  private traverseBranch(
    message_id: string, 
    messages: ForkingMessage[], 
    visited: Set<string>, 
    target_branch_id: string
  ): void {
    if (visited.has(message_id)) return;
    
    const message = this.messageTree.get(message_id);
    if (!message || message.branch_id !== target_branch_id) return;

    visited.add(message_id);
    messages.push(message);

    // Continue with children in the same branch
    message.children.forEach(child_id => {
      this.traverseBranch(child_id, messages, visited, target_branch_id);
    });
  }

  private collectAncestors(message_id: string, ancestors: ForkingMessage[], visited: Set<string>): void {
    if (visited.has(message_id)) return;
    
    const message = this.messageTree.get(message_id);
    if (!message) return;

    visited.add(message_id);
    ancestors.push(message);

    // Continue with parent
    if (message.parent_id) {
      this.collectAncestors(message.parent_id, ancestors, visited);
    }
  }

  /**
   * Export the current state for persistence
   */
  exportState(): {
    messageTree: ForkingMessage[];
    branches: BranchMetadata[];
    conversationRoots: Record<string, string[]>;
  } {
    return {
      messageTree: Array.from(this.messageTree.values()),
      branches: Array.from(this.branches.values()),
      conversationRoots: Object.fromEntries(this.conversationRoots)
    };
  }

  /**
   * Import state from persistence
   */
  importState(state: {
    messageTree: ForkingMessage[];
    branches: BranchMetadata[];
    conversationRoots: Record<string, string[]>;
  }): void {
    this.messageTree.clear();
    this.branches.clear();
    this.conversationRoots.clear();

    // Import messages
    state.messageTree.forEach(msg => {
      this.messageTree.set(msg.id, msg);
    });

    // Import branches
    state.branches.forEach(branch => {
      this.branches.set(branch.branch_id, branch);
    });

    // Import conversation roots
    Object.entries(state.conversationRoots).forEach(([conv_id, root_ids]) => {
      this.conversationRoots.set(conv_id, root_ids);
    });
  }
}

// Utility functions for working with the forking system

/**
 * Create a new conversation with initial messages
 */
export function createConversation(
  forkingSystem: ForkingSystem,
  conversation_id: string,
  initial_messages: Array<{ role: 'user' | 'assistant'; content: string }>
): string {
  let last_message_id: string | null = null;
  const branch_id = forkingSystem.generateBranchId();

  initial_messages.forEach((msg, index) => {
    const message = forkingSystem.add_message(
      last_message_id,
      msg.role,
      msg.content,
      conversation_id,
      branch_id
    );
    last_message_id = message.id;
  });

  return branch_id;
}

/**
 * Fork a conversation from a specific message
 */
export function forkConversation(
  forkingSystem: ForkingSystem,
  conversation_id: string,
  fork_message_id: string,
  new_user_message: string
): string {
  // Get messages up to the fork point
  const messages_up_to_fork = forkingSystem.get_messages_up_to_fork(conversation_id, fork_message_id);
  
  // Create new branch
  const new_branch_id = forkingSystem.generateBranchId();
  
  // Add the new user message
  const new_message = forkingSystem.add_message(
    fork_message_id,
    'user',
    new_user_message,
    conversation_id,
    new_branch_id
  );

  return new_branch_id;
}

/**
 * Get conversation tree for display
 */
export function getConversationTree(
  forkingSystem: ForkingSystem,
  conversation_id: string,
  branch_id?: string
): ForkingMessage[] {
  if (branch_id) {
    return forkingSystem.get_branch(conversation_id, branch_id);
  } else {
    const active_branch = forkingSystem.get_active_branch(conversation_id);
    if (active_branch) {
      return forkingSystem.get_branch(conversation_id, active_branch.branch_id);
    }
    return [];
  }
}
