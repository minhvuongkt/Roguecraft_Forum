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

  // Add comprehensive request and response logging for debugging
  app.use('/api', (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();

    console.log(`[REQUEST] ${req.method} ${req.originalUrl}`);
    if (Object.keys(req.body).length > 0) {
      console.log(`[REQUEST BODY] ${JSON.stringify(req.body)}`);
    }

    const originalSend = res.send;
    res.send = function (body) {
      const responseTime = Date.now() - startTime;
      const contentType = res.getHeader('content-type');
      console.log(`[RESPONSE] ${req.method} ${req.originalUrl} - Status: ${res.statusCode} - ${responseTime}ms - Content-Type: ${contentType}`);

      if (contentType && contentType.toString().includes('application/json')) {
        try {
          const bodyObj = typeof body === 'string' ? JSON.parse(body) : body;
          console.log(`[RESPONSE BODY] ${JSON.stringify(bodyObj)}`);
        } catch (error) {
          console.log(`[RESPONSE BODY] Non-JSON or Invalid JSON: ${body}`);
        }
      }

      return originalSend.call(res, body);
    };

    next();
  });

  // Register upload routes
  app.use('/api/uploads', uploadRoutes);

  // Middleware to enforce JSON responses for API routes
  app.use('/api', (req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Content-Type', 'application/json');
    next();
  });

  // Middleware to handle CORS in development
  if (process.env.NODE_ENV === 'development') {
    app.use('/api', (req: Request, res: Response, next: NextFunction) => {
      res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
      }
      next();
    });
  }

  app.use('/chat-images', (req, res, next) => {
    res.setHeader('Cache-Control', 'public, max-age=86400');
    next();
  }, express.static('public/chat-images'));

  app.use('/topic-images', (req, res, next) => {
    res.setHeader('Cache-Control', 'public, max-age=86400');
    next();
  }, express.static('public/topic-images'));
  setInterval(async () => {
    console.log("Broadcasting online users");
    const onlineUsersMessage = {
      type: WebSocketMessageType.USER_STATUS,
      payload: { users: [] }
    };
    await wsHandler.broadcast(onlineUsersMessage);
  }, 10000);

  // User Routes
  app.post('/api/auth/register', async (req: Request, res: Response) => {
    try {
      const validatedData = insertUserSchema
        .extend({
          password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
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

  // Add login route
  app.post('/api/auth/login', async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ message: 'Vui lòng không để trống các trường' });
      }
      const user = await storage.getUserByUsername(username);
      if (!user || user.password !== password) {
        return res.status(401).json({ message: 'Tên đăng nhập hoặc mật khẩu không hợp lệ' });
      }
      await storage.updateUserLastActive(user.id);
      const { password: _, ...userWithoutPassword } = user;

      res.json({
        ...userWithoutPassword,
        lastActive: new Date(),
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Lỗi máy chủ trong quá trình đăng nhập' });
    }
  });

  app.post('/api/auth/temp-user', async (req: Request, res: Response) => {
    try {
      const { username } = req.body;

      if (!username || typeof username !== 'string') {
        return res.status(400).json({ message: 'Vui lòng nhập tên đăng nhập' });
      }
      if (username.length < 3) {
        return res.status(400).json({ message: 'Tên phải có ít nhất 3 ký tự' });
      }
      const check = await storage.getUserByUsername(username);
      if (check) {
        return res.status(400).json({ message: 'Đã tồn tại username này' });
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
  });  app.post('/api/forum/topics', async (req: Request, res: Response) => {
    console.log('[Topic Creation] Request received');
    
    try {
      // Log the request body with our debug helper
      console.log('[Topic Creation] Request body:', JSON.stringify(debugObject(req.body), null, 2));
      
      // Validate request format
      if (!req.body || typeof req.body !== 'object') {
        console.error('[Topic Creation] Invalid request format');
        return res.status(400).json({ 
          message: 'Invalid request format',
          details: 'Request body must be a valid JSON object'
        });
      }
      
      // 2. Check for missing required fields first
      if (!req.body.userId) {
        console.error('[Topic Creation] Missing user ID');
        return res.status(400).json({ 
          message: 'User ID is required',
          details: 'A valid user ID must be provided to create a topic'
        });
      }
      
      if (!req.body.title || String(req.body.title).trim() === '') {
        console.error('[Topic Creation] Missing title');
        return res.status(400).json({ 
          message: 'Title is required',
          details: 'Topic title cannot be empty'
        });
      }
      
      if (!req.body.content || String(req.body.content).trim() === '') {
        console.error('[Topic Creation] Missing content');
        return res.status(400).json({ 
          message: 'Content is required',
          details: 'Topic content cannot be empty'
        });
      }
      
      // 3. Validate user exists
      let userId: number;
      try {
        userId = Number(req.body.userId);
        if (isNaN(userId) || userId <= 0) {
          throw new Error('Invalid user ID format');
        }
      } catch (e) {
        console.error('[Topic Creation] Invalid user ID format:', req.body.userId);
        return res.status(400).json({ 
          message: 'Invalid user ID format',
          details: 'User ID must be a positive number'
        });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        console.error(`[Topic Creation] User not found: ${userId}`);
        return res.status(400).json({ 
          message: 'Invalid user ID',
          details: `User with ID ${userId} does not exist`
        });
      }
      
      console.log(`[Topic Creation] User validated: ${user.username} (ID: ${user.id})`);
      
      try {        // Pre-validate and sanitize data
        const preparedData: {
          userId: number;
          title: string;
          content: string;
          category: string;
          isAnonymous: boolean;
          media: Record<string, string> | null;
        } = {
          userId: userId,
          title: String(req.body.title || '').trim().substring(0, 255),
          content: String(req.body.content || '').trim().substring(0, 10000),
          category: String(req.body.category || 'Tất cả'),
          isAnonymous: Boolean(req.body.isAnonymous),
          media: null
        };
        
        // Handle media specially to avoid DB errors
        if (req.body.media) {
          try {
            // First check if media is serializable
            const mediaTest = JSON.stringify(req.body.media);
            
            // Now validate the structure
            if (typeof req.body.media === 'object' && req.body.media !== null) {
              // Convert to proper format: Record<string, string>
              const processedMedia: Record<string, string> = {};
              let hasValidEntries = false;
              
              Object.entries(req.body.media).forEach(([key, value]) => {
                if (typeof value === 'string') {
                  processedMedia[key] = value;
                  hasValidEntries = true;
                }
              });
              
              if (hasValidEntries) {
                preparedData.media = processedMedia;
                console.log('[Topic Creation] Media validated successfully');
              } else {
                console.warn('[Topic Creation] Media object has no valid entries, setting to null');
                preparedData.media = null;
              }
            } else {
              console.warn('[Topic Creation] Media is not an object, setting to null');
              preparedData.media = null;
            }
          } catch (mediaError) {
            console.warn('[Topic Creation] Invalid media format (not serializable), ignoring:', mediaError);
            preparedData.media = null;
          }
        }
        
        console.log('[Topic Creation] Running schema validation');
        const validatedData = insertTopicSchema.parse(preparedData);
        
        console.log('[Topic Creation] Data validated successfully');
        
        // 5. Create the topic
        const topic = await forumService.createTopic(validatedData);
        console.log(`[Topic Creation] Topic created successfully with ID: ${topic.id}`);
        
        res.status(201).json(topic);
      } catch (error) {
        if (error instanceof z.ZodError) {
          console.error('[Topic Creation] Validation errors:');
          error.errors.forEach(err => {
            console.error(`- ${err.path.join('.')}: ${err.message}`);
          });
          
          return res.status(400).json({ 
            message: 'Validation failed',
            details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
          });
        }
        throw error; // Pass to outer catch
      }
    } catch (error) {
      console.error('[Topic Creation] Unhandled error:', error);
      
      // Provide more descriptive error responses
      let statusCode = 400;
      let errorMessage = 'Failed to create topic';
      let errorDetails = error instanceof Error ? error.message : 'Unknown error';
      
      // Handle specific known database errors
      if (errorDetails.includes('ER_DATA_TOO_LONG')) {
        errorMessage = 'Content too long';
        errorDetails = 'One or more fields exceed the maximum allowed length';
      } else if (errorDetails.includes('ER_DUP_ENTRY')) {
        errorMessage = 'Duplicate entry';
        errorDetails = 'This topic appears to be a duplicate';
      } else if (errorDetails.includes('ER_JSON_DOCUMENT_TOO_DEEP') || 
                errorDetails.includes('ER_JSON_DOCUMENT_NULL_KEY') || 
                errorDetails.includes('ER_JSON')) {
        errorMessage = 'Invalid media format';
        errorDetails = 'The uploaded media is in an invalid format';
      } else if (errorDetails.includes('connect')) {
        statusCode = 503;
        errorMessage = 'Database connection error';
        errorDetails = 'Unable to connect to the database';
      }
      
      res.status(statusCode).json({ 
        message: errorMessage,
        details: errorDetails
      });
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
        // Check if the parent comment exists (MySQL2/Drizzle compatible)
        const parentCommentResult = await db.select().from(comments)
          .where(and(
            eq(comments.id, Number(req.body.parentCommentId)),
            eq(comments.topicId, topicId)
          ));
        if (!parentCommentResult || parentCommentResult.length === 0) {
          return res.status(404).json({ message: 'Parent comment not found or does not belong to this topic' });
        }
      }

      // Now validate the data
      // Drizzle/zod .omit({ topicId: true }) is not supported in MySQL2, so validate as-is and set topicId manually
      const validatedData = insertCommentSchema.parse(req.body);
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
      const messageCount = messageCountResult[0] && messageCountResult[0].count !== undefined ? Number(messageCountResult[0].count) : 0;

      // Get user's total topic count (more accurate than just the limited results)
      const topicCountResult = await db.select({
        count: sql<number>`count(*)`
      })
        .from(topics)
        .where(eq(topics.userId, userId));
      const topicCount = topicCountResult[0] && topicCountResult[0].count !== undefined ? Number(topicCountResult[0].count) : 0;

      res.json({
        user: userWithoutPassword,
        topics: userTopics,
        stats: {
          messageCount,
          topicCount
        }
      });
    } catch (error) {
      console.error('Error fetching user profile:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Cập nhật thông tin người dùng
  app.put('/api/users/:id', async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      const { username } = req.body;

      // Kiểm tra user có tồn tại không
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      // Kiểm tra username mới có trùng với người dùng khác không
      if (username && username !== user.username) {
        // Validate username format: only Latin characters, numbers, and underscores
        const usernameRegex = /^[a-zA-Z0-9_]+$/;
        if (!usernameRegex.test(username)) {
          return res.status(400).json({ message: 'Username chỉ được chứa chữ cái Latin, số và dấu gạch dưới (_)' });
        }

        const existingUser = await storage.getUserByUsername(username);
        if (existingUser && existingUser.id !== userId) {
          return res.status(400).json({ message: 'Username already exists' });
        }
      }

      // Cập nhật thông tin
      const updatedUser = await storage.updateUserProfile(userId, {
        username: username || user.username,
        isTemporary: false // Sau khi cập nhật, tài khoản không còn là tạm thời
      });

      // Không trả về mật khẩu
      const { password, ...userWithoutPassword } = updatedUser;

      res.json(userWithoutPassword);
    } catch (error) {
      console.error('Error updating user profile:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Đổi mật khẩu người dùng
  app.put('/api/users/:id/password', async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: 'Current password and new password are required' });
      }

      // Kiểm tra user có tồn tại không
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Kiểm tra mật khẩu hiện tại
      if (user.password !== currentPassword) {
        return res.status(401).json({ message: 'Current password is incorrect' });
      }

      // Cập nhật mật khẩu
      const success = await storage.updateUserPassword(userId, newPassword);

      if (success) {
        res.json({ message: 'Password updated successfully' });
      } else {
        res.status(500).json({ message: 'Failed to update password' });
      }
    } catch (error) {
      console.error('Error updating password:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Cập nhật avatar
  app.put('/api/users/:id/avatar', async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      const { avatarUrl } = req.body;

      if (!avatarUrl) {
        return res.status(400).json({ message: 'Avatar URL is required' });
      }

      // Kiểm tra user có tồn tại không
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Cập nhật avatar
      const updatedUser = await storage.updateUserAvatar(userId, avatarUrl);

      // Không trả về mật khẩu
      const { password, ...userWithoutPassword } = updatedUser;

      res.json(userWithoutPassword);
    } catch (error) {
      console.error('Error updating avatar:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // API response logging middleware
  app.use('/api', (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json;
    res.json = function (body: any) {
      console.log('API Response:', {
        url: req.url,
        method: req.method,
        status: res.statusCode,
        contentType: res.get('Content-Type'),
        body
      });
      return originalJson.call(this, body);
    };
    next();
  });

  // Debug helper function
  function debugObject(obj: any, depth = 0, maxDepth = 2): any {
    if (depth > maxDepth) return '[Object]';
    
    if (!obj || typeof obj !== 'object') return obj;
    
    const result: any = {};
    
    for (const [key, value] of Object.entries(obj)) {
      if (key === 'password' || key === 'token') {
        result[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        if (Array.isArray(value)) {
          result[key] = `[Array(${value.length})]`;
        } else {
          result[key] = debugObject(value, depth + 1, maxDepth);
        }
      } else if (typeof value === 'string' && value.length > 100) {
        result[key] = value.substring(0, 100) + '... [truncated]';
      } else {
        result[key] = value;
      }
    }
    
    return result;
  }

  return httpServer;
}
