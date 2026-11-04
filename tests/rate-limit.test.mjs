import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

// Test rate limiter logic
function checkRateLimit(identifier, maxRequests, windowMs, store = new Map()) {
  const now = Date.now();
  const windowStart = now - windowMs;
  const timestamps = (store.get(identifier) || []).filter(t => t > windowStart);

  if (timestamps.length >= maxRequests) {
    return { allowed: false, remaining: 0 };
  }
  timestamps.push(now);
  store.set(identifier, timestamps);
  return { allowed: true, remaining: maxRequests - timestamps.length };
}

describe('Rate Limiter Engine', () => {
  test('permits requests within quota', () => {
    const store = new Map();
    const result1 = checkRateLimit('user-1', 3, 1000, store);
    const result2 = checkRateLimit('user-1', 3, 1000, store);
    assert.equal(result1.allowed, true);
    assert.equal(result2.allowed, true);
    assert.equal(result2.remaining, 1);
  });

  test('blocks requests exceeding quota', () => {
    const store = new Map();
    checkRateLimit('user-2', 2, 1000, store);
    checkRateLimit('user-2', 2, 1000, store);
    const blocked = checkRateLimit('user-2', 2, 1000, store);
    assert.equal(blocked.allowed, false);
    assert.equal(blocked.remaining, 0);
  });
});

