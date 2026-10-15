import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { LawCard } from "@/components/LawCard";
import { Button } from "@/components/ui/button";
import { buyListing, cancelListing, fetchListings, fetchProfile } from "@/lib/game";

export const Route = createFileRoute("/_authenticated/marche")({
  head: () => ({
    meta: [
      { title: "Marché des joueurs — JusCartae" },
      {
        name: "description",
        content:
          "Achetez et revendez des cartes juridiques entre joueurs, au prix fixé par les vendeurs.",
      },
      { property: "og:title", content: "Marché des joueurs — JusCartae" },
      { property: "og:description", content: "Le marché secondaire des cartes du droit français." },
    ],
  }),
  component: Marche,
});

function Marche() {
  const queryClient = useQueryClient();
  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: fetchProfile });
  const { data: listings, isLoading } = useQuery({
    queryKey: ["listings"],
    queryFn: fetchListings,
  });

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["listings"] });
    queryClient.invalidateQueries({ queryKey: ["profile"] });
    queryClient.invalidateQueries({ queryKey: ["collection"] });
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
  }

  const buy = useMutation({
    mutationFn: buyListing,
    onSuccess: () => {
      toast.success("Carte achetée !");
      refresh();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Achat impossible"),
  });

  const cancel = useMutation({
    mutationFn: cancelListing,
    onSuccess: () => {
      toast.success("Annonce retirée");
      refresh();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Retrait impossible"),
  });

  return (
    <AppShell>
      <h1 className="text-3xl">Marché des joueurs</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {listings?.length ?? 0} annonce(s) en cours — solde : {profile?.balance ?? 0} Deniers.
      </p>

      {isLoading ? (
        <p className="mt-8 text-sm text-muted-foreground">Chargement du marché…</p>
      ) : (listings?.length ?? 0) === 0 ? (
        <div className="surface-panel mt-8 p-8 text-center text-muted-foreground">
          Aucune carte en vente pour le moment. Mettez les vôtres en vente depuis votre collection.
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(listings ?? []).map((listing) => {
            const mine = listing.seller_id === profile?.id;
            return (
              <div key={listing.id} className="space-y-2">
                <LawCard
                  card={listing.card}
                  compact
                  footer={
                    mine ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={cancel.isPending}
                        onClick={() => cancel.mutate(listing.id)}
                      >
                        Retirer
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        disabled={buy.isPending || (profile?.balance ?? 0) < listing.price}
                        onClick={() => buy.mutate(listing.id)}
                      >
                        Acheter {listing.price} M
                      </Button>
                    )
                  }
                />
                <p className="px-1 text-xs text-muted-foreground">
                  Vendu par {mine ? "vous" : listing.seller} · prix {listing.price} Deniers
                </p>
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
