import dos from "@/assets/cards/dos.gif.asset.json";
import commune from "@/assets/cards/v2/commune.png.asset.json";
import epique from "@/assets/cards/v2/epique_loop.gif.asset.json";
import legendaire from "@/assets/cards/v2/exceptionnelle_loop.gif.asset.json";
import chromatique from "@/assets/cards/v2/mythique_chromatique_loop.gif.asset.json";
import mythique from "@/assets/cards/v2/mythique_loop.gif.asset.json";
import rare from "@/assets/cards/v2/rare_loop.gif.asset.json";
import type { Rarity } from "@/lib/game";

export const cardBackUrl = dos.url;

/** Gabarits vierges : fixes pour Commune/Peu commune, effets scintillants en boucle (sans rotation) au-delà. */
const frames: Record<Rarity, string> = {
  commune: commune.url,
  peu_commune: commune.url,
  rare: rare.url,
  epique: epique.url,
  legendaire: legendaire.url,
  mythique: mythique.url,
};

/** Couleur d'encre adaptée au fond du gabarit. */
export const inkFor: Record<Rarity, "dark" | "light"> = {
  commune: "dark",
  peu_commune: "dark",
  rare: "dark",
  epique: "light",
  legendaire: "dark",
  mythique: "light",
};

export function frameFor(rarity: Rarity, category?: string | null) {
  if (rarity === "mythique" && category === "jurisprudence") return chromatique.url;
  return frames[rarity];
}

export function inkOf(rarity: Rarity, category?: string | null) {
  if (rarity === "mythique" && category === "jurisprudence") return "dark";
  return inkFor[rarity];
}
