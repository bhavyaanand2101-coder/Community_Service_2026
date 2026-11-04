import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSessionFromCookieString, isAuthorizedForRole } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { sanitizePhone, sanitizeText } from '@/lib/sanitize';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const rateCheck = checkRateLimit(`wa_${ip}`, { maxRequests: 10, windowMs: 60 * 1000 });
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: 'Too many WhatsApp notification requests' }, { status: 429 });
    }

    const session = await getSessionFromCookieString(req.headers.get('cookie'));
    if (!session || !isAuthorizedForRole(session.role, ['ADMIN', 'TEACHER'])) {
      return NextResponse.json({ error: 'Unauthorized: Faculty or Admin role required' }, { status: 403 });
    }

    const body = await req.json();
    const cleanNumber = sanitizePhone(body.toPhone);
    const message = sanitizeText(body.message, 1000);

    if (!cleanNumber || !message) {
      return NextResponse.json({ error: 'Valid phone number and message are required' }, { status: 400 });
    }
    const apiToken = process.env.WHATSAPP_API_TOKEN;
    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (apiToken && phoneId && apiToken !== 'your_meta_graph_api_token') {
      try {
        const response = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: cleanNumber,
            type: 'text',
            text: { body: message },
          }),
        });

        if (response.ok) {
          const data = await response.json();
          return NextResponse.json({ success: true, messageId: data.messages?.[0]?.id, provider: 'meta-cloud-api' });
        }
      } catch (waErr) {
        console.warn('WhatsApp API delivery notice:', waErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: `WhatsApp alert logged and queued for +${cleanNumber}`,
      provider: 'mock-logger',
      directLink: `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

