import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, BellOff, Clock, Cpu, Home, Lock, Radar, Shield, ShieldOff, Signal, Timer, Volume2, Wifi, WifiOff, X, Zap } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { PageHeader, Pill, modeTone, presenceTone, SignalRings, DemoBadge } from "@/components/site/primitives";
import { RoomView } from "@/components/site/RoomView";
import { formatDuration, useGuard, type SecurityMode } from "@/lib/demo-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Security Dashboard — SENSE GUARD" },
      { name: "description", content: "Control security modes, view presence state, Wi-Fi and sensor health." },
      { property: "og:title", content: "Security Dashboard — SENSE GUARD" },
      { property: "og:description", content: "Arm, disarm and monitor your camera-free home security system." },
    ],
  }),
  component: Dashboard,
});

function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  return now;
}

function Dashboard() {
  const g = useGuard();
  const now = useNow();
  const intrusion = g.presence === "INTRUSION" || g.mode === "ALARM";

  const setMode = (m: SecurityMode) => { g.setMode(m); toast.success(`Mode set to ${m}`); };

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 md:px-6">
      {intrusion && (
        <div role="alert" className="mb-6 flex flex-col gap-3 rounded-2xl border border-danger/60 bg-danger/15 p-4 glow-danger sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="relative grid h-10 w-10 shrink-0 place-items-center"><SignalRings tone="danger" /><AlertTriangle className="h-5 w-5 text-danger" /></span>
            <div><div className="font-display font-bold text-danger">INTRUSION DETECTED</div><div className="text-sm text-muted-foreground">Presence confirmed in Living Room while system was armed.{g.demo ? " (simulated)" : ""}</div></div>
          </div>
          {g.isOwner && <button onClick={g.silence} className="inline-flex items-center justify-center gap-2 rounded-xl bg-danger px-4 py-2.5 font-semibold text-destructive-foreground hover:opacity-90"><BellOff className="h-4 w-4" />Silence / Reset</button>}
        </div>
      )}

      <PageHeader eyebrow="Dashboard" title="Security overview" desc={`Signed in as ${g.displayName ?? g.email ?? ""} · ${g.isOwner ? "Owner" : "Viewer"}${g.demo ? " · Demo mode (simulated data)" : ""}`} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Shield} label="Security mode" value={<Pill tone={modeTone[g.mode]}>{g.mode}</Pill>} accent={g.mode === "ALARM"} />
        <StatCard icon={Radar} label="Presence" value={<Pill tone={presenceTone[g.presence]}>{g.presence}</Pill>} accent={g.presence === "INTRUSION"} />
        <StatCard icon={g.wifi ? Wifi : WifiOff} label="Wi-Fi" value={<Pill tone={g.wifi ? "text-success bg-success/10 border-success/40" : "text-danger bg-danger/10 border-danger/40"}>{g.wifi ? "CONNECTED" : "OFFLINE"}</Pill>} />
        <StatCard icon={Cpu} label="Sensor status" value={<Pill tone={g.sensorOk ? "text-success bg-success/10 border-success/40" : "text-danger bg-danger/10 border-danger/40"}>{g.sensorOk ? "OK" : "FAULT"}</Pill>} />
        <StatCard icon={Clock} label="Last seen" value={<span className="font-mono text-lg font-semibold">{Math.max(0, Math.round((now - g.lastSeen) / 1000))}s ago</span>} />
        <StatCard icon={Timer} label="Uptime" value={<span className="font-mono text-lg font-semibold">{formatDuration(now - g.bootedAt)}</span>} />
        <StatCard icon={Signal} label="Signal strength" value={<span className="font-mono text-lg font-semibold">{g.signal.toFixed(0)} dBm</span>} />
        <StatCard icon={Zap} label="Nodes online" value={<span className="font-mono text-lg font-semibold">{g.nodes.filter((n) => n.online).length} / {g.nodes.length}</span>} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="glass p-5">
          <div className="mb-4 flex items-center justify-between"><h2 className="font-semibold">Room presence</h2><Link to="/monitor" className="text-sm text-cyan hover:underline">Open monitor →</Link></div>
          <RoomView compact />
        </div>
        <div className="space-y-6">
          <div className="glass p-5">
            <div className="flex items-center justify-between"><h2 className="font-semibold">Security controls</h2>{!g.isOwner && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Lock className="h-3 w-3" />Owner only</span>}</div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <ModeBtn icon={Lock} label="Arm" active={g.mode === "ARMED"} disabled={!g.isOwner} onClick={() => setMode("ARMED")} tone="success" />
              <ModeBtn icon={Home} label="Home" active={g.mode === "HOME"} disabled={!g.isOwner} onClick={() => setMode("HOME")} tone="primary" />
              <ModeBtn icon={ShieldOff} label="Disarm" active={g.mode === "DISARMED"} disabled={!g.isOwner} onClick={() => setMode("DISARMED")} tone="muted" />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button disabled={!g.isOwner || g.mode !== "ALARM"} onClick={() => { g.silence(); toast("Alarm silenced"); }} className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-3 py-2.5 text-sm font-semibold transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"><BellOff className="h-4 w-4" />Silence / Reset</button>
              <button onClick={() => { g.testAlarm(); toast("Buzzer test running (simulated)"); }} className={cn("relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl border px-3 py-2.5 text-sm font-semibold transition hover:bg-accent", g.buzzing ? "border-warning text-warning" : "border-border")}>
                <Volume2 className={cn("h-4 w-4", g.buzzing && "animate-pulse")} />{g.buzzing ? "Buzzing…" : "Test Alarm"}
              </button>
            </div>
          </div>
          {g.demo && <div className="glass p-5">
            <div className="flex items-center justify-between"><h2 className="font-semibold">Demo scenarios</h2><DemoBadge className="!text-[9px]" /></div>
            <div className="mt-3 flex flex-wrap gap-2">
              <DemoBtn onClick={g.simulateIntrusion}>Simulate intrusion</DemoBtn>
              <DemoBtn onClick={g.toggleWifi}>{g.wifi ? "Drop Wi-Fi" : "Restore Wi-Fi"}</DemoBtn>
              <DemoBtn onClick={g.toggleFault}>{g.sensorOk ? "Sensor fault" : "Clear fault"}</DemoBtn>
              <DemoBtn onClick={() => g.setPresence("NO_PERSON")}>Clear room</DemoBtn>
            </div>
          </div>}
          <AlertPanel />
        </div>
      </div>
    </div>
  );
}

function AlertPanel() {
  const g = useGuard();
  const recent = g.events.filter((e) => e.type === "intrusion" || e.type === "fault").slice(0, 3);
  if (g.alertDismissed) return null;
  return (
    <div className="glass p-5">
      <div className="flex items-center justify-between"><h2 className="font-semibold">Alerts</h2><button onClick={g.dismissAlert} aria-label="Dismiss alerts" className="rounded-md p-1 text-muted-foreground hover:bg-accent"><X className="h-4 w-4" /></button></div>
      {recent.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">No alerts. All quiet.</p> : (
        <ul className="mt-3 space-y-2">
          {recent.map((e) => (
            <li key={e.id} className="flex items-start gap-2 rounded-lg bg-muted/50 p-2.5 text-sm">
              <AlertTriangle className={cn("mt-0.5 h-4 w-4 shrink-0", e.type === "intrusion" ? "text-danger" : "text-warning")} />
              <div className="min-w-0"><div className="truncate">{e.message}</div><div className="font-mono text-[11px] text-muted-foreground">{new Date(e.ts).toLocaleTimeString()}</div></div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent }: { icon: typeof Shield; label: string; value: ReactNode; accent?: boolean }) {
  return (
    <div className={cn("glass p-5 transition hover:-translate-y-0.5", accent ? "glow-danger" : "hover:glow")}>
      <div className="flex items-center justify-between text-sm text-muted-foreground">{label}<Icon className="h-4 w-4 text-cyan" /></div>
      <div className="mt-3">{value}</div>
    </div>
  );
}

function ModeBtn({ icon: Icon, label, active, disabled, onClick, tone }: { icon: typeof Shield; label: string; active: boolean; disabled: boolean; onClick: () => void; tone: "success" | "primary" | "muted" }) {
  const activeCls = { success: "border-success bg-success/15 text-success", primary: "border-primary bg-primary/15 text-primary", muted: "border-foreground/40 bg-muted text-foreground" }[tone];
  return (
    <button onClick={onClick} disabled={disabled} aria-pressed={active}
      className={cn("flex flex-col items-center gap-1.5 rounded-xl border py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40", active ? activeCls : "border-border hover:bg-accent")}>
      <Icon className="h-5 w-5" />{label}
    </button>
  );
}

function DemoBtn({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return <button onClick={onClick} className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold transition hover:border-cyan/50 hover:bg-accent">{children}</button>;
}
