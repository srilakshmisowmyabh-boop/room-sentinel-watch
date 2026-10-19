import { z } from "zod";

export const viewerNameSchema = z.string().trim().min(1, "Name is required.").max(60, "Name must be 60 characters or fewer.");
export const signupSchema = z.object({
  name: viewerNameSchema,
  email: z.string().trim().email("Enter a valid email address.").max(255),
  password: z.string().min(8, "Password must be at least 8 characters.").max(128),
  passkey: z.string().trim().max(128),
});
export const createInviteSchema = z.object({ name: viewerNameSchema });
export const revokeViewerSchema = z.object({ id: z.string().uuid() });
export function invitationError(invite: { name: string; used_at: string | null; revoked_at: string | null } | null, name: string): string | null {
  if (!invite || invite.used_at || invite.revoked_at) return "Passkey is invalid, already used, or revoked.";
  if (invite.name.trim().toLowerCase() !== name.trim().toLowerCase()) return "Name must match the name on your viewer invitation.";
  return null;
}
export async function hashPasskey(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}