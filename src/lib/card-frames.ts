import commune from "@/assets/cards/commune.gif.asset.json";
import dos from "@/assets/cards/dos.gif.asset.json";
import epique from "@/assets/cards/epique.gif.asset.json";
import legendaire from "@/assets/cards/exceptionnelle.gif.asset.json";
import mythique from "@/assets/cards/mythique.gif.asset.json";
import chromatique from "@/assets/cards/mythique_chromatique.gif.asset.json";
import rare from "@/assets/cards/rare.gif.asset.json";
import type { Rarity } from "@/lib/game";

export const cardBackUrl = dos.url;

const frames: Record<Rarity, string> = {
  commune: commune.url,
  peu_commune: commune.url,
  rare: rare.url,
  epique: epique.url,
  legendaire: legendaire.url,
  mythique: mythique.url,
};

/** Cadre animé selon la rareté ; les Mythiques de jurisprudence portent la variante chromatique. */
export function frameFor(rarity: Rarity, category?: string | null) {
  if (rarity === "mythique" && category === "jurisprudence") return chromatique.url;
  return frames[rarity];
}
