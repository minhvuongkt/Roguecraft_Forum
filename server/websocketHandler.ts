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

  private async handleChatMessage(ws: ExtendedWebSocket, payload: any) {
    try {
      const { content, media, mentions, replyToMessageId } = payload;

      if (
        (!content || typeof content !== "string" || content.trim() === "") &&
        (!media || Object.keys(media).length === 0)
      ) {
        return this.sendToClient(ws, {
          type: WebSocketMessageType.CHAT_MESSAGE,
          payload: { error: "Không được để trống tin nhắn" },
        });
      }

      // Make sure user is identified before allowing messages
      if (!ws.userId) {
        return this.sendToClient(ws, {
          type: WebSocketMessageType.CHAT_MESSAGE,
          payload: { error: "Nếu muốn đặt tên thì dùng lệnh /ten [name]" },
        });
      }

      // Log thông tin media để kiểm tra
      console.log(
        "Chat message media received:",
        JSON.stringify(media, null, 2),
      );

      // Kiểm tra nếu media có dữ liệu
      let mediaData = media;
      if (media) {
        // Đảm bảo đường dẫn ảnh là từ thư mục chat-images
        if (
          typeof media === "object" &&
          Object.keys(media).some((key) => /^\d+$/.test(key))
        ) {
          // Kiểm tra xem có đường dẫn nào từ topic-images không
          const hasTopicImage = Object.values(media).some(
            (path) =>
              typeof path === "string" &&
              path.toString().includes("/topic-images/"),
          );

          if (hasTopicImage) {
            console.warn(
              "Warning: Found topic-images path in chat message, fixing paths",
            );

            // Tự động sửa đường dẫn để đảm bảo ảnh lưu đúng thư mục
            const fixedMedia: Record<string, string> = {};
            Object.entries(media).forEach(([key, value]) => {
              if (
                typeof value === "string" &&
                value.includes("/topic-images/")
              ) {
                const originalFileName =
                  value.split("/").pop() || "unknown.jpg";
                const newPath = `/chat-images/chat-${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(originalFileName)}`;
                fixedMedia[key] = newPath;
                console.log(`Fixed media path from ${value} to ${newPath}`);
              } else {
                fixedMedia[key] = value as string;
              }
            });
            mediaData = fixedMedia;
          }
        }

        console.log(
          "Creating chat message with media:",
          JSON.stringify(mediaData, null, 2),
        );
      } else {
        console.log("Creating chat message with media: null");
        mediaData = null;
      }

      // Create chat message
      const message = await chatService.createMessage({
        userId: ws.userId,
        content,
        media: mediaData,
        mentions: mentions || [],
        replyToMessageId: replyToMessageId || null,
      });

      // Log thông tin message sau khi tạo
      console.log("Chat message created:", JSON.stringify(message, null, 2));

      // Broadcast message to all clients
      this.broadcast({
        type: WebSocketMessageType.CHAT_MESSAGE,
        payload: message,
      });
    } catch (error) {
      console.error("Error handling chat message:", error);
      this.sendToClient(ws, {
        type: WebSocketMessageType.CHAT_MESSAGE,
        payload: { error: "Failed to send message" },
      });
    }
  }

  private async handleUserStatus(ws: ExtendedWebSocket, payload: any) {
    // Broadcast current online users to all clients
    await this.broadcastOnlineUsers();
  }

  // Send list of online users to all connected clients
  private async broadcastOnlineUsers() {
    const onlineUsers = await this.getOnlineUsers();

    this.broadcastMessage({
      type: WebSocketMessageType.USER_STATUS,
      payload: {
        users: onlineUsers,
      },
    });
  }

  // Get list of online users with their basic information
  private async getOnlineUsers() {
    const users: {
      id: number;
      username: string;
      avatar: string | null;
      lastActive: Date;
    }[] = [];

    try {
      // Create a Set of unique userIds from connected clients
      const userIds = new Set<number>();

      // First collect all user IDs
      Array.from(this.clients).forEach((client) => {
        if (client.userId && client.readyState === WebSocket.OPEN) {
          userIds.add(client.userId);
        }
      });

      // Now batch update last active status for all online users
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

      // Wait for all updates to complete
      await Promise.allSettled(updatePromises);

      // Now fetch all user data
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

      // Wait for all fetches to complete
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

  // Helper method for non-async broadcasts (without user status)
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
            // If we encounter an error while sending, mark the client as not alive
            // so it will be cleaned up in the next ping cycle
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

  // Make this method accessible from outside (for periodic broadcasts)
  public async broadcast(
    message: WebSocketMessage,
    excludeClient: ExtendedWebSocket | null = null,
  ) {
    try {
      // If this is a user status message, fetch the actual users from the database
      if (message.type === WebSocketMessageType.USER_STATUS) {
        const users = await this.getOnlineUsers();
        message.payload.users = users;
        console.log(`Broadcasting online users: ${users.length}`);
      }

      this.broadcastMessage(message, excludeClient);
    } catch (error) {
      console.error("Error in broadcast:", error);
      // Even if we have an error, try to send a minimal message
      if (message.type === WebSocketMessageType.USER_STATUS) {
        message.payload.users = [];
        this.broadcastMessage(message, excludeClient);
      }
    }
  }
}
