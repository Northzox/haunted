import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createServerSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  isPublic: z.boolean().default(false),
});

// GET /api/servers - Get user's servers
export async function GET(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      const servers = await prisma.server.findMany({
        where: {
          OR: [
            { ownerId: user.userId },
            {
              members: {
                some: {
                  userId: user.userId,
                },
              },
            },
          ],
        },
        include: {
          owner: {
            select: {
              id: true,
              username: true,
              avatar: true,
            },
          },
          members: {
            where: {
              userId: user.userId,
            },
            include: {
              role: true,
            },
          },
          channels: {
            orderBy: {
              position: 'asc',
            },
            take: 1, // Only get first channel for preview
          },
          _count: {
            select: {
              members: true,
              channels: true,
            },
          },
        },
        orderBy: {
          updatedAt: 'desc',
        },
      });

      return NextResponse.json({ servers });
    } catch (error) {
      console.error('Get servers error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}

// POST /api/servers - Create new server
export async function POST(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      const body = await req.json();
      
      // Validate input
      const validation = createServerSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(
          { error: 'Invalid input', details: validation.error.errors },
          { status: 400 }
        );
      }

      const { name, description, isPublic } = validation.data;

      // Create server
      const server = await prisma.server.create({
        data: {
          name,
          description,
          isPublic,
          ownerId: user.userId,
          inviteCode: Math.random().toString(36).substr(2, 8).toUpperCase(),
        },
        include: {
          owner: {
            select: {
              id: true,
              username: true,
              avatar: true,
            },
          },
          _count: {
            select: {
              members: true,
              channels: true,
            },
          },
        },
      });

      // Add owner as member
      await prisma.serverMember.create({
        data: {
          userId: user.userId,
          serverId: server.id,
        },
      });

      // Create default channels
      const defaultChannels = [
        { name: 'welcome', type: 'TEXT', topic: 'Welcome to the server!' },
        { name: 'general', type: 'TEXT', topic: 'General discussion' },
        { name: 'media', type: 'MEDIA', topic: 'Share media files' },
      ];

      for (const [index, channel] of defaultChannels.entries()) {
        await prisma.channel.create({
          data: {
            name: channel.name,
            type: channel.type as any,
            serverId: server.id,
            topic: channel.topic,
            position: index,
          },
        });
      }

      // Log server creation
      await prisma.auditLog.create({
        data: {
          userId: user.userId,
          action: 'SERVER_CREATE',
          details: JSON.stringify({
            serverId: server.id,
            serverName: name,
            isPublic,
            timestamp: new Date().toISOString(),
          }),
          ipAddress: req.ip || 'unknown',
          userAgent: req.headers.get('user-agent') || 'unknown',
        },
      });

      return NextResponse.json(
        { message: 'Server created successfully', server },
        { status: 201 }
      );
    } catch (error) {
      console.error('Create server error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}
