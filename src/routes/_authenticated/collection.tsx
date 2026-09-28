import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { LawCard } from "@/components/LawCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createListing, fetchCollection } from "@/lib/game";

export const Route = createFileRoute("/_authenticated/collection")({
  head: () => ({
    meta: [
      { title: "Ma collection — JusCartae" },
      {
        name: "description",
        content: "Consultez les cartes juridiques que vous possédez et mettez-les en vente sur le marché.",
      },
      { property: "og:title", content: "Ma collection — JusCartae" },
      { property: "og:description", content: "Vos cartes de droit français et leur mise en vente." },
    ],
  }),
  component: Collection,
});

function Collection() {
  const queryClient = useQueryClient();
  const [sellingId, setSellingId] = useState<string | null>(null);
  const [price, setPrice] = useState("");

  const { data: owned, isLoading } = useQuery({
    queryKey: ["collection"],
    queryFn: fetchCollection,
  });

  const sell = useMutation({
    mutationFn: ({ id, value }: { id: string; value: number }) => createListing(id, value),
    onSuccess: () => {
      toast.success("Carte mise en vente");
      setSellingId(null);
      setPrice("");
      queryClient.invalidateQueries({ queryKey: ["listings"] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Mise en vente impossible"),
  });

  return (
    <AppShell>
      <h1 className="text-3xl">Ma collection</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {owned?.length ?? 0} carte(s) en votre possession.
      </p>

      {isLoading ? (
        <p className="mt-8 text-sm text-muted-foreground">Chargement…</p>
      ) : (owned?.length ?? 0) === 0 ? (
        <div className="surface-panel mt-8 p-8 text-center">
          <p className="text-muted-foreground">Votre collection est vide.</p>
          <Button asChild className="mt-4">
            <Link to="/boosters">Ouvrir mon premier booster</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(owned ?? []).map((item) => (
            <LawCard
              key={item.id}
              card={item.card}
              compact
              footer={
                sellingId === item.id ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      inputMode="numeric"
                      placeholder="Prix"
                      className="h-8 w-20"
                    />
                    <Button
                      size="sm"
                      disabled={sell.isPending}
                      onClick={() =>
                        sell.mutate({ id: item.id, value: Number.parseInt(price, 10) || 0 })
                      }
                    >
                      OK
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSellingId(item.id);
                      setPrice(String(item.card.base_value));
                    }}
                  >
                    Vendre
                  </Button>
                )
              }
            />
          ))}
        </div>
      )}
    </AppShell>
  );
}
