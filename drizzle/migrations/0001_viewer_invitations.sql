ALTER TABLE public.user_roles ADD COLUMN revoked_at timestamptz;
CREATE TABLE public.viewer_invites (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 name text NOT NULL CHECK (char_length(trim(name)) BETWEEN 1 AND 60),
 key_hash text NOT NULL UNIQUE CHECK (key_hash ~ '^[a-f0-9]{64}$'),
 created_by uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 used_at timestamptz,
 user_id uuid UNIQUE,
 revoked_at timestamptz
);
GRANT SELECT, INSERT, UPDATE ON public.viewer_invites TO authenticated;
GRANT ALL ON public.viewer_invites TO service_role;
ALTER TABLE public.viewer_invites ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.signup_state (id integer PRIMARY KEY DEFAULT 1 CHECK (id=1), owner_claimed boolean NOT NULL DEFAULT false);
GRANT ALL ON public.signup_state TO service_role;
ALTER TABLE public.signup_state ENABLE ROW LEVEL SECURITY;
INSERT INTO public.signup_state (id, owner_claimed) SELECT 1, EXISTS(SELECT 1 FROM auth.users);
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role AND revoked_at IS NULL) $$;
CREATE OR REPLACE FUNCTION public.is_member(_user_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND revoked_at IS NULL) $$;
CREATE POLICY "Owner reads invitations" ON public.viewer_invites FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'owner'));
CREATE POLICY "Owner creates invitations" ON public.viewer_invites FOR INSERT TO authenticated WITH CHECK(public.has_role(auth.uid(),'owner') AND created_by=auth.uid() AND used_at IS NULL AND user_id IS NULL AND revoked_at IS NULL);
-- Mutations after creation are performed by narrowly scoped owner RPCs; clients cannot mark invitations used.
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE invite public.viewer_invites; entered_name text; claimed boolean;
BEGIN
 PERFORM pg_advisory_xact_lock(424242);
 SELECT owner_claimed INTO claimed FROM public.signup_state WHERE id=1 FOR UPDATE;
 entered_name := trim(coalesce(new.raw_user_meta_data->>'display_name',''));
 IF char_length(entered_name) NOT BETWEEN 1 AND 60 THEN RAISE EXCEPTION 'Name is required (maximum 60 characters).'; END IF;
 IF claimed THEN
  SELECT * INTO invite FROM public.viewer_invites WHERE key_hash=new.raw_app_meta_data->>'invite_hash' FOR UPDATE;
  IF invite.id IS NULL OR invite.used_at IS NOT NULL OR invite.revoked_at IS NOT NULL THEN RAISE EXCEPTION 'Passkey is invalid, already used, or revoked.'; END IF;
  IF lower(trim(invite.name)) <> lower(entered_name) THEN RAISE EXCEPTION 'Name must match the viewer invitation.'; END IF;
  INSERT INTO public.user_roles(user_id,role) VALUES(new.id,'viewer');
  UPDATE public.viewer_invites SET used_at=now(),user_id=new.id WHERE id=invite.id;
 ELSE
  UPDATE public.signup_state SET owner_claimed=true WHERE id=1;
  INSERT INTO public.user_roles(user_id,role) VALUES(new.id,'owner');
 END IF;
 INSERT INTO public.profiles(id,display_name) VALUES(new.id,entered_name);
 RETURN new;
END $$;
CREATE OR REPLACE FUNCTION public.list_viewers() RETURNS TABLE(id uuid,name text,email text,passkey_status text,account_created_at timestamptz,last_sign_in_at timestamptz,revoked_at timestamptz,user_id uuid) LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT public.has_role(auth.uid(),'owner') THEN RAISE EXCEPTION 'Only the Owner can access viewers.'; END IF;
 RETURN QUERY
 SELECT i.id,i.name,u.email::text,CASE WHEN i.used_at IS NULL THEN 'unused' ELSE 'used' END,u.created_at,u.last_sign_in_at,i.revoked_at,i.user_id FROM public.viewer_invites i LEFT JOIN auth.users u ON u.id=i.user_id
 UNION ALL
 SELECT r.id,p.display_name,u.email::text,'used'::text,u.created_at,u.last_sign_in_at,r.revoked_at,r.user_id FROM public.user_roles r JOIN auth.users u ON u.id=r.user_id JOIN public.profiles p ON p.id=r.user_id WHERE r.role='viewer' AND NOT EXISTS(SELECT 1 FROM public.viewer_invites i WHERE i.user_id=r.user_id);
END $$;
CREATE OR REPLACE FUNCTION public.revoke_viewer(_id uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE target uuid;
BEGIN
 IF NOT public.has_role(auth.uid(),'owner') THEN RAISE EXCEPTION 'Only the Owner can revoke viewers.'; END IF;
 UPDATE public.viewer_invites SET revoked_at=coalesce(revoked_at,now()) WHERE id=_id RETURNING user_id INTO target;
 IF NOT FOUND THEN SELECT user_id INTO target FROM public.user_roles WHERE id=_id AND role='viewer'; IF NOT FOUND THEN RAISE EXCEPTION 'Viewer not found.'; END IF; END IF;
 IF target IS NOT NULL THEN
  IF public.has_role(target,'owner') THEN RAISE EXCEPTION 'An Owner cannot be revoked.'; END IF;
  UPDATE public.user_roles SET revoked_at=coalesce(revoked_at,now()) WHERE user_id=target AND role='viewer';
 END IF;
 RETURN target;
END $$;
REVOKE ALL ON FUNCTION public.list_viewers() FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.revoke_viewer(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.list_viewers(),public.revoke_viewer(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC,anon,authenticated;