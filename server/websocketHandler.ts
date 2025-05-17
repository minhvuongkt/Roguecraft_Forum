
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
      if (!payload.content || typeof payload.content !== 'string') {
        return this.sendToClient(ws, {
          type: WebSocketMessageType.CHAT_MESSAGE,
          payload: { error: "Message content is required" },
        });
      }

      const content = payload.content.trim();
      if (content.length === 0) {
        return this.sendToClient(ws, {
          type: WebSocketMessageType.CHAT_MESSAGE,
          payload: { error: "Message content cannot be empty" },
        });
      }

      const media = payload.media || null;
      let replyId = null;

      if (payload.replyToMessageId !== undefined && payload.replyToMessageId !== null) {
        try {
          if (typeof payload.replyToMessageId === 'string') {
            const cleanId = payload.replyToMessageId.replace(/[^0-9]/g, "");
            replyId = cleanId ? parseInt(cleanId, 10) : null;
          } else if (typeof payload.replyToMessageId === 'number') {
            replyId = payload.replyToMessageId;
          }

          if (replyId !== null && (!Number.isInteger(replyId) || replyId <= 0)) {
            console.warn("Invalid replyToMessageId after conversion:", replyId);
            replyId = null;
          }

          if (replyId !== null) {
            const [originalMessage] = await chatService.verifyMessageExists(replyId);
            if (!originalMessage) {
              console.warn(`Reply to non-existent message ID: ${replyId}`);
              replyId = null;
            }
          }
        } catch (e) {
          console.error("Error processing replyToMessageId:", e);
          replyId = null;
        }
      }

      // Extract mentions from content
      const mentionRegex = /@(\w+)/g;
      const mentions = [];
      let match;
      while ((match = mentionRegex.exec(content)) !== null) {
        mentions.push(match[1]);
      }

      const messageData = {
        content,
        media,
        userId: ws.userId,
        replyToMessageId: replyId,
        mentions: mentions.length > 0 ? mentions : (payload.mentions || []),
      };

      const message = await chatService.createMessage(messageData);
      
      // Add user info to message payload
      const messageWithUser = {
        ...message,
        user: {
          id: ws.userId,
          username: ws.username,
        }
      };

      this.broadcast({
        type: WebSocketMessageType.CHAT_MESSAGE,
        payload: messageWithUser,
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
