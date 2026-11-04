import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

describe('Razorpay HMAC-SHA256 Payment Verification', () => {
  const SECRET_KEY = 'rzp_test_secret_primelearning_secure_2026';

  function generateSignature(orderId, paymentId, secret) {
    return crypto
      .createHmac('sha256', secret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');
  }

  function verifyPayment(orderId, paymentId, signature, secret) {
    const expected = generateSignature(orderId, paymentId, secret);
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  }

  test('correctly validates genuine Razorpay signature', () => {
    const orderId = 'order_9A3X8Z21';
    const paymentId = 'pay_001928374';
    const signature = generateSignature(orderId, paymentId, SECRET_KEY);

    const isValid = verifyPayment(orderId, paymentId, signature, SECRET_KEY);
    assert.equal(isValid, true, 'Genuine HMAC signature must be accepted');
  });

  test('rejects forged payment signature', () => {
    const orderId = 'order_9A3X8Z21';
    const paymentId = 'pay_001928374';
    const forgedSignature = crypto.randomBytes(32).toString('hex');

    const isValid = verifyPayment(orderId, paymentId, forgedSignature, SECRET_KEY);
    assert.equal(isValid, false, 'Forged signature must be rejected');
  });

  test('rejects signature calculated with incorrect secret key', () => {
    const orderId = 'order_9A3X8Z21';
    const paymentId = 'pay_001928374';
    const wrongSignature = generateSignature(orderId, paymentId, 'wrong_secret_key');

    const isValid = verifyPayment(orderId, paymentId, wrongSignature, SECRET_KEY);
    assert.equal(isValid, false, 'Signature with wrong secret must be rejected');
  });
});

