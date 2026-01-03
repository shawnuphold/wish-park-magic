// Simple in-memory store for verification codes
// In production, use Redis or a database table
const verificationCodes = new Map<string, { code: string; expires: number }>();

export function setVerificationCode(email: string, requestId: string, code: string) {
  const key = `${email.toLowerCase()}-${requestId}`;
  verificationCodes.set(key, {
    code,
    expires: Date.now() + 10 * 60 * 1000, // 10 minutes
  });
}

export function getVerificationCode(email: string, requestId: string): string | null {
  const key = `${email.toLowerCase()}-${requestId}`;
  const data = verificationCodes.get(key);

  if (!data) return null;

  if (Date.now() > data.expires) {
    verificationCodes.delete(key);
    return null;
  }

  return data.code;
}

export function clearVerificationCode(email: string, requestId: string) {
  const key = `${email.toLowerCase()}-${requestId}`;
  verificationCodes.delete(key);
}

export function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
