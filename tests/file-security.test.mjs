import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

const ALLOWED_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg', '.webp'];
const ALLOWED_MIME_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];

function validateFile(filename, mimeType, sizeBytes) {
  if (sizeBytes > 10 * 1024 * 1024) return { valid: false, error: 'File size exceeds limit' };
  const lower = filename.toLowerCase();
  const hasExt = ALLOWED_EXTENSIONS.some(ext => lower.endsWith(ext));
  if (!hasExt) return { valid: false, error: 'Disallowed extension' };
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) return { valid: false, error: 'Disallowed MIME' };
  if (lower.includes('.php') || lower.includes('.exe') || lower.includes('.sh')) {
    return { valid: false, error: 'Dangerous executable detected' };
  }
  return { valid: true };
}

describe('File Upload Security Whitelist', () => {
  test('permits legitimate student PDF study materials and images', () => {
    assert.equal(validateFile('Class_10_Trigonometry_Formulas.pdf', 'application/pdf', 1024 * 50).valid, true);
    assert.equal(validateFile('Student_ID_Card.png', 'image/png', 1024 * 200).valid, true);
  });

  test('blocks dangerous executables disguised as documents', () => {
    assert.equal(validateFile('trojan.exe', 'application/x-msdownload', 500).valid, false);
    assert.equal(validateFile('webshell.php.pdf', 'application/pdf', 500).valid, false);
    assert.equal(validateFile('script.sh.png', 'image/png', 500).valid, false);
  });
});

