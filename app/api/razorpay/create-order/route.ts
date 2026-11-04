import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import crypto from 'crypto';
import { checkRateLimit } from '@/lib/rate-limit';
import { sanitizeNumber, sanitizeText } from '@/lib/sanitize';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const rateCheck = checkRateLimit(`order_${ip}`, { maxRequests: 15, windowMs: 60 * 1000 });
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: 'Too many order requests. Please retry in a moment.' }, { status: 429 });
    }

    const body = await req.json();
    const amountVal = sanitizeNumber(body.amount, 0, 100, 100000);
    const studentId = sanitizeText(body.studentId, 50);
    const courseTitle = sanitizeText(body.courseTitle, 100);
    const grade = sanitizeText(body.grade, 50);
    const parentName = sanitizeText(body.parentName, 100);
    const studentName = sanitizeText(body.studentName, 100);

    if (!amountVal || amountVal <= 0) {
      return NextResponse.json({ error: 'Valid payment amount is required' }, { status: 400 });
    }

    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_primelearning2026';
    const orderReceipt = `rcpt_${Date.now()}_${studentId?.slice(-4) || 'std'}`;
    const amountInPaise = Math.round(amountVal * 100);
    const orderId = `order_${crypto.randomBytes(8).toString('hex')}`;

    return NextResponse.json({
      success: true,
      order: {
        id: orderId,
        entity: 'order',
        amount: amountInPaise,
        amount_paid: 0,
        amount_due: amountInPaise,
        currency: 'INR',
        receipt: orderReceipt,
        status: 'created',
        key_id: keyId,
        notes: {
          studentId: studentId || '',
          studentName: studentName || 'Student Learner',
          parentName: parentName || '',
          courseTitle: courseTitle || '',
          grade: grade || '',
        },
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to generate payment order' }, { status: 500 });
  }
}

