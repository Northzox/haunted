'use client';

import { useState, useEffect, useRef } from 'react';
import { socketService, SocketMessage, SocketChannel } from '@/lib/socket';
import Button from '@/components/ui/Button';
import Logo from '@/components/Logo';

interface ChatInterfaceProps {
  serverId: string;
  channelId: string;
  token: string;
}

export default function ChatInterface({ serverId, channelId, token }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<SocketMessage[]>([]);
  const [channels, setChannels] = useState<SocketChannel[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const initializeSocket = async () => {
      try {
        await socketService.connect(token);
        setIsConnected(true);

        // Join server and channel
        socketService.joinServer(serverId);
        socketService.joinChannel(channelId);

        // Set up event listeners
        socketService.onServerChannels((channels) => {
          setChannels(channels);
        });

        socketService.onChannelMessages((messages) => {
          setMessages(messages);
          scrollToBottom();
        });

        socketService.onNewMessage((message) => {
          setMessages(prev => [...prev, message]);
          scrollToBottom();
        });

        socketService.onUserTyping(({ username }) => {
          setTypingUsers(prev => new Set(prev).add(username));
        });

        socketService.onUserStopTyping(({ userId }) => {
          setTypingUsers(prev => {
            const newSet = new Set(prev);
            // Remove user by finding their username in typing users
            for (const user of newSet) {
              if (user !== userId) {
                newSet.delete(user);
                break;
              }
            }
            return newSet;
          });
        });

        socketService.onError((error) => {
          console.error('Socket error:', error);
        });

      } catch (error) {
        console.error('Failed to initialize socket:', error);
        setIsConnected(false);
      }
    };

    initializeSocket();

    return () => {
      socketService.disconnect();
    };
  }, [token, serverId, channelId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      socketService.sendMessage(newMessage.trim());
      setNewMessage('');
      stopTyping();
    }
  };

  const handleTyping = () => {
    if (!isTyping) {
      setIsTyping(true);
      socketService.startTyping();
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing after 1 second of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 1000);
  };

  const stopTyping = () => {
    setIsTyping(false);
    socketService.stopTyping();
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getDisplayName = (message: SocketMessage) => {
    if (message.user.isAnonymous && message.user.anonymousId) {
      return message.user.anonymousId;
    }
    return message.user.username;
  };

  return (
    <div className="flex h-screen bg-black">
      {/* Server Sidebar */}
      <div className="w-64 bg-near-black border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <Logo size="sm" />
        </div>
        
        <div className="flex-1 overflow-y-auto">
          <div className="p-2">
            <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
              Channels
            </h3>
            {channels.map((channel) => (
              <div
                key={channel.id}
                className={`channel ${channel.id === channelId ? 'channel-active' : ''}`}
                onClick={() => {
                  if (channel.id !== channelId) {
                    window.location.href = `/servers/${serverId}/${channel.id}`;
                  }
                }}
              >
                <span className="text-text-secondary">#</span>
                <span className="text-text-primary">{channel.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-dark-gray rounded-full flex items-center justify-center">
              <span className="text-xs text-text-primary">U</span>
            </div>
            <div className="flex-1">
              <div className="text-sm text-text-primary">User</div>
              <div className="text-xs text-text-muted">
                {isConnected ? '🟢 Online' : '🔴 Offline'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="h-12 bg-dark-gray border-b border-border flex items-center px-4">
          <div className="flex items-center gap-2">
            <span className="text-text-secondary">#</span>
            <span className="text-text-primary font-medium">
              {channels.find(c => c.id === channelId)?.name || 'Loading...'}
            </span>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div key={message.id} className="message">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-dark-gray rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-xs text-text-primary">
                    {getDisplayName(message).charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-sm font-medium text-text-primary">
                      {getDisplayName(message)}
                    </span>
                    <span className="text-xs text-text-muted">
                      {formatTime(message.createdAt)}
                    </span>
                  </div>
                  <div className="text-text-primary whitespace-pre-wrap">
                    {message.content}
                  </div>
                  {message.attachments.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {message.attachments.map((attachment) => (
                        <div key={attachment.id} className="bg-dark-gray p-2 rounded">
                          <div className="text-sm text-text-primary">
                            📎 {attachment.originalName}
                          </div>
                          <div className="text-xs text-text-muted">
                            {(attachment.size / 1024).toFixed(1)} KB
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          
          {/* Typing Indicator */}
          {typingUsers.size > 0 && (
            <div className="typing-indicator">
              <span className="text-text-muted">
                {Array.from(typingUsers).join(', ')} {typingUsers.size === 1 ? 'is' : 'are'} typing
              </span>
              <div className="flex gap-1 ml-2">
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="p-4 border-t border-border">
          <div className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                handleTyping();
              }}
              onKeyPress={handleKeyPress}
              onBlur={stopTyping}
              placeholder="Type a message..."
              className="flex-1 px-3 py-2 bg-black border border-border rounded-md text-text-primary placeholder-text-muted focus:outline-none focus:border-gray"
              disabled={!isConnected}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!isConnected || !newMessage.trim()}
            >
              Send
            </Button>
          </div>
          {!isConnected && (
            <div className="mt-2 text-sm text-red-400">
              Disconnected from server. Attempting to reconnect...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
