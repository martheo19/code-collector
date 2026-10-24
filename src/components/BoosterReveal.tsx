import { Trophy } from "lucide-react";
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

export function BoosterReveal({
  cards,
  userId,
  onClose,
}: {
  cards: Card[];
  userId?: string | undefined;
  onClose: () => void;
}) {
  const [phase, setPhase] = useState<"sealed" | "opening" | "dealing" | "cards">("sealed");
  const [flipped, setFlipped] = useState<boolean[]>(() => cards.map(() => false));
  const dealDuration = Math.min(Math.max(cards.length - 1, 0) * 55, 1800) + 800;

  const openPack = () => {
    setPhase("opening");
  };

  const flip = (i: number) => {
    setFlipped((current) => current.map((value, index) => (index === i ? true : value)));
  };

  useEffect(() => {
    if (phase === "opening") {
      const timer = window.setTimeout(() => setPhase("dealing"), 850);
      return () => window.clearTimeout(timer);
    }

    if (phase === "dealing") {
      const timer = window.setTimeout(() => setPhase("cards"), dealDuration);
      return () => window.clearTimeout(timer);
    }
  }, [dealDuration, phase]);

  useEffect(() => {
    function handleSpace(event: KeyboardEvent) {
      if (event.code !== "Space" || event.repeat) return;

      const target = event.target;
      if (
        target instanceof HTMLElement &&
        target.closest("button, a, input, textarea, select, [contenteditable='true']")
      ) {
        return;
      }

      event.preventDefault();

      if (phase === "sealed") {
        setPhase("opening");
        return;
      }

      if (phase !== "cards") return;

      setFlipped((current) => {
        const next = current.findIndex((value) => !value);
        return next < 0 ? current : current.map((value, index) => index === next || value);
      });
    }

    window.addEventListener("keydown", handleSpace);
    return () => window.removeEventListener("keydown", handleSpace);
  }, [phase]);

  const isNew = (card: Card) =>
    !!userId &&
    card.first_discovered_by === userId &&
    !!card.first_discovered_at &&
    Date.now() - new Date(card.first_discovered_at).getTime() < 5 * 60_000;

  const total = cards.reduce((sum, card) => sum + card.base_value, 0);
  const done = flipped.every(Boolean);

  return (
    <section className="booster-reveal-section mt-10" data-phase={phase}>
      {phase === "sealed" || phase === "opening" ? (
        <div className="booster-opening-stage flex flex-col items-center gap-3 py-10">
          <div className="booster-table-glow" aria-hidden="true" />
          <button
            type="button"
            aria-label="Ouvrir le booster"
            aria-keyshortcuts="Space"
            disabled={phase === "opening"}
            onClick={openPack}
            className={`booster-pack surface-panel hero-gradient flex h-64 w-44 flex-col items-center justify-center gap-3 border-gold/60 ${
              phase === "opening" ? "pack-opening" : ""
            }`}
          >
            <div className="tricolore-rule h-1 w-full" />
            <MarianneIcon />
            <span className="font-display text-gold">Journal officiel</span>
          </button>
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {phase === "opening"
              ? "Le paquet s’ouvre…"
              : "Cliquez sur le paquet ou appuyez sur Espace pour le déchirer"}
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-xl">
              {phase === "dealing" ? "Distribution des cartes…" : "Votre tirage"}
            </h2>
            {phase === "cards" && !done && (
              <Button variant="outline" size="sm" onClick={() => setFlipped(cards.map(() => true))}>
                Tout révéler
              </Button>
            )}
          </div>

          {phase === "cards" && !done && (
            <p className="mt-1 text-sm text-muted-foreground">
              Cliquez sur une carte ou appuyez sur Espace pour retourner la suivante.
            </p>
          )}

          <div
            className={`booster-deal-table mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5 ${
              phase === "dealing" ? "is-dealing" : ""
            }`}
          >
            {cards.map((card, index) => {
              const shown = flipped[index] ?? false;

              return (
                <div
                  key={`${card.id}-${index}`}
                  className="deal-card flip-card"
                  data-revealed={shown}
                  style={{ animationDelay: `${Math.min(index * 55, 1800)}ms` }}
                >
                  <div className="flip-inner">
                    <button
                      type="button"
                      aria-label={`Retourner la carte ${index + 1}`}
                      aria-keyshortcuts="Space"
                      onClick={() => flip(index)}
                      disabled={phase !== "cards"}
                      className="flip-face flip-back halo block cursor-pointer overflow-hidden rounded-2xl transition-transform hover:scale-[1.02]"
                      style={{
                        ["--halo" as string]: halo[card.rarity],
                        display: "grid",
                        placeItems: "center",
                        border: "1px solid #d6b15f",
                        background:
                          "radial-gradient(circle at 50% 40%, #6b5428 0, transparent 48%), repeating-linear-gradient(45deg, #ffffff08 0 2px, transparent 2px 12px), linear-gradient(145deg, #26334a, #101827 65%, #342b1c)",
                      }}
                    >
                      <span
                        aria-hidden="true"
                        className="grid aspect-square w-[34%] place-items-center rounded-full font-serif text-5xl text-amber-100"
                        style={{
                          border: "2px solid #e9cf8c",
                          background:
                            "radial-gradient(circle at 35% 30%, #786238, #292317 72%)",
                          boxShadow:
                            "inset 0 0 0 3px #e9cf8c33, 0 0 24px #d6b15f55",
                          textShadow: "0 2px 5px #000",
                        }}
                      >
                        §
                      </span>
                      <span
                        aria-hidden="true"
                        className="absolute bottom-[11%] left-0 right-0 text-center text-xs font-extrabold tracking-[0.2em] text-amber-100"
                      >
                        JUSCARTAE
                      </span>
                    </button>

                    <div
                      className="flip-face flip-front halo"
                      style={{
                        ["--halo" as string]: shown ? halo[card.rarity] : "transparent",
                      }}
                    >
                      {shown && isNew(card) && (
                        <div className="absolute -top-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full border-2 border-amber-200 bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-300 px-3 py-1.5 text-xs font-extrabold uppercase tracking-wide text-amber-950 shadow-[0_0_18px_rgba(251,191,36,0.75)] ring-2 ring-amber-950/70">
                          <Trophy className="size-4 shrink-0" aria-hidden="true" />
                          Première découverte mondiale
                        </div>
                      )}
                      <LawCard card={card} revealed={shown} hideFooter />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {done && (
            <div className="surface-panel mt-6 flex flex-col items-start gap-3 p-5 animate-in fade-in md:flex-row md:items-center md:justify-between">
              <p className="text-sm text-muted-foreground">
                {cards.map((card) => rarityLabel[card.rarity]).join(" · ")} — cote totale{" "}
                <span className="inline-flex items-center gap-1 text-gold">
                  {total} <MarianneIcon />
                </span>
                . Cartes ajoutées à votre collection.
              </p>
              <Button variant="secondary" onClick={onClose}>
                Fermer
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
