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
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUserLastActive(id: number): Promise<void> {
    await db.update(users)
      .set({ lastActive: new Date() })
      .where(eq(users.id, id));
  }

  async updateUserProfile(id: number, updates: Partial<InsertUser>): Promise<User> {
    const [updatedUser] = await db.update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();

    return updatedUser;
  }

  async updateUserPassword(id: number, newPassword: string): Promise<boolean> {
    const result = await db.update(users)
      .set({ password: newPassword })
      .where(eq(users.id, id));

    return true; // Phương thức trả về boolean thành công
  }

  async updateUserAvatar(id: number, avatarUrl: string): Promise<User> {
    const [updatedUser] = await db.update(users)
      .set({ avatar: avatarUrl })
      .where(eq(users.id, id))
      .returning();

    return updatedUser;
  }

  // Chat operations
  async createChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    console.log("Creating chat message in database with media:", JSON.stringify(message.media, null, 2));

    try {
      // 1. Đảm bảo định dạng message đúng trước khi lưu
      let finalMedia = message.media;

      // Kiểm tra và sửa đường dẫn nếu cần
      if (finalMedia && typeof finalMedia === 'object') {
        const hasTopicImage = Object.values(finalMedia).some(
          path => typeof path === 'string' && path.toString().includes('/topic-images/')
        );

        if (hasTopicImage) {
          console.warn("Warning: Found topic-images path in chat message, fixing this");

          const fixedMedia: Record<string, string> = {};
          Object.entries(finalMedia).forEach(([key, value]) => {
            if (typeof value === 'string' && value.includes('/topic-images/')) {
              // Tạo tên file mới trong chat-images
              const originalFileName = value.split('/').pop() || 'unknown.jpg';
              const newPath = `/chat-images/chat-${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(originalFileName)}`;
              fixedMedia[key] = newPath;
              console.log(`Fixed media path from ${value} to ${newPath}`);
            } else {
              fixedMedia[key] = value as string;
            }
          });
          finalMedia = fixedMedia;
        }
      }

      // 2. Xử lý replyToMessageId
      let finalReplyToMessageId: number | null = null;
      
      if (message.replyToMessageId !== undefined && message.replyToMessageId !== null) {
        // Đảm bảo là số
        const replyId = Number(message.replyToMessageId);
        if (!isNaN(replyId)) {
          finalReplyToMessageId = replyId;
          
          // Kiểm tra xem message được trả lời có tồn tại không
          const [originalMessage] = await db.select()
            .from(chatMessages)
            .where(eq(chatMessages.id, finalReplyToMessageId));
            
          if (!originalMessage) {
            console.warn(`Reply to non-existent message ID: ${finalReplyToMessageId}`);
            finalReplyToMessageId = null;
          }
        }
      }

      // 3. Chuẩn bị message để lưu
      const messageToInsert = {
        ...message,
        content: message.content?.trim() || "",
        media: finalMedia,
        replyToMessageId: finalReplyToMessageId,
        mentions: Array.isArray(message.mentions) ? message.mentions : []
      };

      // 4. Lưu vào database
      console.log("Inserting message into database:", {
        content: messageToInsert.content,
        userId: messageToInsert.userId,
        replyToMessageId: messageToInsert.replyToMessageId
      });
      
      const [createdMessage] = await db.insert(chatMessages)
        .values(messageToInsert)
        .returning();

      console.log("Chat message created in database:", JSON.stringify({
        id: createdMessage.id,
        content: createdMessage.content,
        media: createdMessage.media
      }, null, 2));

      return createdMessage;
    } catch (error) {
      console.error("Error creating chat message:", error);
      throw new Error(`Failed to save chat message: ${error.message}`);
    }
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
    console.log("Creating topic with media:", JSON.stringify(topic.media, null, 2));

    // Đảm bảo định dạng topic đúng trước khi lưu
    const topicToInsert = {
      ...topic,
      // Đảm bảo media có định dạng đúng
      media: topic.media
    };

    const [createdTopic] = await db.insert(topics).values(topicToInsert).returning();

    console.log("Topic created in database:", JSON.stringify({
      id: createdTopic.id,
      title: createdTopic.title,
      media: createdTopic.media
    }, null, 2));

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
    // Start a transaction to ensure data consistency
    return await db.transaction(async (tx) => {
      // Insert the comment
      const [createdComment] = await tx.insert(comments).values(comment).returning();

      // Increment the comment count for the topic
      await tx.update(topics)
        .set({ commentCount: sql`${topics.commentCount} + 1` })
        .where(eq(topics.id, comment.topicId))
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
}