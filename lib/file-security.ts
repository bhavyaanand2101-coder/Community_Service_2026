/**
 * File Upload Security & Magic Number Verification
 * Ensures only safe, authorized educational file types (PDF, PNG, JPEG) can be uploaded.
 */

export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
];

export const ALLOWED_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg', '.webp'];

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB limit

/**
 * Validates a file's metadata against strict educational security whitelist
 */
export function validateFileMetadata(filename: string, mimeType: string, sizeBytes: number): { valid: boolean; error?: string } {
  // 1. File size check
  if (sizeBytes > MAX_FILE_SIZE_BYTES) {
    return { valid: false, error: 'File size exceeds 10MB maximum limit' };
  }
  if (sizeBytes <= 0) {
    return { valid: false, error: 'Empty file cannot be uploaded' };
  }

  // 2. Extension check
  const lowerName = filename.toLowerCase();
  const hasValidExt = ALLOWED_EXTENSIONS.some(ext => lowerName.endsWith(ext));
  if (!hasValidExt) {
    return { valid: false, error: 'Disallowed file extension. Only PDF, PNG, JPG, and WebP are allowed.' };
  }

  // 3. Double extension check (e.g. payload.php.pdf or script.exe.png)
  const dotCount = (filename.match(/\./g) || []).length;
  if (dotCount > 1) {
    const dangerousExtensions = ['.exe', '.php', '.js', '.sh', '.py', '.bat', '.cmd', '.vbs', '.msi'];
    const isDangerous = dangerousExtensions.some(ext => lowerName.includes(ext));
    if (isDangerous) {
      return { valid: false, error: 'Double extension or executable pattern detected. Upload blocked.' };
    }
  }

  // 4. MIME type whitelist check
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    return { valid: false, error: `Disallowed MIME type: ${mimeType}` };
  }

  return { valid: true };
}
