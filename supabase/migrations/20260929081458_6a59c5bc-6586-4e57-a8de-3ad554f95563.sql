ALTER TYPE public.card_rarity ADD VALUE IF NOT EXISTS 'mythique';

ALTER TABLE public.cards
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'en_vigueur',
  ADD COLUMN IF NOT EXISTS status_note text,
  ADD COLUMN IF NOT EXISTS circle text NOT NULL DEFAULT 'france',
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'code',
  ADD COLUMN IF NOT EXISTS text_date text,
  ADD COLUMN IF NOT EXISTS authority text,
  ADD COLUMN IF NOT EXISTS summary text;