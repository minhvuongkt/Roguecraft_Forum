import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer } from "ws";
import { storage } from "./storage";
import { WebSocketHandler } from "./websocketHandler";
import { chatService } from "./chatService";
import { forumService } from "./forumService";
import { z } from "zod";
import { insertChatMessageSchema, insertUserSchema, insertTopicSchema, insertCommentSchema, WebSocketMessageType, comments } from "@shared/schema";
import { db } from "./db";
import { and, eq } from "drizzle-orm";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // Initialize WebSocket server
  const wsHandler = new WebSocketHandler(httpServer);
  
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
      
      const validatedData = insertCommentSchema
        .omit({ topicId: true })
        .parse(req.body);
        
      // If this is a reply, check if the parent comment exists and belongs to this topic
      if (validatedData.parentCommentId) {
        const [parentComment] = await db.select()
          .from(comments)
          .where(
            and(
              eq(comments.id, validatedData.parentCommentId),
              eq(comments.topicId, topicId)
            )
          );
          
        if (!parentComment) {
          return res.status(404).json({ message: 'Parent comment not found or does not belong to this topic' });
        }
      }
      
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

  return httpServer;
}
