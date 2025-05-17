import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  useCallback,
} from "react";
import { useAuth } from "./AuthContext";
import { useToast } from "@/hooks/use-toast";
import { WebSocketMessageType } from "@shared/schema";
import { ChatMessage, OnlineUser } from "@/types";

// Extended WebSocket type with retries property
interface ExtendedWebSocket extends WebSocket {
  retries?: number;
}

// Define the WebSocket context type
interface WebSocketContextType {
  isConnected: boolean;
  messages: ChatMessage[];
  onlineUsers: OnlineUser[];
  sendMessage: (
    content: string,
    media?: any,
    mentions?: string[],
    replyToMessageId?: number | string | null,
  ) => void;
  setUsername: (username: string) => void;
  findMessagesByUsername: (username: string) => ChatMessage[];
  findMessageById: (messageId: number) => ChatMessage | undefined;
}

const WebSocketContext = createContext<WebSocketContextType>({
  isConnected: false,
  messages: [],
  onlineUsers: [],
  sendMessage: () => {},
  setUsername: () => {},
  findMessagesByUsername: () => [],
  findMessageById: () => undefined,
});

export const useWebSocket = () => useContext(WebSocketContext);

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
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

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    console.log("Connecting to WebSocket...", wsUrl);
    const ws = new WebSocket(wsUrl) as ExtendedWebSocket;

    ws.onopen = () => {
      console.log("WebSocket connected");
      setIsConnected(true);

      // If user is already authenticated, send username
      if (user) {
        ws.send(
          JSON.stringify({
            type: WebSocketMessageType.SET_USERNAME,
            payload: { username: user.username },
          }),
        );
      }
    };

    ws.onclose = (event) => {
      console.log(`WebSocket disconnected: ${event.code} ${event.reason}`);
      setIsConnected(false);

      // Try to reconnect after a delay - using exponential backoff
      // Starting with 1s, max 30s
      const delay = Math.min(30000, 1000 * 2 ** Math.min(5, ws.retries || 0));
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
      console.error("WebSocket error:", error);
      setIsConnected(false);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
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
      socket.send(
        JSON.stringify({
          type: WebSocketMessageType.SET_USERNAME,
          payload: { username: user.username },
        }),
      );

      // Request online users status
      const statusMsg = JSON.stringify({
        type: WebSocketMessageType.USER_STATUS,
        payload: {},
      });
      console.log("Sending USER_STATUS request:", statusMsg);
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
          payload: {},
        });
        console.log("Sending periodic USER_STATUS request:", statusMsg);
        socket.send(statusMsg);
      }
    }, 15000); // Every 15 seconds

    return () => clearInterval(interval);
  }, [isConnected, socket]);

  // Fetch recent messages from API
  const fetchRecentMessages = async () => {
    try {
      const response = await fetch("/api/chat/messages");
      if (!response.ok) throw new Error("Failed to fetch messages");

      const data = await response.json();

      // Convert timestamps to Date objects and sort by timestamp (oldest first)
      const processedMessages = data
        .map((msg: any) => ({
          ...msg,
          createdAt: new Date(msg.createdAt),
        }))
        .sort(
          (a: ChatMessage, b: ChatMessage) =>
            a.createdAt.getTime() - b.createdAt.getTime(),
        );

      setMessages(processedMessages);
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  const handleWebSocketMessage = (data: any) => {
    console.log("Received WebSocket message:", data);
    switch (data.type) {
      case WebSocketMessageType.CHAT_MESSAGE:
        if (data.payload.error) {
          toast({
            title: "Lỗi",
            description: data.payload.error,
            variant: "destructive",
          });
        } else {
          setMessages((prev) => [
            ...prev,
            {
              ...data.payload,
              createdAt: new Date(data.payload.createdAt),
            },
          ]);
          if (data.payload.userId !== user?.id) {
            if (Notification.permission === "granted") {
              const username = data.payload.user?.username || "Người dùng";
              try {
                new Notification("Tin nhắn mới", {
                  body: `${username}: ${data.payload.content.substring(0, 50)}${data.payload.content.length > 50 ? "..." : ""}`,
                  icon: "/favicon.ico",
                });
              } catch (error) {
                console.error("Lỗi hiển thị thông báo:", error);
              }
            }
          }
        }
        break;

      case WebSocketMessageType.USER_JOINED:
        // Show toast for user joined
        // toast({
        //   title: 'Thông báo',
        //   description: `${data.payload.username} đã tham gia chat`,
        // });
        if (data.payload.user) {
          setOnlineUsers((prevUsers) => {
            // Check if user already exists
            const userExists = prevUsers.some(
              (u) => u.id === data.payload.user.id,
            );
            if (!userExists) {
              return [
                ...prevUsers,
                {
                  ...data.payload.user,
                  lastActive: new Date(),
                },
              ];
            }
            return prevUsers;
          });
        }
        break;

      case WebSocketMessageType.USER_LEFT:
        // Show toast for user left
        toast({
          title: "Thông báo",
          description: `${data.payload.username} đã rời khỏi chat`,
        });

        // Remove user from online users
        if (data.payload.userId) {
          setOnlineUsers((prevUsers) =>
            prevUsers.filter((user) => user.id !== data.payload.userId),
          );
        }
        break;

      case WebSocketMessageType.USER_STATUS:
        // Update online users list
        if (data.payload.users && Array.isArray(data.payload.users)) {
          setOnlineUsers(
            data.payload.users.map((user: any) => ({
              ...user,
              lastActive: new Date(user.lastActive || Date.now()),
            })),
          );
        }
        break;

      case WebSocketMessageType.SET_USERNAME:
        if (data.payload.error) {
          toast({
            title: "Lỗi",
            description: data.payload.error,
            variant: "destructive",
          });
        }
        break;

      default:
        console.log("Unhandled WebSocket message type:", data.type);
    }
  };

  // Send a chat message
  const sendMessage = (
    content: string,
    media?: any,
    mentions?: string[],
    replyToMessageId?: number | string | null,
  ) => {
    if (!socket || !isConnected) {
      toast({
        title: "Không thể gửi tin nhắn",
        description: "Kết nối đã bị mất. Đang thử kết nối lại...",
        variant: "destructive",
      });
      return;
    }
    console.log("Sending message with reply ?", replyToMessageId);
    // let processedReplyId: number | string | null = null;
    // if (replyToMessageId !== undefined && replyToMessageId !== null) {
    //   const parsed = Number(replyToMessageId);
    //   processedReplyId = Number.isInteger(parsed) && parsed > 0 ? parsed : null;
    //   // Log để debug
    //   console.log("Sending message with replyToMessageId:", {
    //     original: replyToMessageId,
    //     processed: processedReplyId,
    //     type: typeof processedReplyId,
    //   });
    // }

    const message = {
      type: WebSocketMessageType.CHAT_MESSAGE,
      payload: {
        content,
        media,
        mentions,
        replyToMessageId: replyToMessageId,
      },
    };

    socket.send(JSON.stringify(message));
  };

  // Set username via WebSocket
  const setUsername = useCallback(
    (username: string) => {
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        toast({
          title: "Lỗi kết nối",
          description: "Không thể đặt tên. Vui lòng thử lại sau.",
          variant: "destructive",
        });
        return;
      }

      socket.send(
        JSON.stringify({
          type: WebSocketMessageType.SET_USERNAME,
          payload: { username },
        }),
      );
    },
    [socket, toast],
  );

  // Hàm tìm tin nhắn dựa trên tên người dùng
  const findMessagesByUsername = useCallback(
    (username: string) => {
      return messages.filter(
        (message) =>
          message.user?.username?.toLowerCase() === username.toLowerCase(),
      );
    },
    [messages],
  );

  // Hàm tìm kiếm tin nhắn theo ID
  const findMessageById = useCallback(
    (messageId: number) => {
      return messages.find((message) => message.id === messageId);
    },
    [messages],
  );

  return (
    <WebSocketContext.Provider
      value={{
        isConnected,
        messages,
        onlineUsers,
        sendMessage,
        setUsername,
        findMessagesByUsername,
        findMessageById,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
};
