import { storage } from './storage';
import { InsertUser, InsertTopic, InsertChatMessage, InsertComment } from '@shared/schema';

/**
 * Add sample data to the in-memory database
 */
export async function seedData() {
  console.log('Seeding database with sample data...');
  
  // Create sample users
  const users = await createSampleUsers();
  
  // Create sample topics
  const topics = await createSampleTopics(users);
  
  // Create sample comments
  await createSampleComments(users, topics);
  
  // Create sample chat messages
  await createSampleChatMessages(users);
  
  console.log('Database seeded successfully!');
}

async function createSampleUsers() {
  const users: InsertUser[] = [
    {
      username: 'admin',
      password: 'admin123',
      avatar: null,
      isTemporary: false
    },
    {
      username: 'nguyenvan',
      password: 'password123',
      avatar: null,
      isTemporary: false
    },
    {
      username: 'thanhha',
      password: 'password123',
      avatar: null,
      isTemporary: false
    },
    {
      username: 'minhanh',
      password: 'password123',
      avatar: null,
      isTemporary: false
    }
  ];
  
  const createdUsers = [];
  
  for (const user of users) {
    try {
      const createdUser = await storage.createUser(user);
      createdUsers.push(createdUser);
    } catch (error) {
      console.error(`Failed to create user ${user.username}:`, error);
    }
  }
  
  return createdUsers;
}

async function createSampleTopics(users: any[]) {
  if (users.length === 0) return [];
  
  const categories = ['Công nghệ', 'Giải trí', 'Hỏi đáp', 'Chia sẻ'];
  
  const topics: InsertTopic[] = [
    {
      userId: users[0].id,
      title: 'Chào mừng đến với diễn đàn!',
      content: 'Đây là diễn đàn thảo luận và trò chuyện trực tuyến. Hãy tham gia và chia sẻ ý kiến của bạn!',
      media: null,
      category: 'Công nghệ',
      isAnonymous: false
    },
    {
      userId: users[1].id,
      title: 'Cách tối ưu hóa website React',
      content: 'Có ai biết các cách tối ưu hóa hiệu suất cho ứng dụng React không? Tôi đang gặp vấn đề với việc render lại quá nhiều lần.',
      media: null,
      category: 'Công nghệ',
      isAnonymous: false
    },
    {
      userId: users[2].id,
      title: 'Review phim mới - Avengers',
      content: 'Phim rất hay với những cảnh hành động mãn nhãn. Tôi đánh giá 9/10. Ai đã xem rồi thì chia sẻ cảm nhận nhé!',
      media: null,
      category: 'Giải trí',
      isAnonymous: false
    },
    {
      userId: users[3].id,
      title: 'Cách nấu phở ngon tại nhà',
      content: 'Tôi muốn học cách nấu phở ngon tại nhà. Ai có công thức chia sẻ không?',
      media: null,
      category: 'Chia sẻ',
      isAnonymous: false
    },
    {
      userId: users[1].id,
      title: 'Bài tập lập trình khó quá, giúp với!',
      content: 'Tôi đang gặp khó khăn với bài tập về thuật toán đệ quy. Có ai giúp được không?',
      media: null,
      category: 'Hỏi đáp',
      isAnonymous: true
    }
  ];
  
  const createdTopics = [];
  
  for (const topic of topics) {
    try {
      const createdTopic = await storage.createTopic(topic);
      createdTopics.push(createdTopic);
      
      // Add some views and likes to each topic
      const viewCount = Math.floor(Math.random() * 100);
      for (let i = 0; i < viewCount; i++) {
        await storage.incrementTopicViews(createdTopic.id);
      }
      
      const likeCount = Math.floor(Math.random() * 30);
      for (let i = 0; i < likeCount; i++) {
        await storage.toggleTopicLike(createdTopic.id, true);
      }
    } catch (error) {
      console.error(`Failed to create topic ${topic.title}:`, error);
    }
  }
  
  return createdTopics;
}

async function createSampleComments(users: any[], topics: any[]) {
  if (users.length === 0 || topics.length === 0) return;
  
  const comments: InsertComment[] = [
    {
      topicId: topics[0].id,
      userId: users[1].id,
      content: 'Cảm ơn admin vì đã tạo diễn đàn này!',
      media: null,
      isAnonymous: false
    },
    {
      topicId: topics[1].id,
      userId: users[2].id,
      content: 'Bạn có thể sử dụng React.memo hoặc useMemo để tránh render không cần thiết.',
      media: null,
      isAnonymous: false
    },
    {
      topicId: topics[1].id,
      userId: users[0].id,
      content: 'Việc sử dụng các hook như useCallback cũng rất quan trọng.',
      media: null,
      isAnonymous: false
    },
    {
      topicId: topics[2].id,
      userId: users[3].id,
      content: 'Tôi cũng đã xem và đánh giá 8/10. Nội dung hơi dài nhưng cảnh quay rất đẹp.',
      media: null,
      isAnonymous: false
    },
    {
      topicId: topics[3].id,
      userId: users[2].id,
      content: 'Tôi có công thức nấu phở gia truyền, để tôi chia sẻ cho bạn...',
      media: null,
      isAnonymous: false
    },
    {
      topicId: topics[4].id,
      userId: users[0].id,
      content: 'Bạn có thể chia sẻ đoạn code cụ thể không để tôi giúp đỡ?',
      media: null,
      isAnonymous: false
    }
  ];
  
  for (const comment of comments) {
    try {
      await storage.createComment(comment);
    } catch (error) {
      console.error(`Failed to create comment for topic ${comment.topicId}:`, error);
    }
  }
}

async function createSampleChatMessages(users: any[]) {
  if (users.length === 0) return;
  
  // Kiểm tra xem đã có tin nhắn chưa để tránh tạo trùng lặp
  const existingMessages = await storage.getChatMessagesByDateRange(3);
  if (existingMessages.length > 0) {
    console.log('Chat messages already exist, skipping chat message creation.');
    return;
  }
  
  // Create messages from the past few days to show the 3-day history feature
  const now = new Date();
  const threeDaysAgo = new Date(now);
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 2); // 2 days ago to be within the 3-day limit
  
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
  
  // Trong PostgreSQL, chúng ta không thể trực tiếp sửa createdAt sau khi tạo
  // Thay vào đó, chúng ta sẽ tạo tin nhắn với thời gian hiện tại
  for (const message of messages) {
    try {
      await storage.createChatMessage(message);
    } catch (error) {
      console.error(`Failed to create chat message:`, error);
    }
  }
}