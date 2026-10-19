import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { KeyRound, ShieldCheck, UserPlus } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { SignalRings } from "@/components/site/primitives";
import { supabase } from "@/integrations/supabase/client";
import { useGuard } from "@/lib/demo-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Login — SENSE GUARD" },
      { name: "description", content: "Sign in to SENSE GUARD or create an account." },
      { property: "og:title", content: "Login — SENSE GUARD" },
      { property: "og:description", content: "Access your SENSE GUARD security dashboard." },
    ],
  }),
  component: Login,
});

const input = "w-full rounded-xl border border-input bg-background/60 px-4 py-3 outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30";

function Login() {
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const g = useGuard();
  const nav = useNavigate();

  useEffect(() => { if (g.authReady && g.signedIn) nav({ to: "/dashboard" }); }, [g.authReady, g.signedIn, nav]);

  const onLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email") ?? "").trim(), password = String(f.get("pass") ?? "");
    if (!email || !password) { setErr("Please enter your email and password."); return; }
    setErr(""); setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    toast.success("Signed in");
    nav({ to: "/dashboard" });
  };

  const onSignup = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const name = String(f.get("name") ?? "").trim(), email = String(f.get("email") ?? "").trim(), password = String(f.get("pass") ?? "");
    if (!name || !email || !password) { setErr("All fields are required."); return; }
    if (name.length > 60) { setErr("Display name must be 60 characters or fewer."); return; }
    if (password.length < 8) { setErr("Password must be at least 8 characters."); return; }
    setErr(""); setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email, password, options: { data: { display_name: name }, emailRedirectTo: window.location.origin },
    });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    if (data.session) { toast.success("Account created"); nav({ to: "/dashboard" }); }
    else { toast.info("Account created — please sign in."); setTab("login"); }
  };

  return (
    <div className="relative mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-10 px-4 py-12 md:px-6 lg:grid-cols-2">
      <div className="hidden lg:block">
        <div className="relative mx-auto grid h-72 w-72 place-items-center">
          <SignalRings />
          <span className="grid h-24 w-24 place-items-center rounded-3xl bg-brand glow"><ShieldCheck className="h-12 w-12 text-primary-foreground" /></span>
        </div>
        <h2 className="mt-10 text-center text-3xl font-semibold">Welcome to <span className="text-gradient">SENSE GUARD</span></h2>
        <p className="mt-3 text-center text-muted-foreground">The first account becomes the Owner. Everyone after joins as a Viewer.</p>
      </div>
      <div className="glass p-6 md:p-8">
        <div className="mb-6 flex rounded-xl border border-border bg-muted/50 p-1">
          {([["login", "Sign in", KeyRound], ["signup", "Create account", UserPlus]] as const).map(([v, l, I]) => (
            <button key={v} type="button" onClick={() => { setTab(v); setErr(""); }} className={cn("flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold transition", tab === v ? "bg-primary text-primary-foreground" : "text-muted-foreground")}><I className="h-4 w-4" />{l}</button>
          ))}
        </div>
        {tab === "login" ? (
          <form onSubmit={onLogin} className="space-y-4">
            <label className="block space-y-1.5 text-sm"><span>Email</span><input name="email" type="email" className={input} autoComplete="email" /></label>
            <label className="block space-y-1.5 text-sm"><span>Password</span><input name="pass" type="password" className={input} autoComplete="current-password" /></label>
            {err && <p className="text-sm text-danger">{err}</p>}
            <button disabled={busy} className="w-full rounded-xl bg-brand py-3 font-semibold text-primary-foreground glow disabled:opacity-60">{busy ? "Signing in…" : "Sign in"}</button>
          </form>
        ) : (
          <form onSubmit={onSignup} className="space-y-4">
            <label className="block space-y-1.5 text-sm"><span>Display name</span><input name="name" className={input} autoComplete="name" maxLength={60} /></label>
            <label className="block space-y-1.5 text-sm"><span>Email</span><input name="email" type="email" className={input} autoComplete="email" /></label>
            <label className="block space-y-1.5 text-sm"><span>Password (8+ characters)</span><input name="pass" type="password" className={input} autoComplete="new-password" /></label>
            {err && <p className="text-sm text-danger">{err}</p>}
            <button disabled={busy} className="w-full rounded-xl bg-brand py-3 font-semibold text-primary-foreground glow disabled:opacity-60">{busy ? "Creating…" : "Create account"}</button>
          </form>
        )}
      </div>
    </div>
  );
}
