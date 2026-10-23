import { useEffect, useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, UserX, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { listViewers, setViewerBlocked, setViewerPasskey } from "@/lib/viewers.functions";
import { viewerPasskeySchema } from "@/lib/viewer-schemas";

type Viewer = { user_id: string; name: string; email: string; first_sign_in_at: string | null; last_sign_in_at: string | null; blocked_at: string | null };
const date = (value: string | null | undefined) => value ? new Date(value).toLocaleString() : "—";

export function ViewersPanel() {
  const list = useServerFn(listViewers);
  const setBlocked = useServerFn(setViewerBlocked);
  const savePasskey = useServerFn(setViewerPasskey);
  const queryClient = useQueryClient();
  const { data: viewers, error, isPending } = useQuery<Viewer[]>({ queryKey: ["owner-viewers"], queryFn: () => list(), refetchInterval: 15000, gcTime: 0 });
  const [passkey, setPasskey] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => () => { queryClient.removeQueries({ queryKey: ["owner-viewers"] }); }, [queryClient]);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["owner-viewers"] });

  const save = async (event: FormEvent) => {
    event.preventDefault();
    const parsed = viewerPasskeySchema.safeParse(passkey);
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message ?? "Enter a passkey."); return; }
    if (!confirm("Save this viewer passkey? All signed-in viewers will be signed out and must use the new passkey.")) return;
    setBusy(true);
    try {
      await savePasskey({ data: { passkey: parsed.data } });
      setPasskey("");
      toast.success("Viewer passkey saved. All viewers were signed out.");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Unable to save the passkey."); }
    finally { setBusy(false); }
  };

  const toggleBlock = async (viewer: Viewer) => {
    const block = !viewer.blocked_at;
    if (!confirm(block ? `Block ${viewer.name}? They will be signed out and cannot sign in again.` : `Unblock ${viewer.name}?`)) return;
    setBusy(true);
    try {
      await setBlocked({ data: { userId: viewer.user_id, blocked: block } });
      toast.success(block ? "Viewer blocked" : "Viewer unblocked");
      await refresh();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Unable to update the viewer."); }
    finally { setBusy(false); }
  };

  return <section className="border-t border-border pt-6" aria-labelledby="viewers-heading">
    <h2 id="viewers-heading" className="text-xl font-semibold">Viewers</h2>
    <form onSubmit={save} className="mt-4 flex flex-wrap items-end gap-3">
      <label className="min-w-0 flex-1 space-y-1.5 text-sm">
        <span>Viewer passkey</span>
        <input type="password" value={passkey} onChange={(event) => setPasskey(event.target.value)} minLength={8} maxLength={128} autoComplete="off"
          placeholder="New shared passkey (8+ characters)" className="w-full rounded-lg border border-input bg-background/60 px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-ring" />
      </label>
      <Button type="submit" disabled={busy}><KeyRound />Save passkey</Button>
    </form>
    <p className="mt-2 text-xs text-muted-foreground">Viewers sign in with their name, email and this shared passkey — no password. Saving a new passkey signs out all current viewers. The passkey is stored hashed and never shown.</p>
    {isPending && <p className="mt-4 text-sm text-muted-foreground">Loading viewers…</p>}
    {error && <p className="mt-4 text-sm text-danger">Unable to load viewers.</p>}
    {viewers?.length === 0 && <p className="mt-5 text-sm text-muted-foreground">No viewers have signed in yet.</p>}
    <div className="mt-5 divide-y divide-border">
      {viewers?.map((viewer) => <div key={viewer.user_id} className="flex flex-wrap items-start justify-between gap-3 py-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2"><span className="break-words font-semibold">{viewer.name}</span>{viewer.blocked_at && <span className="text-xs font-semibold text-danger">Blocked</span>}</div>
          <p className="mt-1 break-all text-sm text-muted-foreground">{viewer.email}</p>
          <dl className="mt-3 grid gap-x-6 gap-y-2 text-xs sm:grid-cols-2">
            <div><dt className="text-muted-foreground">First sign-in</dt><dd className="mt-1">{date(viewer.first_sign_in_at)}</dd></div>
            <div><dt className="text-muted-foreground">Last sign-in</dt><dd className="mt-1">{date(viewer.last_sign_in_at)}</dd></div>
          </dl>
        </div>
        <Button variant="outline" size="sm" disabled={busy} onClick={() => toggleBlock(viewer)}>
          {viewer.blocked_at ? <UserCheck /> : <UserX />}{viewer.blocked_at ? "Unblock" : "Block"}
        </Button>
      </div>)}
    </div>
  </section>;
}
