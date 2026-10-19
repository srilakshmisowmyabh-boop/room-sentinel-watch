import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { PageHeader, Reveal } from "@/components/site/primitives";
import { Workflow } from "@/components/site/Workflow";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "How It Works — SENSE GUARD" },
      { name: "description", content: "How RUView Wi-Fi sensing and ESP32 nodes detect human presence without cameras." },
      { property: "og:title", content: "How It Works — SENSE GUARD" },
      { property: "og:description", content: "From Wi-Fi signal changes to security alerts, step by step." },
    ],
  }),
  component: HowItWorks,
});

const steps = [
  ["Wi-Fi as a sensor", "Every human body absorbs and reflects radio waves. Three ESP32 nodes exchange Wi-Fi packets and record Channel State Information (CSI) — fine-grained data about how the signal travelled."],
  ["RUView signal processing", "RUView turns raw CSI into motion and presence features. Movement causes characteristic fluctuations that can be scored against a detection threshold."],
  ["Presence confirmation", "A score above the threshold becomes POSSIBLE_PERSON. Only if it persists for the configured window does it become PERSON_PRESENT — filtering out pets, fans and noise."],
  ["Security decision", "The state is combined with the security mode. In ARMED mode, confirmed presence after the entry delay becomes INTRUSION."],
  ["Alerting", "An intrusion sounds the buzzer for the alarm duration, raises a dashboard banner and (optionally) sends a Telegram message. Every step is logged."],
];

function HowItWorks() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 md:px-6">
      <PageHeader eyebrow="How it works" title="Sensing presence through Wi-Fi" desc="A camera-free pipeline from radio signals to security decisions." />
      <div className="glass p-6 md:p-10"><Workflow /></div>
      <div className="mt-14 grid gap-6 md:grid-cols-[220px_1fr]">
        <div className="hidden md:block"><div className="sticky top-24 font-mono text-xs uppercase tracking-[0.25em] text-cyan">Step by step</div></div>
        <ol className="relative space-y-8 border-l border-border pl-8">
          {steps.map(([t, d], i) => (
            <Reveal key={t} delay={i * 60}>
              <li className="relative">
                <span className="absolute -left-[45px] grid h-7 w-7 place-items-center rounded-full bg-brand font-mono text-xs font-bold text-primary-foreground">{i + 1}</span>
                <h3 className="text-xl font-semibold">{t}</h3>
                <p className="mt-2 max-w-2xl text-muted-foreground">{d}</p>
              </li>
            </Reveal>
          ))}
        </ol>
      </div>
      <div className="mt-14 flex justify-center">
        <Link to="/monitor" className="inline-flex items-center gap-2 rounded-xl bg-brand px-6 py-3.5 font-semibold text-primary-foreground glow">See the Live Monitor <ArrowRight className="h-4 w-4" /></Link>
      </div>
    </div>
  );
}
