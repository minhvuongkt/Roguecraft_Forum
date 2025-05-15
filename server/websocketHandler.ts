import { WebSocket, WebSocketServer } from "ws";
import { IncomingMessage } from "http";
import { chatService } from "./chatService";
import { WebSocketMessageType, WebSocketMessage } from "@shared/schema";
import { parse } from "url";
import { storage } from "./storage";

interface ExtendedWebSocket extends WebSocket {
  userId?: number;
  username?: string;
  isAlive?: boolean;
}

export class WebSocketHandler {
  private wss: WebSocketServer;
  private clients: Set<ExtendedWebSocket> = new Set();
  
  constructor(server: any) {
    this.wss = new WebSocketServer({ server, path: '/ws' });
    this.setupWebSocketServer();
  }
  
  private setupWebSocketServer() {
    this.wss.on('connection', (ws: ExtendedWebSocket, request: IncomingMessage) => {
      // Mark the connection as alive
      ws.isAlive = true;
      
      // Add client to the set
      this.clients.add(ws);
      
      // Handle pings to check if clients are still alive
      ws.on('pong', () => {
        ws.isAlive = true;
      });
      
      // Handle messages from clients
      ws.on('message', (data: string) => {
        try {
          const message: WebSocketMessage = JSON.parse(data);
          // Run message handler asynchronously but don't block the event loop
          this.handleMessage(ws, message).catch(error => {
            console.error('Error in async message handling:', error);
          });
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      });
      
      // Handle client disconnect
      ws.on('close', () => {
        this.clients.delete(ws);
        
        // Broadcast user left if they had a username
        if (ws.username) {
          this.broadcast({
            type: WebSocketMessageType.USER_LEFT,
            payload: {
              username: ws.username,
            }
          });
        }
      });
    });
    
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
    
    this.wss.on('close', () => {
      clearInterval(interval);
    });
  }
  
  private async handleMessage(ws: ExtendedWebSocket, message: WebSocketMessage) {
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
      
      if (!username || typeof username !== 'string' || username.trim() === '') {
        return this.sendToClient(ws, {
          type: WebSocketMessageType.SET_USERNAME,
          payload: { error: 'Invalid username' }
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
            isTemporary: user.isTemporary
          }
        }
      });
      
      // Broadcast user joined
      this.broadcast({
        type: WebSocketMessageType.USER_JOINED,
        payload: {
          username: user.username,
        }
      });
      
    } catch (error) {
      console.error('Error setting username:', error);
      this.sendToClient(ws, {
        type: WebSocketMessageType.SET_USERNAME,
        payload: { error: 'Failed to set username' }
      });
    }
  }
  
  private async handleChatMessage(ws: ExtendedWebSocket, payload: any) {
    try {
      const { content, media, mentions } = payload;
      
      if (!content || typeof content !== 'string' || content.trim() === '') {
        return this.sendToClient(ws, {
          type: WebSocketMessageType.CHAT_MESSAGE,
          payload: { error: 'Message cannot be empty' }
        });
      }
      
      // Make sure user is identified before allowing messages
      if (!ws.userId) {
        return this.sendToClient(ws, {
          type: WebSocketMessageType.CHAT_MESSAGE,
          payload: { error: 'You must set a username first with /ten [name]' }
        });
      }
      
      // Create chat message
      const message = await chatService.createMessage({
        userId: ws.userId,
        content,
        media: media || null,
        mentions: mentions || []
      });
      
      // Broadcast message to all clients
      this.broadcast({
        type: WebSocketMessageType.CHAT_MESSAGE,
        payload: message
      });
      
    } catch (error) {
      console.error('Error handling chat message:', error);
      this.sendToClient(ws, {
        type: WebSocketMessageType.CHAT_MESSAGE,
        payload: { error: 'Failed to send message' }
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
        users: onlineUsers
      }
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
    
    // Create a Set of unique userIds from connected clients
    const userIds = new Set<number>();
    
    for (const client of this.clients) {
      if (client.userId && client.readyState === WebSocket.OPEN) {
        userIds.add(client.userId);
        
        // Update the user's last active timestamp in the database
        try {
          await storage.updateUserLastActive(client.userId);
        } catch (error) {
          console.error(`Error updating last active status for user ${client.userId}:`, error);
        }
      }
    }
    
    // Fetch user information from the database for each connected user
    for (const userId of userIds) {
      try {
        const user = await storage.getUser(userId);
        if (user) {
          users.push({
            id: user.id,
            username: user.username,
            avatar: user.avatar,
            lastActive: user.lastActive || new Date()
          });
        }
      } catch (error) {
        console.error(`Error fetching user ${userId}:`, error);
      }
    }
    
    return users;
  }
  
  private sendToClient(client: ExtendedWebSocket, message: WebSocketMessage) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  }
  
  // Helper method for non-async broadcasts (without user status)
  private broadcastMessage(message: WebSocketMessage, excludeClient: ExtendedWebSocket | null = null) {
    console.log(`Broadcasting message of type ${message.type} to ${this.clients.size} clients`);
    
    this.clients.forEach(client => {
      if (client !== excludeClient && client.readyState === WebSocket.OPEN) {
        try {
          client.send(JSON.stringify(message));
        } catch (error) {
          console.error('Error sending message to client:', error);
        }
      }
    });
  }
  
  // Make this method accessible from outside (for periodic broadcasts)
  public async broadcast(message: WebSocketMessage, excludeClient: ExtendedWebSocket | null = null) {
    // If this is a user status message, fetch the actual users from the database
    if (message.type === WebSocketMessageType.USER_STATUS) {
      const users = await this.getOnlineUsers();
      message.payload.users = users;
      console.log(`Broadcasting online users: ${users.length}`);
    }
    
    this.broadcastMessage(message, excludeClient);
  }
}
