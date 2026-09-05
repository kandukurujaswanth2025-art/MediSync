import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { UserPlus } from "lucide-react";
import AuthShell, { Field, Input, FormError } from "@/components/AuthShell";
import { useAppAuth } from "@/lib/AppAuthContext";

export default function PatientRegister() {
  const { registerPatient } = useAppAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", password: "", age: "", gender: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (form.password.length < 6) return setError("Password must be at least 6 characters.");
    setLoading(true);
    try {
      await registerPatient(form);
      navigate("/select-hospital");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Create your patient account"
      subtitle="Register to join a hospital queue and track your visit."
      footer={<>Already have an account? <Link to="/login/patient" className="font-semibold text-primary">Login here</Link></>}
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Full Name"><Input required value={form.fullName} onChange={set("fullName")} placeholder="Your full name" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Email"><Input type="email" required value={form.email} onChange={set("email")} placeholder="you@medisync.demo" /></Field>
          <Field label="Phone"><Input required value={form.phone} onChange={set("phone")} placeholder="+91 …" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Age"><Input type="number" min="0" required value={form.age} onChange={set("age")} placeholder="28" /></Field>
          <Field label="Gender">
            <select required value={form.gender} onChange={set("gender")} className="input-base">
              <option value="">Select</option>
              <option>Female</option>
              <option>Male</option>
              <option>Other</option>
            </select>
          </Field>
        </div>
        <Field label="Password"><Input type="password" required value={form.password} onChange={set("password")} placeholder="At least 6 characters" /></Field>
        <FormError>{error}</FormError>
        <button type="submit" disabled={loading} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
          <UserPlus className="h-4 w-4" /> {loading ? "Creating account…" : "Create account"}
        </button>
      </form>
    </AuthShell>
  );
}