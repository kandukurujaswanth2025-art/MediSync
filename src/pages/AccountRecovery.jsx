import React, { useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Mail, ShieldCheck, KeyRound, CheckCircle2, Eye, EyeOff, RefreshCw } from "lucide-react";
import AuthShell, { Field, Input, FormError } from "@/components/AuthShell";
import { sendOtp, verifyOtp, resetPassword } from "@/services/passwordResetService";

const STEPS = { DETAILS: 0, OTP: 1, RESET: 2, DONE: 3 };

const ROLE_CONFIG = {
  hospital: { title: "Hospital Account Recovery", loginPath: "/login/hospital" },
  manager: { title: "Resource Manager Recovery", loginPath: "/login/manager" },
  patient: { title: "Patient Account Recovery", loginPath: "/login/patient" },
};

export default function AccountRecovery() {
  const { role } = useParams();
  const navigate = useNavigate();
  const cfg = ROLE_CONFIG[role] || ROLE_CONFIG.patient;
  const isManager = role === "manager";

  const [step, setStep] = useState(STEPS.DETAILS);
  const [email, setEmail] = useState("");
  const [hospitalCode, setHospitalCode] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  const btnPrimary = "inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60";
  const btnSecondary = "inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold hover:bg-muted disabled:opacity-60";

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError(""); setInfo(""); setLoading(true);
    try {
      const res = await sendOtp(role, email.trim(), hospitalCode.trim());
      setInfo(res.message || "OTP sent to your recovery email.");
      setStep(STEPS.OTP);
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError(""); setInfo(""); setLoading(true);
    try {
      await verifyOtp(role, email.trim(), hospitalCode.trim(), otp.trim());
      setInfo("OTP verified. Set your new password.");
      setStep(STEPS.RESET);
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  };

  const handleResend = async () => {
    setError(""); setInfo(""); setLoading(true);
    try {
      const res = await sendOtp(role, email.trim(), hospitalCode.trim());
      setInfo(res.message || "A new OTP has been sent.");
      setOtp("");
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");

    if (newPassword.length < 6) {
        setError("Password must be at least 6 characters.");
        return;
    }

    if (newPassword !== confirm) {
        setError("Passwords do not match.");
        return;
    }

    setLoading(true);

    try {
        await resetPassword(
            role,
            email.trim(),
            hospitalCode.trim(),
            otp.trim(),
            newPassword
        );

        setStep(STEPS.DONE);
    } catch (err) {
        setError(err.message);
    } finally {
        setLoading(false);
    }
};

  return (
    <AuthShell
      title={cfg.title}
      subtitle="Reset your password with a one-time OTP sent to your recovery email."
      footer={<Link to={cfg.loginPath} className="font-semibold text-primary">Back to login</Link>}
    >
      {step === STEPS.DETAILS && (
        <form onSubmit={handleSendOtp} className="space-y-4">
          {isManager && (
            <Field label="Hospital Code" hint="e.g. HOSP001">
              <Input required value={hospitalCode} onChange={(e) => setHospitalCode(e.target.value.toUpperCase())} placeholder="HOSP001" className="font-mono" />
            </Field>
          )}
          <Field label="Registered Email">
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@medisync.demo" />
          </Field>
          <FormError>{error}</FormError>
          <button type="submit" disabled={loading} className={btnPrimary}>
            <Mail className="h-4 w-4" /> {loading ? "Sending OTP…" : "Send OTP"}
          </button>
          {info && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{info}</p>}
        </form>
      )}

      {step === STEPS.OTP && (
        <form onSubmit={handleVerifyOtp} className="space-y-4">
          <p className="text-sm text-muted-foreground">Enter the 6-digit OTP sent to your recovery email.</p>
          <Field label="OTP">
            <Input
              required
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="123456"
              className="font-mono text-center text-lg tracking-widest"
              inputMode="numeric"
            />
          </Field>
          <FormError>{error}</FormError>
          <button type="submit" disabled={loading || otp.length < 6} className={btnPrimary}>
            <ShieldCheck className="h-4 w-4" /> {loading ? "Verifying…" : "Verify OTP"}
          </button>
          <button type="button" onClick={handleResend} disabled={loading} className={btnSecondary}>
            <RefreshCw className="h-4 w-4" /> Resend OTP
          </button>
          {info && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{info}</p>}
        </form>
      )}

      {step === STEPS.RESET && (
        <form onSubmit={handleReset} className="space-y-4">
          <Field label="New Password">
            <div className="relative">
              <Input type={show ? "text" : "password"} required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" className="pr-10" />
              <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </Field>
          <Field label="Confirm New Password">
            <Input type={show ? "text" : "password"} required value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" />
          </Field>
          <FormError>{error}</FormError>
          <button type="submit" disabled={loading} className={btnPrimary}>
            <KeyRound className="h-4 w-4" /> {loading ? "Resetting…" : "Reset Password"}
          </button>
        </form>
      )}

      {step === STEPS.DONE && (
        <div className="space-y-4 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
          <p className="text-lg font-semibold">Password reset successfully.</p>
          <p className="text-sm text-muted-foreground">You can now log in with your new password.</p>
          <button onClick={() => navigate(cfg.loginPath)} className={btnPrimary}>Go to Login</button>
        </div>
      )}
    </AuthShell>
  );
}