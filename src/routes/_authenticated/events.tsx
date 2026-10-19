import { createFileRoute } from "@tanstack/react-router";
import { Download, Inbox } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader, DemoBadge } from "@/components/site/primitives";
import { formatTime, useGuard, type EventType } from "@/lib/demo-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/events")({
  head: () => ({
    meta: [
      { title: "Event History — SENSE GUARD" },
      { name: "description", content: "Timestamped log of mode changes, presence events, intrusions, faults and Wi-Fi changes." },
      { property: "og:title", content: "Event History — SENSE GUARD" },
      { property: "og:description", content: "Filter and export the SENSE GUARD security event log." },
    ],
  }),
  component: Events,
});

const TYPES: { v: EventType | "all"; label: string }[] = [
  { v: "all", label: "All" }, { v: "mode", label: "Mode" }, { v: "presence", label: "Presence" },
  { v: "intrusion", label: "Intrusion" }, { v: "fault", label: "Fault" }, { v: "wifi", label: "Wi-Fi" }, { v: "test", label: "Test" },
];
const typeTone: Record<EventType, string> = {
  mode: "text-primary bg-primary/10", presence: "text-cyan bg-cyan/10", intrusion: "text-danger bg-danger/15",
  fault: "text-warning bg-warning/10", wifi: "text-violet bg-violet/15", test: "text-muted-foreground bg-muted",
};

function Events() {
  const g = useGuard();
  const [type, setType] = useState<EventType | "all">("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const rows = useMemo(() => g.events.filter((e) => {
    if (type !== "all" && e.type !== type) return false;
    if (from && e.ts < new Date(from + "T00:00:00").getTime()) return false;
    if (to && e.ts > new Date(to + "T23:59:59").getTime()) return false;
    return true;
  }), [g.events, type, from, to]);

  const exportCsv = () => {
    const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
    const csv = ["time,device,room,event type,confidence,mode", ...rows.map((e) => [
      new Date(e.ts).toISOString(), esc(e.device ?? ""), esc(e.room ?? ""), e.type,
      e.confidence ?? "", esc(e.mode ?? ""),
    ].join(","))].join("\r\n");
    const url = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url; a.download = `senseguard-events-${new Date().toISOString().slice(0, 10)}.csv`; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
    toast.success(`Exported ${rows.length} events`);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 md:px-6">
      <PageHeader eyebrow="Events" title="Event history" desc="Every security-relevant change, timestamped."
        right={<>{g.demo && <DemoBadge />}{g.isOwner && <button onClick={exportCsv} disabled={!rows.length} className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-primary-foreground glow disabled:opacity-40"><Download className="h-4 w-4" />Export CSV</button>}</>} />
      {(
        <div className="glass overflow-hidden">
          <div className="flex flex-col gap-4 border-b border-border p-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-1.5">
              {TYPES.map((t) => (
                <button key={t.v} onClick={() => setType(t.v)} className={cn("rounded-lg px-3 py-1.5 text-sm font-semibold transition", type === t.v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground")}>{t.label}</button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <label className="flex items-center gap-2 text-muted-foreground">From<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-lg border border-input bg-background px-2 py-1.5 text-foreground" /></label>
              <label className="flex items-center gap-2 text-muted-foreground">To<input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-lg border border-input bg-background px-2 py-1.5 text-foreground" /></label>
              {(from || to || type !== "all") && <button onClick={() => { setFrom(""); setTo(""); setType("all"); }} className="text-cyan hover:underline">Reset</button>}
            </div>
          </div>
          {rows.length === 0 ? (
            <div className="flex flex-col items-center gap-2 p-14 text-center text-muted-foreground"><Inbox className="h-8 w-8" /><p>No events match these filters.</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr><th className="px-4 py-3 font-medium">Time</th><th className="px-4 py-3 font-medium">Type</th><th className="px-4 py-3 font-medium">Event</th></tr>
                </thead>
                <tbody>
                  {rows.map((e) => (
                    <tr key={e.id} className="border-t border-border transition hover:bg-accent/40">
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-muted-foreground">{formatTime(e.ts)}</td>
                      <td className="px-4 py-3"><span className={cn("rounded-md px-2 py-0.5 font-mono text-xs font-semibold uppercase", typeTone[e.type])}>{e.type}</span></td>
                      <td className="px-4 py-3">{e.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="border-t border-border px-4 py-3 text-xs text-muted-foreground">{rows.length} of {g.events.length} events</div>
        </div>
      )}
    </div>
  );
}
