import express, { type Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer } from "ws";
import { storage } from "./storage";
import { WebSocketHandler } from "./websocketHandler";
import { chatService } from "./chatService";
import { forumService } from "./forumService";
import { z } from "zod";
import { insertChatMessageSchema, insertUserSchema, insertTopicSchema, insertCommentSchema, WebSocketMessageType, comments, topics, chatMessages, users, topicLikes } from "@shared/schema";
import { db } from "./db";
import { and, eq, desc, count, sql } from "drizzle-orm";
import uploadRoutes from "./routes/uploads";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // Initialize WebSocket server
  const wsHandler = new WebSocketHandler(httpServer);
  
  // Register upload routes
  app.use('/api/uploads', uploadRoutes);
  
  // Serve static files from public directory
  app.use('/chat-images', (req, res, next) => {
    // Add cache control headers for images
    res.setHeader('Cache-Control', 'public, max-age=86400');
    next();
  }, express.static('public/chat-images'));
  
  app.use('/topic-images', (req, res, next) => {
    // Add cache control headers for images
    res.setHeader('Cache-Control', 'public, max-age=86400');
    next();
  }, express.static('public/topic-images'));
  
  // Setup periodic broadcast of online users
  setInterval(async () => {
    console.log("Broadcasting online users");
    const onlineUsersMessage = {
      type: WebSocketMessageType.USER_STATUS,
      payload: { users: [] } // This will be filled by the handler
    };
    await wsHandler.broadcast(onlineUsersMessage);
  }, 10000);
  
  // User Routes
  app.post('/api/auth/register', async (req: Request, res: Response) => {
    try {
      const validatedData = insertUserSchema
        .extend({
          password: z.string().min(6, "Password must be at least 6 characters"),
        })
        .parse(req.body);
      
      const user = await chatService.createPermanentUser(
        validatedData.username,
        validatedData.password as string
      );
      
      res.status(201).json({
        id: user.id,
        username: user.username,
        avatar: user.avatar,
        isTemporary: user.isTemporary
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(400).json({ message: (error as Error).message });
    }
  });
  
  app.post('/api/auth/temp-user', async (req: Request, res: Response) => {
    try {
      const { username } = req.body;
      
      if (!username || typeof username !== 'string') {
        return res.status(400).json({ message: 'Username is required' });
      }
      
      const user = await chatService.createTemporaryUser(username);
      
      res.status(201).json({
        id: user.id,
        username: user.username,
        avatar: user.avatar,
        isTemporary: user.isTemporary
      });
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });
  
  // Chat Routes
  app.get('/api/chat/messages', async (req: Request, res: Response) => {
    try {
      const days = req.query.days ? parseInt(req.query.days as string) : 3;
      const messages = await chatService.getRecentMessages(days);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch messages' });
    }
  });
  
  // Forum Routes
  app.get('/api/forum/topics', async (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
      const category = req.query.category as string;
      
      const topics = await forumService.getTopics(limit, offset, category);
      res.json(topics);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch topics' });
    }
  });
  
  app.get('/api/forum/topics/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const topic = await forumService.getTopicById(id);
      
      if (!topic) {
        return res.status(404).json({ message: 'Topic not found' });
      }
      
      res.json(topic);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch topic' });
    }
  });
  
  app.post('/api/forum/topics/:id/view', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      // Check if topic exists
      const topic = await storage.getTopicById(id);
      if (!topic) {
        return res.status(404).json({ message: 'Topic not found' });
      }
      
      await storage.incrementTopicViews(id);
      res.status(200).json({ success: true });
    } catch (error) {
      res.status(400).json({ message: 'Failed to update view count' });
    }
  });
  
  app.get('/api/forum/topics/:id/comments', async (req: Request, res: Response) => {
    try {
      const topicId = parseInt(req.params.id);
      
      // Check if topic exists
      const topic = await storage.getTopicById(topicId);
      if (!topic) {
        return res.status(404).json({ message: 'Topic not found' });
      }
      
      const comments = await storage.getCommentsByTopicId(topicId);
      res.json(comments);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch comments' });
    }
  });
  
  app.post('/api/forum/topics', async (req: Request, res: Response) => {
    try {
      const validatedData = insertTopicSchema.parse(req.body);
      const topic = await forumService.createTopic(validatedData);
      res.status(201).json(topic);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(400).json({ message: 'Failed to create topic' });
    }
  });
  
  app.post('/api/forum/topics/:id/comments', async (req: Request, res: Response) => {
    try {
      const topicId = parseInt(req.params.id);
      
      // Check if topic exists
      const topic = await storage.getTopicById(topicId);
      if (!topic) {
        return res.status(404).json({ message: 'Topic not found' });
      }
      
      // Add a parentCommentId check before schema validation to fix type errors
      if (req.body.parentCommentId !== undefined && req.body.parentCommentId !== null) {
        // Check if the parent comment exists
        const [parentComment] = await db.select()
          .from(comments)
          .where(
            and(
              eq(comments.id, parseInt(req.body.parentCommentId)),
              eq(comments.topicId, topicId)
            )
          );
        
        if (!parentComment) {
          return res.status(404).json({ message: 'Parent comment not found or does not belong to this topic' });
        }
      }
      
      // Now validate the data
      const validatedData = insertCommentSchema
        .omit({ topicId: true })
        .parse(req.body);
      
      const comment = await forumService.createComment({
        ...validatedData,
        topicId
      });
      
      // After creating a comment, return all comments for the topic to update the UI
      const allComments = await storage.getCommentsByTopicId(topicId);
      
      res.status(201).json({
        newComment: comment,
        allComments
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(400).json({ message: 'Failed to create comment' });
    }
  });
  
  app.post('/api/forum/topics/:id/like', async (req: Request, res: Response) => {
    try {
      const topicId = parseInt(req.params.id);
      const { action, userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({ message: 'User ID is required' });
      }
      
      // Check if topic exists
      const topic = await storage.getTopicById(topicId);
      if (!topic) {
        return res.status(404).json({ message: 'Topic not found' });
      }
      
      if (action !== 'like' && action !== 'unlike') {
        return res.status(400).json({ message: 'Invalid action. Use "like" or "unlike"' });
      }
      
      let success;
      if (action === 'like') {
        success = await storage.addTopicLike(topicId, userId);
      } else {
        success = await storage.removeTopicLike(topicId, userId);
      }
      
      const userHasLiked = await storage.getTopicLike(topicId, userId);
      
      res.status(200).json({ 
        success,
        userHasLiked 
      });
    } catch (error) {
      console.error('Error handling topic like:', error);
      res.status(400).json({ message: 'Failed to update like status' });
    }
  });
  
  // Check if user has liked a topic
  app.get('/api/forum/topics/:id/like/:userId', async (req: Request, res: Response) => {
    try {
      const topicId = parseInt(req.params.id);
      const userId = parseInt(req.params.userId);
      
      if (isNaN(topicId) || isNaN(userId)) {
        return res.status(400).json({ message: 'Invalid topic ID or user ID' });
      }
      
      const userHasLiked = await storage.getTopicLike(topicId, userId);
      
      res.status(200).json({ userHasLiked });
    } catch (error) {
      console.error('Error checking topic like:', error);
      res.status(400).json({ message: 'Failed to check like status' });
    }
  });
  
  // User profile endpoint
  app.get('/api/users/:id', async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: 'Invalid user ID' });
      }
      
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Return user without password
      const { password, ...userWithoutPassword } = user;
      
      // Get user's topics
      const userTopics = await db.select({
        id: topics.id,
        title: topics.title,
        category: topics.category,
        createdAt: topics.createdAt,
        viewCount: topics.viewCount,
        likeCount: topics.likeCount,
        commentCount: topics.commentCount,
      })
      .from(topics)
      .where(eq(topics.userId, userId))
      .orderBy(desc(topics.createdAt))
      .limit(5);
      
      // Get user's total message count
      const messageCountResult = await db.select({
        count: sql<number>`count(*)`
      })
      .from(chatMessages)
      .where(eq(chatMessages.userId, userId));
      
      // Get user's total topic count (more accurate than just the limited results)
      const topicCountResult = await db.select({
        count: sql<number>`count(*)`
      })
      .from(topics)
      .where(eq(topics.userId, userId));
      
      res.json({
        user: userWithoutPassword,
        topics: userTopics,
        stats: {
          messageCount: messageCountResult[0]?.count || 0,
          topicCount: topicCountResult[0]?.count || 0
        }
      });
    } catch (error) {
      console.error('Error fetching user profile:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  return httpServer;
}
