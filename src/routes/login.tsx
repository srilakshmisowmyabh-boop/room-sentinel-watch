import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { KeyRound, ShieldCheck, UserPlus } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { SignalRings } from "@/components/site/primitives";
import { supabase } from "@/integrations/supabase/client";
import { useGuard } from "@/lib/demo-store";
import { cn } from "@/lib/utils";
import { useServerFn } from "@tanstack/react-start";
import { registerAccount, signupAvailability } from "@/lib/viewers.functions";
import { signupSchema } from "@/lib/viewer-schemas";

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
  const register = useServerFn(registerAccount);
  const availability = useServerFn(signupAvailability);
  const [firstOwner, setFirstOwner] = useState(false);
  useEffect(() => { availability().then(result => setFirstOwner(result.firstOwner)).catch(() => setFirstOwner(false)); }, [availability]);

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
    const parsed = signupSchema.safeParse({ name: String(f.get("name") ?? ""), email: String(f.get("email") ?? ""), password: String(f.get("pass") ?? ""), passkey: String(f.get("passkey") ?? "") });
    if (!parsed.success) { setErr(parsed.error.issues[0]?.message ?? "Please check your details."); return; }
    if (!firstOwner && !parsed.data.passkey) { setErr("Enter the passkey shared by the Owner."); return; }
    setErr(""); setBusy(true);
    try {
      const result = await register({ data: parsed.data });
      if (!result.ok) { setErr(result.message); return; }
      setFirstOwner(false); toast.success(result.message); setTab("login");
    } catch { setErr("Unable to create account. Please try again."); }
    finally { setBusy(false); }
  };

  return (
    <div className="relative mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-10 px-4 py-12 md:px-6 lg:grid-cols-2">
      <div className="hidden lg:block">
        <div className="relative mx-auto grid h-72 w-72 place-items-center">
          <SignalRings />
          <span className="grid h-24 w-24 place-items-center rounded-3xl bg-brand glow"><ShieldCheck className="h-12 w-12 text-primary-foreground" /></span>
        </div>
        <h2 className="mt-10 text-center text-3xl font-semibold">Welcome to <span className="text-gradient">SENSE GUARD</span></h2>
        <p className="mt-3 text-center text-muted-foreground">{firstOwner ? "The first account becomes the Owner. No passkey needed." : "Viewer accounts require a passkey shared by the Owner."}</p>
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
            <label className="block space-y-1.5 text-sm"><span>Name</span><input name="name" className={input} autoComplete="name" maxLength={60} required /></label>
            <label className="block space-y-1.5 text-sm"><span>Email</span><input name="email" type="email" className={input} autoComplete="email" /></label>
            <label className="block space-y-1.5 text-sm"><span>Password (8+ characters)</span><input name="pass" type="password" className={input} autoComplete="new-password" /></label>
            <label className="block space-y-1.5 text-sm"><span>Passkey{firstOwner ? " (not needed for the first Owner)" : ""}</span><input name="passkey" className={input} autoComplete="off" maxLength={128} required={!firstOwner} /></label>
            {err && <p className="text-sm text-danger">{err}</p>}
            <button disabled={busy} className="w-full rounded-xl bg-brand py-3 font-semibold text-primary-foreground glow disabled:opacity-60">{busy ? "Creating…" : "Create account"}</button>
          </form>
        )}
      </div>
    </div>
  );
}
