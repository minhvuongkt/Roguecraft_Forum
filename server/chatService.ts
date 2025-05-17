import { storage } from "./storage";
import { InsertChatMessage, InsertUser, User } from "@shared/schema";

export class ChatService {
  private static instance: ChatService;

  private constructor() {
    // Set up scheduled task to delete old messages
    this.setupCleanupTask();
  }

  static getInstance(): ChatService {
    if (!ChatService.instance) {
      ChatService.instance = new ChatService();
    }
    return ChatService.instance;
  }

  private async setupCleanupTask() {
    // Run cleanup every 12 hours
    const runCleanup = async () => {
      try {
        await this.cleanupOldMessages();
        // Schedule next run after 12 hours
        setTimeout(runCleanup, 12 * 60 * 60 * 1000);
      } catch (error) {
        console.error("Error during chat message cleanup:", error);
        // Retry after 1 hour on failure
        setTimeout(runCleanup, 60 * 60 * 1000);
      }
    };

    // Start the cleanup cycle
    setTimeout(runCleanup, 1000); // Start first cleanup after 1 second
  }

  async getRecentMessages(days: number = 3): Promise<any[]> {
    // Messages already have user data joined from database
    const messages = await storage.getChatMessagesByDateRange(days);

    // Ensure correct date format for frontend
    return messages.map(message => ({
      ...message,
      // Return ISO string to ensure consistent parsing on frontend
      createdAt: message.createdAt instanceof Date 
        ? message.createdAt.toISOString() 
        : message.createdAt
    }));
  }

  async createMessage(message: InsertChatMessage): Promise<any> {
    console.log('Creating chat message:', {
      content: message.content,
      userId: message.userId,
      replyToMessageId: message.replyToMessageId,
      replyToMessageIdType: typeof message.replyToMessageId,
      hasMedia: !!message.media
    });

    // Simple replyToMessageId validation
    let finalReplyId = null;
    if (message.replyToMessageId) {
      const replyId = Number(message.replyToMessageId);
      if (!isNaN(replyId) && replyId > 0) {
        finalReplyId = replyId;
      }
    }

    // Debug logging
    if (finalReplyId !== null) {
      console.log(`Reply ID validated and ready for database: ${finalReplyId}`);
    }

    console.log('Final reply ID:', {
      original: message.replyToMessageId,
      processed: finalReplyId,
      type: typeof finalReplyId
    });

    console.log('Processed replyToMessageId:', {
      original: message.replyToMessageId,
      final: finalReplyId,
      type: typeof finalReplyId
    });

    // Ensure media is in correct format
    let mediaData = message.media;

    if (message.media) {
      // If media is a string, convert to JSON
      if (typeof message.media === 'string') {
        try {
          mediaData = JSON.parse(message.media);
          console.log('Converted string media to JSON:', mediaData);
        } catch (e) {
          console.error('Failed to parse media string:', e);
          // Keep as is if parsing fails
        }
      } else {
        console.log('Media is already an object:', mediaData);
      }
    }

    // Make sure message has the right format
    const processedMessage: InsertChatMessage = {
      ...message,
      media: mediaData,
      replyToMessageId: finalReplyId
    };

    console.log('Final processed message media:', JSON.stringify(processedMessage.media, null, 2));

    try {
      // Create message in database
      const newMessage = await storage.createChatMessage(processedMessage);

      // Get user info
      const user = newMessage.userId
        ? await storage.getUser(newMessage.userId)
        : undefined;

      if (newMessage.userId) {
        await storage.updateUserLastActive(newMessage.userId);
      }

      // Log the created message for debugging
      console.log('New message created in database:', JSON.stringify({
        id: newMessage.id,
        content: newMessage.content,
        media: newMessage.media
      }, null, 2));

      return {
        ...newMessage,
        user: user ? {
          id: user.id,
          username: user.username,
          avatar: user.avatar
        } : null
      };
    } catch (error) {
      console.error('Error creating chat message:', error);
      throw new Error('Failed to create message in database');
    }
  }

  async cleanupOldMessages(): Promise<void> {
    // Delete messages older than 4 days
    await storage.deleteChatMessagesOlderThan(4);
  }

  async createTemporaryUser(username: string): Promise<User> {
    // Check if user already exists
    const existingUser = await storage.getUserByUsername(username);
    if (existingUser) {
      // Update last active time
      await storage.updateUserLastActive(existingUser.id);
      return existingUser;
    }

    // Create new temporary user
    const user: InsertUser = {
      username,
      password: null, // Temporary users don't have passwords
      avatar: null,
      isTemporary: true,
    };

    return await storage.createUser(user);
  }

  async createPermanentUser(username: string, password: string): Promise<User> {
    // Check if username already exists
    const existingUser = await storage.getUserByUsername(username);
    if (existingUser) {
      throw new Error("Username already exists");
    }

    // Create new permanent user
    const user: InsertUser = {
      username,
      password,
      avatar: null,
      isTemporary: false,
    };

    return await storage.createUser(user);
  }
}

export const chatService = ChatService.getInstance();