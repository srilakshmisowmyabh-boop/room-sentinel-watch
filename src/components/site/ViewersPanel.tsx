import { useEffect, useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, UserPlus, UserX, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createViewerInvite, listViewers, revokeViewer } from "@/lib/viewers.functions";
import { createInviteSchema } from "@/lib/viewer-schemas";
import type { Database } from "@/integrations/supabase/types";

const date = (value: string | null | undefined) => value ? new Date(value).toLocaleString() : "—";
export function ViewersPanel() {
  const list = useServerFn(listViewers);
  const create = useServerFn(createViewerInvite);
  const revoke = useServerFn(revokeViewer);
  const queryClient = useQueryClient();
  const { data: viewers, error, isPending } = useQuery<Database["public"]["Functions"]["list_viewers"]["Returns"]>({ queryKey: ["owner-viewers"], queryFn: () => list(), refetchInterval: 15000, gcTime: 0 });
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [newInvite, setNewInvite] = useState<{ name: string; passkey: string } | null>(null);
  useEffect(() => () => { queryClient.removeQueries({ queryKey: ["owner-viewers"] }); }, [queryClient]);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["owner-viewers"] });
  const add = async (event: FormEvent) => {
    event.preventDefault();
    const parsed = createInviteSchema.safeParse({ name });
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message ?? "Enter a name."); return; }
    setBusy(true);
    try { setNewInvite(await create({ data: parsed.data })); setName(""); await refresh(); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Unable to add viewer."); }
    finally { setBusy(false); }
  };
  const remove = async (id: string, viewerName: string) => {
    if (!confirm(`Revoke ${viewerName}? Their passkey and account access will be blocked.`)) return;
    setBusy(true);
    try { await revoke({ data: { id } }); toast.success("Viewer revoked"); await refresh(); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Unable to revoke viewer."); }
    finally { setBusy(false); }
  };
  return <section className="border-t border-border pt-6" aria-labelledby="viewers-heading">
    <h2 id="viewers-heading" className="text-xl font-semibold">Viewers</h2>
    <form onSubmit={add} className="mt-4 flex flex-wrap items-end gap-3">
      <label className="min-w-0 flex-1 space-y-1.5 text-sm"><span>Viewer name</span><input value={name} onChange={event => setName(event.target.value)} required maxLength={60} className="w-full rounded-lg border border-input bg-background/60 px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-ring" /></label>
      <Button type="submit" disabled={busy}><UserPlus />Add viewer</Button>
    </form>
    {newInvite && <div className="mt-4 rounded-lg border border-border bg-muted/60 p-4" role="status">
      <div className="flex items-center justify-between gap-2"><span className="font-semibold">Passkey for {newInvite.name}</span><Button variant="ghost" size="icon" aria-label="Dismiss passkey" title="Dismiss passkey" onClick={() => setNewInvite(null)}><X /></Button></div>
      <code className="mt-2 block break-all font-mono text-sm text-cyan">{newInvite.passkey}</code>
      <div className="mt-3 flex flex-wrap items-center gap-3"><Button variant="outline" size="sm" onClick={async () => { try { await navigator.clipboard.writeText(newInvite.passkey); toast.success("Passkey copied"); } catch { toast.error("Copy the passkey manually."); } }}><Copy />Copy</Button><span className="text-xs text-warning">Shown once. Share it now. No expiry; one use only.</span></div>
    </div>}
    {isPending && <p className="mt-4 text-sm text-muted-foreground">Loading viewers…</p>}
    {error && <p className="mt-4 text-sm text-danger">Unable to load viewers.</p>}
    {viewers?.length === 0 && <p className="mt-5 text-sm text-muted-foreground">No viewers yet.</p>}
    <div className="mt-5 divide-y divide-border">
      {viewers?.map(viewer => <div key={viewer.id} className="flex flex-wrap items-start justify-between gap-3 py-4">
        <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="break-words font-semibold">{viewer.name}</span>{viewer.revoked_at && <span className="text-xs font-semibold text-danger">Revoked</span>}</div><p className="mt-1 break-all text-sm text-muted-foreground">{viewer.email || "Not registered"}</p>
          <dl className="mt-3 grid gap-x-6 gap-y-2 text-xs sm:grid-cols-3"><div><dt className="text-muted-foreground">Passkey status</dt><dd className="mt-1 capitalize">{viewer.passkey_status}</dd></div><div><dt className="text-muted-foreground">Account created</dt><dd className="mt-1">{date(viewer.account_created_at)}</dd></div><div><dt className="text-muted-foreground">Last sign-in</dt><dd className="mt-1">{date(viewer.last_sign_in_at)}</dd></div></dl>
        </div><Button variant="outline" size="sm" disabled={busy} onClick={() => remove(viewer.id, viewer.name)}><UserX />{viewer.revoked_at ? "Retry revoke" : "Revoke"}</Button>
      </div>)}
    </div>
  </section>;
}