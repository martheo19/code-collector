import type { Rarity } from "@/lib/game";

export const cardBackUrl = "/files/dos.gif";

const frames: Record<Rarity, string> = {
  commune: "/files/commune.gif",
  peu_commune: "/files/commune.gif",
  rare: "/files/rare.gif",
  epique: "/files/epique.gif",
  legendaire: "/files/exceptionnelle.gif",
  mythique: "/files/mythique.gif",
};

export const inkFor: Record<Rarity, "dark" | "light"> = {
  commune: "dark",
  peu_commune: "dark",
  rare: "dark",
  epique: "light",
  legendaire: "dark",
  mythique: "light",
};

export function frameFor(rarity: Rarity, category?: string | null) {
  if (rarity === "mythique" && category === "jurisprudence") return "/files/mythique_chromatique.gif";
  return frames[rarity];
}

export function inkOf(rarity: Rarity, category?: string | null) {
  if (rarity === "mythique" && category === "jurisprudence") return "dark";
  return inkFor[rarity];
}