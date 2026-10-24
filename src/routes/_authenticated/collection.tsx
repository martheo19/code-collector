import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpDown } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { LawCard } from "@/components/LawCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  createListing,
  fetchCardIndex,
  fetchCards,
  fetchCollection,
  MAX_COLLECTION_CARDS,
  rarityClass,
  rarityLabel,
  type Card,
  type OwnedCard,
  type Rarity,
} from "@/lib/game";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/collection")({
  head: () => ({
    meta: [
      { title: "Ma collection — JusCartae" },
      {
        name: "description",
        content:
          "Consultez les cartes juridiques que vous possédez et mettez-les en vente sur le marché.",
      },
      { property: "og:title", content: "Ma collection — JusCartae" },
      {
        property: "og:description",
        content: "Vos cartes de droit français et leur mise en vente.",
      },
    ],
  }),
  component: Collection,
});

const circleLabels: Record<string, string> = {
  france: "Droit français",
  europe: "Droit européen",
  international: "Droit international",
};
type SortKey = "rarete_desc" | "rarete_asc" | "recent" | "ancien" | "az" | "za" | "cote";
const sortLabels: Record<SortKey, string> = {
  rarete_desc: "Rareté (la plus rare d'abord)",
  rarete_asc: "Rareté (la plus commune d'abord)",
  recent: "Obtention (récentes d'abord)",
  ancien: "Obtention (anciennes d'abord)",
  az: "Titre (A → Z)",
  za: "Titre (Z → A)",
  cote: "Cote en Deniers (la plus haute)",
};
const rarityOrder: Rarity[] = [
  "commune",
  "peu_commune",
  "rare",
  "epique",
  "legendaire",
  "mythique",
];

function Collection() {
  const queryClient = useQueryClient();
  const [sellingId, setSellingId] = useState<string | null>(null);
  const [price, setPrice] = useState("");
  const [rarity, setRarity] = useState<Rarity | "toutes">("toutes");
  const [circle, setCircle] = useState("toutes");
  const [dupesOnly, setDupesOnly] = useState(false);
  const [sort, setSort] = useState<SortKey>("rarete_desc");

  const { data: owned, isLoading } = useQuery({
    queryKey: ["collection"],
    queryFn: fetchCollection,
  });
  const { data: allCards } = useQuery({
    queryKey: ["card-index"],
    queryFn: fetchCardIndex,
    staleTime: 600_000,
  });

  const counts = new Map<string, number>();
  for (const o of owned ?? []) counts.set(o.card.id, (counts.get(o.card.id) ?? 0) + 1);
  const grouped = new Map<string, { item: OwnedCard; count: number }>();
  for (const item of owned ?? []) {
    const existing = grouped.get(item.card.id);
    if (existing) existing.count += 1;
    else grouped.set(item.card.id, { item, count: 1 });
  }
  const total = allCards?.length ?? 0;
  const unique = counts.size;
  const pct = total ? Math.round((unique / total) * 100) : 0;

  const statFor = (pred: (c: Pick<Card, "id" | "rarity" | "circle">) => boolean) => {
    const all = (allCards ?? []).filter(pred);
    const have = all.filter((c) => counts.has(c.id)).length;
    return { have, all: all.length };
  };

  const visible = [...grouped.values()].filter(
    ({ item: o, count }) =>
      (rarity === "toutes" || o.card.rarity === rarity) &&
      (circle === "toutes" || (o.card.circle ?? "france") === circle) &&
      (!dupesOnly || count > 1),
  );

  const rank = (r: Rarity) => rarityOrder.indexOf(r);
  const sorted = [...visible].sort(({ item: a }, { item: b }) => {
    switch (sort) {
      case "rarete_desc":
        return (
          rank(b.card.rarity) - rank(a.card.rarity) ||
          a.card.title.localeCompare(b.card.title, "fr")
        );
      case "rarete_asc":
        return (
          rank(a.card.rarity) - rank(b.card.rarity) ||
          a.card.title.localeCompare(b.card.title, "fr")
        );
      case "recent":
        return b.acquired_at.localeCompare(a.acquired_at);
      case "ancien":
        return a.acquired_at.localeCompare(b.acquired_at);
      case "az":
        return a.card.title.localeCompare(b.card.title, "fr");
      case "za":
        return b.card.title.localeCompare(a.card.title, "fr");
      case "cote":
        return b.card.base_value - a.card.base_value;
    }
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
        {owned?.length ?? 0} / {MAX_COLLECTION_CARDS.toLocaleString("fr-FR")} cartes en votre
        possession.
      </p>

      {total > 0 && (
        <section className="surface-panel mt-6 p-6">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-xl">Progression</h2>
            <span className="text-sm text-gold">
              {unique} / {total} cartes — {pct} %
            </span>
          </div>
          <Progress value={pct} className="mt-3" />
          <div className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
            {Object.entries(circleLabels).map(([k, label]) => {
              const s = statFor((c) => (c.circle ?? "france") === k);
              return (
                <div
                  key={k}
                  className="flex justify-between rounded border border-border px-3 py-2"
                >
                  <span className="text-muted-foreground">{label}</span>
                  <span>
                    {s.have} / {s.all}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-2 grid gap-2 text-xs sm:grid-cols-6">
            {rarityOrder.map((r) => {
              const s = statFor((c) => c.rarity === r);
              return (
                <div key={r} className={cn("rounded border px-2 py-1 text-center", rarityClass[r])}>
                  {rarityLabel[r]} {s.have}/{s.all}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {(owned?.length ?? 0) > 0 && (
        <div className="mt-6 flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={circle === "toutes" ? "default" : "outline"}
            onClick={() => setCircle("toutes")}
          >
            Tous
          </Button>
          {Object.entries(circleLabels).map(([k, label]) => (
            <Button
              key={k}
              size="sm"
              variant={circle === k ? "default" : "outline"}
              onClick={() => setCircle(k)}
            >
              {label}
            </Button>
          ))}
          <select
            aria-label="Rareté"
            value={rarity}
            onChange={(e) => setRarity(e.target.value as Rarity | "toutes")}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="toutes">Toutes raretés</option>
            {rarityOrder.map((r) => (
              <option key={r} value={r}>
                {rarityLabel[r]}
              </option>
            ))}
          </select>
          <label className="inline-flex items-center gap-2 text-sm">
            <ArrowUpDown className="size-4 text-gold" aria-hidden />
            <select
              aria-label="Trier"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              {(Object.keys(sortLabels) as SortKey[]).map((k) => (
                <option key={k} value={k}>
                  {sortLabels[k]}
                </option>
              ))}
            </select>
          </label>
          <Button
            size="sm"
            variant={dupesOnly ? "default" : "outline"}
            onClick={() => setDupesOnly((v) => !v)}
          >
            Doublons uniquement
          </Button>
        </div>
      )}

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
          {sorted.map(({ item, count }) => (
            <LawCard
              key={item.id}
              card={item.card}
              compact
              ownedCount={count}
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
