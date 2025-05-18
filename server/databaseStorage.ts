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
import path from 'path';
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
    const result = await db.insert(users).values(insertUser);
    const userId = Number(result[0].insertId);
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    return user;
  }

  async updateUserLastActive(id: number): Promise<void> {
    await db.update(users)
      .set({ lastActive: new Date() })
      .where(eq(users.id, id));
  }
  async updateUserProfile(id: number, updates: Partial<InsertUser>): Promise<User> {
    await db.update(users)
      .set(updates)
      .where(eq(users.id, id));

    const [updatedUser] = await db.select().from(users).where(eq(users.id, id));
    return updatedUser;
  }

  async updateUserPassword(id: number, newPassword: string): Promise<boolean> {
    const result = await db.update(users)
      .set({ password: newPassword })
      .where(eq(users.id, id));

    return true; // Phương thức trả về boolean thành công
  }

  async updateUserAvatar(id: number, avatarUrl: string): Promise<User> {
    await db.update(users)
      .set({ avatar: avatarUrl })
      .where(eq(users.id, id));

    const [updatedUser] = await db.select().from(users).where(eq(users.id, id));
    return updatedUser;
  }

  // Chat operations
  async createChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    // Parse and validate replyToMessageId
    let finalReplyToMessageId: number | null = null;
    if (message.replyToMessageId !== undefined && message.replyToMessageId !== null) {
      const parsed = Number(message.replyToMessageId);
      finalReplyToMessageId = Number.isInteger(parsed) && parsed > 0 ? parsed : null;
    }
    // Ensure mentions is string[] or null
    let mentions: string[] | null = null;
    if (Array.isArray(message.mentions)) {
      mentions = message.mentions.map(String);
    } else if (typeof message.mentions === 'string') {
      mentions = [message.mentions];
    }
    // Prepare message for DB insert
    const messageToInsert = {
      ...message,
      replyToMessageId: finalReplyToMessageId,
      content: message.content?.trim() || "",
      media: message.media ?? null,
      mentions,
    };
    // Insert into DB (MySQL2/Drizzle)
    const result = await db.insert(chatMessages).values(messageToInsert);
    const insertId = Number(result[0]?.insertId);
    const [createdMessage] = await db.select().from(chatMessages).where(eq(chatMessages.id, insertId));
    // Join user info
    const user = createdMessage.userId ? await this.getUser(createdMessage.userId) : null;
    return {
      ...createdMessage,
      user: user ? { id: user.id, username: user.username, avatar: user.avatar } : null
    } as ChatMessage;
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
    try {
      console.log("Creating topic with data:", JSON.stringify({
        userId: topic.userId,
        title: topic.title?.substring(0, 30) + (topic.title?.length > 30 ? "..." : ""),
        content: topic.content?.substring(0, 50) + (topic.content?.length > 50 ? "..." : ""),
        category: topic.category,
        isAnonymous: topic.isAnonymous,
        mediaType: topic.media ? typeof topic.media : 'null'
      }, null, 2));

      // Check for any missing required fields
      if (!topic.userId) {
        throw new Error("Missing required userId in topic creation");
      }
      if (!topic.title) {
        throw new Error("Missing required title in topic creation");
      }
      if (!topic.content) {
        throw new Error("Missing required content in topic creation");
      }
      
      // Use default category if not provided
      if (!topic.category) {
        console.warn("Missing category in topic creation, using default");
        topic.category = 'Tất cả';
      }

      // Ensure all fields have correct types and are properly sanitized
      const topicToInsert = {
        userId: Number(topic.userId),
        title: String(topic.title || "").trim().substring(0, 255), // Enforce DB limits
        content: String(topic.content || "").trim().substring(0, 10000), // Enforce DB limits
        category: String(topic.category || "Tất cả"),
        isAnonymous: Boolean(topic.isAnonymous),
        media: topic.media || null
      };
      
      // Drizzle MySQL does not support .returning(), so insert and then select
      console.log("Attempting to insert topic into database...");
      
      // Validate media format if present to prevent database errors
      if (topicToInsert.media) {
        if (typeof topicToInsert.media !== 'object') {
          console.warn("Converting media to null as it's not an object");
          topicToInsert.media = null;
        } else {
          // Ensure media is JSON serializable
          try {
            JSON.parse(JSON.stringify(topicToInsert.media));
          } catch (error) {
            console.error("Media is not serializable, setting to null:", error);
            topicToInsert.media = null;
          }
        }
      }
      
      const result = await db.insert(topics).values(topicToInsert);
      
      if (!result || !Array.isArray(result) || !result[0]?.insertId) {
        throw new Error("Failed to get insert ID from database: " + JSON.stringify(result));
      }
      
      const insertId = Number(result[0].insertId);
      console.log(`Topic inserted with ID: ${insertId}`);
      
      // Fetch the created topic
      const [createdTopic] = await db.select().from(topics).where(eq(topics.id, insertId));
      
      if (!createdTopic) {
        throw new Error(`Failed to retrieve created topic with ID: ${insertId}`);
      }

      console.log("Topic created in database:", JSON.stringify({
        id: createdTopic.id,
        title: createdTopic.title,
        category: createdTopic.category,
        isAnonymous: createdTopic.isAnonymous
      }, null, 2));
      
      return createdTopic;
    } catch (error) {
      console.error("Database error during topic creation:", error);
      throw new Error(`Failed to create topic in database: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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

    // Cast to Topic & add user info
    return {
      ...result.topics,
      user: result.users ? {
        id: result.users.id,
        username: result.users.username,
        avatar: result.users.avatar
      } : null
    } as Topic & { user: { id: number; username: string; avatar: string } | null };
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
    // Start a transaction to ensure data consistency
    return await db.transaction(async (tx) => {
      // Insert the comment
      const result = await tx.insert(comments).values(comment);
      const insertId = Number(result[0]?.insertId);
      const [createdComment] = await tx.select().from(comments).where(eq(comments.id, insertId));

      // Increment the comment count for the topic
      await tx.update(topics)
        .set({ commentCount: sql`comment_count + 1` })
        .where(eq((topics as any).id, (comment as any).topicId))
        .execute();

      return createdComment;
    });
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

  async getChatMessageById(id: number): Promise<ChatMessage[]> {
    // Select the chat message and join user info
    const result = await db.select({
      chat_message: chatMessages,
      user: users
    })
      .from(chatMessages)
      .leftJoin(users, eq(chatMessages.userId, users.id))
      .where(eq(chatMessages.id, id));

    // Map to expected format (array, for compatibility)
    return result.map(row => ({
      ...row.chat_message,
      user: row.user
        ? {
            id: row.user.id,
            username: row.user.username,
            avatar: row.user.avatar
          }
        : null
    }));
  }
}