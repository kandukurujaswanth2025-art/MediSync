import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Users, Eye, EyeOff } from "lucide-react";
import AuthShell, { Field, Input, FormError } from "@/components/AuthShell";
import { useAppAuth } from "@/lib/AppAuthContext";

export default function PatientLogin() {
  const { loginPatient } = useAppAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const session = await loginPatient(email.trim(), password);
      navigate(
        session.selectedHospitalId
          ? "/patient"
          : "/select-hospital"
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Patient Login"
      subtitle="Track your queue, token and medicines."
      footer={
        <>
          New patient?{" "}
          <Link
            to="/register/patient"
            className="font-semibold text-primary"
          >
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Email">
          <Input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@medisync.demo"
          />
        </Field>

        <Field label="Password">
          <div className="relative">
            <Input
              type={show ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
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
            to="/account-recovery/patient"
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
          <Users className="h-4 w-4" />
          {loading ? "Signing in…" : "Login"}
        </button>
      </form>
    </AuthShell>
  );
}