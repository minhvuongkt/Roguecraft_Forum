import { IStorage } from './storage';
import { db } from './db';
import { users, topics, comments, chatMessages, topicLikes } from '@shared/schema';
import { 
  InsertUser, User, 
  InsertTopic, Topic, 
  InsertComment, Comment, 
  InsertChatMessage, ChatMessage,
  InsertTopicLike, TopicLike 
} from '@shared/schema';
import { eq, and, gte, lt, desc, asc, sql } from 'drizzle-orm';

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUserLastActive(id: number): Promise<void> {
    await db.update(users)
      .set({ lastActive: new Date() })
      .where(eq(users.id, id));
  }

  // Chat operations
  async createChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    const [createdMessage] = await db.insert(chatMessages).values(message).returning();
    return createdMessage;
  }

  async getChatMessagesByDateRange(days: number): Promise<ChatMessage[]> {
    const date = new Date();
    date.setDate(date.getDate() - days);

    const messages = await db.select({
      chat_messages: chatMessages,
      users: users
    })
    .from(chatMessages)
    .leftJoin(users, eq(chatMessages.userId, users.id))
    .where(gte(chatMessages.createdAt, date))
    .orderBy(desc(chatMessages.createdAt));

    return messages.map(row => ({
      ...row.chat_messages,
      user: row.users ? {
        id: row.users.id,
        username: row.users.username,
        avatar: row.users.avatar
      } : null
    }));
  }

  async deleteChatMessagesOlderThan(days: number): Promise<void> {
    const date = new Date();
    date.setDate(date.getDate() - days);

    // Use lt (less than) operator from drizzle-orm
    await db.delete(chatMessages)
      .where(and(lt(chatMessages.createdAt, date)));
  }

  // Forum operations
  async createTopic(topic: InsertTopic): Promise<Topic> {
    const [createdTopic] = await db.insert(topics).values(topic).returning();
    return createdTopic;
  }

  async getTopics(limit: number = 10, offset: number = 0, category?: string): Promise<Topic[]> {
    let baseQuery = db.select({
      topics: topics,
      users: users
    })
    .from(topics)
    .leftJoin(users, eq(topics.userId, users.id))
    .orderBy(desc(topics.createdAt))
    .limit(limit)
    .offset(offset);

    let result;
    if (category) {
      result = await baseQuery.where(eq(topics.category, category));
    } else {
      result = await baseQuery;
    }

    return result.map(row => ({
      ...row.topics,
      user: row.users ? {
        id: row.users.id,
        username: row.users.username,
        avatar: row.users.avatar
      } : null
    }));
  }

  async getTopicById(id: number): Promise<Topic | undefined> {
    const [result] = await db.select({
      topics: topics,
      users: users
    })
    .from(topics)
    .leftJoin(users, eq(topics.userId, users.id))
    .where(eq(topics.id, id));

    if (!result) return undefined;

    return {
      ...result.topics,
      user: result.users ? {
        id: result.users.id,
        username: result.users.username,
        avatar: result.users.avatar
      } : null
    };
  }

  async incrementTopicViews(id: number): Promise<void> {
    await db.execute(
      sql`UPDATE ${topics} SET view_count = view_count + 1 WHERE id = ${id}`
    );
  }

  async toggleTopicLike(id: number, increment: boolean): Promise<void> {
    if (increment) {
      await db.execute(
        sql`UPDATE ${topics} SET like_count = like_count + 1 WHERE id = ${id}`
      );
    } else {
      await db.execute(
        sql`UPDATE ${topics} SET like_count = like_count - 1 WHERE id = ${id}`
      );
    }
  }

  // Topic Likes operations
  async addTopicLike(topicId: number, userId: number): Promise<boolean> {
    try {
      // Check if the like already exists
      const existingLike = await this.getTopicLike(topicId, userId);
      if (existingLike) {
        return false; // User already liked this topic
      }
      
      // Add the like
      await db.insert(topicLikes).values({
        topicId,
        userId
      });
      
      // Increment like count
      await this.toggleTopicLike(topicId, true);
      
      return true;
    } catch (error) {
      console.error('Error adding topic like:', error);
      return false;
    }
  }
  
  async removeTopicLike(topicId: number, userId: number): Promise<boolean> {
    try {
      // Check if the like exists
      const existingLike = await this.getTopicLike(topicId, userId);
      if (!existingLike) {
        return false; // User hasn't liked this topic
      }
      
      // Remove the like
      await db.delete(topicLikes)
        .where(
          and(
            eq(topicLikes.topicId, topicId),
            eq(topicLikes.userId, userId)
          )
        );
      
      // Decrement like count
      await this.toggleTopicLike(topicId, false);
      
      return true;
    } catch (error) {
      console.error('Error removing topic like:', error);
      return false;
    }
  }
  
  async getTopicLike(topicId: number, userId: number): Promise<boolean> {
    const [like] = await db.select()
      .from(topicLikes)
      .where(
        and(
          eq(topicLikes.topicId, topicId),
          eq(topicLikes.userId, userId)
        )
      );
    
    return !!like;
  }

  // Comment operations
  async createComment(comment: InsertComment): Promise<Comment> {
    const [createdComment] = await db.insert(comments).values(comment).returning();
    return createdComment;
  }

  async getCommentsByTopicId(topicId: number): Promise<Comment[]> {
    const result = await db.select({
      comments: comments,
      users: users
    })
    .from(comments)
    .leftJoin(users, eq(comments.userId, users.id))
    .where(eq(comments.topicId, topicId))
    .orderBy(asc(comments.createdAt)); // Sort by createdAt ascending for chronological order

    // Map to add user info
    const allComments = result.map(row => ({
      ...row.comments,
      user: row.users ? {
        id: row.users.id,
        username: row.users.username,
        avatar: row.users.avatar
      } : null,
      replies: [] // Initialize replies array
    }));

    // Create a map for quick lookup
    const commentMap = new Map();
    allComments.forEach(comment => {
      commentMap.set(comment.id, comment);
    });

    // Build the hierarchical structure
    const rootComments: any[] = [];
    allComments.forEach(comment => {
      if (comment.parentCommentId) {
        // This is a reply, add it to its parent's replies
        const parentComment = commentMap.get(comment.parentCommentId);
        if (parentComment) {
          parentComment.replies.push(comment);
        } else {
          // If parent doesn't exist (shouldn't happen), treat as root
          rootComments.push(comment);
        }
      } else {
        // This is a root comment
        rootComments.push(comment);
      }
    });

    return rootComments;
  }
}