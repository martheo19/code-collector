CREATE POLICY "promo_codes_no_direct_read" ON public.promo_codes
  FOR SELECT TO authenticated USING (false);