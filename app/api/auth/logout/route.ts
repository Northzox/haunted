import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';
import { destroySession } from '@/lib/auth';
import { clearAuthCookie } from '@/middleware/auth';

export async function POST(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      const token = req.cookies.get('auth-token')?.value;
      
      if (token) {
        await destroySession(token);
      }

      // Update user status
      await prisma.user.update({
        where: { id: user.userId },
        data: { 
          lastSeen: new Date(),
          isOnline: false,
        },
      });

      // Log logout
      await prisma.auditLog.create({
        data: {
          userId: user.userId,
          action: 'USER_LOGOUT',
          details: JSON.stringify({
            timestamp: new Date().toISOString(),
          }),
          ipAddress: req.ip || 'unknown',
          userAgent: req.headers.get('user-agent') || 'unknown',
        },
      });

      const response = NextResponse.json(
        { message: 'Logout successful' },
        { status: 200 }
      );

      clearAuthCookie(response);

      return response;
    } catch (error) {
      console.error('Logout error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}
