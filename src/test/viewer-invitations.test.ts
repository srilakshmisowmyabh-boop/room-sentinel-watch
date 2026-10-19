import { describe, expect, it } from "vitest";
import { hashPasskey, invitationError, signupSchema } from "@/lib/viewer-schemas";

describe("Viewer invitation rules", () => {
  it("refuses an invalid passkey", () => expect(invitationError(null, "Alice")).toBe("Passkey is invalid, already used, or revoked."));
  it("refuses reuse", () => expect(invitationError({ name: "Alice", used_at: "2026-10-19T11:00:00Z", revoked_at: null }, "Alice")).toBe("Passkey is invalid, already used, or revoked."));
  it("refuses a revoked invitation", () => expect(invitationError({ name: "Alice", used_at: null, revoked_at: "2026-10-19T11:00:00Z" }, "Alice")).toBe("Passkey is invalid, already used, or revoked."));
  it("requires the invited name", () => expect(invitationError({ name: "Alice", used_at: null, revoked_at: null }, "Bob")).toBe("Name must match the name on your viewer invitation."));
  it("does not expire unused invitations", () => expect(invitationError({ name: "Alice", used_at: null, revoked_at: null }, "Alice")).toBeNull());
  it("allows bootstrap signup without a passkey", () => expect(signupSchema.safeParse({ name: "Owner", email: "owner@example.com", password: "valid-password", passkey: "" }).success).toBe(true));
  it("hashes keys using SHA-256 rather than storing plaintext", async () => expect(await hashPasskey("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"));
});