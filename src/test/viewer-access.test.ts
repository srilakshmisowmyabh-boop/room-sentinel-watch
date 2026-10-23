import { describe, expect, it } from "vitest";
import {
  checkLockout,
  EMAIL_FAIL_LIMIT,
  hashPasskey,
  IP_FAIL_LIMIT,
  LOCKOUT_WINDOW_MINUTES,
  ownerSignupSchema,
  viewerAccessSchema,
} from "@/lib/viewer-schemas";

describe("Viewer guessing protection", () => {
  it("locks after 5 failed attempts for one email", () => expect(checkLockout(EMAIL_FAIL_LIMIT, 0)).toBe(true));
  it("allows up to 4 failed attempts for one email", () => expect(checkLockout(EMAIL_FAIL_LIMIT - 1, 0)).toBe(false));
  it("locks after 20 failed attempts from one IP", () => expect(checkLockout(0, IP_FAIL_LIMIT)).toBe(true));
  it("allows up to 19 failed attempts from one IP", () => expect(checkLockout(0, IP_FAIL_LIMIT - 1)).toBe(false));
  it("uses a 10-minute lockout window", () => expect(LOCKOUT_WINDOW_MINUTES).toBe(10));
});

describe("Account forms", () => {
  it("requires a viewer passkey of at least 8 characters for the Owner sign-up", () => {
    expect(ownerSignupSchema.safeParse({ name: "Owner", email: "owner@example.com", password: "valid-password", viewerPasskey: "" }).success).toBe(false);
    expect(ownerSignupSchema.safeParse({ name: "Owner", email: "owner@example.com", password: "valid-password", viewerPasskey: "short" }).success).toBe(false);
    expect(ownerSignupSchema.safeParse({ name: "Owner", email: "owner@example.com", password: "valid-password", viewerPasskey: "long-enough" }).success).toBe(true);
  });
  it("requires name, email and passkey for viewer access — never a password", () => {
    expect(viewerAccessSchema.safeParse({ name: "Ada", email: "ada@example.com", passkey: "" }).success).toBe(false);
    expect(viewerAccessSchema.safeParse({ name: "Ada", email: "ada@example.com", passkey: "shared-key" }).success).toBe(true);
    expect("password" in viewerAccessSchema.shape).toBe(false);
  });
  it("hashes passkeys using SHA-256 rather than storing plaintext", async () =>
    expect(await hashPasskey("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"));
});
