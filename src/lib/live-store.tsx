/**
 * Live data from Lovable Cloud: auth/role state and realtime security data.
 * Writes go straight to the database; row-level security decides whether the
 * signed-in user (Owner vs Viewer) is allowed.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import type { GuardEvent, NodeInfo, Presence, Role, SecurityMode, Settings } from "./demo-store";

export type DeviceRow = Tables<"devices">;

export interface AuthState {
  authReady: boolean;
  signedIn: boolean;
  userId: string | null;
  email: string | null;
  displayName: string | null;
  authRole: Role | null;
  signOut: () => Promise<void>;
}
export interface LiveExtras extends AuthState {
  demo: boolean;
  setDemo: (v: boolean) => void;
  devices?: DeviceRow[];
}

export function useAuthState(): AuthState {
  const router = useRouter();
  const [st, setSt] = useState<Omit<AuthState, "signOut">>({ authReady: false, signedIn: false, userId: null, email: null, displayName: null, authRole: null });

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSt({ authReady: true, signedIn: false, userId: null, email: null, displayName: null, authRole: null }); return; }
    const [{ data: roles }, { data: prof }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", user.id).is("revoked_at", null),
      supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle(),
    ]);
    const authRole: Role | null = roles?.some((r) => r.role === "owner") ? "owner" : roles?.length ? "viewer" : null;
    if (!authRole) {
      await supabase.auth.signOut({ scope: "local" });
      setSt({ authReady: true, signedIn: false, userId: null, email: null, displayName: null, authRole: null });
      return;
    }
    setSt({ authReady: true, signedIn: true, userId: user.id, email: user.email ?? null, displayName: prof?.display_name ?? null, authRole });
  }, []);

  useEffect(() => {
    load();
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      setTimeout(() => { load(); router.invalidate(); }, 0);
    });
    const interval = setInterval(() => { load(); }, 15000);
    const channel = supabase.channel("senseguard-membership").on("postgres_changes", { event: "UPDATE", schema: "public", table: "user_roles" }, () => { load(); router.invalidate(); }).subscribe();
    return () => { data.subscription.unsubscribe(); clearInterval(interval); supabase.removeChannel(channel); };
  }, [load, router]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    router.navigate({ to: "/login", replace: true });
  }, [router]);

  return { ...st, signOut };
}

const MODE_TO_DB = { DISARMED: "Disarmed", HOME: "Home", ARMED: "Armed" } as const;
const ONLINE_MS = 60_000;

export function useLiveGuard(enabled: boolean, auth: AuthState) {
  const [devices, setDevices] = useState<DeviceRow[]>([]);
  const [events, setEvents] = useState<Tables<"presence_events">[]>([]);
  const [alerts, setAlerts] = useState<Tables<"alerts">[]>([]);
  const [security, setSecurity] = useState<Tables<"security_state"> | null>(null);
  const [settingsRow, setSettingsRow] = useState<Tables<"settings"> | null>(null);
  const [draft, setDraft] = useState<Settings | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const fetchers = useMemo(() => ({
    devices: async () => { const { data } = await supabase.from("devices").select("*").order("id"); if (data) setDevices(data); },
    presence_events: async () => { const { data } = await supabase.from("presence_events").select("*").order("ts", { ascending: false }).limit(300); if (data) setEvents(data); },
    alerts: async () => { const { data } = await supabase.from("alerts").select("*").order("created_at", { ascending: false }).limit(200); if (data) setAlerts(data); },
    security_state: async () => { const { data } = await supabase.from("security_state").select("*").eq("id", 1).maybeSingle(); if (data) setSecurity(data); },
    settings: async () => { const { data } = await supabase.from("settings").select("*").eq("id", 1).maybeSingle(); if (data) { setSettingsRow(data); setDraft(null); } },
  }), []);

  useEffect(() => {
    if (!enabled) { setDevices([]); setEvents([]); setAlerts([]); setSecurity(null); setSettingsRow(null); setDraft(null); return; }
    Object.values(fetchers).forEach((f) => f());
    const ch = supabase.channel("senseguard-live");
    (Object.keys(fetchers) as (keyof typeof fetchers)[]).forEach((t) =>
      ch.on("postgres_changes", { event: "*", schema: "public", table: t }, () => fetchers[t]()));
    ch.subscribe();
    const tick = setInterval(() => setNow(Date.now()), 5000);
    return () => { supabase.removeChannel(ch); clearInterval(tick); };
  }, [enabled, auth.userId, fetchers]);

  const nodes: NodeInfo[] = devices.map((d) => ({
    id: d.id, label: d.name, rssi: d.signal_strength ?? -100,
    online: d.status === "online" && !!d.last_seen && now - Date.parse(d.last_seen) < ONLINE_MS,
  }));
  const openIntrusion = alerts.some((a) => a.kind === "intrusion" && !a.acknowledged);
  const baseMode = (security?.mode.toUpperCase() ?? "DISARMED") as SecurityMode;
  const mode: SecurityMode = baseMode === "ARMED" && openIntrusion ? "ALARM" : baseMode;

  const latestByDevice = new Map<string, Tables<"presence_events">>();
  for (const e of events) if (!latestByDevice.has(e.device_id)) latestByDevice.set(e.device_id, e);
  const rank = { NO_PERSON: 0, POSSIBLE_PERSON: 1, PERSON_PRESENT: 2 } as const;
  let presence: Presence = "NO_PERSON";
  for (const e of latestByDevice.values()) {
    const s = e.state as keyof typeof rank;
    if (rank[s] > rank[presence as keyof typeof rank]) presence = s;
  }
  if (mode === "ALARM") presence = "INTRUSION";

  const online = nodes.filter((n) => n.online);
  const lastSeen = Math.max(0, ...devices.map((d) => (d.last_seen ? Date.parse(d.last_seen) : 0)));
  const maxUptime = Math.max(0, ...devices.map((d) => d.uptime_seconds));

  const guardEvents: GuardEvent[] = [
    ...events.map((e) => ({ id: e.id, ts: Date.parse(e.ts), type: "presence" as const, message: `${e.room} · ${devices.find((d) => d.id === e.device_id)?.name ?? e.device_id}: ${e.state} · ${Number(e.confidence)}%`, device: e.device_id, room: e.room, confidence: Number(e.confidence), mode: e.mode ?? undefined })),
    ...alerts.map((a) => ({ id: a.id, ts: Date.parse(a.created_at), type: (a.kind === "intrusion" ? "intrusion" : "fault") as GuardEvent["type"], message: a.message + (a.acknowledged ? " — acknowledged" : ""), device: a.device_id ?? undefined, room: a.room ?? undefined, confidence: a.confidence == null ? undefined : Number(a.confidence), mode: a.mode ?? undefined })),
  ].sort((a, b) => b.ts - a.ts);

  const fromDb: Settings = {
    threshold: settingsRow?.threshold ?? 60, persistence: settingsRow?.persistence ?? 3, clearTime: settingsRow?.clear_time ?? 20,
    entryDelay: security?.entry_delay ?? 15, exitDelay: security?.exit_delay ?? 30,
    alarmDuration: settingsRow?.alarm_duration ?? 120, telegram: settingsRow?.telegram ?? true,
  };
  const settings = draft ?? fromDb;

  const fail = (msg: string, error: unknown) => { if (error) { toast.error(msg); return true; } return false; };

  const setMode = async (m: SecurityMode) => {
    if (m === "ALARM") return;
    const { data, error } = await supabase.from("security_state").update({ mode: MODE_TO_DB[m], updated_at: new Date().toISOString(), updated_by: auth.userId }).eq("id", 1).select();
    if (!fail("Only the Owner can change the security mode.", error || !data?.length)) fetchers.security_state();
  };
  const silence = async () => {
    const { data, error } = await supabase.from("alerts").update({ acknowledged: true, acknowledged_by: auth.userId }).eq("acknowledged", false).select();
    if (!fail("Only the Owner can silence alerts.", error || (openIntrusion && !data?.length))) fetchers.alerts();
  };
  const saveSettings = async () => {
    const s = settings;
    const [a, b] = await Promise.all([
      supabase.from("settings").update({ threshold: s.threshold, persistence: s.persistence, clear_time: s.clearTime, alarm_duration: s.alarmDuration, telegram: s.telegram, updated_at: new Date().toISOString() }).eq("id", 1).select(),
      supabase.from("security_state").update({ entry_delay: s.entryDelay, exit_delay: s.exitDelay }).eq("id", 1).select(),
    ]);
    if (fail("Only the Owner can change settings.", a.error || b.error || !a.data?.length)) return;
    toast.success("Settings saved");
    fetchers.settings(); fetchers.security_state();
  };
  const setTelegram = async (on: boolean) => {
    const { data, error } = await supabase.from("settings").update({ telegram: on, updated_at: new Date().toISOString() }).eq("id", 1).select();
    if (fail("Only the Owner can change Telegram alerts.", error || !data?.length)) return;
    toast.success(on ? "Telegram alerts on" : "Telegram alerts off");
    if (draft) setDraft({ ...draft, telegram: on });
    fetchers.settings();
  };
  const noop = () => toast.info("Turn on Demo mode to run simulated scenarios.");

  return {
    devices,
    state: {
      mode, presence, nodes, events: guardEvents, settings, devices,
      wifi: online.length > 0, sensorOk: nodes.length > 0 && online.length === nodes.length,
      lastSeen: lastSeen || now, bootedAt: now - maxUptime * 1000,
      signal: online.length ? online.reduce((s, n) => s + n.rssi, 0) / online.length : -100,
      setMode, silence, saveSettings, setTelegram,
      updateSettings: (p: Partial<Settings>) => setDraft({ ...settings, ...p }),
      resetSettings: () => setDraft({ threshold: 60, persistence: 3, clearTime: 20, entryDelay: 15, exitDelay: 30, alarmDuration: 120, telegram: true }),
      simulateIntrusion: noop, toggleFault: noop, toggleWifi: noop, setPresence: noop,
    },
  };
}
