import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const anonymitySchema = z.object({
  isAnonymous: z.boolean(),
});

// GET /api/user/anonymity - Get anonymity settings
export async function GET(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      const userData = await prisma.user.findUnique({
        where: { id: user.userId },
        select: {
          id: true,
          username: true,
          isAnonymous: true,
          anonymousId: true,
          onlineVisibility: true,
          mediaAutoDownload: true,
          messagePreview: true,
        },
      });

      if (!userData) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        isAnonymous: userData.isAnonymous,
        anonymousId: userData.anonymousId,
        onlineVisibility: userData.onlineVisibility,
        mediaAutoDownload: userData.mediaAutoDownload,
        messagePreview: userData.messagePreview,
      });
    } catch (error) {
      console.error('Get anonymity settings error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}

// PUT /api/user/anonymity - Update anonymity settings
export async function PUT(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      const body = await req.json();
      
      // Validate input
      const validation = anonymitySchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(
          { error: 'Invalid input', details: validation.error.errors },
          { status: 400 }
        );
      }

      const { isAnonymous } = validation.data;

      // Generate new anonymous ID if enabling anonymity
      let anonymousId = undefined;
      if (isAnonymous) {
        // Check if user already has an anonymous ID
        const currentUser = await prisma.user.findUnique({
          where: { id: user.userId },
          select: { anonymousId: true },
        });

        if (!currentUser?.anonymousId) {
          anonymousId = `anon_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`;
        }
      }

      // Update user anonymity settings
      const updatedUser = await prisma.user.update({
        where: { id: user.userId },
        data: {
          isAnonymous,
          ...(anonymousId && { anonymousId }),
        },
        select: {
          id: true,
          username: true,
          isAnonymous: true,
          anonymousId: true,
        },
      });

      // Log anonymity change
      await prisma.auditLog.create({
        data: {
          userId: user.userId,
          action: 'ANONYMITY_CHANGE',
          details: JSON.stringify({
            oldState: !isAnonymous,
            newState: isAnonymous,
            anonymousId: updatedUser.anonymousId,
            timestamp: new Date().toISOString(),
          }),
          ipAddress: req.ip || 'unknown',
          userAgent: req.headers.get('user-agent') || 'unknown',
        },
      });

      return NextResponse.json({
        message: 'Anonymity settings updated successfully',
        user: updatedUser,
      });
    } catch (error) {
      console.error('Update anonymity settings error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}

// POST /api/user/anonymity/regenerate - Generate new anonymous ID
export async function POST(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      const newAnonymousId = `anon_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`;

      const updatedUser = await prisma.user.update({
        where: { id: user.userId },
        data: {
          anonymousId: newAnonymousId,
          isAnonymous: true, // Ensure anonymity is enabled
        },
        select: {
          id: true,
          username: true,
          isAnonymous: true,
          anonymousId: true,
        },
      });

      // Log anonymous ID regeneration
      await prisma.auditLog.create({
        data: {
          userId: user.userId,
          action: 'ANONYMOUS_ID_REGENERATE',
          details: JSON.stringify({
            newAnonymousId,
            timestamp: new Date().toISOString(),
          }),
          ipAddress: req.ip || 'unknown',
          userAgent: req.headers.get('user-agent') || 'unknown',
        },
      });

      return NextResponse.json({
        message: 'Anonymous ID regenerated successfully',
        user: updatedUser,
      });
    } catch (error) {
      console.error('Regenerate anonymous ID error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}
