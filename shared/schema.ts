import { mysqlTable, varchar, int, boolean, timestamp, json, unique, primaryKey } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  username: varchar("username", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }),
  avatar: varchar("avatar", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
  lastActive: timestamp("last_active").defaultNow(),
  isTemporary: boolean("is_temporary").default(true),
});

export const insertUserSchema = createInsertSchema(users)
  .pick({
    username: true,
    password: true,
    avatar: true,
    isTemporary: true,
  })
  .extend({
    username: z.string()
      .min(3, "Username phải có ít nhất 3 ký tự")
      .max(20, "Username không được quá 20 ký tự")
      .regex(/^[a-zA-Z0-9_]+$/, "Username chỉ được chứa chữ cái Latin, số và dấu gạch dưới (_)"),
  });

// Chat message schema
export const chatMessages = mysqlTable("chat_messages", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").references(() => users.id),
  content: varchar("content", { length: 1000 }).notNull(),
  media: json("media").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").defaultNow(),
  mentions: json("mentions").$type<string[]>(),
  replyToMessageId: int("reply_to_message_id"),
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).pick({
  userId: true,
  content: true,
  media: true,
  mentions: true,
  replyToMessageId: true,
});

// Topics schema
export const topics = mysqlTable("topics", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").references(() => users.id),
  title: varchar("title", { length: 255 }).notNull(),
  content: varchar("content", { length: 10000 }).notNull(),
  media: json("media").$type<Record<string, any>>(),
  category: varchar("category", { length: 50 }).notNull(),
  isAnonymous: boolean("is_anonymous").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  viewCount: int("view_count").default(0),
  likeCount: int("like_count").default(0),
  commentCount: int("comment_count").default(0),
});

export const insertTopicSchema = createInsertSchema(topics).pick({
  userId: true,
  title: true,
  content: true,
  media: true,
  category: true,
  isAnonymous: true,
});

// Comments schema (self-referencing foreign key cannot be enforced in Drizzle+TS, see comment)
export const comments = mysqlTable("comments", {
  id: int("id").autoincrement().primaryKey(),
  topicId: int("topic_id").references(() => topics.id),
  userId: int("user_id").references(() => users.id),
  content: varchar("content", { length: 1000 }).notNull(),
  media: json("media").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").defaultNow(),
  isAnonymous: boolean("is_anonymous").default(false),
  parentCommentId: int("parent_comment_id"), // Self-referencing FK not enforced here; see migration
});

// Topic likes schema
export const topicLikes = mysqlTable("topic_likes", {
  id: int("id").autoincrement().primaryKey(),
  topicId: int("topic_id").references(() => topics.id),
  userId: int("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  uniqueUserTopic: unique().on(table.userId, table.topicId),
}));

export const insertCommentSchema = createInsertSchema(comments).pick({
  topicId: true,
  userId: true,
  content: true,
  media: true,
  isAnonymous: true,
  parentCommentId: true,
});

// Create insert schema for topic likes
export const insertTopicLikeSchema = createInsertSchema(topicLikes).pick({
  topicId: true,
  userId: true,
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

export type InsertTopicLike = z.infer<typeof insertTopicLikeSchema>;
export type TopicLike = typeof topicLikes.$inferSelect;

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
