import { db } from '$lib/db';
import { conversations, branches, messages } from '$lib/db/schema';
import { eq, and, desc, asc } from 'drizzle-orm';
import type { NewConversation, NewBranch, NewMessage, Conversation, Branch, Message } from '$lib/db/schema';

export class ForkingService {
  /**
   * Create a new conversation
   */
  static async createConversation(userId: string, title: string): Promise<Conversation> {
    const [conversation] = await db
      .insert(conversations)
      .values({
        userId,
        title
      })
      .returning();

    // Create the main branch for this conversation
    await db.insert(branches).values({
      conversationId: conversation.id,
      name: 'Main Branch'
    });

    return conversation;
  }

  /**
   * Get all conversations for a user
   */
  static async getUserConversations(userId: string): Promise<Conversation[]> {
    return await db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, userId))
      .orderBy(desc(conversations.updatedAt));
  }

  /**
   * Get all branches for a conversation
   */
  static async getConversationBranches(conversationId: string): Promise<Branch[]> {
    return await db
      .select()
      .from(branches)
      .where(eq(branches.conversationId, conversationId))
      .orderBy(asc(branches.createdAt));
  }

  /**
   * Get all messages in a branch
   */
  static async getBranchMessages(branchId: string): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.branchId, branchId))
      .orderBy(asc(messages.createdAt));
  }

  /**
   * Add a message to a branch
   */
  static async addMessage(branchId: string, role: 'user' | 'assistant', content: string, parentId?: string): Promise<Message> {
    const [message] = await db
      .insert(messages)
      .values({
        branchId,
        role,
        content,
        parentId
      })
      .returning();

    // Update conversation updated_at timestamp - simplified approach
    try {
      const [branch] = await db
        .select({ conversationId: branches.conversationId })
        .from(branches)
        .where(eq(branches.id, branchId))
        .limit(1);

      if (branch) {
        await db
          .update(conversations)
          .set({ updatedAt: new Date() })
          .where(eq(conversations.id, branch.conversationId));
      }
    } catch (error) {
      console.error('Failed to update conversation timestamp:', error);
      // Don't fail the message insertion if timestamp update fails
    }

    return message;
  }

  /**
   * Fork a conversation from a specific message
   * This creates a new branch with all messages up to that point
   */
  static async forkFromMessage(
    conversationId: string, 
    messageId: string, 
    branchName?: string
  ): Promise<{ branch: Branch; messages: Message[] }> {
    // Get the source branch and message
    const sourceMessage = await db
      .select()
      .from(messages)
      .where(eq(messages.id, messageId))
      .limit(1);

    if (!sourceMessage.length) {
      throw new Error('Source message not found');
    }

    const sourceBranchId = sourceMessage[0].branchId;
    
    // Get all messages up to and including the source message
    const allMessages = await this.getBranchMessages(sourceBranchId);
    const messageIndex = allMessages.findIndex(m => m.id === messageId);
    
    if (messageIndex === -1) {
      throw new Error('Message not found in source branch');
    }

    // Get the source branch to determine parent branch
    const sourceBranch = await db
      .select()
      .from(branches)
      .where(eq(branches.id, sourceBranchId))
      .limit(1);

    // Create new branch
    const [newBranch] = await db
      .insert(branches)
      .values({
        conversationId,
        parentBranchId: sourceBranchId,
        name: branchName || `Fork from ${sourceMessage[0].role} message`
      })
      .returning();

    // Copy messages up to the fork point
    const messagesToCopy = allMessages.slice(0, messageIndex + 1);
    const copiedMessages: Message[] = [];

    for (const msg of messagesToCopy) {
      const [copiedMessage] = await db
        .insert(messages)
        .values({
          branchId: newBranch.id,
          role: msg.role,
          content: msg.content,
          parentId: msg.parentId,
          isEdited: msg.isEdited,
          originalContent: msg.originalContent
        })
        .returning();
      
      copiedMessages.push(copiedMessage);
    }

    return { branch: newBranch, messages: copiedMessages };
  }

  /**
   * Edit a user message and fork the conversation
   */
  static async editUserMessage(
    messageId: string, 
    newContent: string, 
    branchName?: string
  ): Promise<{ branch: Branch; messages: Message[] }> {
    // Get the message to edit
    const [message] = await db
      .select()
      .from(messages)
      .where(eq(messages.id, messageId))
      .limit(1);

    if (!message) {
      throw new Error('Message not found');
    }

    if (message.role !== 'user') {
      throw new Error('Can only edit user messages');
    }

    // Get the conversation ID
    const [branch] = await db
      .select({ conversationId: branches.conversationId })
      .from(branches)
      .where(eq(branches.id, message.branchId))
      .limit(1);

    // Fork from the parent message (if exists) or from the beginning
    const forkFromId = message.parentId || messageId;
    const result = await this.forkFromMessage(branch.conversationId, forkFromId, branchName);

    // Update the forked message with new content
    await db
      .update(messages)
      .set({
        content: newContent,
        isEdited: true,
        originalContent: message.content
      })
      .where(eq(messages.id, result.messages[result.messages.length - 1].id));

    // Remove any subsequent messages in the new branch
    await db
      .delete(messages)
      .where(eq(messages.branchId, result.branch.id));

    // Re-add the edited message
    const [editedMessage] = await db
      .insert(messages)
      .values({
        branchId: result.branch.id,
        role: 'user',
        content: newContent,
        parentId: result.messages[result.messages.length - 2]?.id, // Parent of the edited message
        isEdited: true,
        originalContent: message.content
      })
      .returning();

    result.messages = result.messages.slice(0, -1); // Remove the old version
    result.messages.push(editedMessage);

    return result;
  }

  /**
   * Regenerate an AI response and fork the conversation
   */
  static async regenerateAIResponse(
    messageId: string, 
    newContent: string, 
    branchName?: string
  ): Promise<{ branch: Branch; messages: Message[] }> {
    // Get the message to regenerate
    const [message] = await db
      .select()
      .from(messages)
      .where(eq(messages.id, messageId))
      .limit(1);

    if (!message) {
      throw new Error('Message not found');
    }

    if (message.role !== 'assistant') {
      throw new Error('Can only regenerate assistant messages');
    }

    // Get the conversation ID
    const [branch] = await db
      .select({ conversationId: branches.conversationId })
      .from(branches)
      .where(eq(branches.id, message.branchId))
      .limit(1);

    // Fork from the parent message (if exists) or from the beginning
    const forkFromId = message.parentId || messageId;
    const result = await this.forkFromMessage(branch.conversationId, forkFromId, branchName);

    // Remove any subsequent messages in the new branch
    await db
      .delete(messages)
      .where(eq(messages.branchId, result.branch.id));

    // Re-add the messages up to the regeneration point
    const messagesToKeep = result.messages.slice(0, -1); // Remove the old AI message
    result.messages = messagesToKeep;

    // Add the regenerated AI message
    const [regeneratedMessage] = await db
      .insert(messages)
      .values({
        branchId: result.branch.id,
        role: 'assistant',
        content: newContent,
        parentId: messagesToKeep[messagesToKeep.length - 1]?.id
      })
      .returning();

    result.messages.push(regeneratedMessage);

    return result;
  }

  /**
   * Get conversation tree structure
   */
  static async getConversationTree(conversationId: string) {
    const branches = await this.getConversationBranches(conversationId);
    const tree = [];

    for (const branch of branches) {
      const messages = await this.getBranchMessages(branch.id);
      tree.push({
        branch,
        messages,
        childBranches: branches.filter(b => b.parentBranchId === branch.id)
      });
    }

    return tree;
  }

  /**
   * Delete a branch and all its messages
   */
  static async deleteBranch(branchId: string): Promise<void> {
    await db.delete(branches).where(eq(branches.id, branchId));
  }

  /**
   * Rename a branch
   */
  static async renameBranch(branchId: string, newName: string): Promise<Branch> {
    const [branch] = await db
      .update(branches)
      .set({ name: newName })
      .where(eq(branches.id, branchId))
      .returning();

    return branch;
  }
}
