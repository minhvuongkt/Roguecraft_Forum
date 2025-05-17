import * as storage from './databseServiceCleanup';
import fs from "fs";
import path from "path";
interface User {
  id: number;
  isTemporary: boolean;
  createdAt: string;
}

interface FileContainer {
  id: number;
  createdAt: string | Date | null;
  media?: Record<string, string> | null;
}

async function safeDeleteFile(filePath: string): Promise<void> {
  if (!filePath) return;
  
  try {
    const uploadsDir = path.resolve(__dirname, '../public/');
    const normalizedPath = path.resolve(filePath);
    
    if (!normalizedPath.startsWith(uploadsDir)) {
      console.warn("[Cleanup] Không xoá file ngoài thư mục uploads:", filePath);
      return;
    }
    
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
      console.log("[Cleanup] Đã xoá file:", filePath);
    }
  } catch (error) {
    console.warn("[Cleanup] Lỗi xoá file", filePath, error);
  }
}
async function getExpiredTemporaryUsers(): Promise<User[]> {
  if (typeof storage.getAllUsers !== 'function') {
    console.error("[Cleanup] Lỗi: storage.getAllUsers không phải là một hàm");
    return [];
  }

  try {
    const users: User[] = await storage.getAllUsers() || [];
    const now = Date.now();
    const SEVEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;
    
    return users.filter(
      (u) =>
        u.isTemporary &&
        u.createdAt &&
        now - new Date(u.createdAt).getTime() > SEVEN_DAYS_MS
    );
  } catch (error) {
    console.error("[Cleanup] Lỗi khi lấy danh sách user tạm:", error);
    return [];
  }
}
async function deleteUserAndRelatedData(userId: number): Promise<void> {
  try {
    // 1. Xoá chat messages của user
    if (typeof storage.getChatMessagesByUserId === 'function') {
      const messages = await storage.getChatMessagesByUserId(userId) || [];
      for (const msg of messages) {
        await deleteMediaFiles(msg);
        if (typeof storage.deleteChatMessage === 'function') {
          await storage.deleteChatMessage(msg.id);
        }
      }
    }
    if (typeof storage.getCommentsByUserId === 'function') {
      const comments = await storage.getCommentsByUserId(userId) || [];
      for (const cmt of comments) {
        await deleteMediaFiles(cmt);
        if (typeof storage.deleteComment === 'function') {
          await storage.deleteComment(cmt.id);
        }
      }
    }
    if (typeof storage.getTopicsByUserId === 'function') {
      const topics = await storage.getTopicsByUserId(userId) || [];
      for (const topic of topics) {
        await deleteMediaFiles(topic);
        if (typeof storage.deleteTopic === 'function') {
          await storage.deleteTopic(topic.id);
        }
      }
    }
    if (typeof storage.deleteUser === 'function') {
      await storage.deleteUser(userId);
      console.log(`[Cleanup] Đã xoá user tạm thời và dữ liệu liên quan: UserID=${userId}`);
    }
  } catch (error) {
    console.error(`[Cleanup] Lỗi khi xoá user ${userId}:`, error);
  }
}

async function deleteMediaFiles(item: FileContainer): Promise<void> {
  if (item.media && typeof item.media === "object") {
    for (const file of Object.values(item.media)) {
      if (typeof file === 'string') {
        await safeDeleteFile(file);
      }
    }
  }
}

async function deleteOldMessagesAndFiles(): Promise<void> {
  if (typeof storage.getAllChatMessages !== 'function') {
    console.error("[Cleanup] Lỗi: storage.getAllChatMessages không phải là một hàm");
    return;
  }

  try {
    const FOUR_DAYS_MS = 4 * 24 * 60 * 60 * 1000;
    const cutoff = Date.now() - FOUR_DAYS_MS;
    const messages: FileContainer[] = await storage.getAllChatMessages() || [];
    
    for (const msg of messages) {
      if (msg.createdAt && new Date(msg.createdAt).getTime() < cutoff) {
        await deleteMediaFiles(msg);
        if (typeof storage.deleteChatMessage === 'function') {
          await storage.deleteChatMessage(msg.id);
          console.log(`[Cleanup] Đã xoá chat message cũ: ID=${msg.id}`);
        }
      }
    }
  } catch (error) {
    console.error("[Cleanup] Lỗi khi xoá tin nhắn cũ:", error);
  }
}

export async function autoCleanupTask(): Promise<void> {
  console.log("[Cleanup] Bắt đầu dọn dẹp tự động...");

  try {
    // 1. Xoá user tạm đã quá hạn
    const expiredUsers = await getExpiredTemporaryUsers();
    console.log(`[Cleanup] Tìm thấy ${expiredUsers.length} user tạm hết hạn cần xoá`);
    for (const user of expiredUsers) {
      await deleteUserAndRelatedData(user.id);
    }

    // 2. Xoá message cũ quá 4 ngày
    await deleteOldMessagesAndFiles();

    console.log("[Cleanup] Đã hoàn thành dọn dẹp tự động.");
  } catch (error) {
    console.error("[Cleanup] Lỗi trong quá trình dọn dẹp:", error);
  }
}

export function startCleanupScheduler(): NodeJS.Timeout {
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  console.log("[Cleanup] Khởi động hệ thống dọn dẹp tự động");
  const initialTimeout = setTimeout(async () => {
    try {
      await autoCleanupTask();
    } catch (e) {
      console.error("[Cleanup] Lỗi khi dọn dẹp tự động:", e);
    }
  }, 5000);
  const interval = setInterval(async () => {
    try {
      await autoCleanupTask();
    } catch (e) {
      console.error("[Cleanup] Lỗi khi dọn dẹp tự động:", e);
    }
  }, ONE_DAY_MS);
  return interval;
}
