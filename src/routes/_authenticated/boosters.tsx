import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Gift, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { BoosterReveal } from "@/components/BoosterReveal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FREE_BOOSTERS_PER_DAY,
  fetchFreeBoosters,
  fetchProfile,
  MAX_PAID_BOOSTER_PACKS,
  openBooster,
  openFreeBooster,
  PAID_BOOSTER_PRICE,
  type Card,
} from "@/lib/game";

export const Route = createFileRoute("/_authenticated/boosters")({
  head: () => ({
    meta: [
      { title: "Boosters — JusCartae" },
      {
        name: "description",
        content:
          "Ouvrez des boosters de cinq cartes de droit tirées au sort et enrichissez votre collection.",
      },
      { property: "og:title", content: "Boosters — JusCartae" },
      {
        property: "og:description",
        content: "Cinq cartes juridiques tirées au sort par booster.",
      },
    ],
  }),
  component: Boosters,
});

function Boosters() {
  const queryClient = useQueryClient();
  const [drawn, setDrawn] = useState<Card[]>([]);
  const [drawKey, setDrawKey] = useState(0);
  const [packCountInput, setPackCountInput] = useState("1");
  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: fetchProfile });
  const { data: freeLeft = 0 } = useQuery({
    queryKey: ["free-boosters"],
    queryFn: fetchFreeBoosters,
  });

  const onDone = (cards: Card[]) => {
    setDrawn(cards);
    setDrawKey((k) => k + 1);
    queryClient.invalidateQueries({ queryKey: ["profile"] });
    queryClient.invalidateQueries({ queryKey: ["free-boosters"] });
    queryClient.invalidateQueries({ queryKey: ["collection"] });
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
    toast.success(`${cards.length / 5} booster(s) ouvert(s) !`);
  };
  const onFail = (error: unknown) =>
    toast.error(error instanceof Error ? error.message : "Ouverture impossible");

  const mutation = useMutation({
    mutationFn: openBooster,
    onSuccess: onDone,
    onError: onFail,
  });
  const free = useMutation({ mutationFn: openFreeBooster, onSuccess: onDone, onError: onFail });
  const busy = mutation.isPending || free.isPending;

  const packCount = Number(packCountInput);
  const validPackCount =
    Number.isInteger(packCount) && packCount >= 1 && packCount <= MAX_PAID_BOOSTER_PACKS;
  const totalPrice = validPackCount ? packCount * PAID_BOOSTER_PRICE : 0;
  const canOpen = validPackCount && (profile?.balance ?? 0) >= totalPrice;

  return (
    <AppShell>
      <h1 className="text-3xl">Boosters</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Un booster contient 5 cartes. Plus la rareté est haute, plus la cote est élevée.
      </p>

      <div className="surface-panel mt-6 flex flex-col items-start gap-4 border-gold/40 p-8 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="font-display text-2xl">Boosters gratuits du jour</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {freeLeft} / {FREE_BOOSTERS_PER_DAY} disponibles — rechargés chaque jour à minuit (heure
            de Paris).
          </p>
        </div>
        <Button
          size="lg"
          variant="secondary"
          disabled={freeLeft === 0 || busy}
          onClick={() => free.mutate()}
        >
          <Gift className="mr-2 size-4" />
          {free.isPending ? "Ouverture…" : freeLeft > 0 ? "Ouvrir gratuitement" : "Reviens demain"}
        </Button>
      </div>

      <div className="surface-panel hero-gradient mt-4 flex flex-col items-start gap-4 p-8 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="font-display text-2xl">Booster « Journal officiel »</h2>
          <label htmlFor="paid-pack-count" className="mt-3 block text-sm font-medium">
            Nombre de packs payants (1 à {MAX_PAID_BOOSTER_PACKS})
          </label>
          <Input
            id="paid-pack-count"
            type="number"
            min={1}
            max={MAX_PAID_BOOSTER_PACKS}
            step={1}
            inputMode="numeric"
            value={packCountInput}
            onChange={(event) => setPackCountInput(event.target.value)}
            aria-describedby="paid-pack-price"
            className="mt-1 w-32"
          />
          <p id="paid-pack-price" className="mt-2 text-sm text-muted-foreground">
            {validPackCount
              ? `${totalPrice} Deniers — solde actuel : ${profile?.balance ?? 0} Deniers`
              : `Choisissez un nombre entier de 1 à ${MAX_PAID_BOOSTER_PACKS}.`}
          </p>
        </div>
        <Button size="lg" disabled={!canOpen || busy} onClick={() => mutation.mutate(packCount)}>
          <Sparkles className="mr-2 size-4" />
          {mutation.isPending
            ? "Ouverture…"
            : `Ouvrir ${validPackCount ? packCount : ""} pack${packCount === 1 ? "" : "s"}`}
        </Button>
      </div>

      {validPackCount && !canOpen && (
        <p className="mt-3 text-sm text-accent">
          Solde insuffisant : revendez des cartes sur le marché pour continuer.
        </p>
      )}

      {drawn.length > 0 && (
        <BoosterReveal
          key={drawKey}
          cards={drawn}
          userId={profile?.id}
          onClose={() => setDrawn([])}
        />
      )}
    </AppShell>
  );
}
