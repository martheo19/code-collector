import { useQuery } from "@tanstack/react-query";
import { Compass, ExternalLink } from "lucide-react";

import { MarianneIcon } from "@/components/Marianne";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { fetchDiscoverer, officialUrl, rarityClass, rarityLabel, type Card } from "@/lib/game";
import { cn } from "@/lib/utils";

function DiscovererLine({ card }: { card: Card }) {
  const { data } = useQuery({
    queryKey: ["discoverer", card.id, card.first_discovered_by],
    queryFn: () => fetchDiscoverer(card),
  });
  if (!data) return null;
  return (
    <p className="inline-flex items-center gap-2 rounded-md border border-gold/40 bg-gold/10 px-3 py-1.5 text-xs text-gold">
      <Compass className="size-3.5" />
      Premier découvreur : {data.username} le {new Date(data.at).toLocaleDateString("fr-FR")}
    </p>
  );
}

const statusLabel: Record<string, string> = {
  en_vigueur: "En vigueur",
  non_modifie: "Non modifié",
  modifie: "Modifié",
  abroge: "Abrogé",
  historique: "Historique",
};

const circleLabel: Record<string, string> = {
  france: "Droit français",
  europe: "Droit européen",
  international: "Droit international",
};

export function StatusBadge({ card }: { card: Card }) {
  const s = card.status ?? "en_vigueur";
  return (
    <span className="rounded border border-border bg-secondary px-2 py-0.5 text-[11px] font-medium text-foreground">
      {statusLabel[s] ?? s}
    </span>
  );
}

export function LawCard({
  card,
  footer,
  compact = false,
  revealed = false,
  hideFooter = false,
  ownedCount,
}: {
  card: Card;
  footer?: React.ReactNode;
  compact?: boolean;
  revealed?: boolean;
  hideFooter?: boolean;
  ownedCount?: number;
}) {
  return (
    <article
      className="law-card group relative flex flex-col transition-transform duration-[350ms] will-change-transform hover:-translate-y-1"
      data-rarity={card.rarity}
      data-revealed={revealed ? "true" : undefined}
    >
      {ownedCount !== undefined && ownedCount > 1 && (
        <span
          className="absolute left-2 top-2 z-20 inline-flex min-h-8 min-w-8 items-center justify-center rounded-full border-2 border-background bg-gold px-2 text-sm font-extrabold text-background shadow-lg"
          aria-label={`${ownedCount} exemplaires possédés`}
          title={`${ownedCount} exemplaires possédés`}
        >
          {ownedCount}
        </span>
      )}
      <Dialog>
        <DialogTrigger asChild>
          <button
            type="button"
            className="law-card-trigger relative flex aspect-[420/570] w-full flex-col overflow-hidden rounded-2xl text-left"
            aria-label={`Voir la fiche : ${card.title}`}
          >
            <span className="law-card-topline">
              <span className="law-card-brand">JusCartae · Collection du droit</span>
              <span className="law-card-rarity">{rarityLabel[card.rarity]}</span>
            </span>

            <span className="law-card-category">
              {card.category === "jurisprudence" ? "Jurisprudence" : "Texte juridique"}
            </span>

            <span className="law-card-content">
              <span className="law-card-reference">
                {card.category === "jurisprudence"
                  ? [card.authority, card.text_date].filter(Boolean).join(" · ")
                  : [card.source_code, card.article].filter(Boolean).join(" · ")}
              </span>
              <span className="law-card-title">{card.title}</span>
              <span className={cn("law-card-summary", compact && "law-card-summary-compact")}>
                {(card.summary || card.content).replace(/\s+/g, " ").trim()}
              </span>
            </span>

            <span className="law-card-bottomline">
              <span>{circleLabel[card.circle ?? "france"]}</span>
              <span className="law-card-seal" aria-hidden="true">
                §
              </span>
              <span>{statusLabel[card.status ?? "en_vigueur"] ?? "En vigueur"}</span>
            </span>
          </button>
        </DialogTrigger>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              {circleLabel[card.circle ?? "france"]} · {card.source_code} · {card.article}
            </p>
            <DialogTitle className="font-display text-2xl text-gold">{card.title}</DialogTitle>
            <DialogDescription asChild>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <StatusBadge card={card} />
                <span
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase",
                    rarityClass[card.rarity],
                  )}
                >
                  {rarityLabel[card.rarity]}
                </span>
                {card.status_note && (
                  <span className="text-xs text-muted-foreground">{card.status_note}</span>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            {card.text_date && (
              <>
                <dt className="text-muted-foreground">Date</dt>
                <dd>{card.text_date}</dd>
              </>
            )}
            {card.authority && (
              <>
                <dt className="text-muted-foreground">Autorité</dt>
                <dd>{card.authority}</dd>
              </>
            )}
            <dt className="text-muted-foreground">Référence</dt>
            <dd>{card.ref}</dd>
            <dt className="text-muted-foreground">Cote</dt>
            <dd className="inline-flex items-center gap-1">
              {card.base_value} <MarianneIcon />
            </dd>
          </dl>
          <DiscovererLine card={card} />
          {card.summary && <p className="text-sm italic text-muted-foreground">{card.summary}</p>}
          <div className="whitespace-pre-line rounded-lg border border-border bg-secondary/40 p-4 text-sm leading-relaxed">
            {card.content}
          </div>
          <a
            href={officialUrl(card)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-sm text-gold underline"
          >
            Source officielle <ExternalLink className="size-3.5" />
          </a>
        </DialogContent>
      </Dialog>
      {!hideFooter && (
        <div className="mt-auto flex items-center justify-between border-t border-border/70 px-4 py-3">
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            Cote {card.base_value} <MarianneIcon />
          </span>
          {footer}
        </div>
      )}
    </article>
  );
}
