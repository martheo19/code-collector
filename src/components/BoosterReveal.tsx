import { Compass } from "lucide-react";
import { useState } from "react";

import { LawCard } from "@/components/LawCard";
import { MarianneIcon } from "@/components/Marianne";
import { Button } from "@/components/ui/button";
import { rarityLabel, type Card, type Rarity } from "@/lib/game";

const halo: Record<Rarity, string> = {
  commune: "transparent",
  peu_commune: "transparent",
  rare: "var(--rarity-rare)",
  epique: "var(--rarity-epique)",
  legendaire: "var(--rarity-legendaire)",
  mythique: "var(--rarity-mythique)",
};
const high: Rarity[] = ["epique", "legendaire", "mythique"];

/** Paquet scellé (clic) → éclat → chaque carte se retourne au clic → synthèse. */
export function BoosterReveal({ cards, userId, onClose }: { cards: Card[]; userId?: string | undefined; onClose: () => void }) {
  const [phase, setPhase] = useState<"sealed" | "burst" | "cards">("sealed");
  const [flipped, setFlipped] = useState<boolean[]>(() => cards.map(() => false));

  const openPack = () => {
    setPhase("burst");
    setTimeout(() => setPhase("cards"), 700);
  };
  const flip = (i: number) => setFlipped((f) => f.map((v, j) => (j === i ? true : v)));

  const isNew = (c: Card) =>
    !!userId && c.first_discovered_by === userId && !!c.first_discovered_at &&
    Date.now() - new Date(c.first_discovered_at).getTime() < 5 * 60_000;
  const total = cards.reduce((s, c) => s + c.base_value, 0);
  const done = flipped.every(Boolean);

  return (
    <section className="mt-10">
      {phase !== "cards" ? (
        <div className="flex flex-col items-center gap-3 py-10">
          <button
            type="button"
            aria-label="Ouvrir le booster"
            disabled={phase === "burst"}
            onClick={openPack}
            className={`surface-panel hero-gradient flex h-64 w-44 flex-col items-center justify-center gap-3 border-gold/60 transition-transform hover:-translate-y-1 hover:scale-105 ${phase === "burst" ? "pack-burst" : "animate-pulse"}`}
          >
            <div className="tricolore-rule h-1 w-full" />
            <MarianneIcon />
            <span className="font-display text-gold">Journal officiel</span>
          </button>
          {phase === "sealed" && <p className="text-sm text-muted-foreground">Cliquez sur le paquet pour l'ouvrir</p>}
        </div>
      ) : (
        <>
          <h2 className="font-display text-xl">Votre tirage</h2>
          {!done && <p className="mt-1 text-sm text-muted-foreground">Cliquez sur chaque carte pour la retourner.</p>}
          <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((card, i) => {
              const shown = flipped[i] ?? false;
              return (
                <div key={`${card.id}-${i}`} className="flip-card" data-revealed={shown}>
                  <div className={`flip-inner ${shown && high.includes(card.rarity) ? "rare-shake" : ""}`}>
                    <button
                      type="button"
                      aria-label={`Retourner la carte ${i + 1}`}
                      onClick={() => flip(i)}
                      className="flip-face flip-back halo surface-panel hero-gradient flex cursor-pointer items-center justify-center border-gold/50"
                      style={{ ["--halo" as string]: halo[card.rarity] }}
                    >
                      <span className="font-display text-2xl text-gold">JusCartae</span>
                    </button>
                    <div className="flip-face flip-front halo" style={{ ["--halo" as string]: shown ? halo[card.rarity] : "transparent" }}>
                      {shown && isNew(card) && (
                        <p className="mb-2 inline-flex items-center gap-1 rounded-md bg-gold/15 px-2 py-1 text-xs font-semibold text-gold">
                          <Compass className="size-3.5" /> Première découverte mondiale !
                        </p>
                      )}
                      {shown && <LawCard card={card} />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {done && (
            <div className="surface-panel mt-6 flex flex-col items-start gap-3 p-5 animate-in fade-in md:flex-row md:items-center md:justify-between">
              <p className="text-sm text-muted-foreground">
                {cards.map((c) => rarityLabel[c.rarity]).join(" · ")} — cote totale{" "}
                <span className="inline-flex items-center gap-1 text-gold">{total} <MarianneIcon /></span>. Cartes ajoutées à votre collection.
              </p>
              <Button variant="secondary" onClick={onClose}>Fermer</Button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
