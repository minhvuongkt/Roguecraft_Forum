import { 
  User, InsertUser, 
  ChatMessage, InsertChatMessage,
  Topic, InsertTopic,
  Comment, InsertComment
} from "@shared/schema";

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserLastActive(id: number): Promise<void>;
  updateUserProfile(id: number, updates: Partial<InsertUser>): Promise<User>;
  updateUserPassword(id: number, newPassword: string): Promise<boolean>;
  updateUserAvatar(id: number, avatarUrl: string): Promise<User>;
  
  // Chat operations
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  getChatMessagesByDateRange(days: number): Promise<ChatMessage[]>;
  deleteChatMessagesOlderThan(days: number): Promise<void>;
  getChatMessageById(id: number): Promise<ChatMessage[]>;
  
  // Forum operations
  createTopic(topic: InsertTopic): Promise<Topic>;
  getTopics(limit?: number, offset?: number, category?: string): Promise<Topic[]>;
  getTopicById(id: number): Promise<Topic | undefined>;
  incrementTopicViews(id: number): Promise<void>;
  toggleTopicLike(id: number, increment: boolean): Promise<void>;
  
  // Topic Likes operations
  addTopicLike(topicId: number, userId: number): Promise<boolean>;
  removeTopicLike(topicId: number, userId: number): Promise<boolean>;
  getTopicLike(topicId: number, userId: number): Promise<boolean>;
  
  // Comment operations
  createComment(comment: InsertComment): Promise<Comment>;
  getCommentsByTopicId(topicId: number): Promise<Comment[]>;
}

// In-memory implementation
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private chatMessages: Map<number, ChatMessage>;
  private topics: Map<number, Topic>;
  private comments: Map<number, Comment>;
  
  private userId: number;
  private messageId: number;
  private topicId: number;
  private commentId: number;
  
  constructor() {
    this.users = new Map();
    this.chatMessages = new Map();
    this.topics = new Map();
    this.comments = new Map();
    
    this.userId = 1;
    this.messageId = 1;
    this.topicId = 1;
    this.commentId = 1;
  }
  
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username.toLowerCase() === username.toLowerCase()
    );
  }
  
  async createUser(user: InsertUser): Promise<User> {
    const id = this.userId++;
    const createdAt = new Date();
    const lastActive = new Date();
    const newUser: User = {
      id,
      username: user.username,
      password: user.password ?? null,
      avatar: user.avatar ?? null,
      isTemporary: user.isTemporary ?? false,
      createdAt,
      lastActive
    };
    this.users.set(id, newUser);
    return newUser;
  }
  
  async updateUserLastActive(id: number): Promise<void> {
    const user = this.users.get(id);
    if (user) {
      user.lastActive = new Date();
      this.users.set(id, user);
    }
  }
  
  async updateUserProfile(id: number, updates: Partial<InsertUser>): Promise<User> {
    const user = this.users.get(id);
    if (!user) throw new Error('User not found');
    const updated: User = {
      ...user,
      ...updates,
      password: updates.password ?? user.password ?? null,
      avatar: updates.avatar ?? user.avatar ?? null,
      isTemporary: updates.isTemporary ?? user.isTemporary ?? null,
    };
    this.users.set(id, updated);
    return updated;
  }
  async updateUserPassword(id: number, newPassword: string): Promise<boolean> {
    const user = this.users.get(id);
    if (!user) throw new Error('User not found');
    user.password = newPassword;
    this.users.set(id, user);
    return true;
  }
  async updateUserAvatar(id: number, avatarUrl: string): Promise<User> {
    const user = this.users.get(id);
    if (!user) throw new Error('User not found');
    user.avatar = avatarUrl;
    this.users.set(id, user);
    return user;
  }
  async addTopicLike(topicId: number, userId: number): Promise<boolean> { return true; }
  async removeTopicLike(topicId: number, userId: number): Promise<boolean> { return true; }
  async getTopicLike(topicId: number, userId: number): Promise<boolean> { return false; }

  // Chat operations
  async createChatMessage(insertMessage: InsertChatMessage): Promise<ChatMessage> {
    const id = this.messageId++;
    const createdAt = new Date();
    const mentions: string[] | null = Array.isArray(insertMessage.mentions)
      ? insertMessage.mentions.map(String)
      : null;
    const message: ChatMessage = {
      id,
      userId: insertMessage.userId ?? null,
      content: insertMessage.content,
      media: insertMessage.media ?? null,
      createdAt,
      mentions,
      replyToMessageId: insertMessage.replyToMessageId ?? null,
    };
    this.chatMessages.set(id, message);
    return message;
  }
  
  async getChatMessagesByDateRange(days: number): Promise<ChatMessage[]> {
    const now = new Date();
    const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    
    return Array.from(this.chatMessages.values())
      .filter(message => message.createdAt && message.createdAt >= cutoffDate)
      .sort((a, b) => {
        if (!a.createdAt || !b.createdAt) return 0;
        return a.createdAt.getTime() - b.createdAt.getTime();
      });
  }
  
  async deleteChatMessagesOlderThan(days: number): Promise<void> {
    const now = new Date();
    const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    
    for (const [id, message] of Array.from(this.chatMessages.entries())) {
      if (message.createdAt && message.createdAt < cutoffDate) {
        this.chatMessages.delete(id);
      }
    }
  }
  
  async getChatMessageById(id: number): Promise<ChatMessage[]> {
    const msg = this.chatMessages.get(id);
    return msg ? [msg] : [];
  }

  // Forum operations
  async createTopic(insertTopic: InsertTopic): Promise<Topic> {
    const id = this.topicId++;
    const createdAt = new Date();
    
    const topic: Topic = {
      id,
      userId: insertTopic.userId ?? null,
      content: insertTopic.content,
      title: insertTopic.title,
      category: insertTopic.category,
      media: insertTopic.media ?? null,
      isAnonymous: insertTopic.isAnonymous ?? null,
      createdAt,
      viewCount: 0,
      likeCount: 0,
      commentCount: 0,
    };
    
    this.topics.set(id, topic);
    return topic;
  }
  
  async getTopics(limit: number = 10, offset: number = 0, category?: string): Promise<Topic[]> {
    let topics = Array.from(this.topics.values())
      .sort((a, b) => {
        if (!a.createdAt || !b.createdAt) return 0;
        return b.createdAt.getTime() - a.createdAt.getTime();
      });
    
    if (category && category !== 'Tất cả') {
      topics = topics.filter(topic => topic.category === category);
    }
    
    return topics.slice(offset, offset + limit);
  }
  
  async getTopicById(id: number): Promise<Topic | undefined> {
    return this.topics.get(id);
  }
  
  async incrementTopicViews(id: number): Promise<void> {
    const topic = this.topics.get(id);
    if (topic && topic.viewCount !== null) {
      topic.viewCount += 1;
      this.topics.set(id, topic);
    }
  }
  
  async toggleTopicLike(id: number, increment: boolean): Promise<void> {
    const topic = this.topics.get(id);
    if (topic && topic.likeCount !== null) {
      topic.likeCount += increment ? 1 : -1;
      this.topics.set(id, topic);
    }
  }
  
  // Comment operations
  async createComment(insertComment: InsertComment): Promise<Comment> {
    // Workaround for Drizzle/zod type inference issue
    const c: any = insertComment;
    const id = this.commentId++;
    const createdAt = new Date();
    const comment: Comment = {
      id,
      topicId: c.topicId ?? null,
      userId: c.userId ?? null,
      content: c.content,
      media: c.media ?? null,
      isAnonymous: c.isAnonymous ?? false,
      parentCommentId: c.parentCommentId ?? null,
      createdAt
      // Do not add 'replies' property here; only add in DB implementation if needed
    };
    this.comments.set(id, comment);
    return comment;
  }
  
  async getCommentsByTopicId(topicId: number): Promise<Comment[]> {
    return Array.from(this.comments.values())
      .filter(comment => comment.topicId === topicId)
      .sort((a, b) => {
        if (!a.createdAt || !b.createdAt) return 0;
        return a.createdAt.getTime() - b.createdAt.getTime();
      });
  }
}

import { DatabaseStorage } from './databaseStorage';

// Use database storage instead of memory storage
export const storage = new DatabaseStorage();
