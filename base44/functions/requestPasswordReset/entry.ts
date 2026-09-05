import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { generateOtp, hashOtp, OTP_TTL_MS, RESEND_COOLDOWN_MS } from '../../shared/otpUtils.ts';

// Request a password-reset OTP. Generates a random OTP server-side, emails it
// to the recovery address via SendEmail, and stores a hash (never plaintext)
// in the PasswordResetOtp entity for later verification.
export default async function(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const accountEmail = (body && body.accountEmail || "").toString().trim();
    const recoveryEmail = (body && body.recoveryEmail || "").toString().trim();
    if (!accountEmail || !recoveryEmail) {
      return Response.json({ success: false, message: "Missing account email or recovery email." }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);

    // Rate limit: prevent OTP spam / rapid resends.
    const existing = await base44.asServiceRole.entities.PasswordResetOtp.filter(
      { accountEmail }, "-created_date", 1
    );
    if (existing && existing.length > 0) {
      const age = Date.now() - new Date(existing[0].created_date).getTime();
      if (age < RESEND_COOLDOWN_MS) {
        return Response.json({
          success: false,
          message: "An OTP was recently sent. Please wait a moment before requesting another.",
        });
      }
    }

    const otp = generateOtp();
    const otpHash = await hashOtp(otp, accountEmail);
    const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString();

    // Send the email first — never store an OTP we could not deliver.
    let delivered = false;
    let deliveryError = "";
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: recoveryEmail,
        subject: "MediSync — Password Reset OTP",
        body:
          "Your MediSync password reset OTP is: " + otp + "\n\n" +
          "This OTP expires in 10 minutes and can be used only once.\n" +
          "If you did not request a password reset, please ignore this email.",
      });
      delivered = true;
    } catch (e) {
      deliveryError = (e && e.message) ? e.message : String(e);
    }

    if (!delivered) {
      return Response.json({
        success: false,
        delivered: false,
        message:
          "Could not send the OTP email. The recovery email address may not be able to " +
          "receive mail (a registered app-user email or a connected custom domain is required).",
      });
    }

    // Replace any previous OTP records for this account.
    await base44.asServiceRole.entities.PasswordResetOtp.deleteMany({ accountEmail });
    await base44.asServiceRole.entities.PasswordResetOtp.create({
      accountEmail,
      otpHash,
      expiresAt,
      attempts: 0,
      used: false,
      delivered: true,
    });

    return Response.json({ success: true, delivered: true, message: "OTP sent to your recovery email." });
  } catch (error) {
    return Response.json({ success: false, message: (error && error.message) || "Unexpected error." }, { status: 500 });
  }
}