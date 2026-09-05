import React from "react";
import { Link } from "react-router-dom";
import { Activity } from "lucide-react";
import { cn } from "@/lib/utils";

// Shared shell for the login/register screens.
export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="flex min-h-screen flex-col bg-background lg:grid lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-primary p-10 text-primary-foreground lg:flex">
        <div className="absolute inset-0 bg-grid opacity-20" />
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-teal-400/20 blur-3xl" />
        <div className="absolute -bottom-24 -left-10 h-72 w-72 rounded-full bg-teal-500/10 blur-3xl" />
        <div className="relative">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-foreground/15">
              <Activity className="h-5 w-5" />
            </span>
            <span className="text-lg font-bold tracking-tight">MediSync</span>
          </Link>
        </div>
        <div className="relative max-w-md">
          <h2 className="text-3xl font-semibold leading-tight tracking-tight">
            Smarter hospital operations. Better patient experience.
          </h2>
          <p className="mt-4 text-primary-foreground/70">
            A unified platform for hospital resource management, patient queues, and real-time medicine availability.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-primary-foreground/80">
            {["Role-based dashboards", "Live patient queue & token system", "Department-wise resource control"].map((f) => (
              <li key={f} className="flex items-center gap-2.5">
                <span className="h-1.5 w-1.5 rounded-full bg-teal-300" /> {f}
              </li>
            ))}
          </ul>
        </div>
        <div className="relative text-xs text-primary-foreground/50">© 2026 MediSync. Demonstration platform.</div>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-8 flex items-center gap-2.5 lg:hidden">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Activity className="h-5 w-5" />
            </span>
            <span className="text-lg font-bold tracking-tight">MediSync</span>
          </Link>
          <div className="card-soft p-7">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
            <div className="mt-6">{children}</div>
          </div>
          {footer && <div className="mt-5 text-center text-sm text-muted-foreground">{footer}</div>}
        </div>
      </div>
    </div>
  );
}

export function Field({ label, children, hint }) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-sm font-medium text-foreground">{label}</span>}
      {children}
      {hint && <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

export function Input(props) {
  return <input {...props} className={cn("input-base", props.className)} />;
}

export function FormError({ children }) {
  if (!children) return null;
  return <p className="mt-1.5 text-sm text-rose-600">{children}</p>;
}