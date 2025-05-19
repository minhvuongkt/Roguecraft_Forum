import { storage } from "./storage";
import { InsertTopic, InsertComment, User } from "@shared/schema";

export class ForumService {
  private static instance: ForumService;

  private constructor() {
    console.log('Forum service initialized');
  }

  static getInstance(): ForumService {
    if (!ForumService.instance) {
      ForumService.instance = new ForumService();
    }
    return ForumService.instance;
  }

  // Function to sanitize input data 
  private sanitizeTopicData(topicData: InsertTopic): InsertTopic {
    return {
      userId: Number(topicData.userId),
      title: String(topicData.title || "").trim().substring(0, 255),
      content: String(topicData.content || "").trim().substring(0, 10000),
      category: String(topicData.category || "Tất cả"),
      isAnonymous: Boolean(topicData.isAnonymous),
      media: this.sanitizeMedia(topicData.media)
    };
  }
  // Helper to sanitize media
  private sanitizeMedia(media: any): Record<string, string> | null {
    if (!media) return null;
    
    try {
      if (typeof media === 'object' && media !== null) {
        const safeMedia: Record<string, string> = {};
        
        Object.entries(media).forEach(([key, value]) => {
          if (typeof value === 'string') {
            safeMedia[key] = String(value);
          }
        });
        
        if (Object.keys(safeMedia).length > 0) {
          return safeMedia;
        }
      }
    } catch (e) {
      console.error('Error sanitizing media:', e);
    }
    
    return null;
  }

  async getTopics(limit?: number, offset?: number, category?: string): Promise<any[]> {
    const topics = await storage.getTopics(limit, offset, category);
    
    // Fetch user information for each topic
    const enhancedTopics = await Promise.all(
      topics.map(async (topic) => {
        // Skip user fetch for anonymous posts
        if (topic.isAnonymous) {
          return {
            ...topic,
            user: null
          };
        }
        
        const user = topic.userId 
          ? await storage.getUserById(topic.userId)
          : undefined;
        
        return {
          ...topic,
          user: user ? {
            id: user.id,
            username: user.username,
            avatar: user.avatar
          } : null
        };
      })
    );
    
    return enhancedTopics;
  }

  async getTopicById(id: number): Promise<any | null> {
    const topic = await storage.getTopicById(id);
    if (!topic) return null;
    
    // Increment view count
    await storage.incrementTopicViews(id);
    
    // Get user info if not anonymous
    let userInfo = null;
    if (!topic.isAnonymous && topic.userId) {
      const user = await storage.getUserById(topic.userId);
      if (user) {
        userInfo = {
          id: user.id,
          username: user.username,
          avatar: user.avatar
        };
      }
    }
    
    // Get comments
    const comments = await storage.getCommentsByTopicId(id);
    const enhancedComments = await Promise.all(
      comments.map(async (comment) => {
        // Skip user fetch for anonymous comments
        if (comment.isAnonymous) {
          return {
            ...comment,
            user: null
          };
        }
        
        const user = comment.userId 
          ? await storage.getUserById(comment.userId)
          : undefined;
        
        return {
          ...comment,
          user: user ? {
            id: user.id,
            username: user.username,
            avatar: user.avatar
          } : null
        };
      })
    );
    
    return {
      ...topic,
      user: userInfo,
      comments: enhancedComments
    };
  }
  
  async createTopic(topicData: InsertTopic): Promise<any> {
    try {
      console.log('[ForumService] Creating topic with input data:', JSON.stringify({
        userId: topicData.userId,
        title: topicData.title?.substring(0, 30) + '...',
        contentLength: topicData.content?.length || 0,
        category: topicData.category,
        isAnonymous: topicData.isAnonymous,
        mediaType: topicData.media ? typeof topicData.media : 'null'
      }));
      
      // Sanitize input data to prevent errors
      const sanitizedData = this.sanitizeTopicData(topicData);
      
      // Create the topic in database
      const newTopic = await storage.createTopic(sanitizedData);
      
      console.log('[ForumService] Topic created successfully with ID:', newTopic.id);
      
      // Update user's last active timestamp
      if (newTopic.userId) {
        await storage.updateUserLastActive(newTopic.userId);
      }
      
      // Get user info if not anonymous
      let userInfo = null;
      if (!newTopic.isAnonymous && newTopic.userId) {
        const user = await storage.getUserById(newTopic.userId);
        if (user) {
          userInfo = {
            id: user.id,
            username: user.username,
            avatar: user.avatar
          };
        }
      }
      
      return {
        ...newTopic,
        user: userInfo
      };
    } catch (error) {
      console.error('[ForumService] Error creating topic:', error);
      throw error;
    }
  }
  
  async createComment(commentData: InsertComment): Promise<any> {
    const newComment = await storage.createComment(commentData);
    
    // Update user's last active timestamp
    if (newComment.userId) {
      await storage.updateUserLastActive(newComment.userId);
    }
    
    // Get user info if not anonymous
    let userInfo = null;
    if (!newComment.isAnonymous && newComment.userId) {
      const user = await storage.getUserById(newComment.userId);
      if (user) {
        userInfo = {
          id: user.id,
          username: user.username,
          avatar: user.avatar
        };
      }
    }
    
    return {
      ...newComment,
      user: userInfo
    };
  }
  
  async toggleTopicLike(topicId: number, userId: number, increment: boolean): Promise<boolean> {
    try {
      if (increment) {
        return await storage.addTopicLike(topicId, userId);
      } else {
        return await storage.removeTopicLike(topicId, userId);
      }
    } catch (error) {
      console.error('Error toggling topic like:', error);
      return false;
    }
  }
  
  async checkTopicLike(topicId: number, userId: number): Promise<boolean> {
    return await storage.getTopicLike(topicId, userId);
  }
}

export const forumService = ForumService.getInstance();
