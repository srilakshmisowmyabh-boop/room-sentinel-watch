CREATE TABLE public.viewer_access (id integer PRIMARY KEY DEFAULT 1 CHECK (id=1), passkey_hash text NOT NULL CHECK (passkey_hash ~ '^[a-f0-9]{64}$'), updated_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.viewer_access TO service_role;
ALTER TABLE public.viewer_access ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.viewer_accounts (
 user_id uuid PRIMARY KEY,
 name text NOT NULL CHECK (char_length(trim(name)) BETWEEN 1 AND 60),
 email text NOT NULL UNIQUE,
 first_sign_in_at timestamptz,
 last_sign_in_at timestamptz,
 blocked_at timestamptz,
 current_session_id uuid
);
GRANT SELECT ON public.viewer_accounts TO authenticated;
GRANT ALL ON public.viewer_accounts TO service_role;
ALTER TABLE public.viewer_accounts ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.auth_attempts (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), scope text NOT NULL CHECK (scope IN ('ip','email')), key_hash text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX auth_attempts_lookup ON public.auth_attempts(scope,key_hash,created_at);
GRANT ALL ON public.auth_attempts TO service_role;
ALTER TABLE public.auth_attempts ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.activity_log (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 created_at timestamptz NOT NULL DEFAULT now(),
 actor_id uuid,
 actor_name text NOT NULL DEFAULT '',
 actor_email text NOT NULL DEFAULT '',
 role text NOT NULL DEFAULT 'unknown',
 action text NOT NULL,
 old_value jsonb,
 new_value jsonb
);
CREATE INDEX activity_log_created ON public.activity_log(created_at DESC);
GRANT SELECT ON public.activity_log TO authenticated;
GRANT SELECT, INSERT ON public.activity_log TO service_role;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_member(_user_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT public.has_role(_user_id,'owner') OR EXISTS(
  SELECT 1 FROM public.user_roles r JOIN public.viewer_accounts v ON v.user_id=r.user_id
  WHERE r.user_id=_user_id AND r.role='viewer' AND r.revoked_at IS NULL AND v.blocked_at IS NULL
   AND v.current_session_id IS NOT NULL AND v.current_session_id::text = coalesce(auth.jwt()->>'session_id',''))
$$;

CREATE POLICY "Owner reads viewers" ON public.viewer_accounts FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'owner'));
CREATE POLICY "Owner reads activity" ON public.activity_log FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'owner'));

CREATE OR REPLACE FUNCTION public.write_activity(_actor uuid, _action text, _old jsonb, _new jsonb, _name text DEFAULT NULL, _email text DEFAULT NULL, _role text DEFAULT NULL) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 INSERT INTO public.activity_log(actor_id,actor_name,actor_email,role,action,old_value,new_value)
 SELECT _actor,
  coalesce(_name,(SELECT display_name FROM public.profiles WHERE id=_actor),''),
  coalesce(_email,(SELECT email::text FROM auth.users WHERE id=_actor),''),
  coalesce(_role,CASE WHEN public.has_role(_actor,'owner') THEN 'owner' WHEN _actor IS NOT NULL THEN 'viewer' ELSE 'unknown' END),
  _action,_old,_new;
END $$;
REVOKE ALL ON FUNCTION public.write_activity(uuid,text,jsonb,jsonb,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.write_activity(uuid,text,jsonb,jsonb,text,text,text) TO service_role;

CREATE OR REPLACE FUNCTION public.log_security_change() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF auth.uid() IS NULL THEN RETURN new; END IF;
 IF old.mode IS DISTINCT FROM new.mode THEN PERFORM public.write_activity(auth.uid(),'Security mode changed',to_jsonb(old.mode),to_jsonb(new.mode)); END IF;
 IF old.entry_delay IS DISTINCT FROM new.entry_delay OR old.exit_delay IS DISTINCT FROM new.exit_delay THEN
  PERFORM public.write_activity(auth.uid(),'Settings changed',jsonb_build_object('entry_delay',old.entry_delay,'exit_delay',old.exit_delay),jsonb_build_object('entry_delay',new.entry_delay,'exit_delay',new.exit_delay));
 END IF;
 RETURN new;
END $$;
CREATE TRIGGER security_state_activity AFTER UPDATE ON public.security_state FOR EACH ROW EXECUTE FUNCTION public.log_security_change();

CREATE OR REPLACE FUNCTION public.log_settings_change() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE o jsonb; n jsonb;
BEGIN
 IF auth.uid() IS NULL THEN RETURN new; END IF;
 IF old.telegram IS DISTINCT FROM new.telegram THEN PERFORM public.write_activity(auth.uid(),'Telegram alerts changed',to_jsonb(CASE WHEN old.telegram THEN 'on' ELSE 'off' END),to_jsonb(CASE WHEN new.telegram THEN 'on' ELSE 'off' END)); END IF;
 o := jsonb_build_object('threshold',old.threshold,'persistence',old.persistence,'clear_time',old.clear_time,'alarm_duration',old.alarm_duration);
 n := jsonb_build_object('threshold',new.threshold,'persistence',new.persistence,'clear_time',new.clear_time,'alarm_duration',new.alarm_duration);
 IF o IS DISTINCT FROM n THEN PERFORM public.write_activity(auth.uid(),'Settings changed',o,n); END IF;
 RETURN new;
END $$;
CREATE TRIGGER settings_activity AFTER UPDATE ON public.settings FOR EACH ROW EXECUTE FUNCTION public.log_settings_change();
REVOKE ALL ON FUNCTION public.log_security_change(), public.log_settings_change() FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.auth_user_by_email(_email text) RETURNS TABLE(id uuid, is_owner boolean) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT u.id, public.has_role(u.id,'owner') FROM auth.users u WHERE lower(u.email)=lower(trim(_email)) LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.auth_user_by_email(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.auth_user_by_email(text) TO service_role;

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE entered_name text; claimed boolean; ph text;
BEGIN
 PERFORM pg_advisory_xact_lock(424242);
 SELECT owner_claimed INTO claimed FROM public.signup_state WHERE id=1 FOR UPDATE;
 entered_name := trim(coalesce(new.raw_user_meta_data->>'display_name',''));
 IF char_length(entered_name) NOT BETWEEN 1 AND 60 THEN RAISE EXCEPTION 'Name is required (maximum 60 characters).'; END IF;
 IF NOT claimed THEN
  ph := new.raw_app_meta_data->>'viewer_passkey_hash';
  IF ph IS NULL OR ph !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'A viewer passkey is required.'; END IF;
  UPDATE public.signup_state SET owner_claimed=true WHERE id=1;
  INSERT INTO public.user_roles(user_id,role) VALUES(new.id,'owner');
  INSERT INTO public.viewer_access(id,passkey_hash) VALUES(1,ph) ON CONFLICT (id) DO UPDATE SET passkey_hash=excluded.passkey_hash, updated_at=now();
 ELSIF new.raw_app_meta_data->>'viewer_access' = 'true' THEN
  INSERT INTO public.user_roles(user_id,role) VALUES(new.id,'viewer');
 ELSE
  RAISE EXCEPTION 'Account creation is closed.';
 END IF;
 INSERT INTO public.profiles(id,display_name) VALUES(new.id,entered_name);
 RETURN new;
END $$;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC,anon,authenticated;

ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_log;
ALTER PUBLICATION supabase_realtime ADD TABLE public.viewer_accounts;
COMMENT ON TABLE public.viewer_invites IS 'DEPRECATED: replaced by viewer_access and viewer_accounts';