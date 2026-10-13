import { useQuery } from "@tanstack/react-query";
import { Compass, ExternalLink } from "lucide-react";

import { MarianneIcon } from "@/components/Marianne";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { fetchDiscoverer, officialUrl, rarityClass, rarityLabel, type Card } from "@/lib/game";

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
import { cn } from "@/lib/utils";

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

export function LawCard({ card, footer, compact = false }: { card: Card; footer?: React.ReactNode; compact?: boolean }) {
  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl border bg-card shadow-[var(--shadow-card)] transition-transform duration-200 hover:-translate-y-1",
        rarityClass[card.rarity],
      )}
    >
      <Dialog>
        <DialogTrigger asChild>
          <button type="button" className="flex flex-1 flex-col text-left" aria-label={`Voir la fiche : ${card.title}`}>
            <div className="tricolore-rule h-1 w-full opacity-80" />
            <div className="flex items-start justify-between gap-3 px-4 pt-4">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{card.source_code}</p>
                <h3 className="font-display text-lg leading-tight text-foreground">{card.article}</h3>
              </div>
              <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider", rarityClass[card.rarity])}>
                {rarityLabel[card.rarity]}
              </span>
            </div>
            <p className="px-4 pt-2 font-display text-sm text-gold">{card.title}</p>
            <div className="px-4 pt-2"><StatusBadge card={card} /></div>
            <p className={cn("px-4 pb-4 pt-2 text-sm leading-relaxed text-muted-foreground", compact ? "line-clamp-3" : "line-clamp-6")}>
              {card.summary || card.content}
            </p>
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
                <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase", rarityClass[card.rarity])}>
                  {rarityLabel[card.rarity]}
                </span>
                {card.status_note && <span className="text-xs text-muted-foreground">{card.status_note}</span>}
              </div>
            </DialogDescription>
          </DialogHeader>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            {card.text_date && (<><dt className="text-muted-foreground">Date</dt><dd>{card.text_date}</dd></>)}
            {card.authority && (<><dt className="text-muted-foreground">Autorité</dt><dd>{card.authority}</dd></>)}
            <dt className="text-muted-foreground">Référence</dt><dd>{card.ref}</dd>
            <dt className="text-muted-foreground">Cote</dt><dd className="inline-flex items-center gap-1">{card.base_value} <MarianneIcon /></dd>
          </dl>
          <DiscovererLine card={card} />
          {card.summary && <p className="text-sm italic text-muted-foreground">{card.summary}</p>}
          <div className="whitespace-pre-line rounded-lg border border-border bg-secondary/40 p-4 text-sm leading-relaxed">{card.content}</div>
          <a href={officialUrl(card)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-gold underline">
            Source officielle <ExternalLink className="size-3.5" />
          </a>
        </DialogContent>
      </Dialog>
      <div className="mt-auto flex items-center justify-between border-t border-border/70 px-4 py-3">
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          Cote {card.base_value} <MarianneIcon />
        </span>
        {footer}
      </div>
    </article>
  );
}
