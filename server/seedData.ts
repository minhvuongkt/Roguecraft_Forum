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
  
  const categories = ['Survival', 'Creative', 'Mods', 'Redstone', 'PvP', 'Servers'];
  
  const topics: InsertTopic[] = [
    {
      userId: users[0].id,
      title: 'Chào mừng đến với diễn đàn Minecraft!',
      content: 'Đây là diễn đàn thảo luận về Minecraft. Hãy tham gia và chia sẻ kinh nghiệm chơi game của bạn!',
      media: null,
      category: 'Servers',
      isAnonymous: false
    },
    {
      userId: users[1].id,
      title: 'Cách xây dựng farm hiệu quả trong Minecraft Survival',
      content: 'Có ai biết cách xây farm hiệu quả trong chế độ Survival không? Tôi muốn tăng nguồn tài nguyên để xây dựng các công trình lớn.',
      media: null,
      category: 'Survival',
      isAnonymous: false
    },
    {
      userId: users[2].id,
      title: 'Top 10 mod Minecraft hay nhất năm 2025',
      content: 'Tôi đã thử qua nhiều mod và đánh giá 10 mod hay nhất. Đặc biệt ấn tượng với Create mod và Biomes O Plenty. Ai cũng đang dùng mod nào thì chia sẻ nhé!',
      media: null,
      category: 'Mods',
      isAnonymous: false
    },
    {
      userId: users[3].id,
      title: 'Hướng dẫn tạo cơ chế Redstone tự động craft',
      content: 'Tôi muốn học cách tạo hệ thống tự động craft items bằng Redstone. Ai có hướng dẫn chi tiết không?',
      media: null,
      category: 'Redstone',
      isAnonymous: false
    },
    {
      userId: users[1].id,
      title: 'Tìm server PvP có nhiều người chơi',
      content: 'Tôi đang tìm server PvP chất lượng với nhiều người chơi. Ai biết server nào tốt không?',
      media: null,
      category: 'PvP',
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
      content: 'Cảm ơn admin vì đã tạo diễn đàn Minecraft này! Rất vui được là một phần của cộng đồng.',
      media: null,
      isAnonymous: false
    },
    {
      topicId: topics[1].id,
      userId: users[2].id,
      content: 'Bạn nên thử farm nguyên liệu bằng villagers, hiệu quả nhất là farm lúa mì và khoai tây.',
      media: null,
      isAnonymous: false
    },
    {
      topicId: topics[1].id,
      userId: users[0].id,
      content: 'Iron golem farm cũng rất quan trọng để có nhiều sắt, nhất là khi chơi ở chế độ survival lâu dài.',
      media: null,
      isAnonymous: false
    },
    {
      topicId: topics[2].id,
      userId: users[3].id,
      content: 'Tôi rất thích mod Applied Energistics 2, giúp quản lý kho đồ dễ dàng hơn nhiều.',
      media: null,
      isAnonymous: false
    },
    {
      topicId: topics[3].id,
      userId: users[2].id,
      content: 'Bạn có thể dùng comparator, hopper và chest để tạo hệ thống sorting tự động rất hiệu quả.',
      media: null,
      isAnonymous: false
    },
    {
      topicId: topics[4].id,
      userId: users[0].id,
      content: 'Bạn có thể thử server Hypixel, rất nhiều người chơi và có nhiều mini-game PvP hay.',
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