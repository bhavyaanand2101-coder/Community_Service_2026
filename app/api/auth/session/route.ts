import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSessionFromCookieString } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const cookieHeader = req.headers.get('cookie');
    const session = await getSessionFromCookieString(cookieHeader);

    if (!session) {
      return NextResponse.json({ authenticated: false, session: null }, { status: 401 });
    }

    return NextResponse.json({
      authenticated: true,
      session: {
        userId: session.userId,
        email: session.email,
        name: session.name,
        role: session.role,
        phone: session.phone,
        associatedId: session.associatedId,
        authProvider: session.authProvider,
        expiresAt: session.expiresAt,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

