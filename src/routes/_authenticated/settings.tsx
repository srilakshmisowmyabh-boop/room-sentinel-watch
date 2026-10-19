import { createFileRoute } from "@tanstack/react-router";
import { RotateCcw, Send } from "lucide-react";
import { toast } from "sonner";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Locked, PageHeader } from "@/components/site/primitives";
import { useGuard, type Settings } from "@/lib/demo-store";
import { DevicesPanel } from "@/components/site/DevicesPanel";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — SENSE GUARD" },
      { name: "description", content: "Configure detection threshold, persistence, delays, alarm duration and Telegram alerts." },
      { property: "og:title", content: "Settings — SENSE GUARD" },
      { property: "og:description", content: "Tune SENSE GUARD presence detection and alarm behaviour." },
    ],
  }),
  component: SettingsPage,
});

const fields: { key: keyof Omit<Settings, "telegram">; label: string; desc: string; min: number; max: number; step: number; unit: string }[] = [
  { key: "threshold", label: "Detection threshold", desc: "Signal score needed to flag a possible person.", min: 10, max: 100, step: 5, unit: "%" },
  { key: "persistence", label: "Persistence", desc: "How long presence must hold before it's confirmed.", min: 1, max: 15, step: 1, unit: "s" },
  { key: "clearTime", label: "Clear time", desc: "Quiet period before the room is marked empty.", min: 5, max: 120, step: 5, unit: "s" },
  { key: "entryDelay", label: "Entry delay", desc: "Grace period to disarm after entering.", min: 0, max: 60, step: 5, unit: "s" },
  { key: "exitDelay", label: "Exit delay", desc: "Time to leave after arming.", min: 0, max: 120, step: 5, unit: "s" },
  { key: "alarmDuration", label: "Alarm duration", desc: "How long the buzzer sounds on intrusion.", min: 30, max: 600, step: 30, unit: "s" },
];

function SettingsPage() {
  const g = useGuard();
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 md:px-6">
      <PageHeader eyebrow="Settings" title="Detection & alarm settings" desc={g.demo ? "Demo mode: changes apply to this session only." : "Saved to your system and used by the ESP32 alert check."} />
      {!g.isOwner ? <Locked what="change security settings" /> : (
        <div className="space-y-4">
          <div className="glass divide-y divide-border">
            {fields.map((f) => (
              <div key={f.key} className="grid gap-4 p-5 md:grid-cols-[1fr_280px] md:items-center">
                <div><div className="font-semibold">{f.label}</div><div className="text-sm text-muted-foreground">{f.desc}</div></div>
                <div className="flex items-center gap-4">
                  <Slider value={[g.settings[f.key]]} min={f.min} max={f.max} step={f.step} onValueChange={([v]) => g.updateSettings({ [f.key]: v })} aria-label={f.label} />
                  <span className="w-16 shrink-0 text-right font-mono text-sm font-semibold text-cyan">{g.settings[f.key]}{f.unit}</span>
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between gap-4 p-5">
              <div className="flex items-start gap-3"><Send className="mt-0.5 h-5 w-5 text-cyan" /><div><div className="font-semibold">Telegram notifications</div><div className="text-sm text-muted-foreground">Send a Telegram message when an intrusion alarm is raised. Saves immediately.</div></div></div>
              <Switch checked={g.settings.telegram} onCheckedChange={(v) => g.setTelegram(v)} aria-label="Telegram notifications" />
            </div>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <button onClick={() => { g.resetSettings(); toast("Defaults restored"); }} className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold hover:bg-accent"><RotateCcw className="h-4 w-4" />Reset defaults</button>
            <button onClick={() => g.demo ? toast.success("Settings saved for this demo session") : g.saveSettings()} className="rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-primary-foreground glow">Save settings</button>
          </div>
          {!g.demo && <DevicesPanel />}
        </div>
      )}
    </div>
  );
}
