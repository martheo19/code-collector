import { Compass } from "lucide-react";
import { useEffect, useState } from "react";

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

/** Paquet scellé → éclat → les 3 cartes se retournent automatiquement → synthèse. */
export function BoosterReveal({ cards, userId, onClose }: { cards: Card[]; userId?: string | undefined; onClose: () => void }) {
  const [phase, setPhase] = useState<"burst" | "cards">("burst");
  const [revealed, setRevealed] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setPhase("cards"), 700);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    if (phase !== "cards" || revealed >= cards.length) return;
    const t = setTimeout(() => setRevealed((n) => n + 1), revealed === 0 ? 300 : 650);
    return () => clearTimeout(t);
  }, [phase, revealed, cards.length]);

  const isNew = (c: Card) =>
    !!userId && c.first_discovered_by === userId && !!c.first_discovered_at &&
    Date.now() - new Date(c.first_discovered_at).getTime() < 5 * 60_000;
  const total = cards.reduce((s, c) => s + c.base_value, 0);
  const done = revealed >= cards.length;

  return (
    <section className="mt-10">
      {phase === "burst" ? (
        <div className="flex justify-center py-10">
          <div className="pack-burst surface-panel hero-gradient flex h-64 w-44 flex-col items-center justify-center gap-3 border-gold/60">
            <div className="tricolore-rule h-1 w-full" />
            <MarianneIcon />
            <span className="font-display text-gold">Journal officiel</span>
          </div>
        </div>
      ) : (
        <>
          <h2 className="font-display text-xl">Votre tirage</h2>
          <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((card, i) => {
              const shown = i < revealed;
              return (
                <div key={`${card.id}-${i}`} className="flip-card" data-revealed={shown}>
                  <div className={`flip-inner ${shown && high.includes(card.rarity) ? "rare-shake" : ""}`}>
                    <div className="flip-face flip-back halo surface-panel hero-gradient flex items-center justify-center border-gold/50" style={{ ["--halo" as string]: halo[card.rarity] }}>
                      <span className="font-display text-2xl text-gold">JusCartae</span>
                    </div>
                    <div className="flip-face flip-front halo" style={{ ["--halo" as string]: shown ? halo[card.rarity] : "transparent" }}>
                      {isNew(card) && (
                        <p className="mb-2 inline-flex items-center gap-1 rounded-md bg-gold/15 px-2 py-1 text-xs font-semibold text-gold">
                          <Compass className="size-3.5" /> Première découverte mondiale !
                        </p>
                      )}
                      <LawCard card={card} />
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
