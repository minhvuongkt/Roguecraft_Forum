// Các hàm truy vấn/xoá phục vụ cleanup tự động, sử dụng Drizzle + MySQL
import { db } from '../db';
import { users, topics, comments, chatMessages } from '@shared/schema';
import { eq } from 'drizzle-orm';

// Lấy toàn bộ user tạm thời (cho cleanup)
export async function getAllUsers() {
  // Chỉ lấy các trường cần thiết để cleanup
  const rows = await db.select({
    id: users.id,
    isTemporary: users.isTemporary,
    createdAt: users.createdAt
  }).from(users);
  return rows as unknown as { id: number; isTemporary: boolean; createdAt: string }[];
}

// Lấy toàn bộ chat messages (để xóa message cũ)
export async function getAllChatMessages() {
  const rows = await db.select({
    id: chatMessages.id,
    createdAt: chatMessages.createdAt,
    media: chatMessages.media
  }).from(chatMessages);
  // Media có thể là JSON hoặc null
  return rows.map(row => ({
    ...row,
    media: row.media ? typeof row.media === 'string' ? JSON.parse(row.media) : row.media : null
  }));
}

// Lấy tất cả chat message của 1 user (dọn user tạm)
export async function getChatMessagesByUserId(userId: number) {
  const rows = await db.select({
    id: chatMessages.id,
    createdAt: chatMessages.createdAt,
    media: chatMessages.media
  }).from(chatMessages).where(eq(chatMessages.userId, userId));
  return rows.map(row => ({
    ...row,
    media: row.media ? typeof row.media === 'string' ? JSON.parse(row.media) : row.media : null
  }));
}

// Xoá 1 chat message by id
export async function deleteChatMessage(id: number) {
  await db.delete(chatMessages).where(eq(chatMessages.id, id));
}

// Lấy tất cả comment của 1 user
export async function getCommentsByUserId(userId: number) {
  const rows = await db.select({
    id: comments.id,
    createdAt: comments.createdAt,
    media: comments.media
  }).from(comments).where(eq(comments.userId, userId));
  return rows.map(row => ({
    ...row,
    media: row.media ? typeof row.media === 'string' ? JSON.parse(row.media) : row.media : null
  }));
}

// Xoá 1 comment by id
export async function deleteComment(id: number) {
  await db.delete(comments).where(eq(comments.id, id));
}

// Lấy tất cả topic của 1 user
export async function getTopicsByUserId(userId: number) {
  const rows = await db.select({
    id: topics.id,
    createdAt: topics.createdAt,
    media: topics.media
  }).from(topics).where(eq(topics.userId, userId));
  return rows.map(row => ({
    ...row,
    media: row.media ? typeof row.media === 'string' ? JSON.parse(row.media) : row.media : null
  }));
}

// Xoá 1 topic by id
export async function deleteTopic(id: number) {
  await db.delete(topics).where(eq(topics.id, id));
}

// Xoá 1 user by id
export async function deleteUser(id: number) {
  await db.delete(users).where(eq(users.id, id));
}