import { useEffect, useRef, type ReactNode } from "react";
import { FlaskConical, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Presence, SecurityMode } from "@/lib/demo-store";

export function Reveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (!e) return;
      if (e.isIntersecting) { el.classList.add("is-visible"); io.disconnect(); }
    }, { threshold: 0.12 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return <div ref={ref} className={cn("reveal", className)} style={{ transitionDelay: `${delay}ms` }}>{children}</div>;
}

export function DemoBadge({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border border-warning/40 bg-warning/10 px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-widest text-warning", className)}>
      <FlaskConical className="h-3 w-3" /> Demo mode · simulated data
    </span>
  );
}

export function SignalRings({ className, tone = "cyan" }: { className?: string; tone?: "cyan" | "danger" }) {
  const c = tone === "danger" ? "border-danger" : "border-cyan";
  return (
    <span className={cn("pointer-events-none absolute inset-0 grid place-items-center", className)}>
      {[0, 1, 2].map((i) => (
        <span key={i} className={cn("absolute h-full w-full rounded-full border-2 animate-ring", c)} style={{ animationDelay: `${i}s` }} />
      ))}
    </span>
  );
}

export function PageHeader({ eyebrow, title, desc, right }: { eyebrow: string; title: string; desc?: string; right?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0 animate-fade-up">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-cyan">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-semibold md:text-4xl">{title}</h1>
        {desc && <p className="mt-2 max-w-2xl text-muted-foreground">{desc}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">{right ?? <DemoBadge />}</div>
    </div>
  );
}

export function Locked({ what }: { what: string }) {
  return (
    <div className="glass flex flex-col items-center gap-3 p-10 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-full bg-muted"><Lock className="h-5 w-5 text-muted-foreground" /></div>
      <h3 className="text-lg font-semibold">Owner access required</h3>
      <p className="max-w-md text-sm text-muted-foreground">Viewer accounts can't {what}. Switch to the Owner demo role in the top bar to continue.</p>
    </div>
  );
}

export const modeTone: Record<SecurityMode, string> = {
  DISARMED: "text-muted-foreground bg-muted border-border",
  HOME: "text-primary bg-primary/10 border-primary/40",
  ARMED: "text-success bg-success/10 border-success/40",
  ALARM: "text-danger bg-danger/15 border-danger/50",
};
export const presenceTone: Record<Presence, string> = {
  NO_PERSON: "text-muted-foreground bg-muted border-border",
  POSSIBLE_PERSON: "text-warning bg-warning/10 border-warning/40",
  PERSON_PRESENT: "text-cyan bg-cyan/10 border-cyan/40",
  INTRUSION: "text-danger bg-danger/15 border-danger/50",
};

export function Pill({ tone, children }: { tone: string; children: ReactNode }) {
  return <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-xs font-semibold", tone)}>
    <span className="h-1.5 w-1.5 rounded-full bg-current" />{children}</span>;
}
