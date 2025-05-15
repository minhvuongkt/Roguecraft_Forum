import { storage } from "./storage";
import { InsertChatMessage, InsertUser, User } from "@shared/schema";
import * as schedule from "node:timers/promises";

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
    const newMessage = await storage.createChatMessage(message);
    
    // Get user info
    const user = newMessage.userId 
      ? await storage.getUser(newMessage.userId)
      : undefined;
    
    if (newMessage.userId) {
      await storage.updateUserLastActive(newMessage.userId);
    }
    
    return {
      ...newMessage,
      user: user ? {
        id: user.id,
        username: user.username,
        avatar: user.avatar
      } : null
    };
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
