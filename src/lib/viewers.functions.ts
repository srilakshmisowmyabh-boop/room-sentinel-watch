import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import {
  attemptKeyHash,
  checkLockout,
  hashPasskey,
  LOCKOUT_MESSAGE,
  LOCKOUT_WINDOW_MINUTES,
  ownerSignupSchema,
  viewerAccessSchema,
  viewerPasskeySchema,
} from "./viewer-schemas";

// Signup availability is public: it only reveals whether the Owner slot is taken.
export const signupAvailability = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.from("signup_state").select("owner_claimed").eq("id", 1).single();
  if (error) throw new Error("Unable to check account registration.");
  return { firstOwner: !data.owner_claimed };
});

// The very first sign-up creates the Owner and sets the shared viewer passkey.
// After that, account creation is closed — viewers sign in with the passkey.
export const registerOwner = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => ownerSignupSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: state, error: stateError } = await supabaseAdmin.from("signup_state").select("owner_claimed").eq("id", 1).single();
    if (stateError) return { ok: false as const, message: "Account registration is temporarily unavailable." };
    if (state.owner_claimed) return { ok: false as const, message: "Account creation is closed. An Owner already exists." };
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { display_name: data.name },
      app_metadata: { viewer_passkey_hash: await hashPasskey(data.viewerPasskey) },
    });
    if (error || !created.user) return { ok: false as const, message: "Unable to create account. This email may already be registered; try signing in." };
    await supabaseAdmin.rpc("write_activity", {
      _actor: created.user.id, _action: "owner_registered", _old: null,
      _new: { name: data.name, email: data.email }, _name: data.name, _email: data.email, _role: "owner",
    });
    return { ok: true as const, message: "Owner account created. Sign in with your email and password." };
  });

// Viewer access: name + email + shared passkey, no password. Validates the
// passkey hash server-side, enforces the guessing lockout, finds or creates the
// viewer account and returns a one-time sign-in token for the browser.
export const viewerAccess = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => viewerAccessSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = data.email.toLowerCase();
    const req = getRequest();
    const ip = (req.headers.get("x-forwarded-for")?.split(",")[0] ?? req.headers.get("cf-connecting-ip") ?? "unknown").trim();
    const [emailKey, ipKey] = await Promise.all([attemptKeyHash(`email:${email}`), attemptKeyHash(`ip:${ip}`)]);
    const since = new Date(Date.now() - LOCKOUT_WINDOW_MINUTES * 60_000).toISOString();
    const attempts = (scope: string, key: string) =>
      supabaseAdmin.from("auth_attempts").select("id", { count: "exact", head: true }).eq("scope", scope).eq("key_hash", key).gte("created_at", since);
    const [{ count: emailFails }, { count: ipFails }] = await Promise.all([attempts("email", emailKey), attempts("ip", ipKey)]);
    if (checkLockout(emailFails ?? 0, ipFails ?? 0)) return { ok: false as const, message: LOCKOUT_MESSAGE };

    const fail = async (message: string, logAttempt: boolean) => {
      if (logAttempt) {
        await supabaseAdmin.from("auth_attempts").insert([{ scope: "email", key_hash: emailKey }, { scope: "ip", key_hash: ipKey }]);
        await supabaseAdmin.rpc("write_activity", {
          _actor: null, _action: "viewer_signin_failed", _old: null,
          _new: { name: data.name, email, reason: message }, _name: data.name, _email: email, _role: "viewer",
        });
      }
      return { ok: false as const, message };
    };

    const { data: access } = await supabaseAdmin.from("viewer_access").select("passkey_hash").eq("id", 1).maybeSingle();
    if (!access) return { ok: false as const, message: "Viewer access is not set up yet. Ask the Owner to set a viewer passkey." };
    if (access.passkey_hash !== await hashPasskey(data.passkey)) return fail("Incorrect passkey.", true);

    const { data: found } = await supabaseAdmin.rpc("auth_user_by_email", { _email: email });
    const existing = found?.[0];
    if (existing?.is_owner) return fail("This email belongs to the Owner. Please use Sign in.", true);

    let userId = existing?.id as string | undefined;
    if (!userId) {
      const password = Array.from(crypto.getRandomValues(new Uint8Array(24)), (b) => b.toString(16).padStart(2, "0")).join("");
      const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
        email, password, email_confirm: true,
        user_metadata: { display_name: data.name },
        app_metadata: { viewer_access: "true" },
      });
      if (error || !created.user) return { ok: false as const, message: "Unable to sign you in. Please try again." };
      userId = created.user.id;
    }

    const { data: account } = await supabaseAdmin.from("viewer_accounts").select("blocked_at").eq("user_id", userId).maybeSingle();
    if (account?.blocked_at) return fail("This viewer has been blocked by the Owner.", false);

    const now = new Date().toISOString();
    const { error: upsertError } = await supabaseAdmin.from("viewer_accounts").upsert(
      { user_id: userId, name: data.name, email, last_sign_in_at: now, ...(account ? {} : { first_sign_in_at: now }) },
      { onConflict: "user_id" },
    );
    if (upsertError) return { ok: false as const, message: "Unable to sign you in. Please try again." };

    const { data: link, error: linkError } = await supabaseAdmin.auth.admin.generateLink({ type: "magiclink", email });
    const tokenHash = link?.properties?.hashed_token;
    if (linkError || !tokenHash) return { ok: false as const, message: "Unable to start your session. Please try again." };

    await supabaseAdmin.rpc("write_activity", {
      _actor: userId, _action: "viewer_signin", _old: null,
      _new: { name: data.name, email }, _name: data.name, _email: email, _role: "viewer",
    });
    return { ok: true as const, tokenHash, email };
  });

// Called right after the browser completes the viewer sign-in: binds this
// session to the viewer account so older sessions lose database access.
export const claimViewerSession = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const sessionId = context.claims["session_id"];
  if (typeof sessionId !== "string" || !sessionId) throw new Error("No session found.");
  const { data: isViewer } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "viewer" });
  if (!isViewer) return { ok: true };
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.from("viewer_accounts").update({ current_session_id: sessionId }).eq("user_id", context.userId);
  return { ok: true };
});

export const recordOwnerSignIn = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data: isOwner } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "owner" });
  if (!isOwner) return { ok: true };
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.rpc("write_activity", { _actor: context.userId, _action: "owner_signin", _old: null, _new: null });
  return { ok: true };
});

async function requireOwner(supabase: { rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }> }, userId: string) {
  const { data: owner, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "owner" });
  if (error || !owner) throw new Error("Only the Owner can do this.");
}

export const listViewers = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  await requireOwner(context.supabase, context.userId);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("viewer_accounts")
    .select("user_id,name,email,first_sign_in_at,last_sign_in_at,blocked_at")
    .order("first_sign_in_at", { ascending: true });
  if (error) throw new Error("Unable to load viewers.");
  return data;
});

export const setViewerBlocked = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ userId: z.string().uuid(), blocked: z.boolean() }).parse(input))
  .handler(async ({ data, context }) => {
    await requireOwner(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: viewer, error } = await supabaseAdmin
      .from("viewer_accounts")
      .update({ blocked_at: data.blocked ? new Date().toISOString() : null, ...(data.blocked ? { current_session_id: null } : {}) })
      .eq("user_id", data.userId)
      .select("name,email")
      .single();
    if (error) throw new Error("Unable to update the viewer.");
    await supabaseAdmin.rpc("write_activity", {
      _actor: context.userId, _action: data.blocked ? "viewer_blocked" : "viewer_unblocked",
      _old: { blocked: !data.blocked }, _new: { blocked: data.blocked, viewer: viewer.name, email: viewer.email },
    });
    return { ok: true };
  });

export const setViewerPasskey = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ passkey: viewerPasskeySchema }).parse(input))
  .handler(async ({ data, context }) => {
    await requireOwner(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("viewer_access")
      .upsert({ id: 1, passkey_hash: await hashPasskey(data.passkey), updated_at: new Date().toISOString() });
    if (error) throw new Error("Unable to save the viewer passkey.");
    // Signing out every viewer: without a bound session their database access ends.
    await supabaseAdmin.from("viewer_accounts").update({ current_session_id: null }).not("current_session_id", "is", null);
    await supabaseAdmin.rpc("write_activity", {
      _actor: context.userId, _action: "viewer_passkey_changed", _old: null, _new: { viewers_signed_out: true },
    });
    return { ok: true };
  });

export const listActivity = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  await requireOwner(context.supabase, context.userId);
  const { data, error } = await context.supabase.from("activity_log").select("*").order("created_at", { ascending: false }).limit(500);
  if (error) throw new Error("Only the Owner can read the activity log.");
  return data;
});
