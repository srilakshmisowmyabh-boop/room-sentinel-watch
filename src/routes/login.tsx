import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { KeyRound, ShieldCheck, UserPlus, Users } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { SignalRings } from "@/components/site/primitives";
import { supabase } from "@/integrations/supabase/client";
import { useGuard } from "@/lib/demo-store";
import { cn } from "@/lib/utils";
import { useServerFn } from "@tanstack/react-start";
import { claimViewerSession, recordOwnerSignIn, registerOwner, signupAvailability, viewerAccess, viewerPasskeyStatus } from "@/lib/viewers.functions";
import { ownerSignupSchema, viewerAccessSchema } from "@/lib/viewer-schemas";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Login — SENSE GUARD" },
      { name: "description", content: "Sign in to SENSE GUARD as the Owner or with viewer access." },
      { property: "og:title", content: "Login — SENSE GUARD" },
      { property: "og:description", content: "Access your SENSE GUARD security dashboard." },
    ],
  }),
  component: Login,
});

const input = "w-full rounded-xl border border-input bg-background/60 px-4 py-3 outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30";

function Login() {
  const [tab, setTab] = useState<"login" | "viewer" | "signup">("login");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const g = useGuard();
  const nav = useNavigate();
  const register = useServerFn(registerOwner);
  const access = useServerFn(viewerAccess);
  const claim = useServerFn(claimViewerSession);
  const recordSignIn = useServerFn(recordOwnerSignIn);
  const availability = useServerFn(signupAvailability);
  const [firstOwner, setFirstOwner] = useState(false);
  const passkeyStatus = useServerFn(viewerPasskeyStatus);
  const [passkeySet, setPasskeySet] = useState(true);
  const [forgot, setForgot] = useState(false);
  useEffect(() => { passkeyStatus().then((r) => setPasskeySet(r.set)).catch(() => undefined); }, [passkeyStatus]);
  useEffect(() => {
    availability().then((result) => setFirstOwner(result.firstOwner)).catch(() => setFirstOwner(false));
  }, [availability]);

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
    recordSignIn().catch(() => undefined);
    toast.success("Signed in");
    nav({ to: "/dashboard" });
  };

  const onForgot = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email") ?? "").trim();
    if (!email) { setErr("Enter your email."); return; }
    setErr(""); setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    toast.success("If that email belongs to the Owner, a reset link is on its way.");
    setForgot(false);
  };

  const onViewer = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const parsed = viewerAccessSchema.safeParse({ name: String(f.get("name") ?? ""), email: String(f.get("email") ?? ""), passkey: String(f.get("passkey") ?? "") });
    if (!parsed.success) { setErr(parsed.error.issues[0]?.message ?? "Please check your details."); return; }
    setErr(""); setBusy(true);
    try {
      const result = await access({ data: parsed.data });
      if (!result.ok) { setErr(result.message); return; }
      const { error } = await supabase.auth.verifyOtp({ token_hash: result.tokenHash, type: "magiclink" });
      if (error) { setErr("Unable to start your session. Please try again."); return; }
      await claim().catch(() => undefined);
      toast.success("Signed in");
      nav({ to: "/dashboard" });
    } catch { setErr("Unable to sign you in. Please try again."); }
    finally { setBusy(false); }
  };

  const onSignup = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const parsed = ownerSignupSchema.safeParse({
      name: String(f.get("name") ?? ""), email: String(f.get("email") ?? ""),
      password: String(f.get("pass") ?? ""), viewerPasskey: String(f.get("passkey") ?? ""),
    });
    if (!parsed.success) { setErr(parsed.error.issues[0]?.message ?? "Please check your details."); return; }
    if (parsed.data.password !== String(f.get("pass2") ?? "")) { setErr("Passwords do not match."); return; }
    if (parsed.data.viewerPasskey !== String(f.get("passkey2") ?? "").trim()) { setErr("Passkeys do not match."); return; }
    setErr(""); setBusy(true);
    try {
      const result = await register({ data: parsed.data });
      if (!result.ok) { setErr(result.message); return; }
      setFirstOwner(false); toast.success(result.message); setTab("login");
    } catch { setErr("Unable to create account. Please try again."); }
    finally { setBusy(false); }
  };

  const tabs = [
    ["login", "Owner", KeyRound],
    ["viewer", "Viewer", Users],
  ] as const;

  return (
    <div className="relative mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-10 px-4 py-12 md:px-6 lg:grid-cols-2">
      <Dialog open={chooser} onOpenChange={setChooser}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Welcome to SENSE GUARD</DialogTitle>
            <DialogDescription>Choose how you want to continue.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <button type="button" onClick={() => { setTab("signup"); setErr(""); setForgot(false); setChooser(false); }} className="flex items-center justify-center gap-2 rounded-xl bg-brand py-3 font-semibold text-primary-foreground glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><UserPlus className="h-4 w-4" />First-time user? Create account</button>
            <button type="button" onClick={() => { setTab("login"); setErr(""); setChooser(false); }} className="flex items-center justify-center gap-2 rounded-xl border border-border py-3 font-semibold transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><KeyRound className="h-4 w-4" />Already have an account? Sign in</button>
          </div>
        </DialogContent>
      </Dialog>
      <div className="hidden lg:block">
        <div className="relative mx-auto grid h-72 w-72 place-items-center">
          <SignalRings />
          <span className="grid h-24 w-24 place-items-center rounded-3xl bg-brand glow"><ShieldCheck className="h-12 w-12 text-primary-foreground" /></span>
        </div>
        <h2 className="mt-10 text-center text-3xl font-semibold">Welcome to <span className="text-gradient">SENSE GUARD</span></h2>
        <p className="mt-3 text-center text-muted-foreground">The Owner manages the system. Viewers sign in with their name, email and the passkey shared by the Owner.</p>
      </div>
      <div className="glass p-6 md:p-8">
        {tab === "signup" ? (
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Create Owner account</h3>
            <button type="button" onClick={() => { setTab("login"); setErr(""); }} className="text-sm text-primary hover:underline">Sign in instead</button>
          </div>
        ) : (
          <div className="mb-6 flex rounded-xl border border-border bg-muted/50 p-1">
            {tabs.map(([v, l, I]) => (
              <button key={v} type="button" onClick={() => { setTab(v); setErr(""); }} className={cn("flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold transition", tab === v ? "bg-primary text-primary-foreground" : "text-muted-foreground")}><I className="h-4 w-4" />{l}</button>
            ))}
          </div>
        )}
        {tab === "login" && forgot && (
          <form onSubmit={onForgot} className="space-y-4">
            <label className="block space-y-1.5 text-sm"><span>Owner email</span><input name="email" type="email" className={input} autoComplete="email" /></label>
            {err && <p className="text-sm text-danger">{err}</p>}
            <button disabled={busy} className="w-full rounded-xl bg-brand py-3 font-semibold text-primary-foreground glow disabled:opacity-60">{busy ? "Sending…" : "Send reset link"}</button>
            <button type="button" onClick={() => { setForgot(false); setErr(""); }} className="w-full text-sm text-muted-foreground hover:text-foreground">Back to sign in</button>
          </form>
        )}
        {tab === "login" && !forgot && (
          <form onSubmit={onLogin} className="space-y-4">
            <label className="block space-y-1.5 text-sm"><span>Email</span><input name="email" type="email" className={input} autoComplete="email" /></label>
            <label className="block space-y-1.5 text-sm"><span>Password</span><input name="pass" type="password" className={input} autoComplete="current-password" /></label>
            {err && <p className="text-sm text-danger">{err}</p>}
            <button disabled={busy} className="w-full rounded-xl bg-brand py-3 font-semibold text-primary-foreground glow disabled:opacity-60">{busy ? "Signing in…" : "Sign in"}</button>
            <button type="button" onClick={() => { setForgot(true); setErr(""); }} className="w-full text-sm text-primary hover:underline">Forgot password?</button>
          </form>
        )}
        {tab === "viewer" && !passkeySet && <p className="rounded-xl border border-border bg-muted/50 p-4 text-sm">Viewer access isn't available yet. Ask the Owner to set a passkey.</p>}
        {tab === "viewer" && passkeySet && (
          <form onSubmit={onViewer} className="space-y-4">
            <label className="block space-y-1.5 text-sm"><span>Name</span><input name="name" className={input} autoComplete="name" maxLength={60} /></label>
            <label className="block space-y-1.5 text-sm"><span>Email</span><input name="email" type="email" className={input} autoComplete="email" /></label>
            <label className="block space-y-1.5 text-sm"><span>Viewer passkey</span><input name="passkey" type="password" className={input} autoComplete="off" maxLength={128} /></label>
            {err && <p className="text-sm text-danger">{err}</p>}
            <button disabled={busy} className="w-full rounded-xl bg-brand py-3 font-semibold text-primary-foreground glow disabled:opacity-60">{busy ? "Signing in…" : "View dashboard"}</button>
            <p className="text-xs text-muted-foreground">No password needed. Get the passkey from the Owner.</p>
          </form>
        )}
        {tab === "signup" && firstOwner && (
          <form onSubmit={onSignup} className="space-y-4">
            <label className="block space-y-1.5 text-sm"><span>Name</span><input name="name" className={input} autoComplete="name" maxLength={60} required /></label>
            <label className="block space-y-1.5 text-sm"><span>Email</span><input name="email" type="email" className={input} autoComplete="email" /></label>
            <label className="block space-y-1.5 text-sm"><span>Password (8+ characters)</span><input name="pass" type="password" className={input} autoComplete="new-password" /></label>
            <label className="block space-y-1.5 text-sm"><span>Confirm password</span><input name="pass2" type="password" className={input} autoComplete="new-password" /></label>
            <label className="block space-y-1.5 text-sm"><span>Viewer passkey (8+ characters)</span><input name="passkey" type="password" className={input} autoComplete="off" maxLength={128} /></label>
            <label className="block space-y-1.5 text-sm"><span>Confirm viewer passkey</span><input name="passkey2" type="password" className={input} autoComplete="off" maxLength={128} /></label>
            {err && <p className="text-sm text-danger">{err}</p>}
            <button disabled={busy} className="w-full rounded-xl bg-brand py-3 font-semibold text-primary-foreground glow disabled:opacity-60">{busy ? "Creating…" : "Create Owner account"}</button>
            <p className="text-xs text-muted-foreground">The viewer passkey is shared with people you want to grant view-only access. Only this first sign-up creates an account.</p>
          </form>
        )}
      </div>
    </div>
  );
}
