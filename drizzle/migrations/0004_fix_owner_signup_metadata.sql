CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE entered_name text; claimed boolean; ph text;
BEGIN
 PERFORM pg_advisory_xact_lock(424242);
 SELECT owner_claimed INTO claimed FROM public.signup_state WHERE id=1 FOR UPDATE;
 entered_name := trim(coalesce(new.raw_user_meta_data->>'display_name',''));
 IF char_length(entered_name) NOT BETWEEN 1 AND 60 THEN RAISE EXCEPTION 'Name is required (maximum 60 characters).'; END IF;
 IF NOT claimed THEN
  ph := coalesce(new.raw_app_meta_data->>'viewer_passkey_hash', new.raw_user_meta_data->>'viewer_passkey_hash');
  IF ph IS NULL OR ph !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'A viewer passkey is required.'; END IF;
  UPDATE public.signup_state SET owner_claimed=true WHERE id=1;
  INSERT INTO public.user_roles(user_id,role) VALUES(new.id,'owner');
  INSERT INTO public.viewer_access(id,passkey_hash) VALUES(1,ph) ON CONFLICT (id) DO UPDATE SET passkey_hash=excluded.passkey_hash, updated_at=now();
 ELSIF coalesce(new.raw_app_meta_data->>'viewer_access', new.raw_user_meta_data->>'viewer_access') = 'true' THEN
  INSERT INTO public.user_roles(user_id,role) VALUES(new.id,'viewer');
 ELSE
  RAISE EXCEPTION 'Account creation is closed.';
 END IF;
 INSERT INTO public.profiles(id,display_name) VALUES(new.id,entered_name);
 RETURN new;
END $$;