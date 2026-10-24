CREATE TABLE IF NOT EXISTS public.announcements (
  id SMALLINT PRIMARY KEY CHECK (id = 1),
  message TEXT NOT NULL CHECK (length(btrim(message)) BETWEEN 1 AND 500),
  color TEXT NOT NULL CHECK (color IN ('gold', 'blue', 'red', 'green', 'purple', 'dark')),
  shape TEXT NOT NULL CHECK (shape IN ('bar', 'rounded', 'pill')),
  font TEXT NOT NULL CHECK (font IN ('sans', 'serif', 'display')),
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (expires_at > starts_at)
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.announcements FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.announcements TO anon, authenticated;
GRANT ALL ON public.announcements TO service_role;

DROP POLICY IF EXISTS "announcements_read_active" ON public.announcements;
CREATE POLICY "announcements_read_active"
  ON public.announcements
  FOR SELECT
  TO anon, authenticated
  USING (starts_at <= now() AND expires_at > now());

CREATE OR REPLACE FUNCTION public.admin_set_announcement(
  p_message TEXT,
  p_duration_minutes INTEGER,
  p_color TEXT,
  p_shape TEXT,
  p_font TEXT
)
RETURNS TABLE(message TEXT, color TEXT, shape TEXT, font TEXT, starts_at TIMESTAMPTZ, expires_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_starts_at TIMESTAMPTZ := now();
  v_expires_at TIMESTAMPTZ;
  v_message TEXT := btrim(COALESCE(p_message, ''));
BEGIN
  IF NOT public.is_god_admin() THEN
    RAISE EXCEPTION 'Accès administrateur requis';
  END IF;
  IF length(v_message) < 1 OR length(v_message) > 500 THEN
    RAISE EXCEPTION 'Le message doit contenir entre 1 et 500 caractères';
  END IF;
  IF p_duration_minutes IS NULL OR p_duration_minutes < 1 OR p_duration_minutes > 10080 THEN
    RAISE EXCEPTION 'La durée doit être comprise entre 1 et 10 080 minutes';
  END IF;
  IF p_color IS NULL OR p_shape IS NULL OR p_font IS NULL
     OR p_color NOT IN ('gold', 'blue', 'red', 'green', 'purple', 'dark')
     OR p_shape NOT IN ('bar', 'rounded', 'pill')
     OR p_font NOT IN ('sans', 'serif', 'display') THEN
    RAISE EXCEPTION 'Personnalisation de l’annonce invalide';
  END IF;

  v_expires_at := v_starts_at + make_interval(mins => p_duration_minutes);

  INSERT INTO public.announcements (
    id, message, color, shape, font, starts_at, expires_at, updated_by, updated_at
  )
  VALUES (
    1, v_message, p_color, p_shape, p_font, v_starts_at, v_expires_at, auth.uid(), v_starts_at
  )
  ON CONFLICT (id) DO UPDATE SET
    message = EXCLUDED.message,
    color = EXCLUDED.color,
    shape = EXCLUDED.shape,
    font = EXCLUDED.font,
    starts_at = EXCLUDED.starts_at,
    expires_at = EXCLUDED.expires_at,
    updated_by = EXCLUDED.updated_by,
    updated_at = EXCLUDED.updated_at;

  INSERT INTO public.god_mode_audit (actor_user_id, action, reason, details)
  VALUES (
    auth.uid(),
    'announcement_published',
    'Annonce globale',
    jsonb_build_object(
      'message', v_message,
      'duration_minutes', p_duration_minutes,
      'color', p_color,
      'shape', p_shape,
      'font', p_font,
      'expires_at', v_expires_at
    )
  );

  RETURN QUERY
  SELECT a.message, a.color, a.shape, a.font, a.starts_at, a.expires_at
  FROM public.announcements a
  WHERE a.id = 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_end_announcement()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  IF NOT public.is_god_admin() THEN
    RAISE EXCEPTION 'Accès administrateur requis';
  END IF;

  UPDATE public.announcements
  SET expires_at = now(), updated_by = auth.uid(), updated_at = now()
  WHERE id = 1 AND expires_at > now();
  GET DIAGNOSTICS v_count = ROW_COUNT;

  INSERT INTO public.god_mode_audit (actor_user_id, action, reason, details)
  VALUES (
    auth.uid(),
    'announcement_ended',
    'Fin anticipée de l’annonce globale',
    jsonb_build_object('announcement_ended', v_count > 0)
  );

  RETURN v_count > 0;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_announcement(TEXT, INTEGER, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_end_announcement() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_announcement(TEXT, INTEGER, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_end_announcement() TO authenticated;
