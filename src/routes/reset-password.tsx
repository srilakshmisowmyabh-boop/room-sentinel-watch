import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { passwordSchema } from "@/lib/viewer-schemas";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset password — SENSE GUARD" },
      { name: "description", content: "Choose a new Owner password for SENSE GUARD." },
      { property: "og:title", content: "Reset password — SENSE GUARD" },
      { property: "og:description", content: "Choose a new Owner password for SENSE GUARD." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPassword,
});

const input = "w-full rounded-xl border border-input bg-background/60 px-4 py-3 outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30";

function ResetPassword() {
  const nav = useNavigate();
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const parsed = passwordSchema.safeParse(String(f.get("pass") ?? ""));
    if (!parsed.success) { setErr(parsed.error.issues[0]?.message ?? "Invalid password."); return; }
    if (parsed.data !== String(f.get("pass2") ?? "")) { setErr("Passwords do not match."); return; }
    setErr(""); setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: parsed.data });
    setBusy(false);
    if (error) { setErr("This reset link is invalid or has expired. Request a new one."); return; }
    toast.success("Password updated");
    nav({ to: "/dashboard" });
  };
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <form onSubmit={onSubmit} className="glass space-y-4 p-6 md:p-8">
        <h1 className="text-2xl font-semibold">Set a new password</h1>
        <label className="block space-y-1.5 text-sm"><span>New password (8+ characters)</span><input name="pass" type="password" className={input} autoComplete="new-password" /></label>
        <label className="block space-y-1.5 text-sm"><span>Confirm new password</span><input name="pass2" type="password" className={input} autoComplete="new-password" /></label>
        {err && <p className="text-sm text-danger">{err}</p>}
        <button disabled={busy} className="w-full rounded-xl bg-brand py-3 font-semibold text-primary-foreground glow disabled:opacity-60">{busy ? "Saving…" : "Update password"}</button>
      </form>
    </div>
  );
}
