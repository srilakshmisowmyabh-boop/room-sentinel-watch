import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createInviteSchema, hashPasskey, invitationError, revokeViewerSchema, signupSchema } from "./viewer-schemas";

// Signup is deliberately public; the permanent bootstrap flag or a valid invite
// authorizes account creation. The auth trigger consumes the invite atomically.
export const signupAvailability = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.from("signup_state").select("owner_claimed").eq("id", 1).single();
  if (error) throw new Error("Unable to check account registration.");
  return { firstOwner: !data.owner_claimed };
});

export const registerAccount = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => signupSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: state, error: stateError } = await supabaseAdmin.from("signup_state").select("owner_claimed").eq("id", 1).single();
    if (stateError) return { ok: false, message: "Account registration is temporarily unavailable." };
    const hash = await hashPasskey(data.passkey);
    if (state.owner_claimed) {
      const { data: invite, error } = await supabaseAdmin.from("viewer_invites").select("name,used_at,revoked_at").eq("key_hash", hash).maybeSingle();
      const message = invitationError(error ? null : invite, data.name);
      if (message) return { ok: false, message };
    }
    const { error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email, password: data.password, email_confirm: true,
      user_metadata: { display_name: data.name },
      app_metadata: { invite_hash: hash },
    });
    if (error) {
      // A competing signup can consume the same key between validation and createUser.
      if (state.owner_claimed) {
        const { data: invite } = await supabaseAdmin.from("viewer_invites").select("name,used_at,revoked_at").eq("key_hash", hash).maybeSingle();
        const message = invitationError(invite, data.name);
        if (message) return { ok: false, message };
      }
      return { ok: false, message: "Unable to create account. This email may already be registered; try signing in." };
    }
    return { ok: true, message: "Account created. Sign in with your email and password." };
  });

export const listViewers = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data, error } = await context.supabase.rpc("list_viewers");
  if (error) throw new Error("Only the Owner can access the Viewers list.");
  return data;
});

export const createViewerInvite = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => createInviteSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: owner, error: roleError } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "owner" });
    if (roleError || !owner) throw new Error("Only the Owner can add viewers.");
    const bytes = crypto.getRandomValues(new Uint8Array(24));
    const passkey = Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
    const { error } = await context.supabase.from("viewer_invites").insert({ name: data.name, key_hash: await hashPasskey(passkey), created_by: context.userId });
    if (error) throw new Error("Unable to create the viewer invitation.");
    return { name: data.name, passkey };
  });

export const revokeViewer = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => revokeViewerSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: target, error } = await context.supabase.rpc("revoke_viewer", { _id: data.id });
    if (error) throw new Error("Only the Owner can revoke viewers.");
    if (target) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(target, { ban_duration: "876000h" });
      if (banError) throw new Error("Viewer access is blocked, but sign-in blocking could not finish. Please retry Revoke.");
    }
    return { ok: true };
  });