DROP POLICY IF EXISTS "listings_public_read" ON public.listings;
CREATE POLICY "listings_public_read"
  ON public.listings
  FOR SELECT
  USING (status = 'active');
