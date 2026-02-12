import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'northlable69@gmail.com';

export async function withAdminAuth(
  request: NextRequest,
  handler: (request: NextRequest, user: any) => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const user = await validateSession(token);

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid or expired session' },
        { status: 401 }
      );
    }

    // Check if user is admin by email whitelist
    if (user.email !== ADMIN_EMAIL) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Additional check for isAdmin flag (defense in depth)
    if (!user.isAdmin) {
      return NextResponse.json(
        { error: 'Admin privileges required' },
        { status: 403 }
      );
    }

    return handler(request, user);
  } catch (error) {
    console.error('Admin auth middleware error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
