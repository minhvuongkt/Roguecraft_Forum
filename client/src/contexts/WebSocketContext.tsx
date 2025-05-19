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
import { toVNTime } from "@/lib/dayjs";

interface ExtendedWebSocket extends WebSocket {
  retries?: number;
}
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
  sendMessage: () => { },
  setUsername: () => { },
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

  const connectWebSocket = useCallback(() => {
    if (socket) {
      socket.close();
    }
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl) as ExtendedWebSocket;

    ws.onopen = () => {
      console.log("WebSocket connected");
      setIsConnected(true);
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
      setIsConnected(false);
      const delay = Math.min(30000, 1000 * 2 ** Math.min(5, ws.retries || 0));
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
    ws.retries = 0;
    setSocket(ws);
    return ws;
  }, [user]);

  useEffect(() => {
    const ws = connectWebSocket();
    fetchRecentMessages();
    return () => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, []);

  useEffect(() => {
    if (socket && isConnected && user) {
      socket.send(
        JSON.stringify({
          type: WebSocketMessageType.SET_USERNAME,
          payload: { username: user.username },
        }),
      );
      const statusMsg = JSON.stringify({
        type: WebSocketMessageType.USER_STATUS,
        payload: {},
      });
      socket.send(statusMsg);
    }
  }, [user, isConnected]);

  useEffect(() => {
    if (!isConnected || !socket) return;

    const interval = setInterval(() => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        const statusMsg = JSON.stringify({
          type: WebSocketMessageType.USER_STATUS,
          payload: {},
        });
        socket.send(statusMsg);
      }
    }, 5000); // Every 5 seconds

    return () => clearInterval(interval);
  }, [isConnected, socket]);

  const fetchRecentMessages = async () => {
    try {
      const response = await fetch("/api/chat/messages");
      if (!response.ok) throw new Error("Failed to fetch messages");
      const data = await response.json();
      console.log("Fetching messages...", data);
      const processedMessages = data
        .map((msg: any) => ({
          ...msg,
          createdAt: msg.createdAt,
        }))
        .sort(
          (a: ChatMessage, b: ChatMessage) =>
            toVNTime(a.createdAt).millisecond() - toVNTime(b.createdAt).millisecond(),
        );
      setMessages(processedMessages);
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  const handleWebSocketMessage = (data: any) => {
    // console.log("Received WebSocket message:", data);
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
              createdAt: toVNTime(data.payload.createdAt).toDate(),
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
        toast({
          title: 'Thông báo',
          description: `${data.payload.username} đã vào thở cùng`,
        });
        if (data.payload.user) {
          setOnlineUsers((prevUsers) => {
            // Check if user already exists
            const userExists = prevUsers.some(
              (u) => u.id === data.payload.user.id,
            );
            if (!userExists) {
              return [
                ...prevUsers, {
                  ...data.payload.user,
                  lastActive: toVNTime(new Date()).toDate(),
                },
              ];
            }
            return prevUsers;
          });
        }
        break;

      case WebSocketMessageType.USER_LEFT:
        toast({
          title: "Thông báo",
          description: `${data.payload.username} đã tắt thở`,
        });

        // Remove user from online users
        if (data.payload.userId) {
          setOnlineUsers((prevUsers) =>
            prevUsers.filter((user) => user.id !== data.payload.userId),
          );
        }
        break;

      case WebSocketMessageType.USER_STATUS:
        if (data.payload.users && Array.isArray(data.payload.users)) {
          setOnlineUsers(
            data.payload.users.map((user: any) => ({
              ...user,
              lastActive: toVNTime(user.lastActive || Date.now()).toDate(),
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
    // let processedReplyId: number | string | null = null;
    // if (replyToMessageId !== undefined && replyToMessageId !== null) {
    //   const parsed = Number(replyToMessageId);
    //   processedReplyId = Number.isInteger(parsed) && parsed > 0 ? parsed : null;
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

  const setUsername = useCallback(
    (username: string) => {
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        toast({
          title: "Lỗi kết nối",
          description: "Không thể đặt username lúc này. Vui lòng thử lại sau.",
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

  const findMessagesByUsername = useCallback(
    (username: string) => {
      return messages.filter(
        (message) =>
          message.user?.username?.toLowerCase() === username.toLowerCase(),
      );
    },
    [messages],
  );

  const findMessageById = useCallback(
    (messageId: number) => {
      return messages.find((message) => message.id === messageId);
    },
    [messages],
  );
  const adjustedMessages = messages.map((msg) => ({
    ...msg,
    createdAt: toVNTime(msg.createdAt).toDate(),
  }));

  return (
    <WebSocketContext.Provider
      value={{
        isConnected,
        messages: adjustedMessages,
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
