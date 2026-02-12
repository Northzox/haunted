import { Server as SocketIOServer } from 'socket.io';
import { NextApiRequest, NextApiResponse } from 'next';
import { validateSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export interface SocketUser {
  userId: string;
  username: string;
  isAnonymous: boolean;
  anonymousId?: string;
  isAdmin: boolean;
}

export interface AuthenticatedSocket extends Socket {
  user: SocketUser;
  currentServer?: string;
  currentChannel?: string;
}

export default function SocketHandler(req: NextApiRequest, res: NextApiResponse & { socket: any }) {
  if (res.socket.server.io) {
    console.log('Socket is already running');
  } else {
    console.log('Socket is initializing');
    const httpServer = res.socket.server as any;
    const io = new SocketIOServer(httpServer, {
      path: '/api/socket/io',
      addTrailingSlash: false,
      cors: {
        origin: process.env.NODE_ENV === 'production' 
          ? ['https://yourdomain.com'] 
          : ['http://localhost:3000'],
        methods: ['GET', 'POST'],
      },
    });

    // Authentication middleware
    io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          return next(new Error('Authentication error'));
        }

        const user = await validateSession(token);
        if (!user) {
          return next(new Error('Invalid session'));
        }

        // Get full user details
        const fullUser = await prisma.user.findUnique({
          where: { id: user.userId },
          select: {
            id: true,
            username: true,
            isAnonymous: true,
            anonymousId: true,
            isAdmin: true,
          },
        });

        if (!fullUser) {
          return next(new Error('User not found'));
        }

        (socket as AuthenticatedSocket).user = fullUser;
        next();
      } catch (error) {
        console.error('Socket authentication error:', error);
        next(new Error('Authentication failed'));
      }
    });

    io.on('connection', (socket: AuthenticatedSocket) => {
      console.log(`User ${socket.user.username} connected`);

      // Join server
      socket.on('join-server', async (serverId: string) => {
        try {
          // Verify user is member of server
          const member = await prisma.serverMember.findFirst({
            where: {
              userId: socket.user.userId,
              serverId,
            },
          });

          if (!member) {
            socket.emit('error', 'Not a member of this server');
            return;
          }

          socket.currentServer = serverId;
          socket.join(`server:${serverId}`);

          // Get server channels
          const channels = await prisma.channel.findMany({
            where: { serverId },
            orderBy: { position: 'asc' },
            select: {
              id: true,
              name: true,
              type: true,
              topic: true,
              position: true,
            },
          });

          socket.emit('server-channels', channels);
        } catch (error) {
          console.error('Join server error:', error);
          socket.emit('error', 'Failed to join server');
        }
      });

      // Join channel
      socket.on('join-channel', async (channelId: string) => {
        try {
          // Verify channel exists and user has access
          const channel = await prisma.channel.findFirst({
            where: {
              id: channelId,
              server: {
                members: {
                  some: {
                    userId: socket.user.userId,
                  },
                },
              },
            },
          });

          if (!channel) {
            socket.emit('error', 'Channel not found or access denied');
            return;
          }

          // Leave previous channel
          if (socket.currentChannel) {
            socket.leave(`channel:${socket.currentChannel}`);
          }

          socket.currentChannel = channelId;
          socket.join(`channel:${channelId}`);

          // Get recent messages
          const messages = await prisma.message.findMany({
            where: { channelId },
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  isAnonymous: true,
                  anonymousId: true,
                  avatar: true,
                },
              },
              attachments: true,
              reactions: {
                include: {
                  user: {
                    select: {
                      id: true,
                      username: true,
                    },
                  },
                },
              },
            },
            orderBy: { createdAt: 'desc' },
            take: 50,
          });

          // Reverse to show oldest first
          socket.emit('channel-messages', messages.reverse());
          
          // Notify others user joined channel
          socket.to(`channel:${channelId}`).emit('user-joined', {
            userId: socket.user.userId,
            username: socket.user.isAnonymous ? socket.user.anonymousId : socket.user.username,
          });
        } catch (error) {
          console.error('Join channel error:', error);
          socket.emit('error', 'Failed to join channel');
        }
      });

      // Send message
      socket.on('send-message', async (data: { content: string; type?: string }) => {
        try {
          if (!socket.currentChannel) {
            socket.emit('error', 'Not in a channel');
            return;
          }

          const message = await prisma.message.create({
            data: {
              content: data.content,
              type: data.type || 'TEXT',
              userId: socket.user.userId,
              channelId: socket.currentChannel,
            },
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  isAnonymous: true,
                  anonymousId: true,
                  avatar: true,
                },
              },
              attachments: true,
            },
          });

          // Broadcast to channel
          io.to(`channel:${socket.currentChannel}`).emit('new-message', message);

          // Update channel activity
          await prisma.channel.update({
            where: { id: socket.currentChannel },
            data: { updatedAt: new Date() },
          });
        } catch (error) {
          console.error('Send message error:', error);
          socket.emit('error', 'Failed to send message');
        }
      });

      // Typing indicators
      socket.on('typing-start', () => {
        if (socket.currentChannel) {
          socket.to(`channel:${socket.currentChannel}`).emit('user-typing', {
            userId: socket.user.userId,
            username: socket.user.isAnonymous ? socket.user.anonymousId : socket.user.username,
          });
        }
      });

      socket.on('typing-stop', () => {
        if (socket.currentChannel) {
          socket.to(`channel:${socket.currentChannel}`).emit('user-stop-typing', {
            userId: socket.user.userId,
          });
        }
      });

      // Add reaction
      socket.on('add-reaction', async (data: { messageId: string; emoji: string }) => {
        try {
          const existingReaction = await prisma.reaction.findFirst({
            where: {
              userId: socket.user.userId,
              messageId: data.messageId,
              emoji: data.emoji,
            },
          });

          if (existingReaction) {
            // Remove reaction
            await prisma.reaction.delete({
              where: { id: existingReaction.id },
            });
          } else {
            // Add reaction
            await prisma.reaction.create({
              data: {
                userId: socket.user.userId,
                messageId: data.messageId,
                emoji: data.emoji,
              },
            });
          }

          // Get updated reactions
          const reactions = await prisma.reaction.findMany({
            where: { messageId: data.messageId },
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                },
              },
            },
          });

          io.emit('message-reactions-updated', {
            messageId: data.messageId,
            reactions,
          });
        } catch (error) {
          console.error('Add reaction error:', error);
          socket.emit('error', 'Failed to add reaction');
        }
      });

      // Disconnect
      socket.on('disconnect', () => {
        console.log(`User ${socket.user.username} disconnected`);
        
        if (socket.currentChannel) {
          socket.to(`channel:${socket.currentChannel}`).emit('user-left', {
            userId: socket.user.userId,
          });
        }
      });
    });

    res.socket.server.io = io;
  }
  res.end();
}
