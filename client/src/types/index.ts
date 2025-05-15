/**
 * Các kiểu dữ liệu dùng chung cho ứng dụng
 */

// Kiểu cho người dùng
export interface User {
  id: number;
  username: string;
  avatar: string | null;
  isTemporary: boolean;
  createdAt: string | Date;
  lastActive: string | Date;
}

// Kiểu cho tin nhắn chat
export interface ChatMessage {
  id: number;
  userId: number;
  content: string;
  media?: any; // Có thể là {"1": "path1", "2": "path2"} hoặc kiểu cũ
  createdAt: Date;
  mentions?: string[];
  user?: {
    id: number;
    username: string;
    avatar: string | null;
  } | null;
}

// Kiểu cho chủ đề forum
export interface Topic {
  id: number;
  userId?: number;
  title: string;
  content: string;
  category: string;
  createdAt: string | Date;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  media?: any; // Có thể là {"1": "path1", "2": "path2"} hoặc trống
  isAnonymous?: boolean;
  // Thông tin người tạo - được thêm trong một số API
  user?: {
    id: number;
    username: string;
    avatar: string | null;
  };
}

// Kiểu cho bình luận
export interface Comment {
  id: number;
  topicId: number;
  userId: number;
  content: string;
  createdAt: string | Date;
  media?: any;
  isAnonymous?: boolean;
  parentCommentId?: number | null;
  // Các bình luận phản hồi
  replies?: Comment[];
  // Thông tin người bình luận
  user?: {
    id: number;
    username: string;
    avatar: string | null;
  };
}

// Kiểu cho người dùng online
export interface OnlineUser {
  id: number;
  username: string;
  avatar: string | null;
  lastActive: Date;
}