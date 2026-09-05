import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity, ArrowRight, Stethoscope, Boxes, Users, ListOrdered,
  Pill, BellRing, ShieldCheck, Clock, Building2,
} from "lucide-react";
import ChromaGrid from "@/components/ChromaGrid";

import API_URL from "@/api/config";

export default function Landing() {
  const [hospitals, setHospitals] = useState([]);

  useEffect(() => {
    async function loadHospitals() {
      try {
        const response = await fetch(`${API_URL}/hospitals`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Failed to load hospitals");
        }

        setHospitals(data);
      } catch (error) {
        console.error("Hospital loading error:", error);
      }
    }

    loadHospitals();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Activity className="h-5 w-5" />
            </span>
            <span className="text-lg font-bold tracking-tight">MediSync</span>
          </div>

          <nav className="hidden items-center gap-7 text-sm font-medium text-muted-foreground md:flex">
            <a href="#features" className="hover:text-foreground">Features</a>
            <a href="#how" className="hover:text-foreground">How it works</a>
            <a href="#hospitals" className="hover:text-foreground">Hospitals</a>
          </nav>

          <Link
            to="/login/patient"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Patient Login <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-60" />
        <div className="absolute -right-32 top-0 h-96 w-96 rounded-full bg-teal-400/15 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
              Cloud-based hospital operations platform
            </span>

            <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Smarter Hospital Operations.<br />
              Better Patient Experience.
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-balance text-lg text-muted-foreground">
              A unified platform for hospital resource management, patient queues, and real-time medicine availability — connecting hospitals, resource managers and patients in one place.
            </p>

            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                to="/login/patient"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 sm:w-auto"
              >
                <Users className="h-4.5 w-4.5" />
                Patient Login
              </Link>

              <Link
                to="/login/hospital"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground hover:bg-muted sm:w-auto"
              >
                <Stethoscope className="h-4.5 w-4.5" />
                Hospital Login
              </Link>

              <Link
                to="/login/manager"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground hover:bg-muted sm:w-auto"
              >
                <Boxes className="h-4.5 w-4.5" />
                Resource Manager
              </Link>
            </div>

            <p className="mt-4 text-xs text-muted-foreground">
              Demo platform — use the credentials shown on each login screen.
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section
        id="features"
        className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8"
      >
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight">
            Everything a modern hospital needs
          </h2>

          <p className="mt-3 text-muted-foreground">
            Three connected roles, one source of truth — with hospital-level
            data isolation built in.
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: ListOrdered,
              title: "Smart Patient Queue",
              text: "Token-based queueing with live status, position tracking and estimated waiting time.",
            },
            {
              icon: Pill,
              title: "Medicine Management",
              text: "Department-wise medicine stock with automatic reduction when prescriptions are issued.",
            },
            {
              icon: Boxes,
              title: "Resource Control",
              text: "Track medicines and equipment, monitor low stock, and fulfill hospital resource requests.",
            },
            {
              icon: BellRing,
              title: "In-app Notifications",
              text: "Patients get called instantly; managers stay on top of requests and low stock alerts.",
            },
            {
              icon: ShieldCheck,
              title: "Data Isolation",
              text: "Each hospital sees only its own patients, queues, medicines and equipment — never mixed.",
            },
            {
              icon: Clock,
              title: "Real-time Updates",
              text: "Queue changes, consultation status and medicine lists reflect across every dashboard instantly.",
            },
          ].map((f) => (
            <div key={f.title} className="card-soft p-6">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
                <f.icon className="h-5 w-5" />
              </span>

              <h3 className="mt-4 text-base font-semibold">{f.title}</h3>

              <p className="mt-1.5 text-sm text-muted-foreground">
                {f.text}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="bg-muted/40 border-y border-border">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight">
              How MediSync works
            </h2>

            <p className="mt-3 text-muted-foreground">
              A simple, connected flow across hospitals, resource managers and
              patients.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              {
                n: "01",
                icon: Users,
                title: "Patient registers & gets a token",
                text: "A patient selects a hospital, describes their problem and receives a queue token instantly.",
              },
              {
                n: "02",
                icon: Stethoscope,
                title: "Hospital calls & consults",
                text: "Hospital staff call the patient, run the consultation, prescribe medicines and complete the visit.",
              },
              {
                n: "03",
                icon: Boxes,
                title: "Manager keeps stock healthy",
                text: "Resource managers track stock, fulfill requests and keep every department supplied.",
              },
            ].map((s) => (
              <div key={s.n} className="relative card-soft p-6">
                <span className="text-sm font-bold text-teal-600">
                  {s.n}
                </span>

                <span className="mt-3 grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
                  <s.icon className="h-5 w-5" />
                </span>

                <h3 className="mt-4 text-base font-semibold">
                  {s.title}
                </h3>

                <p className="mt-1.5 text-sm text-muted-foreground">
                  {s.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Hospitals showcase */}
      <section
        id="hospitals"
        className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8"
      >
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight">
            Three connected demo hospitals
          </h2>

          <p className="mt-3 text-muted-foreground">
            Each hospital runs independently with its own departments,
            resources and patient queues.
          </p>
        </div>

        <div className="mt-12">
          <ChromaGrid
            items={hospitals.map((h) => ({
              id: h.id,
              content: (
                <div>
                  <div className="flex items-center justify-between">
                    <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary text-primary-foreground">
                      <Building2 className="h-5 w-5" />
                    </span>

                    <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                      {h.code}
                    </span>
                  </div>

                  <h3 className="mt-4 text-lg font-semibold tracking-tight">
                    {h.name}
                  </h3>

                  <p className="mt-1.5 text-sm text-muted-foreground">
                    {h.description}
                  </p>

                  <p className="mt-3 text-xs font-medium text-teal-600">
                    {h.tagline}
                  </p>
                </div>
              ),
            }))}
          />
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-primary px-8 py-14 text-center text-primary-foreground">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-teal-400/20 blur-3xl" />

          <h2 className="relative text-3xl font-semibold tracking-tight">
            Ready to explore MediSync?
          </h2>

          <p className="relative mx-auto mt-3 max-w-xl text-primary-foreground/70">
            Choose a role and log in with the demo credentials to experience
            the full flow.
          </p>

          <div className="relative mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/login/patient"
              className="rounded-xl bg-primary-foreground px-6 py-3 text-sm font-semibold text-primary hover:bg-primary-foreground/90"
            >
              Patient Login
            </Link>

            <Link
              to="/login/hospital"
              className="rounded-xl border border-primary-foreground/30 px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary-foreground/10"
            >
              Hospital Login
            </Link>

            <Link
              to="/login/manager"
              className="rounded-xl border border-primary-foreground/30 px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary-foreground/10"
            >
              Resource Manager
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
                <Activity className="h-4 w-4" />
              </span>

              <span className="font-bold tracking-tight">
                MediSync
              </span>
            </div>

            <p className="text-sm text-muted-foreground">
              Cloud-Based Hospital Resource & Patient Queue Management —
              Phase 1 demonstration.
            </p>

            <p className="text-xs text-muted-foreground">
              © 2026 MediSync
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}