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
        content: "Achetez et revendez des cartes juridiques entre joueurs, au prix fixé par les vendeurs.",
      },
      { property: "og:title", content: "Marché des joueurs — JusCartae" },
      { property: "og:description", content: "Le marché secondaire des cartes du droit français." },
    ],
  }),
  component: Marche;
});

function Marche() {
  return null;
}
