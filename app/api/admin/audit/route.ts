import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/middleware/adminAuth';
import { prisma } from '@/lib/prisma';

// GET /api/admin/audit - Get audit logs with pagination and filtering
export async function GET(request: NextRequest) {
  return withAdminAuth(request, async (req, user) => {
    try {
      const { searchParams } = new URL(request.url);
      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '50');
      const action = searchParams.get('action') || '';
      const userId = searchParams.get('userId') || '';
      const startDate = searchParams.get('startDate') || '';
      const endDate = searchParams.get('endDate') || '';

      const skip = (page - 1) * limit;

      // Build where clause
      const where: any = {};

      if (action) {
        where.action = { contains: action, mode: 'insensitive' };
      }

      if (userId) {
        where.userId = userId;
      }

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) {
          where.createdAt.gte = new Date(startDate);
        }
        if (endDate) {
          where.createdAt.lte = new Date(endDate);
        }
      }

      const [logs, totalCount] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
                avatar: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.auditLog.count({ where }),
      ]);

      return NextResponse.json({
        logs,
        pagination: {
          page,
          limit,
          total: totalCount,
          pages: Math.ceil(totalCount / limit),
        },
      });
    } catch (error) {
      console.error('Get audit logs error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}

// GET /api/admin/audit/stats - Get audit statistics
export async function GET_STATS(request: NextRequest) {
  return withAdminAuth(request, async (req, user) => {
    try {
      const { searchParams } = new URL(request.url);
      const days = parseInt(searchParams.get('days') || '30');
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const stats = await prisma.auditLog.groupBy({
        by: ['action'],
        where: {
          createdAt: {
            gte: startDate,
          },
        },
        _count: {
          id: true,
        },
      });

      const topUsers = await prisma.auditLog.groupBy({
        by: ['userId'],
        where: {
          createdAt: {
            gte: startDate,
          },
        },
        _count: {
          id: true,
        },
        orderBy: {
          _count: {
            id: 'desc',
          },
        },
        take: 10,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
              avatar: true,
            },
          },
        },
      });

      const dailyActivity = await prisma.$queryRaw`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as count
        FROM audit_logs 
        WHERE created_at >= ${startDate.toISOString()}
        GROUP BY DATE(created_at)
        ORDER BY date DESC
        LIMIT 30
      `;

      return NextResponse.json({
        actionStats: stats,
        topUsers,
        dailyActivity,
        period: {
          startDate: startDate.toISOString(),
          endDate: new Date().toISOString(),
          days,
        },
      });
    } catch (error) {
      console.error('Get audit stats error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}

// DELETE /api/admin/audit - Clear old audit logs
export async function DELETE(request: NextRequest) {
  return withAdminAuth(request, async (req, user) => {
    try {
      const { searchParams } = new URL(request.url);
      const days = parseInt(searchParams.get('days') || '90');
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      // Delete old audit logs
      const result = await prisma.auditLog.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate,
          },
        },
      });

      // Log the cleanup action
      await prisma.auditLog.create({
        data: {
          userId: user.userId,
          action: 'AUDIT_CLEANUP',
          details: JSON.stringify({
            deletedCount: result.count,
            cutoffDate: cutoffDate.toISOString(),
            days,
            timestamp: new Date().toISOString(),
          }),
          ipAddress: req.ip || 'unknown',
          userAgent: req.headers.get('user-agent') || 'unknown',
        },
      });

      return NextResponse.json({
        message: `Deleted ${result.count} old audit logs`,
        deletedCount: result.count,
      });
    } catch (error) {
      console.error('Delete audit logs error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}
