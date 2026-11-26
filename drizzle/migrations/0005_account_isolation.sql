CREATE TABLE public.accounts (
  account_id text PRIMARY KEY CHECK (account_id ~ '^SG-[0-9]{5}$'),
  owner_user_id uuid UNIQUE,
  viewer_password_hash text CHECK (viewer_password_hash IS NULL OR viewer_password_hash ~ '^[a-f0-9]{64}$'),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.accounts TO service_role;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.pending_viewer_logins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id text NOT NULL REFERENCES public.accounts(account_id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  display_name text NOT NULL CHECK (char_length(trim(display_name)) BETWEEN 1 AND 60),
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.pending_viewer_logins TO service_role;
ALTER TABLE public.pending_viewer_logins ENABLE ROW LEVEL SECURITY;
CREATE INDEX pending_viewer_logins_user_expiry ON public.pending_viewer_logins(user_id, expires_at DESC);
CREATE UNIQUE INDEX pending_viewer_logins_one_open_per_user ON public.pending_viewer_logins(user_id) WHERE consumed_at IS NULL;

ALTER TABLE public.user_roles ADD COLUMN account_id text;
ALTER TABLE public.profiles ADD COLUMN account_id text;
ALTER TABLE public.profiles ADD COLUMN email text;
ALTER TABLE public.viewer_accounts ADD COLUMN account_id text;
ALTER TABLE public.activity_log ADD COLUMN account_id text;
ALTER TABLE public.devices ADD COLUMN account_id text;
ALTER TABLE public.presence_events ADD COLUMN account_id text;
ALTER TABLE public.alerts ADD COLUMN account_id text;
ALTER TABLE public.security_state ADD COLUMN account_id text;
ALTER TABLE public.settings ADD COLUMN account_id text;

INSERT INTO public.accounts(account_id, owner_user_id, viewer_password_hash)
VALUES (
  'SG-00001',
  (SELECT user_id FROM public.user_roles WHERE role = 'owner' AND revoked_at IS NULL ORDER BY user_id LIMIT 1),
  (SELECT passkey_hash FROM public.viewer_access WHERE id = 1)
)
ON CONFLICT (account_id) DO NOTHING;

UPDATE public.user_roles SET account_id = 'SG-00001' WHERE account_id IS NULL;
UPDATE public.profiles p
SET account_id = COALESCE((SELECT r.account_id FROM public.user_roles r WHERE r.user_id = p.id AND r.revoked_at IS NULL LIMIT 1), 'SG-00001');
UPDATE public.profiles p SET email = u.email FROM auth.users u WHERE u.id = p.id AND p.email IS NULL;
UPDATE public.viewer_accounts SET account_id = 'SG-00001' WHERE account_id IS NULL;
UPDATE public.activity_log SET account_id = 'SG-00001' WHERE account_id IS NULL;
UPDATE public.devices SET account_id = 'SG-00001' WHERE account_id IS NULL;
UPDATE public.presence_events SET account_id = COALESCE((SELECT d.account_id FROM public.devices d WHERE d.id = public.presence_events.device_id), 'SG-00001') WHERE account_id IS NULL;
UPDATE public.alerts SET account_id = COALESCE((SELECT d.account_id FROM public.devices d WHERE d.id = public.alerts.device_id), 'SG-00001') WHERE account_id IS NULL;
UPDATE public.security_state SET account_id = 'SG-00001' WHERE account_id IS NULL;
UPDATE public.settings SET account_id = 'SG-00001' WHERE account_id IS NULL;

ALTER TABLE public.user_roles ALTER COLUMN account_id SET NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN account_id SET NOT NULL;
ALTER TABLE public.viewer_accounts ALTER COLUMN account_id SET NOT NULL;
ALTER TABLE public.devices ALTER COLUMN account_id SET NOT NULL;
ALTER TABLE public.presence_events ALTER COLUMN account_id SET NOT NULL;
ALTER TABLE public.alerts ALTER COLUMN account_id SET NOT NULL;
ALTER TABLE public.security_state ALTER COLUMN account_id SET NOT NULL;
ALTER TABLE public.settings ALTER COLUMN account_id SET NOT NULL;

ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(account_id) ON DELETE CASCADE;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(account_id) ON DELETE CASCADE;
ALTER TABLE public.viewer_accounts ADD CONSTRAINT viewer_accounts_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(account_id) ON DELETE CASCADE;
ALTER TABLE public.activity_log ADD CONSTRAINT activity_log_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(account_id) ON DELETE CASCADE;
ALTER TABLE public.devices ADD CONSTRAINT devices_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(account_id) ON DELETE CASCADE;
ALTER TABLE public.presence_events ADD CONSTRAINT presence_events_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(account_id) ON DELETE CASCADE;
ALTER TABLE public.alerts ADD CONSTRAINT alerts_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(account_id) ON DELETE CASCADE;
ALTER TABLE public.security_state ADD CONSTRAINT security_state_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(account_id) ON DELETE CASCADE;
ALTER TABLE public.settings ADD CONSTRAINT settings_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(account_id) ON DELETE CASCADE;

CREATE UNIQUE INDEX settings_one_per_account ON public.settings(account_id);
CREATE UNIQUE INDEX security_state_one_per_account ON public.security_state(account_id);
CREATE INDEX devices_account_id_idx ON public.devices(account_id);
CREATE INDEX events_account_time_idx ON public.presence_events(account_id, ts DESC);
CREATE INDEX alerts_account_time_idx ON public.alerts(account_id, created_at DESC);
CREATE INDEX activity_account_time_idx ON public.activity_log(account_id, created_at DESC);
CREATE UNIQUE INDEX profiles_email_unique ON public.profiles(lower(email)) WHERE email IS NOT NULL;

CREATE SEQUENCE public.settings_id_seq START WITH 2;
CREATE SEQUENCE public.security_state_id_seq START WITH 2;
ALTER TABLE public.settings ALTER COLUMN id SET DEFAULT nextval('public.settings_id_seq');
ALTER TABLE public.security_state ALTER COLUMN id SET DEFAULT nextval('public.security_state_id_seq');
GRANT USAGE, SELECT ON SEQUENCE public.settings_id_seq, public.security_state_id_seq TO service_role;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.user_roles r
    WHERE r.user_id = _user_id AND r.role = _role AND r.revoked_at IS NULL
  )
$$;

CREATE OR REPLACE FUNCTION public.current_account_id()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.account_id
  FROM public.user_roles r
  LEFT JOIN public.viewer_accounts v ON v.user_id = r.user_id AND v.account_id = r.account_id
  WHERE r.user_id = auth.uid() AND r.revoked_at IS NULL
    AND (
      r.role = 'owner'::public.app_role
      OR (r.role = 'viewer'::public.app_role AND v.blocked_at IS NULL
          AND v.current_session_id IS NOT NULL
          AND v.current_session_id::text = coalesce(auth.jwt()->>'session_id', ''))
    )
  ORDER BY CASE WHEN r.role = 'owner'::public.app_role THEN 0 ELSE 1 END
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.is_member(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.user_roles r
    LEFT JOIN public.viewer_accounts v ON v.user_id = r.user_id AND v.account_id = r.account_id
    WHERE r.user_id = _user_id AND r.revoked_at IS NULL
      AND (r.role = 'owner'::public.app_role
        OR (r.role = 'viewer'::public.app_role AND v.blocked_at IS NULL
          AND v.current_session_id IS NOT NULL
          AND v.current_session_id::text = coalesce(auth.jwt()->>'session_id', '')))
  )
$$;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role), public.is_member(uuid), public.current_account_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role), public.is_member(uuid), public.current_account_id() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.write_activity(_actor uuid, _action text, _old jsonb, _new jsonb, _name text DEFAULT NULL, _email text DEFAULT NULL, _role text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE actor_account text; actor_role text;
BEGIN
  SELECT r.account_id, r.role::text INTO actor_account, actor_role
  FROM public.user_roles r WHERE r.user_id = _actor AND r.revoked_at IS NULL LIMIT 1;
  INSERT INTO public.activity_log(account_id, actor_id, actor_name, actor_email, role, action, old_value, new_value)
  VALUES (
    coalesce(actor_account, _new->>'account_id'),
    _actor,
    coalesce(_name, (SELECT p.display_name FROM public.profiles p WHERE p.id = _actor), ''),
    coalesce(_email, (SELECT u.email::text FROM auth.users u WHERE u.id = _actor), ''),
    coalesce(_role, actor_role, 'unknown'),
    _action, _old, _new
  );
END $$;
REVOKE ALL ON FUNCTION public.write_activity(uuid, text, jsonb, jsonb, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.write_activity(uuid, text, jsonb, jsonb, text, text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE tenant_id text; tenant_role text; entered_name text;
BEGIN
  tenant_id := new.raw_app_meta_data->>'account_id';
  tenant_role := new.raw_app_meta_data->>'account_role';
  entered_name := trim(coalesce(new.raw_user_meta_data->>'display_name', ''));
  IF tenant_id !~ '^SG-[0-9]{5}$' OR char_length(entered_name) NOT BETWEEN 1 AND 60 THEN
    RAISE EXCEPTION 'Invalid account registration.';
  END IF;
  IF tenant_role = 'owner' THEN
    UPDATE public.accounts SET owner_user_id = new.id
    WHERE account_id = tenant_id AND owner_user_id IS NULL;
    IF NOT FOUND THEN RAISE EXCEPTION 'Owner account is already initialized.'; END IF;
  ELSIF tenant_role = 'viewer' THEN
    IF NOT EXISTS (SELECT 1 FROM public.accounts WHERE account_id = tenant_id AND viewer_password_hash IS NOT NULL) THEN
      RAISE EXCEPTION 'Viewer account is not available.';
    END IF;
  ELSE
    RAISE EXCEPTION 'Invalid account role.';
  END IF;
  INSERT INTO public.user_roles(user_id, account_id, role) VALUES (new.id, tenant_id, tenant_role::public.app_role);
  INSERT INTO public.profiles(id, display_name, email, account_id)
  VALUES (new.id, entered_name, new.email, tenant_id);
  IF tenant_role = 'viewer' THEN
    INSERT INTO public.viewer_accounts(user_id, account_id, name, email)
    VALUES (new.id, tenant_id, entered_name, new.email);
  END IF;
  RETURN new;
END $$;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.device_has_key(_device_id text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_member(auth.uid()) AND EXISTS (
    SELECT 1 FROM public.devices d JOIN public.device_keys k ON k.device_id = d.id
    WHERE d.id = _device_id AND d.account_id = public.current_account_id()
  )
$$;
REVOKE ALL ON FUNCTION public.device_has_key(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.device_has_key(text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.rotate_device_key(_device_id text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE _key text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'owner'::public.app_role) THEN RAISE EXCEPTION 'Only owners can manage device keys'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.devices WHERE id = _device_id AND account_id = public.current_account_id()) THEN RAISE EXCEPTION 'Unknown device'; END IF;
  _key := 'sg_' || encode(extensions.gen_random_bytes(24), 'hex');
  INSERT INTO public.device_keys(device_id, key_hash)
  VALUES (_device_id, encode(extensions.digest(_key, 'sha256'), 'hex'))
  ON CONFLICT (device_id) DO UPDATE SET key_hash = excluded.key_hash, created_at = now();
  RETURN _key;
END $$;
REVOKE ALL ON FUNCTION public.rotate_device_key(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rotate_device_key(text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.auth_user_by_email(_email text)
RETURNS TABLE(id uuid, is_owner boolean) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT u.id, EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = u.id AND r.role = 'owner'::public.app_role AND r.revoked_at IS NULL)
  FROM auth.users u WHERE lower(u.email) = lower(trim(_email)) LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.auth_user_by_email(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.auth_user_by_email(text) TO service_role;

DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Members read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users read own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Members read events" ON public.presence_events;
DROP POLICY IF EXISTS "Owners change security" ON public.security_state;
DROP POLICY IF EXISTS "Members read security" ON public.security_state;
DROP POLICY IF EXISTS "Owners acknowledge alerts" ON public.alerts;
DROP POLICY IF EXISTS "Members read alerts" ON public.alerts;
DROP POLICY IF EXISTS "Owners change settings" ON public.settings;
DROP POLICY IF EXISTS "Members read settings" ON public.settings;
DROP POLICY IF EXISTS "Owner reads viewers" ON public.viewer_accounts;
DROP POLICY IF EXISTS "Owner reads activity" ON public.activity_log;
DROP POLICY IF EXISTS "Owners update devices" ON public.devices;
DROP POLICY IF EXISTS "Members read devices" ON public.devices;
DROP POLICY IF EXISTS "Owner reads invitations" ON public.viewer_invites;
DROP POLICY IF EXISTS "Owner creates invitations" ON public.viewer_invites;

CREATE POLICY "Account members read profiles" ON public.profiles FOR SELECT TO authenticated
USING (account_id = public.current_account_id() AND (id = auth.uid() OR public.has_role(auth.uid(), 'owner'::public.app_role)));
CREATE POLICY "Users update own display name" ON public.profiles FOR UPDATE TO authenticated
USING (id = auth.uid() AND account_id = public.current_account_id())
WITH CHECK (id = auth.uid() AND account_id = public.current_account_id());
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT UPDATE(display_name) ON public.profiles TO authenticated;

CREATE POLICY "Account members read own roles" ON public.user_roles FOR SELECT TO authenticated
USING (user_id = auth.uid() OR (account_id = public.current_account_id() AND public.has_role(auth.uid(), 'owner'::public.app_role)));
CREATE POLICY "Account members read devices" ON public.devices FOR SELECT TO authenticated
USING (public.is_member(auth.uid()) AND account_id = public.current_account_id());
CREATE POLICY "Account owners update devices" ON public.devices FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'owner'::public.app_role) AND account_id = public.current_account_id())
WITH CHECK (public.has_role(auth.uid(), 'owner'::public.app_role) AND account_id = public.current_account_id());
CREATE POLICY "Account members read events" ON public.presence_events FOR SELECT TO authenticated
USING (public.is_member(auth.uid()) AND account_id = public.current_account_id());
CREATE POLICY "Account members read alerts" ON public.alerts FOR SELECT TO authenticated
USING (public.is_member(auth.uid()) AND account_id = public.current_account_id());
CREATE POLICY "Account owners acknowledge alerts" ON public.alerts FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'owner'::public.app_role) AND account_id = public.current_account_id())
WITH CHECK (public.has_role(auth.uid(), 'owner'::public.app_role) AND account_id = public.current_account_id());
CREATE POLICY "Account members read security" ON public.security_state FOR SELECT TO authenticated
USING (public.is_member(auth.uid()) AND account_id = public.current_account_id());
CREATE POLICY "Account owners change security" ON public.security_state FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'owner'::public.app_role) AND account_id = public.current_account_id())
WITH CHECK (public.has_role(auth.uid(), 'owner'::public.app_role) AND account_id = public.current_account_id());
CREATE POLICY "Account members read settings" ON public.settings FOR SELECT TO authenticated
USING (public.is_member(auth.uid()) AND account_id = public.current_account_id());
CREATE POLICY "Account owners change settings" ON public.settings FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'owner'::public.app_role) AND account_id = public.current_account_id())
WITH CHECK (public.has_role(auth.uid(), 'owner'::public.app_role) AND account_id = public.current_account_id());
CREATE POLICY "Account owners read viewers" ON public.viewer_accounts FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'owner'::public.app_role) AND account_id = public.current_account_id());
CREATE POLICY "Account owners read activity" ON public.activity_log FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'owner'::public.app_role) AND account_id = public.current_account_id());

REVOKE ALL ON public.viewer_invites FROM authenticated;
COMMENT ON TABLE public.viewer_invites IS 'DEPRECATED: replaced by per-account Viewer access.';
COMMENT ON TABLE public.viewer_access IS 'DEPRECATED: replaced by public.accounts.viewer_password_hash.';
COMMENT ON TABLE public.signup_state IS 'DEPRECATED: public signups now create isolated accounts.';
COMMENT ON TABLE public.accounts IS 'Each public signup creates an isolated Owner and Viewer account.';
COMMENT ON TABLE public.pending_viewer_logins IS 'Pending Viewer sessions require an email link and account password.';
