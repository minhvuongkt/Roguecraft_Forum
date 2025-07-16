import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';

export interface ScrapedArticle {
  id?: number;
  url: string;
  title: string;
  content: string;
  thumbnail: string;
  images: string[];
  videos: string[];
  source_site: string;
  scraped_at: Date;
  posted_to_wordpress: boolean;
  posted_to_threads: boolean;
  wordpress_url?: string;
  threads_id?: string;
}

export interface WebsiteSource {
  id?: number;
  name: string;
  url: string;
  enabled: boolean;
  created_at: Date;
}

export interface AppConfig {
  id?: number;
  key: string;
  value: string;
  updated_at: Date;
}

export interface PostingHistory {
  id?: number;
  article_id: number;
  platform: 'wordpress' | 'threads';
  status: 'success' | 'failed';
  response_data?: string;
  posted_at: Date;
}

export class AutoPosterDatabase {
  private db: Database<sqlite3.Database, sqlite3.Statement> | null = null;

  async init(): Promise<void> {
    this.db = await open({
      filename: path.join(process.cwd(), 'auto-poster', 'database.sqlite'),
      driver: sqlite3.Database
    });

    await this.createTables();
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // Create scraped_articles table
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS scraped_articles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        url TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        thumbnail TEXT,
        images TEXT, -- JSON array of image URLs
        videos TEXT, -- JSON array of video URLs
        source_site TEXT NOT NULL,
        scraped_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        posted_to_wordpress BOOLEAN DEFAULT FALSE,
        posted_to_threads BOOLEAN DEFAULT FALSE,
        wordpress_url TEXT,
        threads_id TEXT
      )
    `);

    // Create website_sources table
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS website_sources (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        url TEXT UNIQUE NOT NULL,
        enabled BOOLEAN DEFAULT TRUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create app_config table
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS app_config (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT UNIQUE NOT NULL,
        value TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create posting_history table
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS posting_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        article_id INTEGER NOT NULL,
        platform TEXT NOT NULL,
        status TEXT NOT NULL,
        response_data TEXT,
        posted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (article_id) REFERENCES scraped_articles (id)
      )
    `);

    // Insert default configuration
    await this.insertDefaultConfig();
  }

  private async insertDefaultConfig(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const defaultConfigs = [
      { key: 'wordpress_url', value: '' },
      { key: 'wordpress_username', value: '' },
      { key: 'wordpress_password', value: '' },
      { key: 'gpm_api_url', value: '' },
      { key: 'gpm_profile_group_id', value: '' },
      { key: 'gpt_api_key', value: '' },
      { key: 'max_posts_per_day', value: '10' },
      { key: 'max_posts_per_batch', value: '3' },
      { key: 'articles_per_site', value: '5' },
      { key: 'thread_posting_delay', value: '3600' }, // 1 hour in seconds
      { key: 'thread_count', value: '1' },
      { key: 'posting_schedule', value: '0 */6 * * *' }, // Every 6 hours
    ];

    for (const config of defaultConfigs) {
      await this.db.run(
        `INSERT OR IGNORE INTO app_config (key, value) VALUES (?, ?)`,
        [config.key, config.value]
      );
    }
  }

  // Article methods
  async saveScrapedArticle(article: Omit<ScrapedArticle, 'id'>): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.run(
      `INSERT INTO scraped_articles (url, title, content, thumbnail, images, videos, source_site, scraped_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        article.url,
        article.title,
        article.content,
        article.thumbnail,
        JSON.stringify(article.images),
        JSON.stringify(article.videos),
        article.source_site,
        article.scraped_at.toISOString()
      ]
    );

    return result.lastID as number;
  }

  async getUnpostedArticles(limit: number = 10): Promise<ScrapedArticle[]> {
    if (!this.db) throw new Error('Database not initialized');

    const rows = await this.db.all(
      `SELECT * FROM scraped_articles 
       WHERE posted_to_wordpress = FALSE 
       ORDER BY scraped_at DESC 
       LIMIT ?`,
      [limit]
    );

    return rows.map(row => ({
      ...row,
      images: JSON.parse(row.images || '[]'),
      videos: JSON.parse(row.videos || '[]'),
      scraped_at: new Date(row.scraped_at)
    }));
  }

  async markArticleAsPosted(articleId: number, platform: 'wordpress' | 'threads', url?: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    if (platform === 'wordpress') {
      await this.db.run(
        `UPDATE scraped_articles SET posted_to_wordpress = TRUE, wordpress_url = ? WHERE id = ?`,
        [url, articleId]
      );
    } else {
      await this.db.run(
        `UPDATE scraped_articles SET posted_to_threads = TRUE, threads_id = ? WHERE id = ?`,
        [url, articleId]
      );
    }
  }

  // Website source methods
  async getWebsiteSources(): Promise<WebsiteSource[]> {
    if (!this.db) throw new Error('Database not initialized');

    const rows = await this.db.all(
      `SELECT * FROM website_sources WHERE enabled = TRUE ORDER BY created_at DESC`
    );

    return rows.map(row => ({
      ...row,
      created_at: new Date(row.created_at)
    }));
  }

  async addWebsiteSource(source: Omit<WebsiteSource, 'id' | 'created_at'>): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.run(
      `INSERT INTO website_sources (name, url, enabled) VALUES (?, ?, ?)`,
      [source.name, source.url, source.enabled]
    );

    return result.lastID as number;
  }

  async updateWebsiteSource(id: number, source: Partial<WebsiteSource>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const fields = [];
    const values = [];

    if (source.name !== undefined) {
      fields.push('name = ?');
      values.push(source.name);
    }
    if (source.url !== undefined) {
      fields.push('url = ?');
      values.push(source.url);
    }
    if (source.enabled !== undefined) {
      fields.push('enabled = ?');
      values.push(source.enabled);
    }

    if (fields.length > 0) {
      values.push(id);
      await this.db.run(
        `UPDATE website_sources SET ${fields.join(', ')} WHERE id = ?`,
        values
      );
    }
  }

  async deleteWebsiteSource(id: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.run(`DELETE FROM website_sources WHERE id = ?`, [id]);
  }

  // Configuration methods
  async getConfig(key: string): Promise<string | null> {
    if (!this.db) throw new Error('Database not initialized');

    const row = await this.db.get(`SELECT value FROM app_config WHERE key = ?`, [key]);
    return row ? row.value : null;
  }

  async setConfig(key: string, value: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.run(
      `INSERT OR REPLACE INTO app_config (key, value, updated_at) VALUES (?, ?, ?)`,
      [key, value, new Date().toISOString()]
    );
  }

  async getAllConfig(): Promise<Record<string, string>> {
    if (!this.db) throw new Error('Database not initialized');

    const rows = await this.db.all(`SELECT key, value FROM app_config`);
    const config: Record<string, string> = {};
    
    for (const row of rows) {
      config[row.key] = row.value;
    }

    return config;
  }

  // History methods
  async addPostingHistory(history: Omit<PostingHistory, 'id' | 'posted_at'>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.run(
      `INSERT INTO posting_history (article_id, platform, status, response_data) VALUES (?, ?, ?, ?)`,
      [history.article_id, history.platform, history.status, history.response_data]
    );
  }

  async getPostingHistory(limit: number = 100): Promise<PostingHistory[]> {
    if (!this.db) throw new Error('Database not initialized');

    const rows = await this.db.all(
      `SELECT * FROM posting_history ORDER BY posted_at DESC LIMIT ?`,
      [limit]
    );

    return rows.map(row => ({
      ...row,
      posted_at: new Date(row.posted_at)
    }));
  }

  async close(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
    }
  }
}

export const database = new AutoPosterDatabase();