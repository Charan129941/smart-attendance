// =====================================================
// QR Code Generation and HMAC Token Signing
// =====================================================

import crypto from 'crypto';
import QRCode from 'qrcode';

const QR_SECRET = process.env.QR_SECRET || 'default-qr-secret-change-in-production';
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

/**
 * Create a signed QR token for a session version.
 * Token format: base64url(JSON({sessionId, version, expiresAt})) + '.' + base64url(hmac)
 */
export function createQrToken(
  sessionId: string,
  version: number,
  expiresAt: number
): string {
  const payload = JSON.stringify({ sessionId, version, expiresAt });
  const payloadB64 = Buffer.from(payload).toString('base64url');

  const hmac = crypto.createHmac('sha256', QR_SECRET);
  hmac.update(payloadB64);
  const signature = hmac.digest('base64url');

  return `${payloadB64}.${signature}`;
}

/**
 * Verify and decode a QR token.
 * Returns the payload if valid, null if tampered or malformed.
 */
export function verifyQrToken(
  token: string
): { sessionId: string; version: number; expiresAt: number } | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [payloadB64, signature] = parts;

  // Verify HMAC
  const hmac = crypto.createHmac('sha256', QR_SECRET);
  hmac.update(payloadB64);
  const expectedSignature = hmac.digest('base64url');

  if (!crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  )) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
    if (!payload.sessionId || typeof payload.version !== 'number' || typeof payload.expiresAt !== 'number') {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

/**
 * Check if a token is expired.
 */
export function isTokenExpired(expiresAt: number): boolean {
  return Date.now() > expiresAt;
}

/**
 * Hash a token for database storage (we don't store raw tokens in DB).
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Build the full attendance URL from a token.
 */
export function buildAttendanceUrl(token: string, hostUrl?: string): string {
  const base = hostUrl || BASE_URL;
  return `${base}/attend/${encodeURIComponent(token)}`;
}

/**
 * Generate a QR code data URL from a token.
 * Uses the qrcode package (imported dynamically to keep this module testable).
 */
export async function generateQrDataUrl(token: string, hostUrl?: string): Promise<string> {
  const url = buildAttendanceUrl(token, hostUrl);
  return QRCode.toDataURL(url, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 400,
    color: {
      dark: '#FFFFFF',
      light: '#0a0f1e',
    },
  });
}

/**
 * Generate a unique idempotency key for client-side use.
 */
export function generateIdempotencyKey(): string {
  return crypto.randomUUID();
}
