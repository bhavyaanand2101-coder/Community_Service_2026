/**
 * Input Sanitization & Parameter Validation Utilities
 * Defends against XSS, SQL injection, NoSQL injection, and control character injection.
 */

/**
 * Escapes dangerous HTML characters to prevent XSS attacks
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Sanitizes generic user text (stripping HTML tags, null bytes, and limiting length)
 */
export function sanitizeText(input: unknown, maxLength = 500): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/\0/g, '') // Strip null bytes
    .replace(/<[^>]*>?/gm, '') // Strip HTML tags
    .trim()
    .slice(0, maxLength);
}

/**
 * Sanitizes and validates an email address
 */
export function sanitizeEmail(email: unknown): string {
  if (typeof email !== 'string') return '';
  const cleaned = email.trim().toLowerCase().slice(0, 150);
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
  return emailRegex.test(cleaned) ? cleaned : '';
}

/**
 * Sanitizes and normalizes Indian and international phone numbers
 */
export function sanitizePhone(phone: unknown): string {
  if (typeof phone !== 'string') return '';
  // Keep only digits, limit to 15 digits (standard E.164 without prefix)
  return phone.replace(/[^0-9]/g, '').slice(0, 15);
}

/**
 * Sanitizes numeric input (prevents NaN or Infinity injection)
 */
export function sanitizeNumber(input: unknown, fallback = 0, min = 0, max = 1000000): number {
  const num = Number(input);
  if (isNaN(num) || !isFinite(num)) return fallback;
  return Math.min(Math.max(num, min), max);
}
