import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { LawCard } from "@/components/LawCard";
import { Button } from "@/components/ui/button";
import { fetchProfile, openBooster, type Card } from "@/lib/game";

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
  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: fetchProfile });

  const mutation = useMutation({
    mutationFn: openBooster,
    onSuccess: (cards) => {
      setDrawn(cards);
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["collection"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      toast.success("Booster ouvert !");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Ouverture impossible"),
  });

  const canOpen = (profile?.balance ?? 0) >= BOOSTER_PRICE;

  return (
    <AppShell>
      <h1 className="text-3xl">Boosters</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Un booster contient 3 cartes. Plus la rareté est haute, plus la cote est élevée.
      </p>

      <div className="surface-panel hero-gradient mt-6 flex flex-col items-start gap-4 p-8 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="font-display text-2xl">Booster « Journal officiel »</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {BOOSTER_PRICE} Mariannes — solde actuel : {profile?.balance ?? 0} Mariannes
          </p>
        </div>
        <Button
          size="lg"
          disabled={!canOpen || mutation.isPending}
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
        <section className="mt-10">
          <h2 className="font-display text-xl">Votre tirage</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {drawn.map((card, i) => (
              <div key={`${card.id}-${i}`} className="animate-in fade-in zoom-in-95 duration-500">
                <LawCard card={card} />
              </div>
            ))}
          </div>
        </section>
      )}
    </AppShell>
  );
}
