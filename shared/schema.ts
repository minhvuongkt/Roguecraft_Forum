import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password"),
  avatar: text("avatar"),
  createdAt: timestamp("created_at").defaultNow(),
  lastActive: timestamp("last_active").defaultNow(),
  isTemporary: boolean("is_temporary").default(true),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  avatar: true,
  isTemporary: true,
});

// Chat message schema
export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  content: text("content").notNull(),
  media: jsonb("media"),
  createdAt: timestamp("created_at").defaultNow(),
  mentions: text("mentions").array(),
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).pick({
  userId: true,
  content: true,
  media: true,
  mentions: true,
});

// Forum topic schema
export const topics = pgTable("topics", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  title: text("title").notNull(),
  content: text("content").notNull(),
  media: jsonb("media"),
  category: text("category").notNull(),
  isAnonymous: boolean("is_anonymous").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  viewCount: integer("view_count").default(0),
  likeCount: integer("like_count").default(0),
});

export const insertTopicSchema = createInsertSchema(topics).pick({
  userId: true,
  title: true,
  content: true,
  media: true,
  category: true,
  isAnonymous: true,
});

// Forum comment schema
export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  topicId: integer("topic_id").references(() => topics.id),
  userId: integer("user_id").references(() => users.id),
  content: text("content").notNull(),
  media: jsonb("media"),
  createdAt: timestamp("created_at").defaultNow(),
  isAnonymous: boolean("is_anonymous").default(false),
});

export const insertCommentSchema = createInsertSchema(comments).pick({
  topicId: true,
  userId: true,
  content: true,
  media: true,
  isAnonymous: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;

export type InsertTopic = z.infer<typeof insertTopicSchema>;
export type Topic = typeof topics.$inferSelect;

export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Comment = typeof comments.$inferSelect;

// Websocket message types
export enum WebSocketMessageType {
  SET_USERNAME = "SET_USERNAME",
  CHAT_MESSAGE = "CHAT_MESSAGE",
  USER_JOINED = "USER_JOINED",
  USER_LEFT = "USER_LEFT",
  USER_STATUS = "USER_STATUS",
}

export interface WebSocketMessage {
  type: WebSocketMessageType;
  payload: any;
}
