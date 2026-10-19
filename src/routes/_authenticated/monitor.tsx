import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Radio, Wifi } from "lucide-react";
import { PageHeader, Pill, presenceTone, DemoBadge } from "@/components/site/primitives";
import { RoomView } from "@/components/site/RoomView";
import { useGuard, type Presence } from "@/lib/demo-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/monitor")({
  head: () => ({
    meta: [
      { title: "Live Monitor — SENSE GUARD" },
      { name: "description", content: "Interactive room sensing view with three ESP32 nodes and presence heatmap." },
      { property: "og:title", content: "Live Monitor — SENSE GUARD" },
      { property: "og:description", content: "Watch simulated Wi-Fi presence sensing across one room." },
    ],
  }),
  component: Monitor,
});

function Monitor() {
  const g = useGuard();
  const [view, setView] = useState<"room" | "sensing">("room");
  const presences: Presence[] = ["NO_PERSON", "POSSIBLE_PERSON", "PERSON_PRESENT"];
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 md:px-6">
      <PageHeader eyebrow="Live monitor" title="Living Room sensing" desc="Simulated RUView presence field from three ESP32 nodes." />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="glass p-4 md:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex rounded-xl border border-border bg-muted/50 p-1">
              {(["room", "sensing"] as const).map((v) => (
                <button key={v} onClick={() => setView(v)} className={cn("rounded-lg px-4 py-1.5 text-sm font-semibold capitalize transition", view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>{v} view</button>
              ))}
            </div>
            <Pill tone={presenceTone[g.presence]}>{g.presence}</Pill>
          </div>
          <RoomView view={view} />
          <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
            <Legend className="bg-cyan" label="Node online" />
            <Legend className="bg-danger" label="Node fault / intrusion" />
            <Legend className="bg-warning" label="Possible person" />
            <Legend className="bg-primary" label="Mesh link" />
          </div>
        </div>
        <div className="space-y-4">
          <div className="glass p-5">
            <h3 className="flex items-center gap-2 font-semibold"><Radio className="h-4 w-4 text-cyan" /> Nodes</h3>
            <ul className="mt-4 space-y-3">
              {g.nodes.map((n) => {
                const pct = Math.round(((n.rssi + 90) / 50) * 100);
                return (
                  <li key={n.id}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-mono font-semibold">{n.label}</span>
                      <span className={cn("font-mono text-xs", n.online ? "text-success" : "text-danger")}>{n.online ? `${n.rssi.toFixed(0)} dBm` : "FAULT"}</span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div className={cn("h-full rounded-full transition-all duration-700", n.online ? "bg-brand" : "bg-danger")} style={{ width: n.online ? `${pct}%` : "100%" }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="glass p-5">
            <h3 className="flex items-center gap-2 font-semibold"><Wifi className="h-4 w-4 text-cyan" /> Signal metrics</h3>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <Metric k="Avg RSSI" v={`${(g.nodes.reduce((a, n) => a + n.rssi, 0) / Math.max(1, g.nodes.length)).toFixed(1)} dBm`} />
              <Metric k="Links" v={`${g.nodes.filter((n) => n.online).length * 2}/6`} />
              <Metric k="Frame rate" v={g.wifi ? "50 Hz" : "—"} />
              <Metric k="Threshold" v={`${g.settings.threshold}%`} />
            </dl>
          </div>
          <div className="glass p-5">
            <div className="flex items-center justify-between"><h3 className="font-semibold">Simulate</h3><DemoBadge className="!text-[9px]" /></div>
            <div className="mt-3 flex flex-wrap gap-2">
              {presences.map((p) => (
                <button key={p} onClick={() => g.setPresence(p)} className={cn("rounded-lg border px-2.5 py-1.5 font-mono text-[11px] transition hover:bg-accent", g.presence === p ? "border-cyan text-cyan" : "border-border")}>{p}</button>
              ))}
              <button onClick={g.toggleFault} className="rounded-lg border border-border px-2.5 py-1.5 font-mono text-[11px] hover:bg-accent">{g.sensorOk ? "Fault ESP32-3" : "Recover ESP32-3"}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return <span className="flex items-center gap-2"><span className={cn("h-2.5 w-2.5 rounded-full", className)} />{label}</span>;
}
function Metric({ k, v }: { k: string; v: string }) {
  return <div className="rounded-xl bg-muted/50 p-3"><dt className="text-xs text-muted-foreground">{k}</dt><dd className="mt-1 font-mono font-semibold">{v}</dd></div>;
}
