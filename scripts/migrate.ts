import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { db } from '../server/db';

async function runMigration() {
  console.log('Starting database migration...');
  
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" SERIAL PRIMARY KEY,
        "username" TEXT NOT NULL UNIQUE,
        "password" TEXT,
        "avatar" TEXT,
        "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
        "last_active" TIMESTAMP DEFAULT NOW() NOT NULL,
        "is_temporary" BOOLEAN DEFAULT FALSE NOT NULL
      );

      CREATE TABLE IF NOT EXISTS "chat_messages" (
        "id" SERIAL PRIMARY KEY,
        "content" TEXT NOT NULL,
        "media" JSONB,
        "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
        "user_id" INTEGER REFERENCES "users"("id"),
        "mentions" TEXT[]
      );

      CREATE TABLE IF NOT EXISTS "topics" (
        "id" SERIAL PRIMARY KEY,
        "title" TEXT NOT NULL,
        "content" TEXT NOT NULL,
        "media" JSONB,
        "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
        "category" TEXT NOT NULL,
        "user_id" INTEGER REFERENCES "users"("id"),
        "is_anonymous" BOOLEAN DEFAULT FALSE NOT NULL,
        "view_count" INTEGER DEFAULT 0 NOT NULL,
        "like_count" INTEGER DEFAULT 0 NOT NULL
      );

      CREATE TABLE IF NOT EXISTS "comments" (
        "id" SERIAL PRIMARY KEY,
        "content" TEXT NOT NULL,
        "media" JSONB,
        "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
        "user_id" INTEGER REFERENCES "users"("id"),
        "is_anonymous" BOOLEAN DEFAULT FALSE NOT NULL,
        "topic_id" INTEGER NOT NULL REFERENCES "topics"("id") ON DELETE CASCADE
      );
    `);
    
    console.log('Database migration completed successfully!');
  } catch (error) {
    console.error('Error during migration:', error);
    process.exit(1);
  }
}

runMigration();