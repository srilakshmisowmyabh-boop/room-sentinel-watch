import { createFileRoute } from "@tanstack/react-router";
import { Cpu, GraduationCap, Layers, ShieldCheck } from "lucide-react";
import { PageHeader, Reveal } from "@/components/site/primitives";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "About — SENSE GUARD" },
      { name: "description", content: "SENSE GUARD is a college engineering project on camera-free smart home security using RUView." },
      { property: "og:title", content: "About — SENSE GUARD" },
      { property: "og:description", content: "The educational project behind SENSE GUARD." },
    ],
  }),
  component: About,
});

const cards = [
  { icon: GraduationCap, t: "Educational goal", d: "Demonstrate that Wi-Fi sensing can deliver practical home security without cameras or wearables." },
  { icon: Cpu, t: "Hardware", d: "Three ESP32 nodes capture Wi-Fi CSI in a single room, with a buzzer for local alarms." },
  { icon: Layers, t: "Software", d: "RUView sensing pipeline, an on-device decision engine, and this React web control centre." },
  { icon: ShieldCheck, t: "Roadmap", d: "Connect live RUView data over WebSocket, add a secure backend with real login, roles and a database." },
];

function About() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 md:px-6">
      <PageHeader eyebrow="About" title="Smart Home Security Using RUView" desc="SENSE GUARD is a college engineering project exploring privacy-first presence detection." />
      <div className="grid gap-5 sm:grid-cols-2">
        {cards.map((c, i) => (
          <Reveal key={c.t} delay={i * 70}>
            <div className="glass h-full p-6"><c.icon className="h-6 w-6 text-cyan" /><h3 className="mt-4 text-lg font-semibold">{c.t}</h3><p className="mt-2 text-sm text-muted-foreground">{c.d}</p></div>
          </Reveal>
        ))}
      </div>
      <div className="glass mt-8 border-warning/40 p-6 text-sm text-muted-foreground">
        <strong className="text-warning">Transparency note:</strong> this interface currently runs entirely on simulated demonstration data. It is not yet connected to ESP32 hardware or live RUView sensing, and the Owner/Viewer switch is a demo convenience, not real security.
      </div>
    </div>
  );
}
