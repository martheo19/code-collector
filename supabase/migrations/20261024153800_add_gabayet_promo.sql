INSERT INTO public.promo_codes (
  code,
  credits_amount,
  max_uses,
  is_active,
  expires_at
)
VALUES (
  'GABAYET',
  5000,
  NULL,
  true,
  NULL
)
ON CONFLICT (code) DO NOTHING;
