import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { AppShell } from "@/components/AppShell";
import { LawCard } from "@/components/LawCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchCards, rarityLabel, type Rarity } from "@/lib/game";

const rarities: (Rarity | "toutes")[] = [
  "toutes",
  "commune",
  "peu_commune",
  "rare",
  "epique",
  "legendaire",
];

export const Route = createFileRoute("/catalogue")({
  head: () => ({
    meta: [
      { title: "Catalogue des cartes — JusCartae" },
      {
        name: "description",
        content:
          "Parcourez toutes les cartes du jeu : articles du Code civil, de la Constitution, du Code pénal et arrêtés locaux, classés par rareté.",
      },
      { property: "og:title", content: "Catalogue des cartes — JusCartae" },
      {
        property: "og:description",
        content: "Tous les articles de droit disponibles en cartes, classés par rareté et par cote.",
      },
    ],
  }),
  component: Catalogue,
});

function Catalogue() {
  const [search, setSearch] = useState("");
  const [rarity, setRarity] = useState<Rarity | "toutes">("toutes");
  const { data: cards, isLoading } = useQuery({ queryKey: ["cards"], queryFn: fetchCards });

  const filtered = (cards ?? []).filter((c) => {
    const matchRarity = rarity === "toutes" || c.rarity === rarity;
    const q = search.trim().toLowerCase();
    const matchSearch =
      q === "" ||
      c.title.toLowerCase().includes(q) ||
      c.article.toLowerCase().includes(q) ||
      c.source_code.toLowerCase().includes(q) ||
      c.content.toLowerCase().includes(q);
    return matchRarity && matchSearch;
  });

  return (
    <AppShell>
      <h1 className="text-3xl">Catalogue</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {cards?.length ?? 0} cartes référencées.
      </p>

      <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un article, un code, un mot-clé…"
          className="md:max-w-sm"
        />
        <div className="flex flex-wrap gap-2">
          {rarities.map((r) => (
            <Button
              key={r}
              size="sm"
              variant={rarity === r ? "default" : "outline"}
              onClick={() => setRarity(r)}
            >
              {r === "toutes" ? "Toutes" : rarityLabel[r]}
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <p className="mt-8 text-sm text-muted-foreground">Chargement du catalogue…</p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((card) => (
            <LawCard key={card.id} card={card} />
          ))}
        </div>
      )}
    </AppShell>
  );
}
