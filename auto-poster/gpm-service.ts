import axios from 'axios';

export interface GPMConfig {
  apiUrl: string;
  profileGroupId: string;
}

export interface ThreadsPostRequest {
  content: string;
  profiles: string[];
  delay?: number;
}

export interface ThreadsPostResponse {
  success: boolean;
  taskId?: string;
  message?: string;
  error?: string;
}

export interface PostStatus {
  taskId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress?: number;
  results?: Array<{
    profileId: string;
    success: boolean;
    postId?: string;
    error?: string;
  }>;
}

export class GPMThreadsService {
  private config: GPMConfig;

  constructor(config: GPMConfig) {
    this.config = config;
  }

  async postToThreads(content: string, delay: number = 0): Promise<ThreadsPostResponse> {
    try {
      const postData: ThreadsPostRequest = {
        content,
        profiles: [this.config.profileGroupId],
        delay
      };

      const response = await axios.post(
        `${this.config.apiUrl}/api/threads/post`,
        postData,
        {
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'AutoPoster/1.0'
          },
          timeout: 30000
        }
      );

      if (response.data.success) {
        return {
          success: true,
          taskId: response.data.taskId,
          message: response.data.message
        };
      } else {
        return {
          success: false,
          error: response.data.error || 'Unknown error from GPM'
        };
      }
    } catch (error) {
      console.error('Error posting to Threads via GPM:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getPostStatus(taskId: string): Promise<PostStatus | null> {
    try {
      const response = await axios.get(
        `${this.config.apiUrl}/api/threads/status/${taskId}`,
        {
          headers: {
            'User-Agent': 'AutoPoster/1.0'
          },
          timeout: 10000
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error getting post status from GPM:', error);
      return null;
    }
  }

  async getProfiles(): Promise<Array<{ id: string; name: string; active: boolean }> | null> {
    try {
      const response = await axios.get(
        `${this.config.apiUrl}/api/profiles`,
        {
          headers: {
            'User-Agent': 'AutoPoster/1.0'
          },
          timeout: 10000
        }
      );

      return response.data.profiles || [];
    } catch (error) {
      console.error('Error getting profiles from GPM:', error);
      return null;
    }
  }

  async getProfileGroups(): Promise<Array<{ id: string; name: string; profileIds: string[] }> | null> {
    try {
      const response = await axios.get(
        `${this.config.apiUrl}/api/profile-groups`,
        {
          headers: {
            'User-Agent': 'AutoPoster/1.0'
          },
          timeout: 10000
        }
      );

      return response.data.groups || [];
    } catch (error) {
      console.error('Error getting profile groups from GPM:', error);
      return null;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await axios.get(
        `${this.config.apiUrl}/api/health`,
        {
          headers: {
            'User-Agent': 'AutoPoster/1.0'
          },
          timeout: 10000
        }
      );

      return response.status === 200 && response.data.status === 'ok';
    } catch (error) {
      console.error('GPM connection test failed:', error);
      return false;
    }
  }

  async schedulePost(content: string, scheduledTime: Date): Promise<ThreadsPostResponse> {
    try {
      const postData = {
        content,
        profiles: [this.config.profileGroupId],
        scheduledTime: scheduledTime.toISOString()
      };

      const response = await axios.post(
        `${this.config.apiUrl}/api/threads/schedule`,
        postData,
        {
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'AutoPoster/1.0'
          },
          timeout: 30000
        }
      );

      if (response.data.success) {
        return {
          success: true,
          taskId: response.data.taskId,
          message: response.data.message
        };
      } else {
        return {
          success: false,
          error: response.data.error || 'Unknown error from GPM'
        };
      }
    } catch (error) {
      console.error('Error scheduling post via GPM:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async cancelScheduledPost(taskId: string): Promise<boolean> {
    try {
      const response = await axios.delete(
        `${this.config.apiUrl}/api/threads/schedule/${taskId}`,
        {
          headers: {
            'User-Agent': 'AutoPoster/1.0'
          },
          timeout: 10000
        }
      );

      return response.data.success || false;
    } catch (error) {
      console.error('Error canceling scheduled post:', error);
      return false;
    }
  }

  async getScheduledPosts(): Promise<Array<{
    taskId: string;
    content: string;
    scheduledTime: string;
    status: string;
  }> | null> {
    try {
      const response = await axios.get(
        `${this.config.apiUrl}/api/threads/scheduled`,
        {
          headers: {
            'User-Agent': 'AutoPoster/1.0'
          },
          timeout: 10000
        }
      );

      return response.data.posts || [];
    } catch (error) {
      console.error('Error getting scheduled posts:', error);
      return null;
    }
  }

  async getPostingLimits(): Promise<{
    daily: { limit: number; used: number };
    hourly: { limit: number; used: number };
  } | null> {
    try {
      const response = await axios.get(
        `${this.config.apiUrl}/api/threads/limits`,
        {
          headers: {
            'User-Agent': 'AutoPoster/1.0'
          },
          timeout: 10000
        }
      );

      return response.data.limits || null;
    } catch (error) {
      console.error('Error getting posting limits:', error);
      return null;
    }
  }

  async waitForCompletion(taskId: string, timeoutMs: number = 300000): Promise<PostStatus | null> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      const status = await this.getPostStatus(taskId);
      
      if (!status) {
        return null;
      }

      if (status.status === 'completed' || status.status === 'failed') {
        return status;
      }

      // Wait 5 seconds before checking again
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    return null; // Timeout
  }
}

export default GPMThreadsService;