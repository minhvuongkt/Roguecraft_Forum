import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import { ScrapedArticle } from './database.js';

export interface WordPressConfig {
  url: string;
  username: string;
  password: string;
}

export interface WordPressPost {
  id: number;
  title: string;
  content: string;
  status: string;
  link: string;
  featured_media: number;
}

export interface PostResult {
  success: boolean;
  post?: WordPressPost;
  error?: string;
}

export class WordPressService {
  private config: WordPressConfig;
  private authToken: string = '';

  constructor(config: WordPressConfig) {
    this.config = config;
    this.authToken = Buffer.from(`${config.username}:${config.password}`).toString('base64');
  }

  async uploadFeaturedImage(imagePath: string): Promise<number | null> {
    try {
      if (!fs.existsSync(imagePath)) {
        console.error('Image file not found:', imagePath);
        return null;
      }

      const formData = new FormData();
      formData.append('file', fs.createReadStream(imagePath));
      formData.append('title', path.basename(imagePath));
      formData.append('alt_text', 'Featured Image');

      const response = await axios.post(
        `${this.config.url}/wp-json/wp/v2/media`,
        formData,
        {
          headers: {
            'Authorization': `Basic ${this.authToken}`,
            ...formData.getHeaders()
          }
        }
      );

      return response.data.id;
    } catch (error) {
      console.error('Error uploading featured image:', error);
      return null;
    }
  }

  async createPost(article: ScrapedArticle, optimizedTitle?: string, optimizedContent?: string): Promise<PostResult> {
    try {
      const postData = {
        title: optimizedTitle || article.title,
        content: optimizedContent || article.content,
        status: 'publish',
        excerpt: this.generateExcerpt(optimizedContent || article.content),
        meta: {
          original_source: article.url,
          source_site: article.source_site
        }
      };

      // Upload featured image if available
      if (article.thumbnail) {
        const featuredMediaId = await this.uploadFeaturedImage(article.thumbnail);
        if (featuredMediaId) {
          (postData as any).featured_media = featuredMediaId;
        }
      }

      const response = await axios.post(
        `${this.config.url}/wp-json/wp/v2/posts`,
        postData,
        {
          headers: {
            'Authorization': `Basic ${this.authToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        post: {
          id: response.data.id,
          title: response.data.title.rendered,
          content: response.data.content.rendered,
          status: response.data.status,
          link: response.data.link,
          featured_media: response.data.featured_media
        }
      };
    } catch (error) {
      console.error('Error creating WordPress post:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private generateExcerpt(content: string): string {
    // Generate excerpt from content (first 155 characters)
    const plainText = content.replace(/<[^>]*>/g, '');
    return plainText.length > 155 ? plainText.substring(0, 155) + '...' : plainText;
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.config.url}/wp-json/wp/v2/users/me`, {
        headers: {
          'Authorization': `Basic ${this.authToken}`
        }
      });

      return response.status === 200;
    } catch (error) {
      console.error('WordPress connection test failed:', error);
      return false;
    }
  }

  async getPost(postId: number): Promise<WordPressPost | null> {
    try {
      const response = await axios.get(
        `${this.config.url}/wp-json/wp/v2/posts/${postId}`,
        {
          headers: {
            'Authorization': `Basic ${this.authToken}`
          }
        }
      );

      return {
        id: response.data.id,
        title: response.data.title.rendered,
        content: response.data.content.rendered,
        status: response.data.status,
        link: response.data.link,
        featured_media: response.data.featured_media
      };
    } catch (error) {
      console.error('Error fetching WordPress post:', error);
      return null;
    }
  }

  async updatePost(postId: number, updates: Partial<WordPressPost>): Promise<PostResult> {
    try {
      const response = await axios.put(
        `${this.config.url}/wp-json/wp/v2/posts/${postId}`,
        updates,
        {
          headers: {
            'Authorization': `Basic ${this.authToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        post: {
          id: response.data.id,
          title: response.data.title.rendered,
          content: response.data.content.rendered,
          status: response.data.status,
          link: response.data.link,
          featured_media: response.data.featured_media
        }
      };
    } catch (error) {
      console.error('Error updating WordPress post:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async deletePost(postId: number): Promise<boolean> {
    try {
      await axios.delete(
        `${this.config.url}/wp-json/wp/v2/posts/${postId}`,
        {
          headers: {
            'Authorization': `Basic ${this.authToken}`
          }
        }
      );

      return true;
    } catch (error) {
      console.error('Error deleting WordPress post:', error);
      return false;
    }
  }

  async uploadImage(imagePath: string): Promise<string | null> {
    try {
      if (!fs.existsSync(imagePath)) {
        console.error('Image file not found:', imagePath);
        return null;
      }

      const formData = new FormData();
      formData.append('file', fs.createReadStream(imagePath));
      formData.append('title', path.basename(imagePath));

      const response = await axios.post(
        `${this.config.url}/wp-json/wp/v2/media`,
        formData,
        {
          headers: {
            'Authorization': `Basic ${this.authToken}`,
            ...formData.getHeaders()
          }
        }
      );

      return response.data.source_url;
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    }
  }

  async embedImagesInContent(content: string, imagePaths: string[]): Promise<string> {
    let updatedContent = content;

    for (const imagePath of imagePaths) {
      const imageUrl = await this.uploadImage(imagePath);
      if (imageUrl) {
        // Add image to content
        updatedContent += `\n\n<img src="${imageUrl}" alt="Article Image" style="max-width: 100%; height: auto;" />\n\n`;
      }
    }

    return updatedContent;
  }
}

export default WordPressService;