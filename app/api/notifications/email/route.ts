import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSessionFromCookieString } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { sanitizeEmail, sanitizeText } from '@/lib/sanitize';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const rateCheck = checkRateLimit(`email_${ip}`, { maxRequests: 10, windowMs: 60 * 1000 });
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: 'Too many email requests. Please try again later.' }, { status: 429 });
    }

    // Auth verification: ensure caller is authenticated or internal verified transaction
    const session = await getSessionFromCookieString(req.headers.get('cookie'));
    const isInternalKey = req.headers.get('x-internal-key') === (process.env.SESSION_SECRET || 'prime-learning-coaching-portal-secret-key-2026');
    
    if (!session && !isInternalKey) {
      return NextResponse.json({ error: 'Unauthorized: Authentication required to trigger notifications' }, { status: 401 });
    }

    const body = await req.json();
    const to = sanitizeEmail(body.to);
    const subject = sanitizeText(body.subject, 150);
    const type = sanitizeText(body.type, 50);
    const payload = body.payload;

    if (!to || !subject) {
      return NextResponse.json({ error: 'Valid recipient email and subject are required' }, { status: 400 });
    }

    const resendApiKey = process.env.RESEND_API_KEY;

    if (resendApiKey && resendApiKey.startsWith('re_') && resendApiKey !== 're_your_api_key') {
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: process.env.EMAIL_FROM_ADDRESS || 'Prime Learning <admissions@primelearning.edu.in>',
            to: [to],
            subject: subject,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
                <h2 style="color: #0f172a; margin-top: 0;">Prime Learning Classes</h2>
                <p style="color: #64748b; font-size: 14px;">Sector-22B, Gurugram • Quality Coaching</p>
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;" />
                <h3 style="color: #ea580c;">${subject}</h3>
                <p>Hello,</p>
                <p>${payload?.message || 'Please find your official institutional notice attached below.'}</p>
                ${payload?.amount ? `<div style="background: #f8fafc; padding: 12px; border-radius: 8px; font-weight: bold;">Amount: ${payload.amount}</div>` : ''}
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;" />
                <p style="font-size: 12px; color: #94a3b8;">Prime Learning Coaching Portal • Automated Transaction Notification</p>
              </div>
            `,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          return NextResponse.json({ success: true, id: data.id, provider: 'resend' });
        }
      } catch (err) {
        console.warn('Resend email notice:', err);
      }
    }

    // Dev/Sandbox logging fallback
    return NextResponse.json({
      success: true,
      message: `Email queued and simulated for ${to}`,
      provider: 'mock-logger',
      details: { to, subject, type, timestamp: new Date().toISOString() },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

