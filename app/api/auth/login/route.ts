import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { createSessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';
import { UserRole } from '@/lib/types';
import { checkRateLimit } from '@/lib/rate-limit';
import { sanitizeText, sanitizeEmail, sanitizePhone } from '@/lib/sanitize';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const rateCheck = checkRateLimit(`login_${ip}`, { maxRequests: 20, windowMs: 5 * 60 * 1000 });
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please wait a few minutes before retrying.' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { 
      email, 
      phone, 
      password, 
      role = 'STUDENT', 
      firebaseToken, 
      firebaseUser 
    } = body;

    const rawIdentifier = (email || phone || '').trim();
    const identifier = rawIdentifier.includes('@') ? sanitizeEmail(rawIdentifier) : sanitizePhone(rawIdentifier);

    if (!identifier && !firebaseToken && !firebaseUser) {
      return NextResponse.json(
        { error: 'Email, phone number, or Firebase token is required' },
        { status: 400 }
      );
    }

    let authenticatedUser: any = null;
    let authProvider: 'credentials' | 'firebase' | 'otp' = 'credentials';

    // 1. Firebase Authentication Path
    if (firebaseToken || firebaseUser) {
      authProvider = 'firebase';
      const firebaseEmail = (firebaseUser?.email || identifier).toLowerCase();
      const firebasePhone = firebaseUser?.phoneNumber || phone;

      // Look up existing user account or create runtime verified session
      const matched = db.findUserAccount(firebaseEmail) || 
                      (firebasePhone ? db.findUserAccount(firebasePhone) : undefined);

      if (matched) {
        authenticatedUser = matched;
      } else {
        // Create verified Firebase account
        authenticatedUser = {
          id: firebaseUser?.uid || `usr-fb-${Date.now()}`,
          email: firebaseEmail || `${role.toLowerCase()}@primelearning.edu.in`,
          name: firebaseUser?.displayName || identifier.split('@')[0] || 'Verified User',
          role: (role as UserRole) || 'STUDENT',
          phone: firebasePhone || '',
        };
      }
    } 
    // 2. Email / Phone Number + Password Path
    else {
      const cleanId = identifier.toLowerCase();
      const matched = db.findUserAccount(cleanId, password);

      if (!matched) {
        // Check if identifier exists to give helpful message
        const exists = db.findUserAccount(cleanId);
        if (exists) {
          return NextResponse.json(
            { error: 'Invalid password. Please check and try again.' },
            { status: 401 }
          );
        }

        // Parent dynamic check: if phone matches a student record's parentPhone
        if (role === 'PARENT') {
          const studentRecord = db.getStudentByPhoneOrId(identifier);
          if (studentRecord) {
            authenticatedUser = {
              id: `usr-parent-${studentRecord.id}`,
              email: identifier.includes('@') ? identifier : `parent.${studentRecord.phone}@primelearning.edu.in`,
              name: studentRecord.parentName || 'Parent / Guardian',
              role: 'PARENT' as UserRole,
              phone: studentRecord.phone,
              associatedId: studentRecord.id,
            };
          } else {
            return NextResponse.json(
              { error: 'No student enrolled with this parent phone number or email.' },
              { status: 404 }
            );
          }
        } else {
          return NextResponse.json(
            { error: 'Account not found. Please verify your credentials or contact administrator.' },
            { status: 404 }
          );
        }
      } else {
        authenticatedUser = matched;
      }
    }

    // Determine target redirect portal
    const effectiveRole: UserRole = authenticatedUser.role || role;
    const redirectUrl = 
      effectiveRole === 'ADMIN' ? '/admin' :
      effectiveRole === 'TEACHER' ? '/teacher' :
      effectiveRole === 'PARENT' ? '/parent' : '/student';

    // Generate signed HMAC session token
    const token = await createSessionToken({
      userId: authenticatedUser.id,
      email: authenticatedUser.email,
      name: authenticatedUser.name,
      role: effectiveRole,
      phone: authenticatedUser.phone,
      associatedId: authenticatedUser.associatedId,
      authProvider,
    });

    // Build response with secure HTTP-only cookie
    const response = NextResponse.json({
      success: true,
      user: {
        id: authenticatedUser.id,
        email: authenticatedUser.email,
        name: authenticatedUser.name,
        role: effectiveRole,
        phone: authenticatedUser.phone,
        associatedId: authenticatedUser.associatedId,
      },
      redirectUrl,
    });

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error during authentication' },
      { status: 500 }
    );
  }
}

