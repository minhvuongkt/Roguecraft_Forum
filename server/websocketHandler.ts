import { WebSocket, WebSocketServer } from "ws";
import { IncomingMessage } from "http";
import { chatService } from "./chatService";
import { WebSocketMessageType, WebSocketMessage } from "@shared/schema";
import { parse } from "url";

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
      ws.on('message', async (data: string) => {
        try {
          const message: WebSocketMessage = JSON.parse(data);
          await this.handleMessage(ws, message);
        } catch (error) {
          console.error('Error handling WebSocket message:', error);
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
    switch (message.type) {
      case WebSocketMessageType.SET_USERNAME:
        await this.handleSetUsername(ws, message.payload);
        break;
        
      case WebSocketMessageType.CHAT_MESSAGE:
        await this.handleChatMessage(ws, message.payload);
        break;
        
      case WebSocketMessageType.USER_STATUS:
        this.handleUserStatus(ws, message.payload);
        break;
        
      default:
        console.warn(`Unknown message type: ${message.type}`);
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
  
  private handleUserStatus(ws: ExtendedWebSocket, payload: any) {
    // Broadcast current online users to all clients
    this.broadcastOnlineUsers();
  }
  
  // Send list of online users to all connected clients
  private broadcastOnlineUsers() {
    const onlineUsers = this.getOnlineUsers();
    
    this.broadcast({
      type: WebSocketMessageType.USER_STATUS,
      payload: {
        users: onlineUsers
      }
    });
  }
  
  // Get list of online users with their basic information
  private getOnlineUsers() {
    const users: {
      id: number;
      username: string;
      avatar: string | null;
      lastActive: Date;
    }[] = [];
    
    this.clients.forEach(client => {
      if (client.userId && client.username && client.readyState === WebSocket.OPEN) {
        // Avoid duplicates (same user may have multiple connections)
        if (!users.some(u => u.id === client.userId)) {
          users.push({
            id: client.userId,
            username: client.username,
            avatar: null, // We could fetch this from a database if needed
            lastActive: new Date()
          });
        }
      }
    });
    
    return users;
  }
  
  private sendToClient(client: ExtendedWebSocket, message: WebSocketMessage) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  }
  
  private broadcast(message: WebSocketMessage, excludeClient: ExtendedWebSocket | null = null) {
    this.clients.forEach(client => {
      if (client !== excludeClient && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }
}
