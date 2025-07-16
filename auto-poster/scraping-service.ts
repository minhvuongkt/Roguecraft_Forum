import { chromium, Browser, Page } from 'playwright';
import * as cheerio from 'cheerio';
import axios from 'axios';
import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ScrapedArticle } from './database.js';

export interface ScrapeResult {
  success: boolean;
  article?: ScrapedArticle;
  error?: string;
}

export class WebScrapingService {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private initialized = false;

  async init(): Promise<void> {
    try {
      this.browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      this.page = await this.browser.newPage();
      
      // Set user agent to avoid detection
      await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      this.initialized = true;
      console.log('Web scraping service initialized successfully');
    } catch (error) {
      console.warn('Failed to initialize web scraping service:', error);
      console.warn('Scraping functionality will be disabled. Run "npx playwright install chromium" to enable it.');
      this.initialized = false;
    }
  }

  async scrapeArticleLinks(siteUrl: string, limit: number = 10): Promise<string[]> {
    if (!this.initialized || !this.page) {
      console.warn('Web scraping service not initialized. Returning empty array.');
      return [];
    }

    try {
      await this.page.goto(siteUrl, { waitUntil: 'networkidle' });
      
      // Wait for content to load
      await this.page.waitForTimeout(2000);

      const links = await this.page.evaluate((siteUrl) => {
        const articleLinks: string[] = [];
        const linkElements = document.querySelectorAll('a[href*="/"]');
        
        linkElements.forEach(link => {
          const href = link.getAttribute('href');
          if (href) {
            let fullUrl = href;
            if (href.startsWith('/')) {
              const baseUrl = new URL(siteUrl).origin;
              fullUrl = baseUrl + href;
            }
            
            // Filter for article-like URLs
            if (this.isArticleUrl(fullUrl)) {
              articleLinks.push(fullUrl);
            }
          }
        });

        return [...new Set(articleLinks)]; // Remove duplicates
      }, siteUrl);

      return links.slice(0, limit);
    } catch (error) {
      console.error('Error scraping article links:', error);
      return [];
    }
  }

  private isArticleUrl(url: string): boolean {
    // Check if URL looks like an article URL
    const articlePatterns = [
      /\/\d{4}\/\d{2}\/\d{2}\//,  // Date-based URLs
      /\/[^\/]+\/?$/,             // Single path segment
      /\/p\/\d+/,                 // Post ID pattern
      /\/post\//,                 // Post pattern
      /\/article\//,              // Article pattern
      /\/news\//,                 // News pattern
    ];

    const excludePatterns = [
      /\.(jpg|jpeg|png|gif|svg|css|js|ico)$/i,
      /\/(wp-admin|wp-content|wp-includes)\//,
      /\/(category|tag|author)\//,
      /\/(search|contact|about|privacy|terms)\//,
      /\#/,
      /\?/
    ];

    return articlePatterns.some(pattern => pattern.test(url)) && 
           !excludePatterns.some(pattern => pattern.test(url));
  }

  async scrapeArticle(url: string, sourceSite: string): Promise<ScrapeResult> {
    if (!this.initialized || !this.page) {
      console.warn('Web scraping service not initialized');
      return {
        success: false,
        error: 'Web scraping service not initialized. Please run "npx playwright install chromium" to enable scraping.'
      };
    }

    try {
      await this.page.goto(url, { waitUntil: 'networkidle' });
      
      // Wait for content to load
      await this.page.waitForTimeout(3000);

      const content = await this.page.content();
      const $ = cheerio.load(content);

      // Remove ads and unwanted elements
      this.removeAdsAndUnwantedElements($);

      // Extract article data
      const title = this.extractTitle($);
      const articleContent = this.extractArticleContent($);
      const images = await this.extractImages($, url);
      const videos = this.extractVideos($);
      const thumbnail = await this.extractThumbnail($, url);

      if (!title || !articleContent) {
        return {
          success: false,
          error: 'Could not extract title or content'
        };
      }

      const article: ScrapedArticle = {
        url,
        title: title.trim(),
        content: articleContent.trim(),
        thumbnail: thumbnail || '',
        images,
        videos,
        source_site: sourceSite,
        scraped_at: new Date(),
        posted_to_wordpress: false,
        posted_to_threads: false
      };

      return {
        success: true,
        article
      };
    } catch (error) {
      console.error('Error scraping article:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private removeAdsAndUnwantedElements($: cheerio.CheerioAPI): void {
    // Remove common ad containers and unwanted elements
    const selectorsToRemove = [
      '.ad', '.ads', '.advertisement', '.google-ads',
      '.sidebar', '.widget', '.related-posts',
      '.comments', '.comment-form', '.social-share',
      '.navigation', '.nav', '.menu',
      '.header', '.footer', '.breadcrumb',
      '[class*="ad-"]', '[id*="ad-"]',
      '[class*="google"]', '[class*="adsense"]',
      'script', 'style', 'iframe[src*="ads"]',
      '.wp-block-embed', '.wp-block-social-links'
    ];

    selectorsToRemove.forEach(selector => {
      $(selector).remove();
    });
  }

  private extractTitle($: cheerio.CheerioAPI): string {
    const selectors = [
      'h1.entry-title',
      'h1.post-title',
      'h1.article-title',
      'h1[class*="title"]',
      'h1',
      '.entry-title',
      '.post-title',
      '.article-title',
      'title'
    ];

    for (const selector of selectors) {
      const title = $(selector).first().text().trim();
      if (title && title.length > 5) {
        return title;
      }
    }

    return '';
  }

  private extractArticleContent($: cheerio.CheerioAPI): string {
    const selectors = [
      '.entry-content',
      '.post-content',
      '.article-content',
      '.content',
      'main article',
      '.post-body',
      '.entry-body',
      '[class*="content"]'
    ];

    for (const selector of selectors) {
      const content = $(selector).first();
      if (content.length > 0) {
        // Clean up the content
        content.find('script, style, .ad, .ads').remove();
        
        // Get text content while preserving some structure
        let text = content.html() || '';
        
        // Convert HTML to clean text with basic formatting
        text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
        text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
        text = text.replace(/<[^>]+>/g, ' ');
        text = text.replace(/\s+/g, ' ');
        text = text.trim();

        if (text.length > 100) {
          return text;
        }
      }
    }

    return '';
  }

  private async extractImages($: cheerio.CheerioAPI, baseUrl: string): Promise<string[]> {
    const images: string[] = [];
    const imgElements = $('img');

    imgElements.each((_, element) => {
      const src = $(element).attr('src') || $(element).attr('data-src');
      if (src) {
        let fullUrl = src;
        if (src.startsWith('/')) {
          const base = new URL(baseUrl).origin;
          fullUrl = base + src;
        } else if (src.startsWith('//')) {
          fullUrl = 'https:' + src;
        }

        // Filter out small images (likely ads or icons)
        const width = parseInt($(element).attr('width') || '0');
        const height = parseInt($(element).attr('height') || '0');
        
        if (width > 100 && height > 100) {
          images.push(fullUrl);
        } else if (width === 0 && height === 0) {
          // If no dimensions specified, include it
          images.push(fullUrl);
        }
      }
    });

    return [...new Set(images)]; // Remove duplicates
  }

  private extractVideos($: cheerio.CheerioAPI): string[] {
    const videos: string[] = [];
    
    // Extract video URLs from various sources
    $('video source').each((_, element) => {
      const src = $(element).attr('src');
      if (src) videos.push(src);
    });

    $('iframe').each((_, element) => {
      const src = $(element).attr('src');
      if (src && (src.includes('youtube.com') || src.includes('vimeo.com'))) {
        videos.push(src);
      }
    });

    return [...new Set(videos)]; // Remove duplicates
  }

  private async extractThumbnail($: cheerio.CheerioAPI, baseUrl: string): Promise<string> {
    // Try to find featured image or first content image
    const selectors = [
      'meta[property="og:image"]',
      'meta[name="twitter:image"]',
      '.featured-image img',
      '.post-thumbnail img',
      '.entry-content img:first-child',
      '.content img:first-child'
    ];

    for (const selector of selectors) {
      const element = $(selector).first();
      if (element.length > 0) {
        let src = element.attr('content') || element.attr('src');
        if (src) {
          if (src.startsWith('/')) {
            const base = new URL(baseUrl).origin;
            src = base + src;
          } else if (src.startsWith('//')) {
            src = 'https:' + src;
          }
          
          // Download and save the thumbnail
          return await this.downloadAndSaveImage(src);
        }
      }
    }

    return '';
  }

  private async downloadAndSaveImage(imageUrl: string): Promise<string> {
    try {
      const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      const imageBuffer = Buffer.from(response.data);
      
      // Process with sharp for optimization
      const optimizedBuffer = await sharp(imageBuffer)
        .resize(800, 600, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toBuffer();

      // Save to local storage
      const filename = `${uuidv4()}.jpg`;
      const imagePath = path.join(process.cwd(), 'auto-poster', 'images', filename);
      
      // Ensure directory exists
      await fs.mkdir(path.dirname(imagePath), { recursive: true });
      await fs.writeFile(imagePath, optimizedBuffer);

      return imagePath;
    } catch (error) {
      console.error('Error downloading image:', error);
      return '';
    }
  }

  async close(): Promise<void> {
    if (this.page) {
      await this.page.close();
      this.page = null;
    }
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

export const webScrapingService = new WebScrapingService();