import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSessionFromCookieString, isAuthorizedForRole } from '@/lib/auth';
import { getRecentAuditLogs, recordAdminAudit } from '@/lib/audit-logger';

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromCookieString(req.headers.get('cookie'));
    if (!session || !isAuthorizedForRole(session.role, ['ADMIN'])) {
      return NextResponse.json({ error: 'Unauthorized: Admin role required' }, { status: 403 });
    }

    const logs = getRecentAuditLogs();
    return NextResponse.json({ success: true, count: logs.length, logs });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromCookieString(req.headers.get('cookie'));
    if (!session || !isAuthorizedForRole(session.role, ['ADMIN'])) {
      return NextResponse.json({ error: 'Unauthorized: Admin role required' }, { status: 403 });
    }

    const body = await req.json();
    await recordAdminAudit({
      actorEmail: session.email,
      actorRole: session.role,
      action: body.action || 'GENERIC_ADMIN_ACTION',
      resourceType: body.resourceType || 'SETTINGS',
      resourceId: body.resourceId,
      ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
      metadata: body.metadata,
    });

    return NextResponse.json({ success: true, message: 'Admin action recorded in audit log' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

