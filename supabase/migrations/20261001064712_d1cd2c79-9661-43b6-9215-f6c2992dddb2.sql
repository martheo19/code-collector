CREATE TABLE public.promo_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  credits_amount INTEGER NOT NULL CHECK (credits_amount > 0 AND credits_amount <= 1000000),
  max_uses INTEGER,
  uses_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT ALL ON public.promo_codes TO service_role;
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.promo_code_redemptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  promo_code_id UUID NOT NULL REFERENCES public.promo_codes(id) ON DELETE CASCADE,
  credits_amount INTEGER NOT NULL,
  redeemed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, promo_code_id)
);

GRANT SELECT ON public.promo_code_redemptions TO authenticated;
GRANT ALL ON public.promo_code_redemptions TO service_role;
ALTER TABLE public.promo_code_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "redemptions_own_read" ON public.promo_code_redemptions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER promo_codes_updated BEFORE UPDATE ON public.promo_codes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.redeem_promo_code(p_code TEXT)
RETURNS TABLE(credits_amount INTEGER, new_balance INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_user UUID := auth.uid(); c public.promo_codes%ROWTYPE; v_balance INT;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Authentification requise'; END IF;
  IF p_code IS NULL OR length(btrim(p_code)) = 0 THEN RAISE EXCEPTION 'Code invalide'; END IF;

  SELECT * INTO c FROM public.promo_codes
  WHERE code = upper(btrim(p_code)) FOR UPDATE;

  IF c.id IS NULL THEN RAISE EXCEPTION 'Ce code n''existe pas'; END IF;
  IF NOT c.is_active THEN RAISE EXCEPTION 'Ce code n''est plus actif'; END IF;
  IF c.expires_at IS NOT NULL AND c.expires_at < now() THEN RAISE EXCEPTION 'Ce code a expiré'; END IF;
  IF c.max_uses IS NOT NULL AND c.uses_count >= c.max_uses THEN RAISE EXCEPTION 'Ce code a atteint sa limite d''utilisation'; END IF;
  IF EXISTS (SELECT 1 FROM public.promo_code_redemptions WHERE user_id = v_user AND promo_code_id = c.id) THEN
    RAISE EXCEPTION 'Vous avez déjà utilisé ce code';
  END IF;

  INSERT INTO public.promo_code_redemptions (user_id, promo_code_id, credits_amount)
  VALUES (v_user, c.id, c.credits_amount);

  UPDATE public.promo_codes SET uses_count = uses_count + 1 WHERE id = c.id;

  UPDATE public.profiles SET balance = balance + c.credits_amount
  WHERE id = v_user RETURNING balance INTO v_balance;

  INSERT INTO public.transactions (user_id, kind, amount, description)
  VALUES (v_user, 'code', c.credits_amount, 'Code cadeau : ' || c.code);

  credits_amount := c.credits_amount;
  new_balance := v_balance;
  RETURN NEXT;
END; $$;

REVOKE EXECUTE ON FUNCTION public.redeem_promo_code(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.redeem_promo_code(TEXT) TO authenticated;

INSERT INTO public.promo_codes (code, credits_amount) VALUES
  ('MARIANNE2026', 500),
  ('JUSCARTAE', 250),
  ('BIENVENUE', 100);