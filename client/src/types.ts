export interface OnlineUser {
  id: number;
  username: string;
  avatar: string | null;
  lastActive: Date;
}

export interface ChatMessage {
  id: number;
  userId: number;
  content: string;
  media: Record<string, string> | null;
  createdAt: Date;
  mentions: string[] | null;
  user?: {
    id: number;
    username: string;
    avatar: string | null;
  };
}