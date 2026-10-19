import { useEffect, useState } from "react";
import { Copy, KeyRound, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useGuard } from "@/lib/demo-store";

const input = "w-full rounded-lg border border-input bg-background/60 px-3 py-2 text-sm outline-none focus:border-ring";

export function DevicesPanel() {
  const { devices = [] } = useGuard();
  return (
    <div className="glass p-5">
      <h2 className="font-semibold">Devices</h2>
      <p className="mt-1 text-sm text-muted-foreground">Rename nodes, set their room and create the API key each ESP32 uses to send readings. A key is shown once — creating a new one replaces the old one.</p>
      <div className="mt-4 space-y-3">
        {devices.map((d) => <DeviceRow key={d.id} id={d.id} name={d.name} room={d.room} />)}
      </div>
    </div>
  );
}

function DeviceRow({ id, name: n0, room: r0 }: { id: string; name: string; room: string }) {
  const [name, setName] = useState(n0);
  const [room, setRoom] = useState(r0);
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [newKey, setNewKey] = useState<string | null>(null);
  useEffect(() => { setName(n0); setRoom(r0); }, [n0, r0]);
  useEffect(() => { supabase.rpc("device_has_key", { _device_id: id }).then(({ data }) => setHasKey(!!data)); }, [id, newKey]);

  const save = async () => {
    if (!name.trim() || !room.trim()) { toast.error("Name and room are required"); return; }
    const { data, error } = await supabase.from("devices").update({ name: name.trim().slice(0, 40), room: room.trim().slice(0, 40) }).eq("id", id).select();
    if (error || !data?.length) { toast.error("Only the Owner can change devices."); return; }
    toast.success(`${id} saved`);
  };
  const rotate = async () => {
    if (hasKey && !confirm(`Replace the API key for ${id}? The old key stops working immediately.`)) return;
    const { data, error } = await supabase.rpc("rotate_device_key", { _device_id: id });
    if (error || !data) { toast.error("Only the Owner can manage device keys."); return; }
    setNewKey(data);
  };

  return (
    <div className="rounded-xl border border-border p-4">
      <div className="grid gap-3 md:grid-cols-[110px_1fr_1fr_auto_auto] md:items-center">
        <span className="font-mono text-sm text-cyan">{id}</span>
        <input className={input} value={name} onChange={(e) => setName(e.target.value)} aria-label={`${id} name`} />
        <input className={input} value={room} onChange={(e) => setRoom(e.target.value)} aria-label={`${id} room`} />
        <button onClick={save} className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-accent"><Save className="h-4 w-4" />Save</button>
        <button onClick={rotate} className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-accent"><KeyRound className="h-4 w-4" />{hasKey ? "New key" : "Create key"}</button>
      </div>
      {newKey && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-muted/60 p-3">
          <code className="break-all font-mono text-xs">{newKey}</code>
          <button onClick={() => { navigator.clipboard.writeText(newKey); toast.success("Key copied"); }} className="inline-flex items-center gap-1 text-xs text-cyan hover:underline"><Copy className="h-3 w-3" />Copy</button>
          <span className="w-full text-xs text-warning">Copy this now — it won't be shown again.</span>
        </div>
      )}
    </div>
  );
}
