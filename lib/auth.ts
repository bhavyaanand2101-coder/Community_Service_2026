import { AuthSession, UserRole } from './types';

export const SESSION_COOKIE_NAME = 'prime_session';
const SESSION_SECRET = process.env.SESSION_SECRET || 'prime-learning-coaching-portal-secret-key-2026';
const TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

/**
 * Base64URL encode and decode helpers compatible with Edge & Node.js
 */
function base64UrlEncode(str: string): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(str, 'utf-8').toString('base64url');
  }
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlDecode(str: string): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(str, 'base64url').toString('utf-8');
  }
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

/**
 * Web Crypto HMAC-SHA256 signer
 */
async function getCryptoKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

/**
 * Generates an HMAC-signed session token (Edge & Browser compatible)
 */
export async function createSessionToken(
  sessionData: Omit<AuthSession, 'expiresAt'>,
  ttlSeconds = TOKEN_TTL_SECONDS
): Promise<string> {
  const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds;
  const fullSession: AuthSession = {
    ...sessionData,
    expiresAt,
  };

  const payloadJson = JSON.stringify(fullSession);
  const encodedPayload = base64UrlEncode(payloadJson);

  const key = await getCryptoKey(SESSION_SECRET);
  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(encodedPayload)
  );

  const signatureBytes = new Uint8Array(signatureBuffer);
  let binary = '';
  for (let i = 0; i < signatureBytes.length; i++) {
    binary += String.fromCharCode(signatureBytes[i]);
  }
  const encodedSignature = base64UrlEncode(binary);

  return `${encodedPayload}.${encodedSignature}`;
}

/**
 * Verifies an HMAC-signed session token
 */
export async function verifySessionToken(token: string): Promise<AuthSession | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [encodedPayload, encodedSignature] = parts;

    const key = await getCryptoKey(SESSION_SECRET);
    
    // Decode signature
    const sigBinary = base64UrlDecode(encodedSignature);
    const sigBytes = new Uint8Array(sigBinary.length);
    for (let i = 0; i < sigBinary.length; i++) {
      sigBytes[i] = sigBinary.charCodeAt(i);
    }

    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      sigBytes,
      new TextEncoder().encode(encodedPayload)
    );

    if (!isValid) return null;

    const payloadJson = base64UrlDecode(encodedPayload);
    const session = JSON.parse(payloadJson) as AuthSession;

    // Check expiration
    if (session.expiresAt && session.expiresAt < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return session;
  } catch (error) {
    return null;
  }
}

/**
 * Helper to extract and verify session from Cookie string (works in Edge middleware and server routes)
 */
export async function getSessionFromCookieString(cookieHeader: string | null): Promise<AuthSession | null> {
  if (!cookieHeader) return null;
  
  const cookies = cookieHeader.split(';').map(c => c.trim());
  const targetCookie = cookies.find(c => c.startsWith(`${SESSION_COOKIE_NAME}=`));
  if (!targetCookie) return null;

  const token = targetCookie.substring(`${SESSION_COOKIE_NAME}=`.length);
  return await verifySessionToken(token);
}

/**
 * Checks if a session has the necessary role
 */
export function isAuthorizedForRole(userRole: UserRole, allowedRoles: UserRole[]): boolean {
  if (userRole === 'ADMIN') return true; // Superuser access
  return allowedRoles.includes(userRole);
}

