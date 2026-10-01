import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Coins } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { importLegifranceArticles } from "@/lib/legifrance.functions";
import { fetchProfile, fetchTransactions } from "@/lib/game";

export const Route = createFileRoute("/_authenticated/portefeuille")({
  head: () => ({
    meta: [
      { title: "Portefeuille — JusCartae" },
      {
        name: "description",
        content: "Suivez votre solde de crédits, l'historique de vos boosters, achats et ventes.",
      },
      { property: "og:title", content: "Portefeuille — JusCartae" },
      { property: "og:description", content: "Solde et historique de vos opérations sur JusCartae." },
    ],
  }),
  component: Portefeuille,
});

function Portefeuille() {
  const queryClient = useQueryClient();
  const [ids, setIds] = useState("");
  const runImport = useServerFn(importLegifranceArticles);

  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: fetchProfile });
  const { data: transactions } = useQuery({
    queryKey: ["transactions"],
    queryFn: fetchTransactions,
  });

  const importMutation = useMutation({
    mutationFn: (list: string[]) => runImport({ data: { ids: list } }),
    onSuccess: (result) => {
      if (result.imported > 0) {
        toast.success(`${result.imported} article(s) ajouté(s) au catalogue.`);
        queryClient.invalidateQueries({ queryKey: ["cards"] });
      }
      if (result.errors.length > 0) toast.error(result.errors.slice(0, 3).join(" · "));
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Import impossible"),
  });

  return (
    <AppShell>
      <h1 className="text-3xl">Portefeuille</h1>

      <div className="surface-panel hero-gradient mt-6 p-8">
        <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Solde</p>
        <p className="mt-2 inline-flex items-center gap-2 font-display text-4xl">
          <Coins className="size-7 text-gold" />
          {profile?.balance ?? 0} crédits
        </p>
        <p className="mt-3 max-w-md text-sm text-muted-foreground">
          Les crédits s'obtiennent en revendant vos cartes. L'achat de crédits en euros
          sera ajouté dans une prochaine étape.
        </p>
      </div>

      <section className="mt-10">
        <h2 className="font-display text-xl">Activer un code cadeau</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Saisissez un code pour créditer votre solde. Chaque code n'est utilisable
          qu'une seule fois par joueur.
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="MARIANNE2026"
            className="max-w-xs font-mono tracking-widest"
          />
          <Button
            disabled={redeemMutation.isPending || code.trim().length === 0}
            onClick={() => redeemMutation.mutate(code)}
          >
            <Gift className="size-4" />
            {redeemMutation.isPending ? "Vérification…" : "Activer"}
          </Button>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-xl">Historique</h2>
        <div className="surface-panel mt-4 divide-y divide-border">
          {(transactions ?? []).length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground">Aucune opération pour l'instant.</p>
          ) : (
            (transactions ?? []).map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-4 p-4">
                <div>
                  <p className="text-sm">{t.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(t.created_at).toLocaleString("fr-FR")}
                  </p>
                </div>
                <span
                  className={
                    t.amount >= 0 ? "text-sm text-rarity-peu-commune" : "text-sm text-accent"
                  }
                >
                  {t.amount >= 0 ? "+" : ""}
                  {t.amount} cr.
                </span>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-xl">Enrichir le catalogue depuis Légifrance</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Collez des identifiants d'articles Légifrance (ex. LEGIARTI000006419288), un par
          ligne. Les textes sont récupérés officiellement et transformés en cartes.
        </p>
        <Textarea
          value={ids}
          onChange={(e) => setIds(e.target.value)}
          rows={4}
          placeholder={"LEGIARTI000006419288\nLEGIARTI000006428859"}
          className="mt-3"
        />
        <Button
          className="mt-3"
          disabled={importMutation.isPending}
          onClick={() =>
            importMutation.mutate(
              ids
                .split(/[\s,;]+/)
                .map((s) => s.trim())
                .filter(Boolean),
            )
          }
        >
          {importMutation.isPending ? "Import en cours…" : "Importer les articles"}
        </Button>
      </section>
    </AppShell>
  );
}
