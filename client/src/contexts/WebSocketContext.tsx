import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useToast } from '@/hooks/use-toast';
import { WebSocketMessageType } from '@shared/schema';

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

// Define the WebSocket context type
interface WebSocketContextType {
  isConnected: boolean;
  messages: ChatMessage[];
  sendMessage: (content: string, media?: any, mentions?: string[]) => void;
  setUsername: (username: string) => void;
}

const WebSocketContext = createContext<WebSocketContextType>({
  isConnected: false,
  messages: [],
  sendMessage: () => {},
  setUsername: () => {},
});

export const useWebSocket = () => useContext(WebSocketContext);

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const { user } = useAuth();
  const { toast } = useToast();

  // Initialize WebSocket connection
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const ws = new WebSocket(wsUrl);
    
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
    
    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
      
      // Try to reconnect after a delay
      setTimeout(() => {
        setSocket(null);
      }, 5000);
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
    
    setSocket(ws);
    
    // Fetch initial messages
    fetchRecentMessages();
    
    // Clean up WebSocket connection on unmount
    return () => {
      if (ws.readyState === WebSocket.OPEN) {
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
    }
  }, [user, isConnected]);

  // Fetch recent messages from API
  const fetchRecentMessages = async () => {
    try {
      const response = await fetch('/api/chat/messages');
      if (!response.ok) throw new Error('Failed to fetch messages');
      
      const data = await response.json();
      setMessages(data.map((msg: any) => ({
        ...msg,
        createdAt: new Date(msg.createdAt)
      })));
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  // Handle incoming WebSocket messages
  const handleWebSocketMessage = (data: any) => {
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
          if (data.payload.userId !== user?.id && Notification.permission === 'granted') {
            const username = data.payload.user?.username || 'Người dùng';
            new Notification('Tin nhắn mới', {
              body: `${username}: ${data.payload.content.substring(0, 50)}${data.payload.content.length > 50 ? '...' : ''}`,
            });
          }
        }
        break;
        
      case WebSocketMessageType.USER_JOINED:
        // Show toast for user joined
        toast({
          title: 'Thông báo',
          description: `${data.payload.username} đã tham gia chat`,
        });
        break;
        
      case WebSocketMessageType.USER_LEFT:
        // Show toast for user left
        toast({
          title: 'Thông báo',
          description: `${data.payload.username} đã rời khỏi chat`,
        });
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
        sendMessage,
        setUsername
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
};
