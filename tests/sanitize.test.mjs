import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

function sanitizeText(input, maxLength = 500) {
  if (typeof input !== 'string') return '';
  return input.replace(/\0/g, '').replace(/<[^>]*>?/gm, '').trim().slice(0, maxLength);
}

function sanitizeEmail(email) {
  if (typeof email !== 'string') return '';
  const cleaned = email.trim().toLowerCase().slice(0, 150);
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
  return emailRegex.test(cleaned) ? cleaned : '';
}

describe('Input Sanitization & XSS Defense', () => {
  test('strips dangerous HTML and script tags from text inputs', () => {
    const malicious = '<script>alert("XSS")</script>Hello Praveen Sir';
    const sanitized = sanitizeText(malicious);
    assert.equal(sanitized, 'alert("XSS")Hello Praveen Sir');
    assert.ok(!sanitized.includes('<script>'));
  });

  test('validates valid educational emails and rejects garbage', () => {
    assert.equal(sanitizeEmail('admin@primelearning.edu.in'), 'admin@primelearning.edu.in');
    assert.equal(sanitizeEmail('bad-email-format'), '');
    assert.equal(sanitizeEmail('javascript:alert(1)'), '');
  });
});

