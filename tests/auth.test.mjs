import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

// Replicate HMAC signing algorithm to verify cryptographic validity independently
const TEST_SECRET = 'prime-learning-coaching-portal-secret-key-2026';

function base64UrlEncode(str) {
  return Buffer.from(str, 'utf-8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlDecode(str) {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) base64 += '=';
  return Buffer.from(base64, 'base64').toString('utf-8');
}

function signSession(payload, secret = TEST_SECRET) {
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = crypto
    .createHmac('sha256', secret)
    .update(encodedPayload)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `${encodedPayload}.${signature}`;
}

function verifySession(token, secret = TEST_SECRET) {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encodedPayload, encodedSig] = parts;

  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(encodedPayload)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  if (expectedSig !== encodedSig) return null;

  const payload = JSON.parse(base64UrlDecode(encodedPayload));
  if (payload.expiresAt && payload.expiresAt < Math.floor(Date.now() / 1000)) {
    return null;
  }
  return payload;
}

describe('Authentication & Session Token Cryptography', () => {
  test('generates and verifies a valid Admin session', () => {
    const sessionData = {
      userId: 'usr-admin',
      email: 'admin@primelearning.edu.in',
      role: 'ADMIN',
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
    };

    const token = signSession(sessionData);
    assert.ok(token.includes('.'));

    const verified = verifySession(token);
    assert.equal(verified.userId, 'usr-admin');
    assert.equal(verified.role, 'ADMIN');
  });

  test('generates and verifies Parent session linked to student phone', () => {
    const sessionData = {
      userId: 'usr-parent-std-1',
      phone: '9810989437',
      role: 'PARENT',
      associatedId: 'std-1',
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
    };

    const token = signSession(sessionData);
    const verified = verifySession(token);
    assert.equal(verified.role, 'PARENT');
    assert.equal(verified.phone, '9810989437');
    assert.equal(verified.associatedId, 'std-1');
  });

  test('rejects tampered session token payload', () => {
    const sessionData = {
      userId: 'usr-student',
      role: 'STUDENT',
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
    };
    const token = signSession(sessionData);

    // Tamper with payload by changing role to ADMIN
    const [_, sig] = token.split('.');
    const tamperedPayload = base64UrlEncode(JSON.stringify({ ...sessionData, role: 'ADMIN' }));
    const tamperedToken = `${tamperedPayload}.${sig}`;

    const verified = verifySession(tamperedToken);
    assert.equal(verified, null, 'Tampered token must fail signature verification');
  });

  test('rejects expired session token', () => {
    const expiredData = {
      userId: 'usr-teacher',
      role: 'TEACHER',
      expiresAt: Math.floor(Date.now() / 1000) - 100, // Expired in the past
    };
    const token = signSession(expiredData);
    const verified = verifySession(token);
    assert.equal(verified, null, 'Expired session token must be rejected');
  });
});

