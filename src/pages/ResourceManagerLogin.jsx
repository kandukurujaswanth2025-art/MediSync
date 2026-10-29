
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Boxes, Eye, EyeOff, ShieldCheck, ArrowLeft } from "lucide-react";
import AuthShell, { Field, Input, FormError } from "@/components/AuthShell";
import { useAppAuth } from "@/lib/AppAuthContext";
import { verifyManagerMfa } from "@/services/authService";

export default function ResourceManagerLogin() {
  const { loginResourceManager } = useAppAuth();
  const navigate = useNavigate();

  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [challengeToken, setChallengeToken] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const mfaRequired = Boolean(challengeToken);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await loginResourceManager(
        code.trim(),
        password
      );

      if (result?.mfaRequired) {
        setChallengeToken(result.challengeToken);
        setPassword("");
        setMfaCode("");
        return;
      }

      navigate("/manager");
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const verifyMfa = async (e) => {
    e.preventDefault();
    setError("");

    if (!/^\d{6}$/.test(mfaCode)) {
      setError("Enter the six-digit code from your authenticator app.");
      return;
    }

    setLoading(true);

    try {
      await verifyManagerMfa(
        challengeToken,
        mfaCode,
        code.trim()
      );

      navigate("/manager");
    } catch (err) {
      setError(err.message || "MFA verification failed");
    } finally {
      setLoading(false);
    }
  };

  const backToLogin = () => {
    setChallengeToken("");
    setMfaCode("");
    setError("");
  };

  return (
    <AuthShell
      title={mfaRequired ? "Verify Your Identity" : "Resource Manager Login"}
      subtitle={
        mfaRequired
          ? "Enter the six-digit code from your authenticator app."
          : "Manage medicines, equipment and stock for your hospital."
      }
      footer={
        <>
          Hospital staff?{" "}
          <Link
            to="/login/hospital"
            className="font-semibold text-primary"
          >
            Login here
          </Link>
        </>
      }
    >
      {mfaRequired ? (
        <form onSubmit={verifyMfa} className="space-y-4">
          <Field label="Authenticator Code" hint="Enter the current six-digit code">
            <Input
              required
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={mfaCode}
              onChange={(e) =>
                setMfaCode(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              placeholder="123456"
              className="font-mono tracking-widest"
            />
          </Field>

          <FormError>{error}</FormError>

          <button
            type="submit"
            disabled={loading || mfaCode.length !== 6}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            <ShieldCheck className="h-4 w-4" />
            {loading ? "Verifying..." : "Verify and Login"}
          </button>

          <button
            type="button"
            onClick={backToLogin}
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold disabled:opacity-60"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Login
          </button>
        </form>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <Field label="Hospital Code" hint="e.g. HOSP001">
            <Input
              required
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="HOSP001"
              className="font-mono"
            />
          </Field>

          <Field label="Password">
            <div className="relative">
              <Input
                type={show ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="pr-10"
              />

              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {show ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </Field>

          <div className="flex justify-end">
            <Link
              to="/account-recovery/manager"
              className="text-sm font-semibold text-primary hover:underline"
            >
              Forgot password?
            </Link>
          </div>

          <FormError>{error}</FormError>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            <Boxes className="h-4 w-4" />
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
