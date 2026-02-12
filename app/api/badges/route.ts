import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';
import { prisma } from '@/lib/prisma';

// GET /api/badges - Get all available badges
export async function GET(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      const badges = await prisma.badge.findMany({
        include: {
          userBadges: {
            where: {
              userId: user.userId,
              isActive: true,
            },
            select: {
              isActive: true,
            },
          },
        },
        orderBy: [
          { isSystem: 'desc' },
          { name: 'asc' },
        ],
      });

      // Add user-specific information
      const badgesWithUserStatus = badges.map(badge => ({
        ...badge,
        isEarned: badge.userBadges.length > 0,
        isActive: badge.userBadges.length > 0 ? badge.userBadges[0].isActive : false,
      }));

      return NextResponse.json({ badges: badgesWithUserStatus });
    } catch (error) {
      console.error('Get badges error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}
