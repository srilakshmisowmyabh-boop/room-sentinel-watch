import { describe, expect, it } from "vitest";
import { evaluatePersistence, normalizeConfidence, toState, type Reading } from "@/lib/detection";

const r = (state: Reading["state"], confidence: number, secAgo: number): Reading => ({ state, confidence, ts: 100_000 - secAgo * 1000 });

describe("presence threshold + persistence", () => {
  it("does not confirm a reading below the threshold", () => {
    expect(evaluatePersistence([r("PERSON_PRESENT", 59, 0), r("PERSON_PRESENT", 90, 5)], 60, 3).confirmed).toBe(false);
  });
  it("does not confirm presence held for less than the persistence window", () => {
    expect(evaluatePersistence([r("PERSON_PRESENT", 80, 0), r("PERSON_PRESENT", 80, 2)], 60, 3).confirmed).toBe(false);
  });
  it("confirms presence held at/above threshold for the persistence window", () => {
    expect(evaluatePersistence([r("PERSON_PRESENT", 80, 0), r("PERSON_PRESENT", 70, 1), r("PERSON_PRESENT", 65, 3)], 60, 3).confirmed).toBe(true);
  });
  it("a gap below threshold restarts the streak", () => {
    expect(evaluatePersistence([r("PERSON_PRESENT", 80, 0), r("NO_PERSON", 10, 1), r("PERSON_PRESENT", 90, 10)], 60, 3).confirmed).toBe(false);
  });
  it("maps confidence 0-1 to percent and boolean presence to state", () => {
    expect(normalizeConfidence(0.82)).toBe(82);
    expect(toState(true, 82, 60)).toBe("PERSON_PRESENT");
    expect(toState(true, 40, 60)).toBe("POSSIBLE_PERSON");
    expect(toState(false, 90, 60)).toBe("NO_PERSON");
  });
});
