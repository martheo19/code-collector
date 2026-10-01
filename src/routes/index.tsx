import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Gift, Landmark, Repeat } from "lucide-react";

import heroImage from "@/assets/hero.jpg";
import { AppShell } from "@/components/AppShell";
import { LawCard } from "@/components/LawCard";
import { Button } from "@/components/ui/button";
import { fetchCards } from "@/lib/game";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "JusCartae — collectionnez le droit français" },
      {
        name: "description",
        content:
          "Ouvrez des boosters d'articles du Code civil et de la Constitution, complétez votre collection et revendez vos cartes sur le marché entre joueurs.",
      },
      { property: "og:title", content: "JusCartae — collectionnez le droit français" },
      {
        property: "og:description",
        content: "Boosters, collection et marché secondaire autour des textes juridiques français.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const { data: cards } = useQuery({ queryKey: ["cards"], queryFn: fetchCards });
  const highlights = (cards ?? []).slice(0, 6);

  return (
    <AppShell>
      <section className="hero-gradient surface-panel relative overflow-hidden px-6 py-12 md:px-12 md:py-16">
        <div className="relative z-10 max-w-xl">
          <p className="text-xs uppercase tracking-[0.3em] text-gold">
            Jeu de cartes à collectionner
          </p>
          <h1 className="mt-4 text-4xl leading-tight md:text-5xl">
            Le droit français devient une collection.
          </h1>
          <p className="mt-4 text-muted-foreground">
            Chaque article du Code civil, de la Constitution ou d'un arrêté municipal
            devient une carte avec sa rareté et sa cote. Ouvrez des boosters,
            complétez votre collection, revendez vos pièces rares.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/boosters">Ouvrir un booster</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/catalogue">Voir le catalogue</Link>
            </Button>
          </div>
        </div>
        <img
          src={heroImage}
          alt="Cartes à collectionner inspirées du droit français"
          width={1600}
          height={912}
          className="pointer-events-none absolute right-0 top-0 hidden h-full w-1/2 object-cover opacity-45 [mask-image:linear-gradient(to_right,transparent,black_40%)] lg:block"
        />
      </section>

      <section className="mt-10 grid gap-4 md:grid-cols-3">
        {[
          { icon: Gift, title: "Boosters", text: "3 cartes tirées au sort, 150 Mariannes le paquet." },
          { icon: Landmark, title: "Textes officiels", text: "Articles issus des sources publiques du droit français." },
          { icon: Repeat, title: "Marché entre joueurs", text: "Fixez votre prix, revendez et faites du profit." },
        ].map((f) => (
          <div key={f.title} className="surface-panel p-5">
            <f.icon className="size-5 text-gold" />
            <h2 className="mt-3 font-display text-lg">{f.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
          </div>
        ))}
      </section>

      <section className="mt-12">
        <h2 className="font-display text-2xl">Pièces maîtresses du catalogue</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {highlights.map((card) => (
            <LawCard key={card.id} card={card} compact />
          ))}
        </div>
      </section>
    </AppShell>
  );
}
