import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { hashOtp, MAX_ATTEMPTS } from '../../shared/otpUtils.ts';

// Verify a password-reset OTP against the stored hash. Enforces expiry,
// a failed-attempt limit, and single-use (the OTP is invalidated on success
// or after too many attempts). Returns verified: true only on a valid match.
export default async function(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const accountEmail = (body && body.accountEmail || "").toString().trim();
    const otp = (body && body.otp || "").toString().trim();
    if (!accountEmail || !otp) {
      return Response.json({ success: false, message: "Missing account email or OTP." }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);
    const records = await base44.asServiceRole.entities.PasswordResetOtp.filter(
      { accountEmail }, "-created_date", 5
    );
    const record = (records || []).find((r) => !r.used);

    if (!record) {
      return Response.json({ success: false, verified: false, message: "No active OTP found. Please request a new OTP." });
    }
    if (record.attempts >= MAX_ATTEMPTS) {
      await base44.asServiceRole.entities.PasswordResetOtp.update(record.id, { used: true });
      return Response.json({ success: false, verified: false, message: "Too many failed attempts. Please request a new OTP." });
    }
    if (new Date(record.expiresAt) <= new Date()) {
      await base44.asServiceRole.entities.PasswordResetOtp.update(record.id, { used: true });
      return Response.json({ success: false, verified: false, message: "OTP has expired. Please request a new OTP." });
    }

    const inputHash = await hashOtp(otp, accountEmail);
    if (inputHash !== record.otpHash) {
      const newAttempts = record.attempts + 1;
      await base44.asServiceRole.entities.PasswordResetOtp.update(record.id, { attempts: newAttempts });
      const remaining = MAX_ATTEMPTS - newAttempts;
      return Response.json({
        success: false,
        verified: false,
        message: "Invalid OTP. " + remaining + " attempt(s) remaining.",
      });
    }

    // Valid — mark used so it cannot be reused.
    await base44.asServiceRole.entities.PasswordResetOtp.update(record.id, { used: true });
    return Response.json({ success: true, verified: true, message: "OTP verified." });
  } catch (error) {
    return Response.json({ success: false, message: (error && error.message) || "Unexpected error." }, { status: 500 });
  }
}