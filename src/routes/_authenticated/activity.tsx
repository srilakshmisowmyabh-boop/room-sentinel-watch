import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ScrollText } from "lucide-react";
import { Locked, PageHeader } from "@/components/site/primitives";
import { supabase } from "@/integrations/supabase/client";
import { useGuard } from "@/lib/demo-store";
import { listActivity } from "@/lib/viewers.functions";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/activity")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Activity Log — SENSE GUARD" },
      { name: "description", content: "Owner-only record of sign-ins and every change made to the security system." },
      { property: "og:title", content: "Activity Log — SENSE GUARD" },
      { property: "og:description", content: "See who signed in and what changed, in real time." },
    ],
  }),
  component: ActivityPage,
});

const input = "w-full rounded-lg border border-input bg-background/60 px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-ring";

function fmt(value: unknown): string {
  if (value == null) return "";
  return typeof value === "string" ? value : JSON.stringify(value);
}

function ActivityPage() {
  const g = useGuard();
  const list = useServerFn(listActivity);
  const queryClient = useQueryClient();
  const { data: rows, error, isPending } = useQuery<Tables<"activity_log">[]>({
    queryKey: ["activity-log"],
    queryFn: () => list(),
    enabled: g.isOwner,
    refetchInterval: 30000,
  });
  const [person, setPerson] = useState("");
  const [day, setDay] = useState("");

  useEffect(() => {
    if (!g.isOwner) return;
    const channel = supabase
      .channel("activity-log")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "activity_log" }, () => {
        queryClient.invalidateQueries({ queryKey: ["activity-log"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [g.isOwner, queryClient]);
  useEffect(() => () => { queryClient.removeQueries({ queryKey: ["activity-log"] }); }, [queryClient]);

  const filtered = useMemo(() => {
    const needle = person.trim().toLowerCase();
    return (rows ?? []).filter((row) => {
      if (needle && !`${row.actor_name} ${row.actor_email}`.toLowerCase().includes(needle)) return false;
      if (day) {
        const d = new Date(row.created_at);
        const local = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        if (local !== day) return false;
      }
      return true;
    });
  }, [rows, person, day]);

  if (!g.isOwner) {
    return <div className="mx-auto max-w-4xl px-4 py-12 md:px-6">
      <PageHeader eyebrow="Activity" title="Activity log" desc="Owner-only record of sign-ins and changes." />
      <Locked what="view the activity log" />
    </div>;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 md:px-6">
      <PageHeader eyebrow="Activity" title="Activity log" desc="Every sign-in and every change, recorded permanently. Entries cannot be edited or deleted." />
      <div className="mt-6 flex flex-wrap items-end gap-3">
        <label className="min-w-0 flex-1 space-y-1.5 text-sm"><span>Filter by person</span>
          <input value={person} onChange={(e) => setPerson(e.target.value)} placeholder="Name or email" className={input} /></label>
        <label className="space-y-1.5 text-sm"><span>Date</span>
          <input type="date" value={day} onChange={(e) => setDay(e.target.value)} className={input} /></label>
        {(person || day) && <button onClick={() => { setPerson(""); setDay(""); }} className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent">Clear</button>}
      </div>
      {isPending && <p className="mt-6 text-sm text-muted-foreground">Loading activity…</p>}
      {error && <p className="mt-6 text-sm text-danger">Unable to load the activity log.</p>}
      {rows && filtered.length === 0 && <p className="mt-6 text-sm text-muted-foreground">No activity matches.</p>}
      <div className="mt-6 divide-y divide-border">
        {filtered.map((row) => (
          <div key={row.id} className="flex flex-wrap items-start gap-3 py-4">
            <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-muted/60"><ScrollText className="h-4 w-4 text-cyan" /></span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{row.actor_name || "Unknown"}</span>
                <span className="rounded-full border border-border bg-muted/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">{row.role}</span>
              </div>
              <p className="break-all text-xs text-muted-foreground">{row.actor_email || "—"}</p>
              <p className="mt-1.5 text-sm capitalize">{row.action.replaceAll("_", " ")}</p>
              {(row.old_value != null || row.new_value != null) && (
                <p className="mt-1 break-all font-mono text-xs text-muted-foreground">
                  {row.old_value != null && <span className="text-danger">{fmt(row.old_value)}</span>}
                  {row.old_value != null && row.new_value != null && " → "}
                  {row.new_value != null && <span className="text-cyan">{fmt(row.new_value)}</span>}
                </p>
              )}
            </div>
            <time className="shrink-0 text-xs text-muted-foreground">{new Date(row.created_at).toLocaleString()}</time>
          </div>
        ))}
      </div>
    </div>
  );
}
