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
  "mythique",
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

const circles = [
  ["toutes", "Tous les cercles"],
  ["france", "Droit français"],
  ["europe", "Droit européen"],
  ["international", "Droit international"],
] as const;
const statuses = [
  ["tous", "Tous statuts"],
  ["en_vigueur", "En vigueur"],
  ["non_modifie", "Non modifié"],
  ["modifie", "Modifié"],
  ["abroge", "Abrogé"],
  ["historique", "Historique"],
] as const;
const sorts = [
  ["cote_desc", "Cote décroissante"],
  ["cote_asc", "Cote croissante"],
  ["date_asc", "Date (plus ancien)"],
  ["date_desc", "Date (plus récent)"],
] as const;

function yearOf(d?: string | null) {
  const m = d?.match(/\d{4}/);
  return m ? Number(m[0]) : null;
}

function Catalogue() {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [rarity, setRarity] = useState<Rarity | "toutes">("toutes");
  const [circle, setCircle] = useState<string>("toutes");
  const [status, setStatus] = useState<string>("tous");
  const [sort, setSort] = useState<string>("cote_desc");
  const [page, setPage] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 350);
    return () => clearTimeout(t);
  }, [search]);
  useEffect(() => setPage(0), [debounced, rarity, circle, status, sort]);

  const filters = { search: debounced, rarity, circle, status, sort };
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["cards-page", filters, page],
    queryFn: () => fetchCardsPage(filters, page),
    placeholderData: keepPreviousData,
  });
  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const selectClass =
    "h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground";

  const pager = (
    <div className="flex items-center gap-3">
      <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Précédent</Button>
      <span className="text-sm text-muted-foreground">Page {page + 1} / {pages}</span>
      <Button size="sm" variant="outline" disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)}>Suivant</Button>
    </div>
  );

  return (
    <AppShell>
      <h1 className="text-3xl">Catalogue</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {total.toLocaleString("fr-FR")} cartes correspondent{isFetching ? " · chargement…" : ""}.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {circles.map(([value, label]) => (
          <Button
            key={value}
            size="sm"
            variant={circle === value ? "default" : "outline"}
            onClick={() => setCircle(value)}
          >
            {label}
          </Button>
        ))}
      </div>

      <div className="mt-3 flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un titre, un article, un code…"
          className="md:max-w-sm"
        />
        <select aria-label="Statut" value={status} onChange={(e) => setStatus(e.target.value)} className={selectClass}>
          {statuses.map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <select aria-label="Tri" value={sort} onChange={(e) => setSort(e.target.value)} className={selectClass}>
          {sorts.map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
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

      {isLoading ? (
        <p className="mt-8 text-sm text-muted-foreground">Chargement du catalogue…</p>
      ) : (
        <>
          <div className="mt-6">{pager}</div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(data?.cards ?? []).map((card) => (
              <LawCard key={card.id} card={card} />
            ))}
          </div>
          <div className="mt-6">{pager}</div>
        </>
      )}
    </AppShell>
  );
}
