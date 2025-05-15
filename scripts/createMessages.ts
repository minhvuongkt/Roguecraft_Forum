import { storage } from "../server/storage";
import { InsertChatMessage } from "@shared/schema";

async function createChatMessages() {
  try {
    console.log("Xóa và tạo tin nhắn chat mới...");
    
    // Lấy danh sách người dùng hiện có
    const users = [
      await storage.getUserByUsername("admin"),
      await storage.getUserByUsername("nguyenvan"),
      await storage.getUserByUsername("thanhha"),
      await storage.getUserByUsername("minhanh")
    ].filter(Boolean);
    
    if (users.length === 0) {
      console.log("Không tìm thấy người dùng, vui lòng chạy seedData trước.");
      return;
    }
    
    // Tạo tin nhắn mới
    const messages: InsertChatMessage[] = [
      {
        userId: users[0].id,
        content: 'Xin chào mọi người! Đây là chatbox mới của chúng ta.',
        media: null,
        mentions: []
      },
      {
        userId: users[1].id,
        content: 'Chào admin, rất vui được tham gia!',
        media: null,
        mentions: []
      },
      {
        userId: users[2].id,
        content: 'Mọi người đang làm gì vậy?',
        media: null,
        mentions: []
      },
      {
        userId: users[3].id,
        content: '@thanhha Tôi đang học lập trình React và NodeJS.',
        media: null,
        mentions: ['thanhha']
      },
      {
        userId: users[2].id,
        content: '@minhanh Tuyệt quá! Tôi cũng đang học ReactJS.',
        media: null,
        mentions: ['minhanh']
      },
      {
        userId: users[0].id,
        content: 'Nhớ mọi người dùng lệnh /ten [tên của bạn] để đặt tên nhé!',
        media: null,
        mentions: []
      },
      {
        userId: users[1].id,
        content: 'Ai biết cách tag người dùng khác không?',
        media: null,
        mentions: []
      },
      {
        userId: users[0].id,
        content: '@nguyenvan Bạn chỉ cần gõ @ và tên người dùng, ví dụ @admin',
        media: null,
        mentions: ['nguyenvan']
      }
    ];
    
    // Tạo tin nhắn
    for (const message of messages) {
      await storage.createChatMessage(message);
      console.log(`Đã tạo tin nhắn: ${message.content}`);
    }
    
    console.log("Hoàn thành việc tạo tin nhắn chat.");
  } catch (error) {
    console.error("Lỗi khi tạo tin nhắn chat:", error);
  }
}

createChatMessages();