export interface User {
  id: number;
  username: string;
  avatar: string | null;
  isTemporary: boolean;
  createdAt: string | Date;
  lastActive: string | Date;
  expiresAt?: string | Date; // Added expiresAt for temporary user expiration tracking
}

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
  user?: {
    id: number;
    username: string;
    avatar: string | null;
  };
}

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
  user?: {
    id: number;
    username: string;
    avatar: string | null;
  };
}

export interface OnlineUser {
  id: number;
  username: string;
  avatar: string | null;
  lastActive: Date;
}

export interface UserProfile extends User {
  bio?: string;
  joinDate?: string;
  location?: string;
  email?: string;
  birthday?: string;
  totalPosts?: number;
  totalComments?: number;
}