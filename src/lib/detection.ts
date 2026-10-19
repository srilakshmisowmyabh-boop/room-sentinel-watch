/**
 * Pure presence-detection rules shared by the ESP32 ingest endpoint and tests.
 * An alert is only raised when presence stays at/above the confidence threshold
 * for at least `persistence` seconds of consecutive readings while Armed.
 */
export type PresenceState = "NO_PERSON" | "POSSIBLE_PERSON" | "PERSON_PRESENT";

export interface Reading { state: PresenceState; confidence: number; ts: number }

/** Accept 0–1 or 0–100 confidence and return 0–100. */
export function normalizeConfidence(raw: number): number {
  const v = raw <= 1 ? raw * 100 : raw;
  return Math.max(0, Math.min(100, Math.round(v * 100) / 100));
}

/** Turn the device's presence field (boolean or state string) into a state. */
export function toState(presence: boolean | PresenceState, confidence: number, threshold: number): PresenceState {
  if (typeof presence === "string") return presence;
  if (!presence) return "NO_PERSON";
  return confidence >= threshold ? "PERSON_PRESENT" : "POSSIBLE_PERSON";
}

export function qualifies(r: Reading, threshold: number) {
  return r.state !== "NO_PERSON" && r.confidence >= threshold;
}

/**
 * readings: newest first, including the reading just received.
 * Returns whether presence is confirmed and when the qualifying streak began.
 */
export function evaluatePersistence(readings: Reading[], threshold: number, persistenceSec: number) {
  const newest = readings[0];
  if (!newest || !qualifies(newest, threshold)) return { confirmed: false, streakStart: null as number | null };
  let streakStart = newest.ts;
  for (const r of readings) {
    if (!qualifies(r, threshold)) break;
    streakStart = r.ts;
  }
  return { confirmed: newest.ts - streakStart >= persistenceSec * 1000, streakStart };
}
