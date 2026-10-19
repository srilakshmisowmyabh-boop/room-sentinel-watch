import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BellRing, EyeOff, HeartPulse, History, Radar, SlidersHorizontal } from "lucide-react";
import { Workflow } from "@/components/site/Workflow";
import hero from "@/assets/hero-house.jpg";
import { DemoBadge, Reveal, SignalRings } from "@/components/site/primitives";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "SENSE GUARD — See Without Seeing" },
      { name: "description", content: "Camera-free, privacy-first human presence sensing for smart home security using RUView and ESP32." },
      { property: "og:title", content: "SENSE GUARD — See Without Seeing" },
      { property: "og:description", content: "Privacy-first human-presence sensing for smarter home security." },
    ],
  }),
  component: Home,
});

const features = [
  { icon: EyeOff, title: "Camera-free sensing", desc: "Wi-Fi signal disturbances reveal human presence — no lenses, no footage, no privacy trade-off." },
  { icon: Radar, title: "Intelligent presence", desc: "Threshold and persistence filters separate real people from noise before anything is flagged." },
  { icon: SlidersHorizontal, title: "Security modes", desc: "Switch between Disarmed, Home and Armed with configurable entry and exit delays." },
  { icon: HeartPulse, title: "Device health", desc: "Watch each ESP32 node's signal, uptime and fault state at a glance." },
  { icon: History, title: "Event history", desc: "Every mode change, presence event and alert is timestamped and exportable." },
  { icon: BellRing, title: "Instant alerts", desc: "Local buzzer alarm with optional Telegram notifications for intrusions." },
];

function Home() {
  return (
    <>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-hero" />
        <div className="absolute inset-0 bg-grid [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 pb-20 pt-14 md:px-6 lg:grid-cols-[1fr_1.15fr] lg:pt-24">
          <div className="animate-fade-up">
            <DemoBadge />
            <h1 className="mt-6 text-5xl font-bold leading-[1.02] md:text-7xl">
              See Without <span className="text-gradient">Seeing.</span>
            </h1>
            <p className="mt-6 max-w-lg text-lg text-muted-foreground">Privacy-first human-presence sensing for smarter home security.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/dashboard" className="group inline-flex items-center gap-2 rounded-xl bg-brand px-6 py-3.5 font-semibold text-primary-foreground glow transition hover:-translate-y-0.5">
                Explore Dashboard <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </Link>
              <Link to="/how-it-works" className="inline-flex items-center gap-2 rounded-xl border border-border bg-glass px-6 py-3.5 font-semibold backdrop-blur transition hover:bg-accent">
                How It Works
              </Link>
            </div>
            <div className="mt-10 grid max-w-md grid-cols-3 gap-4">
              {[["0", "cameras"], ["3", "ESP32 nodes"], ["<2s", "alert path"]].map(([v, l]) => (
                <div key={l}><div className="font-display text-2xl font-bold">{v}</div><div className="text-xs text-muted-foreground">{l}</div></div>
              ))}
            </div>
          </div>
          <div className="relative animate-float">
            <div className="absolute -inset-6 rounded-[2rem] bg-brand opacity-25 blur-3xl animate-blob" />
            <div className="relative overflow-hidden rounded-3xl border border-border glow">
              <img src={hero} alt="Glass smart home with three wireless sensing nodes emitting signal rings" width={1408} height={1056} className="h-full w-full object-cover" />
            </div>
            <div className="glass absolute -bottom-6 -left-4 flex items-center gap-3 px-4 py-3 md:-left-8">
              <span className="relative grid h-9 w-9 place-items-center"><SignalRings /><span className="h-3 w-3 rounded-full bg-cyan" /></span>
              <div><div className="font-mono text-xs text-muted-foreground">Living Room</div><div className="text-sm font-semibold">PERSON_PRESENT</div></div>
            </div>
            <div className="glass absolute -right-2 top-6 hidden px-4 py-3 sm:block md:-right-6">
              <div className="font-mono text-xs text-muted-foreground">Mode</div>
              <div className="text-sm font-semibold text-primary">HOME</div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 md:px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-cyan">Capabilities</p>
          <h2 className="mt-3 text-3xl font-semibold md:text-5xl">Security that respects the people it protects.</h2>
        </Reveal>
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <Reveal key={f.title} delay={i * 70}>
              <div className="glass group h-full p-6 transition duration-300 hover:-translate-y-1 hover:glow">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/15 text-cyan transition group-hover:bg-brand group-hover:text-primary-foreground"><f.icon className="h-5 w-5" /></div>
                <h3 className="mt-5 text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 md:px-6">
        <Reveal className="glass relative overflow-hidden p-8 md:p-12">
          <div className="absolute inset-0 bg-hero opacity-60" />
          <div className="relative">
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-cyan">Signal path</p>
            <h2 className="mt-3 text-3xl font-semibold">From a ripple in Wi-Fi to an alert.</h2>
            <Workflow />
          </div>
        </Reveal>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 md:px-6">
        <Reveal className="grid items-center gap-10 md:grid-cols-2">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-cyan">About the project</p>
            <h2 className="mt-3 text-3xl font-semibold">An educational engineering project.</h2>
            <p className="mt-4 text-muted-foreground">SENSE GUARD explores how RUView Wi-Fi sensing and low-cost ESP32 boards can detect people in a room without cameras. This interface is the control centre: it currently runs on simulated data, ready to connect to real hardware.</p>
            <Link to="/about" className="mt-6 inline-flex items-center gap-2 font-semibold text-cyan hover:underline">Read more <ArrowRight className="h-4 w-4" /></Link>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[["Privacy", "No images are ever captured"], ["Low cost", "Commodity ESP32 hardware"], ["Roles", "Owner & Viewer access"], ["Open", "Built to plug into RUView APIs"]].map(([t, d]) => (
              <div key={t} className="glass p-5"><div className="font-semibold">{t}</div><div className="mt-1 text-sm text-muted-foreground">{d}</div></div>
            ))}
          </div>
        </Reveal>
      </section>
    </>
  );
}

