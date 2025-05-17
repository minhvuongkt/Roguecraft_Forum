import { WebSocket, WebSocketServer } from "ws";
import { IncomingMessage } from "http";
import { chatService } from "./chatService";
import { WebSocketMessageType, WebSocketMessage } from "@shared/schema";
import { parse } from "url";
import { storage } from "./storage";
import path from "path";

interface ExtendedWebSocket extends WebSocket {
  userId?: number;
  username?: string;
  isAlive?: boolean;
}

export class WebSocketHandler {
  private wss: WebSocketServer;
  private clients: Set<ExtendedWebSocket> = new Set();
  private readonly DEBUG_MODE: boolean = process.env.NODE_ENV !== "production";

  constructor(server: any) {
    this.wss = new WebSocketServer({ server, path: "/ws" });
    this.setupWebSocketServer();
  }

  private setupWebSocketServer() {
    this.wss.on(
      "connection",
      (ws: ExtendedWebSocket, request: IncomingMessage) => {
        // Mark the connection as alive
        ws.isAlive = true;

        // Add client to the set
        this.clients.add(ws);

        // Handle pings to check if clients are still alive
        ws.on("pong", () => {
          ws.isAlive = true;
        });

        // Handle messages from clients
        ws.on("message", (data: string) => {
          try {
            const message: WebSocketMessage = JSON.parse(data);
            // Run message handler asynchronously but don't block the event loop
            this.handleMessage(ws, message).catch((error) => {
              console.error("Error in async message handling:", error);
            });
          } catch (error) {
            console.error("Error parsing WebSocket message:", error);
          }
        });

        // Handle client disconnect
        ws.on("close", () => {
          this.clients.delete(ws);

          // Broadcast user left if they had a username
          if (ws.username) {
            this.broadcast({
              type: WebSocketMessageType.USER_LEFT,
              payload: {
                username: ws.username,
              },
            });
          }
        });
      },
    );

    // Ping clients periodically to check if they're still connected
    const interval = setInterval(() => {
      this.wss.clients.forEach((ws: ExtendedWebSocket) => {
        if (ws.isAlive === false) {
          this.clients.delete(ws);
          return ws.terminate();
        }

        ws.isAlive = false;
        ws.ping();
      });
    }, 30000);

    this.wss.on("close", () => {
      clearInterval(interval);
    });
  }

  private async handleMessage(
    ws: ExtendedWebSocket,
    message: WebSocketMessage,
  ) {
    try {
      switch (message.type) {
        case WebSocketMessageType.SET_USERNAME:
          await this.handleSetUsername(ws, message.payload);
          break;

        case WebSocketMessageType.CHAT_MESSAGE:
          await this.handleChatMessage(ws, message.payload);
          break;

        case WebSocketMessageType.USER_STATUS:
          await this.handleUserStatus(ws, message.payload);
          break;

        default:
          console.warn(`Unknown message type: ${message.type}`);
      }
    } catch (error) {
      console.error(`Error handling message of type ${message.type}:`, error);
    }
  }

  private async handleSetUsername(ws: ExtendedWebSocket, payload: any) {
    try {
      const { username } = payload;

      if (!username || typeof username !== "string" || username.trim() === "") {
        return this.sendToClient(ws, {
          type: WebSocketMessageType.SET_USERNAME,
          payload: { error: "Invalid username" },
        });
      }

      // Create or get temporary user
      const user = await chatService.createTemporaryUser(username);

      // Assign user info to the websocket
      ws.userId = user.id;
      ws.username = user.username;

      // Send confirmation to the client
      this.sendToClient(ws, {
        type: WebSocketMessageType.SET_USERNAME,
        payload: {
          success: true,
          user: {
            id: user.id,
            username: user.username,
            avatar: user.avatar,
            isTemporary: user.isTemporary,
          },
        },
      });

      // Broadcast user joined
      this.broadcast({
        type: WebSocketMessageType.USER_JOINED,
        payload: {
          username: user.username,
        },
      });
    } catch (error) {
      console.error("Error setting username:", error);
      this.sendToClient(ws, {
        type: WebSocketMessageType.SET_USERNAME,
        payload: { error: "Failed to set username" },
      });
    }
  }

  private async handleChatMessage(
    ws: ExtendedWebSocket,
    payload: any,
  ): Promise<void> {
    if (!ws.userId || !ws.username) {
      console.error("WebSocket without user info tried to send a message");
      return this.sendToClient(ws, {
        type: WebSocketMessageType.CHAT_MESSAGE,
        payload: { error: "User authentication required" },
      });
    }

    try {
      // Xử lý nội dung tin nhắn
      const content = payload.content ? payload.content.trim() : "";

      // Xử lý media
      const media = payload.media || null;
      const hasMedia =
        media && typeof media === "object" && Object.keys(media).length > 0;

      // Yêu cầu hoặc nội dung văn bản hoặc media
      if (!content && !hasMedia) {
        return this.sendToClient(ws, {
          type: WebSocketMessageType.CHAT_MESSAGE,
          payload: { error: "Message must contain text or media" },
        });
      }

      // Xử lý replyToMessageId - Đã cải tiến để xử lý nhiều trường hợp
      let replyId = null;

      if (
        payload.replyToMessageId !== undefined &&
        payload.replyToMessageId !== null
      ) {
        try {
          if (typeof payload.replyToMessageId === "string") {
            // Xử lý replyToMessageId là string
            const cleanId = payload.replyToMessageId.replace(/[^0-9]/g, "");
            replyId = cleanId ? parseInt(cleanId, 10) : null;
          } else if (typeof payload.replyToMessageId === "number") {
            // Xử lý replyToMessageId là number
            replyId = payload.replyToMessageId;
          } else if (typeof payload.replyToMessageId === "object") {
            // Xử lý trường hợp client gửi toàn bộ message object
            if (payload.replyToMessageId.id !== undefined) {
              const idValue = payload.replyToMessageId.id;
              if (typeof idValue === "number") {
                replyId = idValue;
              } else if (typeof idValue === "string") {
                const cleanId = idValue.replace(/[^0-9]/g, "");
                replyId = cleanId ? parseInt(cleanId, 10) : null;
              }
            }
          }

          // Kiểm tra tính hợp lệ của ID sau khi chuyển đổi
          if (
            replyId !== null &&
            (!Number.isInteger(replyId) || replyId <= 0)
          ) {
            if (this.DEBUG_MODE) {
              console.warn(
                "Invalid replyToMessageId after conversion:",
                replyId,
                "Original value:",
                payload.replyToMessageId,
              );
            }
            replyId = null;
          }

          // Xác minh message tồn tại trong database
          if (replyId !== null) {
            const [originalMessage] =
              await chatService.verifyMessageExists(replyId);
            if (!originalMessage) {
              if (this.DEBUG_MODE) {
                console.warn(`Reply to non-existent message ID: ${replyId}`);
              }
              replyId = null;
            } else if (this.DEBUG_MODE) {
              console.log(`Verified reply to message ID ${replyId} exists`);
            }
          }
        } catch (e) {
          console.error("Error processing replyToMessageId:", e);
          replyId = null;
        }
      }

      // Trích xuất mentions từ nội dung
      let mentions: string[] = [];

      // Trích xuất từ nội dung nếu có
      if (content) {
        const mentionRegex = /@(\w+)/g;
        let match;
        while ((match = mentionRegex.exec(content)) !== null) {
          if (!mentions.includes(match[1])) {
            mentions.push(match[1]);
          }
        }
      }

      // Kết hợp với mentions được cung cấp rõ ràng từ client nếu có
      if (Array.isArray(payload.mentions) && payload.mentions.length > 0) {
        // Thêm mentions từ payload nếu chưa được trích xuất từ nội dung
        payload.mentions.forEach((mention: string) => {
          if (!mentions.includes(mention)) {
            mentions.push(mention);
          }
        });
      }

      if (this.DEBUG_MODE) {
        console.log("Message data prepared:", {
          content:
            content.length > 30 ? content.substring(0, 30) + "..." : content,
          mediaPresent: hasMedia,
          replyToMessageId: replyId,
          mentions,
          userId: ws.userId,
        });
      }

      // Tạo message thông qua chatService
      const messageData = {
        content,
        media,
        userId: ws.userId,
        replyToMessageId: replyId,
        mentions: mentions.length > 0 ? mentions : [],
      };

      const message = await chatService.createMessage(messageData);

      // Thêm thông tin người dùng vào message payload để client hiển thị ngay
      const messageWithUser = {
        ...message,
        user: {
          id: ws.userId,
          username: ws.username,
        },
      };

      // Broadcast tin nhắn tới tất cả clients
      this.broadcast({
        type: WebSocketMessageType.CHAT_MESSAGE,
        payload: messageWithUser,
      });
    } catch (error) {
      console.error("Error handling chat message:", error);
      this.sendToClient(ws, {
        type: WebSocketMessageType.CHAT_MESSAGE,
        payload: { error: "Failed to send message. Please try again." },
      });
    }
  }

  private async handleUserStatus(ws: ExtendedWebSocket, payload: any) {
    await this.broadcastOnlineUsers();
  }

  private async broadcastOnlineUsers() {
    const onlineUsers = await this.getOnlineUsers();

    this.broadcastMessage({
      type: WebSocketMessageType.USER_STATUS,
      payload: {
        users: onlineUsers,
      },
    });
  }

  private async getOnlineUsers() {
    const users: {
      id: number;
      username: string;
      avatar: string | null;
      lastActive: Date;
    }[] = [];

    try {
      const userIds = new Set<number>();

      Array.from(this.clients).forEach((client) => {
        if (client.userId && client.readyState === WebSocket.OPEN) {
          userIds.add(client.userId);
        }
      });

      const updatePromises: Promise<void>[] = [];
      for (const userId of userIds) {
        updatePromises.push(
          storage.updateUserLastActive(userId).catch((error) => {
            console.error(
              `Error updating last active status for user ${userId}:`,
              error,
            );
          }),
        );
      }

      await Promise.allSettled(updatePromises);

      const fetchPromises = Array.from(userIds).map((userId) =>
        storage
          .getUser(userId)
          .then((user) => {
            if (user) {
              users.push({
                id: user.id,
                username: user.username,
                avatar: user.avatar,
                lastActive: user.lastActive || new Date(),
              });
            }
          })
          .catch((error) => {
            console.error(`Error fetching user ${userId}:`, error);
          }),
      );

      await Promise.allSettled(fetchPromises);
    } catch (error) {
      console.error("Error getting online users:", error);
    }

    return users;
  }

  private sendToClient(client: ExtendedWebSocket, message: WebSocketMessage) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  }

  private broadcastMessage(
    message: WebSocketMessage,
    excludeClient: ExtendedWebSocket | null = null,
  ) {
    try {
      console.log(
        `Broadcasting message of type ${message.type} to ${this.clients.size} clients`,
      );

      const messageStr = JSON.stringify(message);
      let sentCount = 0;

      this.clients.forEach((client) => {
        if (client !== excludeClient && client.readyState === WebSocket.OPEN) {
          try {
            client.send(messageStr);
            sentCount++;
          } catch (error) {
            console.error("Error sending message to client:", error);
            client.isAlive = false;
          }
        }
      });

      console.log(
        `Successfully delivered message to ${sentCount}/${this.clients.size} clients`,
      );
    } catch (error) {
      console.error("Error in broadcastMessage:", error);
    }
  }

  public async broadcast(
    message: WebSocketMessage,
    excludeClient: ExtendedWebSocket | null = null,
  ) {
    try {
      if (message.type === WebSocketMessageType.USER_STATUS) {
        const users = await this.getOnlineUsers();
        message.payload.users = users;
        console.log(`Broadcasting online users: ${users.length}`);
      }

      this.broadcastMessage(message, excludeClient);
    } catch (error) {
      console.error("Error in broadcast:", error);
      if (message.type === WebSocketMessageType.USER_STATUS) {
        message.payload.users = [];
        this.broadcastMessage(message, excludeClient);
      }
    }
  }
}
