import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, ArrowRight, Activity } from "lucide-react";
import { useAppAuth } from "@/lib/AppAuthContext";

const API_URL = "http://localhost:5000/api";

export default function HospitalSelect() {
  const { session, selectHospital } = useAppAuth();
  const navigate = useNavigate();

  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!session || session.role !== "patient") {
      navigate("/login/patient");
      return;
    }

    async function loadHospitals() {
      try {
        const response = await fetch(`${API_URL}/hospitals`);

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Failed to load hospitals");
        }

        setHospitals(data);
      } catch (err) {
        console.error("Hospital loading error:", err);
        setError("Unable to load hospitals. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    loadHospitals();
  }, [session, navigate]);

  const choose = (id) => {
    selectHospital(id);
    navigate("/patient");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/60 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-2.5 px-4 py-4 sm:px-6 lg:px-8">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Activity className="h-5 w-5" />
          </span>

          <span className="text-lg font-bold tracking-tight">
            MediSync
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-3xl font-semibold tracking-tight">
            Choose your hospital
          </h1>

          <p className="mt-2 text-muted-foreground">
            Select one of our demo hospitals to join its queue and start your visit.
          </p>
        </div>

        {loading && (
          <div className="mt-10 text-center text-muted-foreground">
            Loading hospitals...
          </div>
        )}

        {error && (
          <div className="mt-10 text-center text-red-500">
            {error}
          </div>
        )}

        {!loading && !error && (
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {hospitals.map((h) => (
              <button
                key={h.id}
                onClick={() => choose(h.id)}
                className="group card-soft p-6 text-left transition-all hover:-translate-y-1 hover:shadow-lg"
              >
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

                <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                  Select hospital

                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}