CREATE INDEX IF NOT EXISTS cards_base_value_idx ON public.cards (base_value DESC, id);
CREATE INDEX IF NOT EXISTS cards_rarity_idx ON public.cards (rarity);
CREATE INDEX IF NOT EXISTS cards_circle_status_idx ON public.cards (circle, status);