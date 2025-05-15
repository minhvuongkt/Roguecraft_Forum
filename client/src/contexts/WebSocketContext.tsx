import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useToast } from '@/hooks/use-toast';
import { WebSocketMessageType } from '@shared/schema';

// Extended WebSocket type with retries property
interface ExtendedWebSocket extends WebSocket {
  retries?: number;
}

// Define the structure of a chat message
export interface ChatMessage {
  id: number;
  userId: number;
  content: string;
  media?: any;
  createdAt: Date;
  mentions?: string[];
  user?: {
    id: number;
    username: string;
    avatar: string | null;
  } | null;
}

// Define online user type
export interface OnlineUser {
  id: number;
  username: string;
  avatar: string | null;
  lastActive: Date;
}

// Define the WebSocket context type
interface WebSocketContextType {
  isConnected: boolean;
  messages: ChatMessage[];
  onlineUsers: OnlineUser[];
  sendMessage: (content: string, media?: any, mentions?: string[]) => void;
  setUsername: (username: string) => void;
}

const WebSocketContext = createContext<WebSocketContextType>({
  isConnected: false,
  messages: [],
  onlineUsers: [],
  sendMessage: () => {},
  setUsername: () => {},
});

export const useWebSocket = () => useContext(WebSocketContext);

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<ExtendedWebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const { user } = useAuth();
  const { toast } = useToast();

  // Function to create and connect WebSocket
  const connectWebSocket = useCallback(() => {
    // Close existing socket if it exists
    if (socket) {
      socket.close();
    }
    
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    console.log('Connecting to WebSocket...', wsUrl);
    const ws = new WebSocket(wsUrl) as ExtendedWebSocket;
    
    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      
      // If user is already authenticated, send username
      if (user) {
        ws.send(JSON.stringify({
          type: WebSocketMessageType.SET_USERNAME,
          payload: { username: user.username }
        }));
      }
    };
    
    ws.onclose = (event) => {
      console.log(`WebSocket disconnected: ${event.code} ${event.reason}`);
      setIsConnected(false);
      
      // Try to reconnect after a delay - using exponential backoff
      // Starting with 1s, max 30s
      const delay = Math.min(30000, 1000 * (2 ** Math.min(5, ws.retries || 0)));
      console.log(`Attempting to reconnect in ${delay}ms`);
      
      setTimeout(() => {
        if (ws.retries === undefined) {
          ws.retries = 0;
        }
        ws.retries++;
        connectWebSocket();
      }, delay);
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
    
    // Add custom property to track reconnection attempts
    ws.retries = 0;
    
    setSocket(ws);
    
    return ws;
  }, [user]);
  
  // Initialize WebSocket connection
  useEffect(() => {
    const ws = connectWebSocket();
    
    // Fetch initial messages
    fetchRecentMessages();
    
    // Clean up WebSocket connection on unmount
    return () => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, []);

  // Handle reconnection when user changes
  useEffect(() => {
    if (socket && isConnected && user) {
      socket.send(JSON.stringify({
        type: WebSocketMessageType.SET_USERNAME,
        payload: { username: user.username }
      }));
      
      // Request online users status
      const statusMsg = JSON.stringify({
        type: WebSocketMessageType.USER_STATUS,
        payload: {}
      });
      console.log('Sending USER_STATUS request:', statusMsg);
      socket.send(statusMsg);
    }
  }, [user, isConnected]);
  
  // Periodically refresh online users
  useEffect(() => {
    if (!isConnected || !socket) return;
    
    const interval = setInterval(() => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        const statusMsg = JSON.stringify({
          type: WebSocketMessageType.USER_STATUS,
          payload: {}
        });
        console.log('Sending periodic USER_STATUS request:', statusMsg);
        socket.send(statusMsg);
      }
    }, 15000); // Every 15 seconds
    
    return () => clearInterval(interval);
  }, [isConnected, socket]);

  // Fetch recent messages from API
  const fetchRecentMessages = async () => {
    try {
      const response = await fetch('/api/chat/messages');
      if (!response.ok) throw new Error('Failed to fetch messages');
      
      const data = await response.json();
      
      // Convert timestamps to Date objects and sort by timestamp (oldest first)
      const processedMessages = data
        .map((msg: any) => ({
          ...msg,
          createdAt: new Date(msg.createdAt)
        }))
        .sort((a: ChatMessage, b: ChatMessage) => 
          a.createdAt.getTime() - b.createdAt.getTime()
        );
      
      setMessages(processedMessages);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  // Handle incoming WebSocket messages
  const handleWebSocketMessage = (data: any) => {
    console.log('Received WebSocket message:', data);
    switch (data.type) {
      case WebSocketMessageType.CHAT_MESSAGE:
        if (data.payload.error) {
          toast({
            title: 'Lỗi',
            description: data.payload.error,
            variant: 'destructive',
          });
        } else {
          // Add new message to the list
          setMessages(prev => [
            ...prev, 
            {
              ...data.payload,
              createdAt: new Date(data.payload.createdAt)
            }
          ]);
          
          // Show notification if message is from someone else
          if (data.payload.userId !== user?.id) {
            // Import hook không hoạt động ở đây, nên chúng ta vẫn phải dùng Notification API trực tiếp
            if (Notification.permission === 'granted') {
              const username = data.payload.user?.username || 'Người dùng';
              try {
                new Notification('Tin nhắn mới', {
                  body: `${username}: ${data.payload.content.substring(0, 50)}${data.payload.content.length > 50 ? '...' : ''}`,
                  icon: '/favicon.ico',
                });
              } catch (error) {
                console.error('Lỗi hiển thị thông báo:', error);
              }
            }
          }
        }
        break;
        
      case WebSocketMessageType.USER_JOINED:
        // Show toast for user joined
        toast({
          title: 'Thông báo',
          description: `${data.payload.username} đã tham gia chat`,
        });
        
        // Add user to online users if not already present
        if (data.payload.user) {
          setOnlineUsers(prevUsers => {
            // Check if user already exists
            const userExists = prevUsers.some(u => u.id === data.payload.user.id);
            if (!userExists) {
              return [...prevUsers, {
                ...data.payload.user,
                lastActive: new Date()
              }];
            }
            return prevUsers;
          });
        }
        break;
        
      case WebSocketMessageType.USER_LEFT:
        // Show toast for user left
        toast({
          title: 'Thông báo',
          description: `${data.payload.username} đã rời khỏi chat`,
        });
        
        // Remove user from online users
        if (data.payload.userId) {
          setOnlineUsers(prevUsers => 
            prevUsers.filter(user => user.id !== data.payload.userId)
          );
        }
        break;
        
      case WebSocketMessageType.USER_STATUS:
        // Update online users list
        if (data.payload.users && Array.isArray(data.payload.users)) {
          setOnlineUsers(data.payload.users.map((user: any) => ({
            ...user,
            lastActive: new Date(user.lastActive || Date.now())
          })));
        }
        break;
        
      case WebSocketMessageType.SET_USERNAME:
        if (data.payload.error) {
          toast({
            title: 'Lỗi',
            description: data.payload.error,
            variant: 'destructive',
          });
        }
        break;
        
      default:
        console.log('Unhandled WebSocket message type:', data.type);
    }
  };

  // Send a chat message
  const sendMessage = useCallback((content: string, media?: any, mentions?: string[]) => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      toast({
        title: 'Lỗi kết nối',
        description: 'Không thể gửi tin nhắn. Vui lòng thử lại sau.',
        variant: 'destructive',
      });
      return;
    }
    
    socket.send(JSON.stringify({
      type: WebSocketMessageType.CHAT_MESSAGE,
      payload: {
        content,
        media,
        mentions,
      }
    }));
  }, [socket, toast]);

  // Set username via WebSocket
  const setUsername = useCallback((username: string) => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      toast({
        title: 'Lỗi kết nối',
        description: 'Không thể đặt tên. Vui lòng thử lại sau.',
        variant: 'destructive',
      });
      return;
    }
    
    socket.send(JSON.stringify({
      type: WebSocketMessageType.SET_USERNAME,
      payload: { username }
    }));
  }, [socket, toast]);

  return (
    <WebSocketContext.Provider 
      value={{ 
        isConnected,
        messages,
        onlineUsers,
        sendMessage,
        setUsername
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
};
