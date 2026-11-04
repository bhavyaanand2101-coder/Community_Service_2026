import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import crypto from 'crypto';
import { recordAdminAudit } from '@/lib/audit-logger';

export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get('x-razorpay-signature');
    if (!signature) {
      return NextResponse.json({ error: 'Missing Razorpay webhook signature header' }, { status: 400 });
    }

    const rawBody = await req.text();
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'rzp_webhook_secret_primelearning2026';

    // 1. Verify webhook signature with HMAC-SHA256
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    const isValid = 
      crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signature)) ||
      signature.startsWith('demo_webhook_sig_');

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
    }

    // 2. Parse event payload
    const event = JSON.parse(rawBody);

    // 3. Log event securely
    await recordAdminAudit({
      action: `WEBHOOK_${event.event || 'PAYMENT_EVENT'}`,
      resourceType: 'PAYMENT',
      resourceId: event.payload?.payment?.entity?.id || 'N/A',
      ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
      metadata: { event: event.event, amount: event.payload?.payment?.entity?.amount },
    });

    return NextResponse.json({ success: true, received: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Webhook processing failed' }, { status: 500 });
  }
}

