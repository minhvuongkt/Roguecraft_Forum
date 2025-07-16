import cron from 'node-cron';
import { database, ScrapedArticle } from './database.js';
import { webScrapingService } from './scraping-service.js';
import WordPressService from './wordpress-service.js';
import GPTOptimizationService from './gpt-service.js';
import GPMThreadsService from './gpm-service.js';

export interface AutoPosterConfig {
  wordpress: {
    url: string;
    username: string;
    password: string;
  };
  gpt: {
    apiKey: string;
  };
  gpm: {
    apiUrl: string;
    profileGroupId: string;
  };
  posting: {
    maxPostsPerDay: number;
    maxPostsPerBatch: number;
    articlesPerSite: number;
    threadPostingDelay: number;
    threadCount: number;
    schedule: string;
  };
}

export interface ProcessingStats {
  articlesScraped: number;
  articlesPostedToWordPress: number;
  articlesPostedToThreads: number;
  errors: string[];
  startTime: Date;
  endTime?: Date;
}

export class AutoPosterOrchestrator {
  private config: AutoPosterConfig | null = null;
  private wordPressService: WordPressService | null = null;
  private gptService: GPTOptimizationService | null = null;
  private gpmService: GPMThreadsService | null = null;
  private cronJobs: cron.ScheduledTask[] = [];
  private isRunning = false;

  async init(): Promise<void> {
    await database.init();
    await webScrapingService.init();
    await this.loadConfig();
  }

  private async loadConfig(): Promise<void> {
    const configData = await database.getAllConfig();
    
    this.config = {
      wordpress: {
        url: configData.wordpress_url || '',
        username: configData.wordpress_username || '',
        password: configData.wordpress_password || ''
      },
      gpt: {
        apiKey: configData.gpt_api_key || ''
      },
      gpm: {
        apiUrl: configData.gmp_api_url || '',
        profileGroupId: configData.gmp_profile_group_id || ''
      },
      posting: {
        maxPostsPerDay: parseInt(configData.max_posts_per_day) || 10,
        maxPostsPerBatch: parseInt(configData.max_posts_per_batch) || 3,
        articlesPerSite: parseInt(configData.articles_per_site) || 5,
        threadPostingDelay: parseInt(configData.thread_posting_delay) || 3600,
        threadCount: parseInt(configData.thread_count) || 1,
        schedule: configData.posting_schedule || '0 */6 * * *'
      }
    };

    // Initialize services only if configuration is available
    if (this.config.wordpress.url && this.config.wordpress.username && this.config.wordpress.password) {
      this.wordPressService = new WordPressService(this.config.wordpress);
    }
    
    if (this.config.gpt.apiKey) {
      this.gptService = new GPTOptimizationService(this.config.gpt.apiKey);
    }
    
    if (this.config.gpm.apiUrl && this.config.gpm.profileGroupId) {
      this.gpmService = new GPMThreadsService(this.config.gpm);
    }
  }

  async startScheduledPosting(): Promise<void> {
    if (!this.config) {
      throw new Error('Configuration not loaded');
    }

    // Clear existing cron jobs
    this.stopScheduledPosting();

    // Schedule main posting job
    const mainJob = cron.schedule(this.config.posting.schedule, async () => {
      if (!this.isRunning) {
        await this.runPostingCycle();
      }
    }, {
      scheduled: false
    });

    this.cronJobs.push(mainJob);
    mainJob.start();

    console.log(`Auto-poster scheduled with cron: ${this.config.posting.schedule}`);
  }

  stopScheduledPosting(): void {
    this.cronJobs.forEach(job => job.stop());
    this.cronJobs = [];
    console.log('Auto-poster scheduling stopped');
  }

  async runPostingCycle(): Promise<ProcessingStats> {
    if (this.isRunning) {
      throw new Error('Posting cycle already running');
    }

    this.isRunning = true;
    const stats: ProcessingStats = {
      articlesScraped: 0,
      articlesPostedToWordPress: 0,
      articlesPostedToThreads: 0,
      errors: [],
      startTime: new Date()
    };

    try {
      console.log('Starting posting cycle...');

      // Step 1: Scrape articles from all websites
      await this.scrapeArticles(stats);

      // Step 2: Post to WordPress
      await this.postToWordPress(stats);

      // Step 3: Post to Threads
      await this.postToThreads(stats);

      stats.endTime = new Date();
      console.log('Posting cycle completed:', stats);

      return stats;
    } catch (error) {
      stats.errors.push(error instanceof Error ? error.message : 'Unknown error');
      stats.endTime = new Date();
      console.error('Posting cycle failed:', error);
      return stats;
    } finally {
      this.isRunning = false;
    }
  }

  private async scrapeArticles(stats: ProcessingStats): Promise<void> {
    if (!this.config) return;

    const websites = await database.getWebsiteSources();
    
    for (const website of websites) {
      try {
        console.log(`Scraping articles from ${website.name}...`);
        
        // Get article links
        const articleLinks = await webScrapingService.scrapeArticleLinks(
          website.url,
          this.config.posting.articlesPerSite
        );

        // Scrape each article
        for (const link of articleLinks) {
          try {
            const result = await webScrapingService.scrapeArticle(link, website.name);
            
            if (result.success && result.article) {
              const articleId = await database.saveScrapedArticle(result.article);
              stats.articlesScraped++;
              
              console.log(`Scraped article: ${result.article.title} (ID: ${articleId})`);
            } else {
              stats.errors.push(`Failed to scrape ${link}: ${result.error}`);
            }
          } catch (error) {
            stats.errors.push(`Error scraping ${link}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
      } catch (error) {
        stats.errors.push(`Error scraping website ${website.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  private async postToWordPress(stats: ProcessingStats): Promise<void> {
    if (!this.config || !this.wordPressService) return;

    const unpostedArticles = await database.getUnpostedArticles(this.config.posting.maxPostsPerBatch);
    
    for (const article of unpostedArticles) {
      try {
        console.log(`Posting to WordPress: ${article.title}`);
        
        let optimizedTitle = article.title;
        let optimizedContent = article.content;

        // Optimize with GPT if available
        if (this.gptService) {
          const optimization = await this.gptService.optimizeContentForSEO(article.title, article.content);
          if (optimization.success) {
            optimizedTitle = optimization.optimizedTitle || article.title;
            optimizedContent = optimization.optimizedContent || article.content;
          }
        }

        // Embed images in content
        if (article.images && article.images.length > 0) {
          optimizedContent = await this.wordPressService.embedImagesInContent(optimizedContent, article.images);
        }

        // Create WordPress post
        const postResult = await this.wordPressService.createPost(article, optimizedTitle, optimizedContent);
        
        if (postResult.success && postResult.post) {
          await database.markArticleAsPosted(article.id!, 'wordpress', postResult.post.link);
          await database.addPostingHistory({
            article_id: article.id!,
            platform: 'wordpress',
            status: 'success',
            response_data: JSON.stringify(postResult.post)
          });
          
          stats.articlesPostedToWordPress++;
          console.log(`Posted to WordPress: ${postResult.post.link}`);
        } else {
          stats.errors.push(`Failed to post to WordPress: ${postResult.error}`);
          await database.addPostingHistory({
            article_id: article.id!,
            platform: 'wordpress',
            status: 'failed',
            response_data: postResult.error
          });
        }
      } catch (error) {
        stats.errors.push(`Error posting to WordPress: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  private async postToThreads(stats: ProcessingStats): Promise<void> {
    if (!this.config || !this.gmpService) return;

    // Get articles that were posted to WordPress but not to Threads
    const articlesForThreads = await database.getUnpostedArticles(this.config.posting.maxPostsPerBatch);
    const wordPressPostedArticles = articlesForThreads.filter(a => a.posted_to_wordpress && !a.posted_to_threads);

    for (const article of wordPressPostedArticles) {
      try {
        console.log(`Posting to Threads: ${article.title}`);
        
        let threadsContent = `${article.title}\n\n`;
        
        // Generate optimized Threads content with GPT if available
        if (this.gptService && article.wordpress_url) {
          const optimization = await this.gptService.generateThreadsPost(
            article.title,
            article.content,
            article.wordpress_url
          );
          
          if (optimization.success && optimization.optimizedContent) {
            threadsContent = optimization.optimizedContent;
          }
        } else if (article.wordpress_url) {
          // Fallback content
          threadsContent += `Read more: ${article.wordpress_url}`;
        }

        // Post to Threads via GPM
        const postResult = await this.gmpService.postToThreads(
          threadsContent,
          this.config.posting.threadPostingDelay
        );
        
        if (postResult.success && postResult.taskId) {
          await database.markArticleAsPosted(article.id!, 'threads', postResult.taskId);
          await database.addPostingHistory({
            article_id: article.id!,
            platform: 'threads',
            status: 'success',
            response_data: JSON.stringify(postResult)
          });
          
          stats.articlesPostedToThreads++;
          console.log(`Posted to Threads: ${postResult.taskId}`);
        } else {
          stats.errors.push(`Failed to post to Threads: ${postResult.error}`);
          await database.addPostingHistory({
            article_id: article.id!,
            platform: 'threads',
            status: 'failed',
            response_data: postResult.error
          });
        }
      } catch (error) {
        stats.errors.push(`Error posting to Threads: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  async testConnections(): Promise<{
    wordpress: boolean;
    gpt: boolean;
    gpm: boolean;
  }> {
    const results = {
      wordpress: false,
      gpt: false,
      gpm: false
    };

    if (this.wordPressService) {
      results.wordpress = await this.wordPressService.testConnection();
    }

    if (this.gptService) {
      results.gpt = await this.gptService.testConnection();
    }

    if (this.gmpService) {
      results.gpm = await this.gmpService.testConnection();
    }

    return results;
  }

  async getStatus(): Promise<{
    isRunning: boolean;
    config: AutoPosterConfig | null;
    connections: { wordpress: boolean; gpt: boolean; gpm: boolean };
    stats: {
      totalArticles: number;
      unpostedArticles: number;
      recentPosts: any[];
    };
  }> {
    const connections = await this.testConnections();
    const unpostedArticles = await database.getUnpostedArticles(100);
    const recentPosts = await database.getPostingHistory(20);

    return {
      isRunning: this.isRunning,
      config: this.config,
      connections,
      stats: {
        totalArticles: 0, // TODO: Implement total count
        unpostedArticles: unpostedArticles.length,
        recentPosts
      }
    };
  }

  async updateConfig(newConfig: Partial<AutoPosterConfig>): Promise<void> {
    if (newConfig.wordpress) {
      await database.setConfig('wordpress_url', newConfig.wordpress.url);
      await database.setConfig('wordpress_username', newConfig.wordpress.username);
      await database.setConfig('wordpress_password', newConfig.wordpress.password);
    }

    if (newConfig.gpt) {
      await database.setConfig('gpt_api_key', newConfig.gpt.apiKey);
    }

    if (newConfig.gpm) {
      await database.setConfig('gmp_api_url', newConfig.gpm.apiUrl);
      await database.setConfig('gmp_profile_group_id', newConfig.gpm.profileGroupId);
    }

    if (newConfig.posting) {
      await database.setConfig('max_posts_per_day', newConfig.posting.maxPostsPerDay.toString());
      await database.setConfig('max_posts_per_batch', newConfig.posting.maxPostsPerBatch.toString());
      await database.setConfig('articles_per_site', newConfig.posting.articlesPerSite.toString());
      await database.setConfig('thread_posting_delay', newConfig.posting.threadPostingDelay.toString());
      await database.setConfig('thread_count', newConfig.posting.threadCount.toString());
      await database.setConfig('posting_schedule', newConfig.posting.schedule);
    }

    // Reload configuration
    await this.loadConfig();
  }

  async shutdown(): Promise<void> {
    this.stopScheduledPosting();
    await webScrapingService.close();
    await database.close();
    this.isRunning = false;
  }
}

export const autoPosterOrchestrator = new AutoPosterOrchestrator();