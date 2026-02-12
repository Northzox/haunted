import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const joinServerSchema = z.object({
  inviteCode: z.string().min(1).max(20),
});

// POST /api/servers/[id]/join - Join a server
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(request, async (req, user) => {
    try {
      const body = await req.json();
      
      // Validate input
      const validation = joinServerSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(
          { error: 'Invalid input', details: validation.error.errors },
          { status: 400 }
        );
      }

      const { inviteCode } = validation.data;
      const serverId = params.id;

      // Find server
      const server = await prisma.server.findUnique({
        where: { 
          id: serverId,
          inviteCode,
        },
        include: {
          members: {
            where: {
              userId: user.userId,
            },
          },
        },
      });

      if (!server) {
        return NextResponse.json(
          { error: 'Invalid server or invite code' },
          { status: 404 }
        );
      }

      // Check if user is already a member
      if (server.members.length > 0) {
        return NextResponse.json(
          { error: 'Already a member of this server' },
          { status: 409 }
        );
      }

      // Add user as member
      await prisma.serverMember.create({
        data: {
          userId: user.userId,
          serverId: server.id,
        },
      });

      // Log server join
      await prisma.auditLog.create({
        data: {
          userId: user.userId,
          action: 'SERVER_JOIN',
          details: JSON.stringify({
            serverId: server.id,
            serverName: server.name,
            inviteCode,
            timestamp: new Date().toISOString(),
          }),
          ipAddress: req.ip || 'unknown',
          userAgent: req.headers.get('user-agent') || 'unknown',
        },
      });

      return NextResponse.json(
        { message: 'Joined server successfully' },
        { status: 200 }
      );
    } catch (error) {
      console.error('Join server error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}
