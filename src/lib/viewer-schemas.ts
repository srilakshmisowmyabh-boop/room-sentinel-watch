import { z } from "zod";

export const viewerNameSchema = z.string().trim().min(1, "Name is required.").max(60, "Name must be 60 characters or fewer.");
export const emailSchema = z.string().trim().email("Enter a valid email address.").max(255);
export const passwordSchema = z.string().min(8, "Password must be at least 8 characters.").max(128);
export const viewerPasskeySchema = z.string().trim().min(8, "Passkey must be at least 8 characters.").max(128);

export const ownerSignupSchema = z.object({
  name: viewerNameSchema,
  email: emailSchema,
  password: passwordSchema,
  viewerPasskey: viewerPasskeySchema,
});
export const viewerAccessSchema = z.object({
  name: viewerNameSchema,
  email: emailSchema,
  passkey: z.string().trim().min(1, "Enter the viewer passkey.").max(128),
});

// Guessing protection: lock after 5 failed attempts per email or 20 per IP
// within a 10-minute window; the lockout lasts for the remainder of the window.
export const EMAIL_FAIL_LIMIT = 5;
export const IP_FAIL_LIMIT = 20;
export const LOCKOUT_WINDOW_MINUTES = 10;
export const LOCKOUT_MESSAGE = "Too many failed attempts. Please try again in 10 minutes.";
export function checkLockout(emailFails: number, ipFails: number): boolean {
  return emailFails >= EMAIL_FAIL_LIMIT || ipFails >= IP_FAIL_LIMIT;
}

export async function hashPasskey(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

// Keys for attempt counters are salted hashes so raw emails/IPs are never stored.
export async function attemptKeyHash(value: string): Promise<string> {
  const secret = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.VIEWER_CREDENTIAL_SECRET ?? "sense-guard";
  return hashPasskey(`${secret}:${value}`);
}
