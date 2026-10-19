import { Activity, ArrowRight, BellRing, Cpu, ShieldCheck, Wifi } from "lucide-react";

const workflow = [
  { icon: Wifi, title: "RUView Sensing", desc: "Wi-Fi CSI captured by three ESP32 nodes" },
  { icon: Cpu, title: "ESP32 Processing", desc: "Signal features extracted on-device" },
  { icon: Activity, title: "Presence Confirmation", desc: "Threshold + persistence check" },
  { icon: ShieldCheck, title: "Security Decision", desc: "Evaluated against the active mode" },
  { icon: BellRing, title: "Alert", desc: "Buzzer, dashboard and Telegram" },
];

export function Workflow() {
  return (
    <div className="mt-10 grid gap-4 md:grid-cols-5">
      {workflow.map((w, i) => (
        <div key={w.title} className="relative">
          <div className="flex h-full flex-col items-start gap-3 rounded-2xl border border-border bg-background/50 p-5 transition hover:border-cyan/50">
            <span className="font-mono text-xs text-muted-foreground">0{i + 1}</span>
            <span className="relative grid h-11 w-11 place-items-center rounded-xl bg-brand text-primary-foreground"><w.icon className="h-5 w-5" /></span>
            <div className="font-semibold">{w.title}</div>
            <div className="text-xs text-muted-foreground">{w.desc}</div>
          </div>
          {i < workflow.length - 1 && (
            <ArrowRight className="absolute -right-3.5 top-1/2 z-10 hidden h-5 w-5 -translate-y-1/2 text-cyan md:block" />
          )}
        </div>
      ))}
    </div>
  );
}
