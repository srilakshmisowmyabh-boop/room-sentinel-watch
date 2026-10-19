/**
 * Demo-mode state for SENSE GUARD.
 * All values here are SIMULATED. Later this provider can be swapped for one that
 * subscribes to the RUView sensing WebSocket and a secure backend; components only
 * consume the `useGuard()` interface below.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useLiveGuard, useAuthState, type AuthState, type LiveExtras } from "./live-store";

export type SecurityMode = "DISARMED" | "HOME" | "ARMED" | "ALARM";
export type Presence = "NO_PERSON" | "POSSIBLE_PERSON" | "PERSON_PRESENT" | "INTRUSION";
export type Role = "owner" | "viewer";
export type EventType = "mode" | "presence" | "intrusion" | "fault" | "wifi" | "test";

export interface GuardEvent { id: string; ts: number; type: EventType; message: string; }
export interface NodeInfo { id: string; label: string; rssi: number; online: boolean; }
export interface Settings {
  threshold: number; persistence: number; clearTime: number; entryDelay: number;
  exitDelay: number; alarmDuration: number; telegram: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  threshold: 60, persistence: 3, clearTime: 20, entryDelay: 15, exitDelay: 30, alarmDuration: 120, telegram: true,
};

const MIN = 60_000;
function seedEvents(): GuardEvent[] {
  const now = Date.now();
  const raw: [number, EventType, string][] = [
    [3, "presence", "Person present detected in Living Room"],
    [18, "mode", "Mode changed to HOME by Owner"],
    [55, "presence", "Room cleared — NO_PERSON"],
    [130, "wifi", "Wi-Fi reconnected (RSSI −58 dBm)"],
    [135, "wifi", "Wi-Fi disconnected"],
    [300, "intrusion", "INTRUSION while ARMED — alarm triggered"],
    [302, "mode", "Alarm silenced by Owner"],
    [480, "mode", "Mode changed to ARMED by Owner"],
    [900, "fault", "ESP32-3 sensor FAULT — no frames for 12 s"],
    [905, "fault", "ESP32-3 recovered — sensor OK"],
    [1500, "test", "Buzzer test performed by Viewer"],
    [2900, "presence", "Possible person — below persistence window"],
    [4300, "mode", "Mode changed to DISARMED by Owner"],
  ];
  return raw.map(([m, type, message], i) => ({ id: `seed-${i}`, ts: now - m * MIN, type, message }));
}

interface GuardState {
  mode: SecurityMode; presence: Presence; wifi: boolean; sensorOk: boolean;
  lastSeen: number; bootedAt: number; signal: number; nodes: NodeInfo[];
  events: GuardEvent[]; settings: Settings; role: Role; alertDismissed: boolean;
  buzzing: boolean; theme: "dark" | "light";
}

export interface GuardApi extends GuardState, LiveExtras {
  setMode: (m: SecurityMode) => void;
  silence: () => void;
  testAlarm: () => void;
  simulateIntrusion: () => void;
  setPresence: (p: Presence) => void;
  toggleFault: () => void;
  toggleWifi: () => void;
  dismissAlert: () => void;
  setRole: (r: Role) => void;
  updateSettings: (s: Partial<Settings>) => void;
  saveSettings: () => Promise<void>;
  resetSettings: () => void;
  toggleTheme: () => void;
  isOwner: boolean;
}

const Ctx = createContext<GuardApi | null>(null);

function useDemoGuard() {
  const [s, setS] = useState<GuardState>(() => ({
    mode: "HOME", presence: "PERSON_PRESENT", wifi: true, sensorOk: true,
    lastSeen: Date.now(), bootedAt: Date.now() - 1000 * 60 * 60 * 26.4, signal: -54,
    nodes: [
      { id: "n1", label: "ESP32-1", rssi: -48, online: true },
      { id: "n2", label: "ESP32-2", rssi: -55, online: true },
      { id: "n3", label: "ESP32-3", rssi: -61, online: true },
    ],
    events: seedEvents(), settings: DEFAULT_SETTINGS, role: "owner", alertDismissed: false,
    buzzing: false, theme: "dark",
  }));
  const buzzTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const log = (type: EventType, message: string) => (st: GuardState): GuardState => ({
    ...st, events: [{ id: crypto.randomUUID(), ts: Date.now(), type, message }, ...st.events],
  });

  // Simulated telemetry tick
  useEffect(() => {
    const t = setInterval(() => {
      setS((st) => {
        if (!st.wifi) return st;
        const jitter = () => Math.round((Math.random() - 0.5) * 6);
        return {
          ...st,
          lastSeen: Date.now(),
          signal: Math.max(-80, Math.min(-40, st.signal + jitter() / 2)),
          nodes: st.nodes.map((n, i) => ({
            ...n,
            online: i === 2 ? st.sensorOk : true,
            rssi: Math.max(-85, Math.min(-40, n.rssi + jitter() / 2)),
          })),
        };
      });
    }, 2000);
    return () => clearInterval(t);
  }, []);

  // Theme class on <html>
  useEffect(() => {
    document.documentElement.classList.toggle("light", s.theme === "light");
  }, [s.theme]);

  const setMode = useCallback((m: SecurityMode) => setS((st) =>
    log("mode", `Mode changed to ${m} by ${st.role === "owner" ? "Owner" : "Viewer"}`)({
      ...st, mode: m, alertDismissed: false,
      presence: m === "DISARMED" && st.presence === "INTRUSION" ? "PERSON_PRESENT" : st.presence,
    })), []);

  const silence = useCallback(() => setS((st) =>
    log("mode", "Alarm silenced / reset by Owner")({
      ...st, mode: st.mode === "ALARM" ? "ARMED" : st.mode, buzzing: false,
      presence: st.presence === "INTRUSION" ? "PERSON_PRESENT" : st.presence,
    })), []);

  const testAlarm = useCallback(() => {
    setS((st) => log("test", `Buzzer test performed by ${st.role === "owner" ? "Owner" : "Viewer"}`)({ ...st, buzzing: true }));
    if (buzzTimer.current) clearTimeout(buzzTimer.current);
    buzzTimer.current = setTimeout(() => setS((st) => ({ ...st, buzzing: false })), 3000);
  }, []);

  const simulateIntrusion = useCallback(() => setS((st) =>
    log("intrusion", `INTRUSION detected while ${st.mode} — alarm triggered`)({
      ...st, mode: "ALARM", presence: "INTRUSION", alertDismissed: false,
    })), []);

  const setPresence = useCallback((p: Presence) => setS((st) =>
    log("presence", `Presence state → ${p}`)({ ...st, presence: p })), []);

  const toggleFault = useCallback(() => setS((st) =>
    log("fault", st.sensorOk ? "ESP32-3 sensor FAULT — simulated" : "ESP32-3 recovered — sensor OK")({
      ...st, sensorOk: !st.sensorOk,
    })), []);

  const toggleWifi = useCallback(() => setS((st) =>
    log("wifi", st.wifi ? "Wi-Fi disconnected — simulated" : "Wi-Fi reconnected")({ ...st, wifi: !st.wifi })), []);

  return useMemo(() => ({
    ...s, setMode, silence, testAlarm, simulateIntrusion, setPresence, toggleFault, toggleWifi,
    dismissAlert: () => setS((st) => ({ ...st, alertDismissed: true })),
    setRole: (role) => setS((st) => ({ ...st, role })),
    updateSettings: (p) => setS((st) => ({ ...st, settings: { ...st.settings, ...p } })),
    resetSettings: () => setS((st) => ({ ...st, settings: DEFAULT_SETTINGS })),
    saveSettings: async () => {},
    toggleTheme: () => setS((st) => ({ ...st, theme: st.theme === "dark" ? "light" : "dark" })),
  }), [s, setMode, silence, testAlarm, simulateIntrusion, setPresence, toggleFault, toggleWifi]);
}

const DEMO_KEY = "senseguard-demo-mode";

export function GuardProvider({ children }: { children: ReactNode }) {
  const auth: AuthState = useAuthState();
  const [demo, setDemoState] = useState(false);
  useEffect(() => { setDemoState(localStorage.getItem(DEMO_KEY) === "1"); }, []);
  const setDemo = useCallback((v: boolean) => { localStorage.setItem(DEMO_KEY, v ? "1" : "0"); setDemoState(v); }, []);

  const demoApi = useDemoGuard();
  const live = useLiveGuard(!demo && auth.signedIn, auth);
  const base = demo || !auth.signedIn ? demoApi : { ...demoApi, ...live.state };
  const role: Role = auth.authRole ?? "viewer";

  const api: GuardApi = {
    ...base,
    ...auth,
    role,
    // Roles come from the database; the UI only mirrors them. RLS enforces them.
    isOwner: auth.signedIn && auth.authRole === "owner",
    setRole: () => {},
    demo, setDemo,
    devices: live.devices,
  };
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useGuard() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useGuard must be used inside GuardProvider");
  return v;
}

export function formatDuration(ms: number) {
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  return `${d ? d + "d " : ""}${h}h ${m}m`;
}
export function formatTime(ts: number) {
  return new Date(ts).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "medium" });
}
