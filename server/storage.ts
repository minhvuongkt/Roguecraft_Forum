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
  
  // Chat operations
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  getChatMessagesByDateRange(days: number): Promise<ChatMessage[]>;
  deleteChatMessagesOlderThan(days: number): Promise<void>;
  
  // Forum operations
  createTopic(topic: InsertTopic): Promise<Topic>;
  getTopics(limit?: number, offset?: number, category?: string): Promise<Topic[]>;
  getTopicById(id: number): Promise<Topic | undefined>;
  incrementTopicViews(id: number): Promise<void>;
  toggleTopicLike(id: number, increment: boolean): Promise<void>;
  
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
  
  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userId++;
    const createdAt = new Date();
    const lastActive = new Date();
    
    const user: User = { 
      ...insertUser, 
      id, 
      createdAt, 
      lastActive,
    };
    
    this.users.set(id, user);
    return user;
  }
  
  async updateUserLastActive(id: number): Promise<void> {
    const user = this.users.get(id);
    if (user) {
      user.lastActive = new Date();
      this.users.set(id, user);
    }
  }
  
  // Chat operations
  async createChatMessage(insertMessage: InsertChatMessage): Promise<ChatMessage> {
    const id = this.messageId++;
    const createdAt = new Date();
    
    const message: ChatMessage = {
      ...insertMessage,
      id,
      createdAt,
    };
    
    this.chatMessages.set(id, message);
    return message;
  }
  
  async getChatMessagesByDateRange(days: number): Promise<ChatMessage[]> {
    const now = new Date();
    const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    
    return Array.from(this.chatMessages.values())
      .filter(message => message.createdAt >= cutoffDate)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }
  
  async deleteChatMessagesOlderThan(days: number): Promise<void> {
    const now = new Date();
    const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    
    for (const [id, message] of this.chatMessages.entries()) {
      if (message.createdAt < cutoffDate) {
        this.chatMessages.delete(id);
      }
    }
  }
  
  // Forum operations
  async createTopic(insertTopic: InsertTopic): Promise<Topic> {
    const id = this.topicId++;
    const createdAt = new Date();
    
    const topic: Topic = {
      ...insertTopic,
      id,
      createdAt,
      viewCount: 0,
      likeCount: 0,
    };
    
    this.topics.set(id, topic);
    return topic;
  }
  
  async getTopics(limit: number = 10, offset: number = 0, category?: string): Promise<Topic[]> {
    let topics = Array.from(this.topics.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
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
    if (topic) {
      topic.viewCount += 1;
      this.topics.set(id, topic);
    }
  }
  
  async toggleTopicLike(id: number, increment: boolean): Promise<void> {
    const topic = this.topics.get(id);
    if (topic) {
      topic.likeCount += increment ? 1 : -1;
      this.topics.set(id, topic);
    }
  }
  
  // Comment operations
  async createComment(insertComment: InsertComment): Promise<Comment> {
    const id = this.commentId++;
    const createdAt = new Date();
    
    const comment: Comment = {
      ...insertComment,
      id,
      createdAt,
    };
    
    this.comments.set(id, comment);
    return comment;
  }
  
  async getCommentsByTopicId(topicId: number): Promise<Comment[]> {
    return Array.from(this.comments.values())
      .filter(comment => comment.topicId === topicId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }
}

import { DatabaseStorage } from './databaseStorage';

// Use database storage instead of memory storage
export const storage = new DatabaseStorage();
