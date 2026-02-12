import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/middleware/adminAuth';
import { prisma } from '@/lib/prisma';

// GET /api/admin/users - Get all users with pagination and filtering
export async function GET(request: NextRequest) {
  return withAdminAuth(request, async (req, user) => {
    try {
      const { searchParams } = new URL(request.url);
      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '50');
      const search = searchParams.get('search') || '';
      const role = searchParams.get('role') || '';
      const status = searchParams.get('status') || '';

      const skip = (page - 1) * limit;

      // Build where clause
      const where: any = {};

      if (search) {
        where.OR = [
          { username: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ];
      }

      if (role === 'admin') {
        where.isAdmin = true;
      } else if (role === 'user') {
        where.isAdmin = false;
      }

      if (status === 'banned') {
        where.isBanned = true;
      } else if (status === 'active') {
        where.isBanned = false;
      }

      const [users, totalCount] = await Promise.all([
        prisma.user.findMany({
          where,
          select: {
            id: true,
            username: true,
            email: true,
            avatar: true,
            bio: true,
            customStatus: true,
            isAnonymous: true,
            anonymousId: true,
            isOnline: true,
            lastSeen: true,
            emailVerified: true,
            isAdmin: true,
            isBanned: true,
            banReason: true,
            banExpires: true,
            createdAt: true,
            updatedAt: true,
            _count: {
              select: {
                messages: true,
                ownedServers: true,
                serverMemberships: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.user.count({ where }),
      ]);

      return NextResponse.json({
        users,
        pagination: {
          page,
          limit,
          total: totalCount,
          pages: Math.ceil(totalCount / limit),
        },
      });
    } catch (error) {
      console.error('Get users error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}

// POST /api/admin/users/ban - Ban a user
export async function POST(request: NextRequest) {
  return withAdminAuth(request, async (req, user) => {
    try {
      const body = await req.json();
      const { userId, reason, duration } = body;

      if (!userId || !reason) {
        return NextResponse.json(
          { error: 'User ID and reason are required' },
          { status: 400 }
        );
      }

      // Calculate ban expiration
      let banExpires = null;
      if (duration && duration > 0) {
        banExpires = new Date();
        banExpires.setDate(banExpires.getDate() + duration);
      }

      // Update user
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          isBanned: true,
          banReason: reason,
          banExpires,
        },
        select: {
          id: true,
          username: true,
          email: true,
          isBanned: true,
          banReason: true,
          banExpires: true,
        },
      });

      // Log ban action
      await prisma.auditLog.create({
        data: {
          userId: user.userId,
          action: 'USER_BAN',
          details: JSON.stringify({
            bannedUserId: userId,
            bannedUsername: updatedUser.username,
            reason,
            duration,
            banExpires,
            timestamp: new Date().toISOString(),
          }),
          ipAddress: req.ip || 'unknown',
          userAgent: req.headers.get('user-agent') || 'unknown',
        },
      });

      return NextResponse.json({
        message: 'User banned successfully',
        user: updatedUser,
      });
    } catch (error) {
      console.error('Ban user error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}

// DELETE /api/admin/users/ban - Unban a user
export async function DELETE(request: NextRequest) {
  return withAdminAuth(request, async (req, user) => {
    try {
      const { searchParams } = new URL(request.url);
      const userId = searchParams.get('userId');

      if (!userId) {
        return NextResponse.json(
          { error: 'User ID is required' },
          { status: 400 }
        );
      }

      // Update user
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          isBanned: false,
          banReason: null,
          banExpires: null,
        },
        select: {
          id: true,
          username: true,
          email: true,
          isBanned: true,
        },
      });

      // Log unban action
      await prisma.auditLog.create({
        data: {
          userId: user.userId,
          action: 'USER_UNBAN',
          details: JSON.stringify({
            unbannedUserId: userId,
            unbannedUsername: updatedUser.username,
            timestamp: new Date().toISOString(),
          }),
          ipAddress: req.ip || 'unknown',
          userAgent: req.headers.get('user-agent') || 'unknown',
        },
      });

      return NextResponse.json({
        message: 'User unbanned successfully',
        user: updatedUser,
      });
    } catch (error) {
      console.error('Unban user error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}

// DELETE /api/admin/users - Delete a user
export async function DELETE_(request: NextRequest) {
  return withAdminAuth(request, async (req, user) => {
    try {
      const { searchParams } = new URL(request.url);
      const userId = searchParams.get('userId');

      if (!userId) {
        return NextResponse.json(
          { error: 'User ID is required' },
          { status: 400 }
        );
      }

      // Prevent admin from deleting themselves
      if (userId === user.userId) {
        return NextResponse.json(
          { error: 'Cannot delete your own account' },
          { status: 400 }
        );
      }

      // Get user info before deletion for logging
      const userToDelete = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          username: true,
          email: true,
        },
      });

      if (!userToDelete) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      // Delete user (cascade will handle related records)
      await prisma.user.delete({
        where: { id: userId },
      });

      // Log deletion
      await prisma.auditLog.create({
        data: {
          userId: user.userId,
          action: 'USER_DELETE',
          details: JSON.stringify({
            deletedUserId: userId,
            deletedUsername: userToDelete.username,
            deletedEmail: userToDelete.email,
            timestamp: new Date().toISOString(),
          }),
          ipAddress: req.ip || 'unknown',
          userAgent: req.headers.get('user-agent') || 'unknown',
        },
      });

      return NextResponse.json({
        message: 'User deleted successfully',
      });
    } catch (error) {
      console.error('Delete user error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}
