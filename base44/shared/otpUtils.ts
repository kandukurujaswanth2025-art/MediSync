// Shared OTP utilities used by the password-reset backend functions.
// Keeping this here avoids duplicating logic between requestPasswordReset
// and verifyResetOtp.

export const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
export const MAX_ATTEMPTS = 5;
export const RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds between sends

export async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Cryptographically random 6-digit OTP.
export function generateOtp(): string {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return String(arr[0] % 1000000).padStart(6, "0");
}

// Hash the OTP salted with the account email so the plaintext never lives in storage.
export async function hashOtp(otp: string, accountEmail: string): Promise<string> {
  return sha256(otp + ":" + accountEmail);
}