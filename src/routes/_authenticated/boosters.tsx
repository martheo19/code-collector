import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Gift, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { BoosterReveal } from "@/components/BoosterReveal";
import { Button } from "@/components/ui/button";
import {
  FREE_BOOSTERS_PER_DAY,
  fetchFreeBoosters,
  fetchProfile,
  openBooster,
  openFreeBooster,
  type Card,
} from "@/lib/game";

const BOOSTER_PRICE = 150;

export const Route = createFileRoute("/_authenticated/boosters")({
  head: () => ({
    meta: [
      { title: "Boosters — JusCartae" },
      {
        name: "description",
        content: "Ouvrez un booster de trois articles de droit tirés au sort et enrichissez votre collection.",
      },
      { property: "og:title", content: "Boosters — JusCartae" },
      { property: "og:description", content: "Trois cartes juridiques tirées au sort par booster." },
    ],
  }),
  component: Boosters,
});

function Boosters() {
  const queryClient = useQueryClient();
  const [drawn, setDrawn] = useState<Card[]>([]);
  const [drawKey, setDrawKey] = useState(0);
  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: fetchProfile });
  const { data: freeLeft = 0 } = useQuery({ queryKey: ["free-boosters"], queryFn: fetchFreeBoosters });

  const onDone = (cards: Card[]) => {
    setDrawn(cards);
    setDrawKey((k) => k + 1);
    queryClient.invalidateQueries({ queryKey: ["profile"] });
    queryClient.invalidateQueries({ queryKey: ["free-boosters"] });
    queryClient.invalidateQueries({ queryKey: ["collection"] });
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
    toast.success("Booster ouvert !");
  };
  const onFail = (error: unknown) =>
    toast.error(error instanceof Error ? error.message : "Ouverture impossible");

  const mutation = useMutation({ mutationFn: openBooster, onSuccess: onDone, onError: onFail });
  const free = useMutation({ mutationFn: openFreeBooster, onSuccess: onDone, onError: onFail });
  const busy = mutation.isPending || free.isPending;

  const canOpen = (profile?.balance ?? 0) >= BOOSTER_PRICE;

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
            {freeLeft} / {FREE_BOOSTERS_PER_DAY} disponibles — rechargés chaque jour à minuit (heure de Paris).
          </p>
        </div>
        <Button size="lg" variant="secondary" disabled={freeLeft === 0 || busy} onClick={() => free.mutate()}>
          <Gift className="mr-2 size-4" />
          {free.isPending ? "Ouverture…" : freeLeft > 0 ? "Ouvrir gratuitement" : "Reviens demain"}
        </Button>
      </div>

      <div className="surface-panel hero-gradient mt-4 flex flex-col items-start gap-4 p-8 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="font-display text-2xl">Booster « Journal officiel »</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {BOOSTER_PRICE} Deniers — solde actuel : {profile?.balance ?? 0} Deniers
          </p>
        </div>
        <Button
          size="lg"
          disabled={!canOpen || busy}
          onClick={() => mutation.mutate()}
        >
          <Sparkles className="mr-2 size-4" />
          {mutation.isPending ? "Ouverture…" : "Ouvrir un booster"}
        </Button>
      </div>

      {!canOpen && (
        <p className="mt-3 text-sm text-accent">
          Solde insuffisant : revendez des cartes sur le marché pour continuer.
        </p>
      )}


      {drawn.length > 0 && (
        <BoosterReveal key={drawKey} cards={drawn} userId={profile?.id} onClose={() => setDrawn([])} />
      )}
    </AppShell>
  );
}
