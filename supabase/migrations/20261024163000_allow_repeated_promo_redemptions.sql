ALTER TABLE public.promo_codes
  ADD COLUMN IF NOT EXISTS unlimited BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS owner_id UUID;

ALTER TABLE public.promo_code_redemptions
  DROP CONSTRAINT IF EXISTS promo_code_redemptions_user_id_promo_code_id_key;

UPDATE public.promo_codes
SET unlimited = true, max_uses = NULL
WHERE code = 'GABAYET';

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
  IF c.owner_id IS NOT NULL AND c.owner_id <> v_user THEN RAISE EXCEPTION 'Ce code n''existe pas'; END IF;
  IF NOT c.is_active THEN RAISE EXCEPTION 'Ce code n''est plus actif'; END IF;
  IF c.expires_at IS NOT NULL AND c.expires_at < now() THEN RAISE EXCEPTION 'Ce code a expiré'; END IF;

  IF NOT c.unlimited THEN
    IF c.max_uses IS NOT NULL AND c.uses_count >= c.max_uses THEN
      RAISE EXCEPTION 'Ce code a atteint sa limite d''utilisation';
    END IF;
    IF EXISTS (
      SELECT 1 FROM public.promo_code_redemptions
      WHERE user_id = v_user AND promo_code_id = c.id
    ) THEN
      RAISE EXCEPTION 'Vous avez déjà utilisé ce code';
    END IF;
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
