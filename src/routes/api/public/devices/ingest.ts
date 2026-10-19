import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { evaluatePersistence, normalizeConfidence, toState, type PresenceState } from "@/lib/detection";

const Body = z.object({
  device_id: z.string().min(1).max(64),
  presence: z.union([z.boolean(), z.enum(["NO_PERSON", "POSSIBLE_PERSON", "PERSON_PRESENT"])]),
  confidence: z.number().min(0).max(100),
  rssi: z.number().int().min(-120).max(0).optional(),
  timestamp: z.union([z.number(), z.string()]).optional(),
  uptime: z.number().int().min(0).optional(),
});

async function sha256Hex(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
function parseTs(t: number | string | undefined): number {
  const now = Date.now();
  if (t === undefined) return now;
  const n = typeof t === "number" ? (t < 1e12 ? t * 1000 : t) : Date.parse(t);
  // Ignore unsynced clocks (ESP32 without NTP) or far-future values
  if (!Number.isFinite(n) || n < now - 7 * 864e5 || n > now + 60_000) return now;
  return n;
}
const json = (body: unknown, status = 200) => Response.json(body, { status });

export const Route = createFileRoute("/api/public/devices/ingest")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = request.headers.get("x-device-key") ?? request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
        if (!key) return json({ error: "Missing device key" }, 401);

        let parsed;
        try { parsed = Body.safeParse(await request.json()); } catch { return json({ error: "Invalid JSON" }, 400); }
        if (!parsed.success) return json({ error: "Invalid payload", details: parsed.error.flatten().fieldErrors }, 400);
        const p = parsed.data;

        const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
        const { data: keyRow } = await db.from("device_keys").select("key_hash").eq("device_id", p.device_id).maybeSingle();
        if (!keyRow || !safeEqual(keyRow.key_hash, await sha256Hex(key))) return json({ error: "Unauthorized" }, 401);

        const [{ data: device }, { data: settings }, { data: security }] = await Promise.all([
          db.from("devices").select("id, room").eq("id", p.device_id).single(),
          db.from("settings").select("threshold, persistence").eq("id", 1).single(),
          db.from("security_state").select("mode").eq("id", 1).single(),
        ]);
        if (!device || !settings || !security) return json({ error: "Not configured" }, 500);

        const confidence = normalizeConfidence(p.confidence);
        const state: PresenceState = toState(p.presence, confidence, settings.threshold);
        const ts = parseTs(p.timestamp);
        const iso = new Date(ts).toISOString();

        const { error: insErr } = await db.from("presence_events").insert({
          device_id: device.id, room: device.room, state, confidence, signal_strength: p.rssi ?? null, ts: iso,
        });
        if (insErr) return json({ error: "Could not save event" }, 500);

        await db.from("devices").update({
          status: "online", last_seen: new Date().toISOString(),
          ...(p.rssi !== undefined ? { signal_strength: p.rssi } : {}),
          ...(p.uptime !== undefined ? { uptime_seconds: p.uptime } : {}),
        }).eq("id", device.id);

        // Threshold + persistence check over this device's recent readings
        const windowStart = new Date(ts - (settings.persistence + 120) * 1000).toISOString();
        const { data: recent } = await db.from("presence_events").select("state, confidence, ts")
          .eq("device_id", device.id).gte("ts", windowStart).lte("ts", iso).order("ts", { ascending: false }).limit(500);
        const result = evaluatePersistence(
          (recent ?? []).map((r) => ({ state: r.state as PresenceState, confidence: Number(r.confidence), ts: Date.parse(r.ts) })),
          settings.threshold, settings.persistence,
        );

        let alertCreated = false;
        if (result.confirmed && security.mode === "Armed" && result.streakStart !== null) {
          const { count } = await db.from("alerts").select("id", { count: "exact", head: true })
            .eq("device_id", device.id).eq("kind", "intrusion").eq("acknowledged", false)
            .gte("created_at", new Date(result.streakStart - 5000).toISOString());
          if (!count) {
            await db.from("alerts").insert({
              device_id: device.id, room: device.room, kind: "intrusion", confidence,
              message: `Intrusion in ${device.room} while Armed (${confidence}% confidence, ${device.id})`,
            });
            alertCreated = true;
          }
        }

        return json({ ok: true, state, confidence, confirmed: result.confirmed, mode: security.mode, alert_created: alertCreated });
      },
    },
  },
});
