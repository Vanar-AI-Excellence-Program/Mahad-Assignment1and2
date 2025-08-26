import { db } from '$lib/db';
import { chats } from '$lib/db/schema';
import { eq, and, desc, inArray } from 'drizzle-orm';
import type { Chat } from '$lib/db/schema';
import { ForkingSystem, type ForkingMessage, type BranchMetadata } from './forking-system';

/**
 * Database adapter for the forking system
 * Handles persistence and database operations
 */
export class ForkingDBAdapter {
  private forkingSystem: ForkingSystem;

  constructor() {
    this.forkingSystem = new ForkingSystem();
  }

  /**
   * Load conversation data from database into the forking system
   * @param userId - User ID to load conversations for
   * @param conversationId - Optional specific conversation ID
   */
  async loadFromDatabase(userId: string, conversationId?: string): Promise<void> {
    try {
      // Build query to get all chat messages for the user
      let query = db.query.chats.findMany({
        where: eq(chats.userId, userId),
        orderBy: chats.createdAt,
      });

      if (conversationId) {
        // If specific conversation, filter by conversation_id (would need to be added to schema)
        // For now, we'll load all and filter in memory
      }

      const chatMessages = await query;

      // Convert database messages to forking system format
      const forkingMessages: ForkingMessage[] = [];
      const branches = new Map<string, BranchMetadata>();
      const conversationRoots = new Map<string, string[]>();

      // Group messages by conversation (using parent_id relationships)
      const messageMap = new Map<string, Chat>();
      chatMessages.forEach(msg => messageMap.set(msg.id, msg));

      // Find root messages (messages without parent_id)
      const rootMessages = chatMessages.filter(msg => !msg.parentId);
      
      // Process each root message and build conversation trees
      rootMessages.forEach((rootMsg, index) => {
        const conversationId = `conv_${userId}_${index}`;
        const branchId = rootMsg.forkId || `branch_${rootMsg.id}`;
        
        // Create branch metadata
        branches.set(branchId, {
          branch_id: branchId,
          conversation_id: conversationId,
          root_message_id: rootMsg.id,
          parent_branch_id: rootMsg.parentBranchId || undefined,
          branch_name: rootMsg.branchType === 'user_edit' ? 'Edited Branch' : 'Original Branch',
          created_at: rootMsg.createdAt,
          is_active: rootMsg.branchType === 'original' || !rootMsg.forkId
        });

        // Initialize conversation roots
        if (!conversationRoots.has(conversationId)) {
          conversationRoots.set(conversationId, []);
        }
        conversationRoots.get(conversationId)!.push(rootMsg.id);

        // Convert root message
        const forkingMsg: ForkingMessage = {
          id: rootMsg.id,
          parent_id: null,
          role: rootMsg.role,
          content: rootMsg.content,
          children: [],
          conversation_id: conversationId,
          branch_id: branchId,
          created_at: rootMsg.createdAt,
          is_edited: rootMsg.isEdited || false,
          original_content: rootMsg.originalContent || undefined
        };

        forkingMessages.push(forkingMsg);

        // Process children recursively
        this.processMessageChildren(rootMsg.id, messageMap, forkingMessages, conversationId, branchId);
      });

      // Import the loaded state into the forking system
      this.forkingSystem.importState({
        messageTree: forkingMessages,
        branches: Array.from(branches.values()),
        conversationRoots: Object.fromEntries(conversationRoots)
      });

    } catch (error) {
      console.error('Error loading from database:', error);
      throw new Error('Failed to load conversation data from database');
    }
  }

  /**
   * Save the current forking system state to database
   * @param userId - User ID to save conversations for
   */
  async saveToDatabase(userId: string): Promise<void> {
    try {
      const state = this.forkingSystem.exportState();
      
      // Get existing messages for this user
      const existingMessages = await db.query.chats.findMany({
        where: eq(chats.userId, userId),
      });

      const existingIds = new Set(existingMessages.map(msg => msg.id));
      const newMessages: any[] = [];
      const updatedMessages: any[] = [];

      // Process each message in the forking system
      state.messageTree.forEach(forkingMsg => {
        const dbMessage = {
          id: forkingMsg.id,
          userId: userId, // This maps to user_id in the database
          parentId: forkingMsg.parent_id, // This maps to parent_id in the database
          role: forkingMsg.role,
          content: forkingMsg.content,
          isEdited: forkingMsg.is_edited || false,
          originalContent: forkingMsg.original_content,
          forkId: forkingMsg.branch_id, // This maps to fork_id in the database
          branchType: this.getBranchType(forkingMsg.branch_id, state.branches),
          parentBranchId: this.getParentBranchId(forkingMsg.branch_id, state.branches)
          // createdAt is handled by the database default
        };

        if (existingIds.has(forkingMsg.id)) {
          updatedMessages.push(dbMessage);
        } else {
          newMessages.push(dbMessage);
        }
      });

      // Insert new messages
      if (newMessages.length > 0) {
        await db.insert(chats).values(newMessages);
      }

      // Update existing messages
      for (const msg of updatedMessages) {
        await db.update(chats)
          .set({
            content: msg.content,
            isEdited: msg.isEdited,
            originalContent: msg.originalContent,
            forkId: msg.forkId,
            branchType: msg.branchType,
            parentBranchId: msg.parentBranchId
          })
          .where(eq(chats.id, msg.id));
      }

      // Delete messages that no longer exist in the forking system
      const forkingIds = new Set(state.messageTree.map(msg => msg.id));
      const toDelete = existingMessages.filter(msg => !forkingIds.has(msg.id));
      
      if (toDelete.length > 0) {
        const deleteIds = toDelete.map(msg => msg.id);
        await db.delete(chats).where(inArray(chats.id, deleteIds));
      }

    } catch (error) {
      console.error('Error saving to database:', error);
      throw new Error('Failed to save conversation data to database');
    }
  }

  /**
   * Add a new message to the conversation
   * @param userId - User ID
   * @param parentId - Parent message ID (null for root)
   * @param role - Message role
   * @param content - Message content
   * @param conversationId - Conversation ID
   * @param branchId - Branch ID
   * @returns The created message
   */
  async addMessage(
    userId: string,
    parentId: string | null,
    role: 'user' | 'assistant',
    content: string,
    conversationId: string,
    branchId: string
  ): Promise<ForkingMessage> {
    // Add to forking system
    const message = this.forkingSystem.add_message(parentId, role, content, conversationId, branchId);

    // Save to database - use the correct field names that match the schema
    await db.insert(chats).values({
      id: message.id,
      userId: userId, // This maps to user_id in the database
      parentId: message.parent_id, // This maps to parent_id in the database
      role: message.role,
      content: message.content,
      isEdited: message.is_edited || false,
      originalContent: message.original_content,
      forkId: message.branch_id, // This maps to fork_id in the database
      branchType: this.getBranchType(message.branch_id, this.forkingSystem.exportState().branches),
      parentBranchId: this.getParentBranchId(message.branch_id, this.forkingSystem.exportState().branches)
    });

    return message;
  }

  /**
   * Edit a message and create a fork
   * @param userId - User ID
   * @param messageId - Message ID to edit
   * @param newContent - New content
   * @returns The new forked message
   */
  async editMessage(userId: string, messageId: string, newContent: string): Promise<ForkingMessage> {
    // Edit in forking system
    const editedMessage = this.forkingSystem.edit_message(messageId, newContent);

    // Save edited message to database - use the correct field names
    await db.insert(chats).values({
      id: editedMessage.id,
      userId: userId, // This maps to user_id in the database
      parentId: editedMessage.parent_id, // This maps to parent_id in the database
      role: editedMessage.role,
      content: editedMessage.content,
      isEdited: editedMessage.is_edited || false,
      originalContent: editedMessage.original_content,
      forkId: editedMessage.branch_id, // This maps to fork_id in the database
      branchType: this.getBranchType(editedMessage.branch_id, this.forkingSystem.exportState().branches),
      parentBranchId: this.getParentBranchId(editedMessage.branch_id, this.forkingSystem.exportState().branches)
    });

    // Mark original message as edited
    await db.update(chats)
      .set({
        isEdited: true,
        originalContent: editedMessage.original_content
      })
      .where(eq(chats.id, messageId));

    return editedMessage;
  }

  /**
   * Get conversation tree for display
   * @param userId - User ID
   * @param conversationId - Conversation ID
   * @param branchId - Optional branch ID
   * @returns Array of messages in the conversation
   */
  async getConversationTree(
    userId: string,
    conversationId: string,
    branchId?: string
  ): Promise<ForkingMessage[]> {
    // Ensure data is loaded
    await this.loadFromDatabase(userId, conversationId);
    
    if (branchId) {
      return this.forkingSystem.get_branch(conversationId, branchId);
    } else {
      const activeBranch = this.forkingSystem.get_active_branch(conversationId);
      if (activeBranch) {
        return this.forkingSystem.get_branch(conversationId, activeBranch.branch_id);
      }
      return [];
    }
  }

  /**
   * Get all branches for a conversation
   * @param userId - User ID
   * @param conversationId - Conversation ID
   * @returns Array of branch metadata
   */
  async getConversationBranches(userId: string, conversationId: string): Promise<BranchMetadata[]> {
    await this.loadFromDatabase(userId, conversationId);
    return this.forkingSystem.get_conversation_branches(conversationId);
  }

  /**
   * Switch to a different branch
   * @param userId - User ID
   * @param conversationId - Conversation ID
   * @param branchId - Branch ID to switch to
   */
  async switchBranch(userId: string, conversationId: string, branchId: string): Promise<void> {
    await this.loadFromDatabase(userId, conversationId);
    this.forkingSystem.switch_branch(conversationId, branchId);
    await this.saveToDatabase(userId);
  }

  /**
   * Get messages up to a fork point for AI regeneration
   * @param userId - User ID
   * @param conversationId - Conversation ID
   * @param forkMessageId - Message ID to fork from
   * @returns Array of messages up to the fork point
   */
  async getMessagesUpToFork(
    userId: string,
    conversationId: string,
    forkMessageId: string
  ): Promise<ForkingMessage[]> {
    await this.loadFromDatabase(userId, conversationId);
    return this.forkingSystem.get_messages_up_to_fork(conversationId, forkMessageId);
  }

  // Private helper methods

  private processMessageChildren(
    parentId: string,
    messageMap: Map<string, Chat>,
    forkingMessages: ForkingMessage[],
    conversationId: string,
    branchId: string
  ): void {
    const children = Array.from(messageMap.values()).filter(msg => msg.parentId === parentId);
    
    children.forEach(childMsg => {
      const forkingMsg: ForkingMessage = {
        id: childMsg.id,
        parent_id: childMsg.parentId,
        role: childMsg.role,
        content: childMsg.content,
        children: [],
        conversation_id: conversationId,
        branch_id: childMsg.forkId || branchId,
        created_at: childMsg.createdAt,
        is_edited: childMsg.isEdited || false,
        original_content: childMsg.originalContent || undefined
      };

      forkingMessages.push(forkingMsg);

      // Process children recursively
      this.processMessageChildren(childMsg.id, messageMap, forkingMessages, conversationId, branchId);
    });
  }

  private getBranchType(branchId: string, branches: BranchMetadata[]): 'original' | 'user_edit' | 'ai_regeneration' {
    const branch = branches.find(b => b.branch_id === branchId);
    if (branch?.parent_branch_id) {
      return 'user_edit';
    }
    return 'original';
  }

  private getParentBranchId(branchId: string, branches: BranchMetadata[]): string | null {
    const branch = branches.find(b => b.branch_id === branchId);
    return branch?.parent_branch_id || null;
  }

  /**
   * Get the underlying forking system instance
   * Useful for advanced operations
   */
  getForkingSystem(): ForkingSystem {
    return this.forkingSystem;
  }
}
