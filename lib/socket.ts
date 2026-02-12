import { io, Socket } from 'socket.io-client';

export interface SocketMessage {
  id: string;
  content: string;
  type: string;
  userId: string;
  channelId: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    username: string;
    isAnonymous: boolean;
    anonymousId?: string;
    avatar?: string;
  };
  attachments: Array<{
    id: string;
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
    url: string;
    type: string;
  }>;
}

export interface SocketChannel {
  id: string;
  name: string;
  type: string;
  topic?: string;
  position: number;
}

export interface SocketReaction {
  id: string;
  emoji: string;
  userId: string;
  user: {
    id: string;
    username: string;
  };
}

class SocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect(token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        resolve();
        return;
      }

      this.socket = io(process.env.NODE_ENV === 'production' 
        ? 'https://yourdomain.com' 
        : 'http://localhost:3000', {
        path: '/api/socket/io',
        auth: { token },
        transports: ['websocket', 'polling'],
      });

      this.socket.on('connect', () => {
        console.log('Connected to socket server');
        this.reconnectAttempts = 0;
        resolve();
      });

      this.socket.on('disconnect', (reason) => {
        console.log('Disconnected from socket server:', reason);
        if (reason === 'io server disconnect') {
          // Server disconnected, reconnect manually
          this.socket?.connect();
        }
      });

      this.socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        this.reconnectAttempts++;
        
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          reject(new Error('Failed to connect to socket server'));
        }
      });

      this.socket.on('error', (error) => {
        console.error('Socket error:', error);
      });
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Server operations
  joinServer(serverId: string): void {
    this.socket?.emit('join-server', serverId);
  }

  // Channel operations
  joinChannel(channelId: string): void {
    this.socket?.emit('join-channel', channelId);
  }

  sendMessage(content: string, type: string = 'TEXT'): void {
    this.socket?.emit('send-message', { content, type });
  }

  // Typing indicators
  startTyping(): void {
    this.socket?.emit('typing-start');
  }

  stopTyping(): void {
    this.socket?.emit('typing-stop');
  }

  // Reactions
  addReaction(messageId: string, emoji: string): void {
    this.socket?.emit('add-reaction', { messageId, emoji });
  }

  // Event listeners
  onServerChannels(callback: (channels: SocketChannel[]) => void): void {
    this.socket?.on('server-channels', callback);
  }

  onChannelMessages(callback: (messages: SocketMessage[]) => void): void {
    this.socket?.on('channel-messages', callback);
  }

  onNewMessage(callback: (message: SocketMessage) => void): void {
    this.socket?.on('new-message', callback);
  }

  onUserJoined(callback: (data: { userId: string; username: string }) => void): void {
    this.socket?.on('user-joined', callback);
  }

  onUserLeft(callback: (data: { userId: string }) => void): void {
    this.socket?.on('user-left', callback);
  }

  onUserTyping(callback: (data: { userId: string; username: string }) => void): void {
    this.socket?.on('user-typing', callback);
  }

  onUserStopTyping(callback: (data: { userId: string }) => void): void {
    this.socket?.on('user-stop-typing', callback);
  }

  onMessageReactionsUpdated(callback: (data: { messageId: string; reactions: SocketReaction[] }) => void): void {
    this.socket?.on('message-reactions-updated', callback);
  }

  onError(callback: (error: string) => void): void {
    this.socket?.on('error', callback);
  }

  // Remove event listeners
  off(event: string, callback?: Function): void {
    if (callback) {
      this.socket?.off(event, callback);
    } else {
      this.socket?.off(event);
    }
  }
}

export const socketService = new SocketService();
