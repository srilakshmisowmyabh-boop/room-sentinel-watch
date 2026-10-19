import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Eye, KeyRound, ShieldCheck, UserPlus } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { DemoBadge, SignalRings } from "@/components/site/primitives";
import { useGuard } from "@/lib/demo-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Login — SENSE GUARD" },
      { name: "description", content: "Sign in to SENSE GUARD or set up Owner and Viewer accounts." },
      { property: "og:title", content: "Login — SENSE GUARD" },
      { property: "og:description", content: "Access your SENSE GUARD security dashboard." },
    ],
  }),
  component: Login,
});

const input = "w-full rounded-xl border border-input bg-background/60 px-4 py-3 outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30";

function Login() {
  const [tab, setTab] = useState<"login" | "setup">("login");
  const [err, setErr] = useState("");
  const g = useGuard();
  const nav = useNavigate();

  const onLogin = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if (!f.get("user") || !f.get("pass")) { setErr("Please enter your username/email and password."); return; }
    setErr("");
    toast.info("Authentication isn't connected yet — continuing in demo mode.");
    nav({ to: "/dashboard" });
  };
  const onSetup = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if ([...f.values()].some((v) => !v)) { setErr("All fields are required."); return; }
    if (String(f.get("op")).length < 8) { setErr("Owner password must be at least 8 characters."); return; }
    setErr("");
    toast.info("Setup preview only — accounts will be created once the backend is added.");
    setTab("login");
  };

  return (
    <div className="relative mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-10 px-4 py-12 md:px-6 lg:grid-cols-2">
      <div className="hidden lg:block">
        <div className="relative mx-auto grid h-72 w-72 place-items-center">
          <SignalRings />
          <span className="grid h-24 w-24 place-items-center rounded-3xl bg-brand glow"><ShieldCheck className="h-12 w-12 text-primary-foreground" /></span>
        </div>
        <h2 className="mt-10 text-center text-3xl font-semibold">Welcome to <span className="text-gradient">SENSE GUARD</span></h2>
        <p className="mt-3 text-center text-muted-foreground">Owners control the system. Viewers keep an eye on it.</p>
      </div>
      <div className="glass p-6 md:p-8">
        <div className="mb-6 flex items-center justify-between gap-2"><DemoBadge /></div>
        <div className="mb-6 flex rounded-xl border border-border bg-muted/50 p-1">
          {([["login", "Sign in", KeyRound], ["setup", "First-time setup", UserPlus]] as const).map(([v, l, I]) => (
            <button key={v} onClick={() => { setTab(v); setErr(""); }} className={cn("flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold transition", tab === v ? "bg-primary text-primary-foreground" : "text-muted-foreground")}><I className="h-4 w-4" />{l}</button>
          ))}
        </div>
        {tab === "login" ? (
          <form onSubmit={onLogin} className="space-y-4">
            <label className="block space-y-1.5 text-sm"><span>Username or email</span><input name="user" className={input} autoComplete="username" /></label>
            <label className="block space-y-1.5 text-sm"><span>Password</span><input name="pass" type="password" className={input} autoComplete="current-password" /></label>
            {err && <p className="text-sm text-danger">{err}</p>}
            <button className="w-full rounded-xl bg-brand py-3 font-semibold text-primary-foreground glow">Sign in</button>
          </form>
        ) : (
          <form onSubmit={onSetup} className="space-y-5">
            <fieldset className="space-y-3 rounded-xl border border-border p-4">
              <legend className="flex items-center gap-2 px-1 text-sm font-semibold"><ShieldCheck className="h-4 w-4 text-success" />Owner account</legend>
              <p className="text-xs text-muted-foreground">Full controls: arm/disarm, history, export and settings.</p>
              <input name="oe" placeholder="Owner email" className={input} />
              <input name="op" type="password" placeholder="Password (8+ characters)" className={input} />
            </fieldset>
            <fieldset className="space-y-3 rounded-xl border border-border p-4">
              <legend className="flex items-center gap-2 px-1 text-sm font-semibold"><Eye className="h-4 w-4 text-cyan" />Viewer account</legend>
              <p className="text-xs text-muted-foreground">Can view presence & device health and test the buzzer.</p>
              <input name="ve" placeholder="Viewer email" className={input} />
              <input name="vp" type="password" placeholder="Password" className={input} />
            </fieldset>
            {err && <p className="text-sm text-danger">{err}</p>}
            <button className="w-full rounded-xl bg-brand py-3 font-semibold text-primary-foreground glow">Create accounts</button>
          </form>
        )}
        <div className="mt-6 rounded-xl border border-warning/30 bg-warning/5 p-4 text-sm">
          <p className="font-semibold text-warning">Demo role switch</p>
          <p className="mt-1 text-muted-foreground">Real authentication arrives with the backend. For now, pick a role to demo — this is not real security.</p>
          <div className="mt-3 flex gap-2">
            {(["owner", "viewer"] as const).map((r) => (
              <button key={r} onClick={() => { g.setRole(r); nav({ to: "/dashboard" }); }} className={cn("flex-1 rounded-lg border py-2 text-sm font-semibold capitalize transition hover:bg-accent", g.role === r ? "border-primary text-primary" : "border-border")}>Continue as {r}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
