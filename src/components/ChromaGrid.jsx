import React, { useRef } from "react";
import { cn } from "@/lib/utils";

// Lightweight ChromaGrid-style card grid with a per-card spotlight that
// follows the pointer (card-local only — no global cursor effect).
export default function ChromaGrid({ items, className }) {
  return (
    <div className={cn("grid gap-5 sm:grid-cols-2 lg:grid-cols-3", className)}>
      {items.map((item, i) => (
        <ChromaCard key={item.id || i} item={item} index={i} />
      ))}
    </div>
  );
}

function ChromaCard({ item, index }) {
  const ref = useRef(null);
  const handleMove = (e) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - rect.left}px`);
    el.style.setProperty("--my", `${e.clientY - rect.top}px`);
  };
  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      style={{ animationDelay: `${index * 70}ms` }}
      className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg animate-[fadeUp_0.5s_ease-out_both]"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: "radial-gradient(420px circle at var(--mx) var(--my), hsl(173 58% 39% / 0.12), transparent 45%)",
        }}
      />
      <div className="relative">{item.content}</div>
    </div>
  );
}