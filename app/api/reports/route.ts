import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createReportSchema = z.object({
  type: z.enum(['USER', 'MESSAGE', 'SERVER', 'CHANNEL']),
  targetId: z.string(),
  reason: z.string().min(1).max(500),
  description: z.string().max(1000).optional(),
});

// GET /api/reports - Get reports for current user or admin
export async function GET(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      const { searchParams } = new URL(request.url);
      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '20');
      const status = searchParams.get('status') || '';
      const type = searchParams.get('type') || '';

      const skip = (page - 1) * limit;

      // Build where clause
      const where: any = {};

      // Non-admin users can only see their own reports
      if (!user.isAdmin) {
        where.reportedBy = user.userId;
      }

      if (status && status !== 'all') {
        where.status = status;
      }

      if (type && type !== 'all') {
        where.type = type;
      }

      const [reports, totalCount] = await Promise.all([
        prisma.report.findMany({
          where,
          include: {
            reporter: {
              select: {
                id: true,
                username: true,
                avatar: true,
              },
            },
            target: {
              select: {
                id: true,
                username: true,
                avatar: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.report.count({ where }),
      ]);

      return NextResponse.json({
        reports,
        pagination: {
          page,
          limit,
          total: totalCount,
          pages: Math.ceil(totalCount / limit),
        },
      });
    } catch (error) {
      console.error('Get reports error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}

// POST /api/reports - Create a new report
export async function POST(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      const body = await req.json();
      
      // Validate input
      const validation = createReportSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(
          { error: 'Invalid input', details: validation.error.errors },
          { status: 400 }
        );
      }

      const { type, targetId, reason, description } = validation.data;

      // Check if user already reported this target
      const existingReport = await prisma.report.findFirst({
        where: {
          reportedBy: user.userId,
          targetId,
          type,
          status: { in: ['OPEN', 'IN_PROGRESS'] },
        },
      });

      if (existingReport) {
        return NextResponse.json(
          { error: 'You have already reported this item' },
          { status: 409 }
        );
      }

      // Validate target exists
      let targetExists = false;
      switch (type) {
        case 'USER':
          targetExists = await prisma.user.findUnique({
            where: { id: targetId },
            select: { id: true },
          });
          break;
        case 'MESSAGE':
          targetExists = await prisma.message.findUnique({
            where: { id: targetId },
            select: { id: true },
          });
          break;
        case 'SERVER':
          targetExists = await prisma.server.findUnique({
            where: { id: targetId },
            select: { id: true },
          });
          break;
        case 'CHANNEL':
          targetExists = await prisma.channel.findUnique({
            where: { id: targetId },
            select: { id: true },
          });
          break;
      }

      if (!targetExists) {
        return NextResponse.json(
          { error: 'Target not found' },
          { status: 404 }
        );
      }

      // Create report
      const report = await prisma.report.create({
        data: {
          type,
          targetId,
          targetModel: type,
          reason,
          description,
          reportedBy: user.userId,
          status: 'OPEN',
        },
        include: {
          reporter: {
            select: {
              id: true,
              username: true,
              avatar: true,
            },
          },
        },
      });

      // Log report creation
      await prisma.auditLog.create({
        data: {
          userId: user.userId,
          action: 'REPORT_CREATE',
          details: JSON.stringify({
            reportId: report.id,
            type,
            targetId,
            reason,
            timestamp: new Date().toISOString(),
          }),
          ipAddress: req.ip || 'unknown',
          userAgent: req.headers.get('user-agent') || 'unknown',
        },
      });

      return NextResponse.json({
        message: 'Report submitted successfully',
        report,
      }, { status: 201 });
    } catch (error) {
      console.error('Create report error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}

// PUT /api/reports - Update report status (admin only)
export async function PUT(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    // Only admins can update reports
    if (!user.isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    try {
      const body = await req.json();
      const { reportId, status, reviewNote } = body;

      if (!reportId || !status) {
        return NextResponse.json(
          { error: 'Report ID and status are required' },
          { status: 400 }
        );
      }

      if (!['OPEN', 'IN_PROGRESS', 'RESOLVED', 'DISMISSED'].includes(status)) {
        return NextResponse.json(
          { error: 'Invalid status' },
          { status: 400 }
        );
      }

      // Update report
      const updatedReport = await prisma.report.update({
        where: { id: reportId },
        data: {
          status,
          reviewedBy: user.userId,
          reviewedAt: new Date(),
          // Store review note in details or a separate field
          ...(reviewNote && { 
            details: JSON.stringify({
              reviewNote,
              reviewedAt: new Date().toISOString(),
              reviewedBy: user.userId,
            })
          }),
        },
        include: {
          reporter: {
            select: {
              id: true,
              username: true,
              avatar: true,
            },
          },
        },
      });

      // Log report update
      await prisma.auditLog.create({
        data: {
          userId: user.userId,
          action: 'REPORT_UPDATE',
          details: JSON.stringify({
            reportId,
            oldStatus: 'PREVIOUS_STATUS',
            newStatus: status,
            reviewNote,
            timestamp: new Date().toISOString(),
          }),
          ipAddress: req.ip || 'unknown',
          userAgent: req.headers.get('user-agent') || 'unknown',
        },
      });

      return NextResponse.json({
        message: 'Report updated successfully',
        report: updatedReport,
      });
    } catch (error) {
      console.error('Update report error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}
