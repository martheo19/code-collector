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
import { frameFor } from "@/lib/card-frames";
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
    <article className="group relative flex flex-col transition-transform duration-200 hover:-translate-y-1">
      <Dialog>
        <DialogTrigger asChild>
          <button
            type="button"
            className="relative block aspect-[420/570] w-full overflow-hidden rounded-2xl text-left shadow-[var(--shadow-card)]"
            aria-label={`Voir la fiche : ${card.title}`}
          >
            <img src={frameFor(card.rarity, card.category)} alt="" aria-hidden className={cn("absolute inset-0 size-full object-cover", card.rarity === "peu_commune" && "peu-commune-tint")} />
            <div className={cn("card-ink absolute inset-0", inkOf(card.rarity, card.category) === "light" ? "card-ink-light" : "card-ink-dark")}>
              <div className="absolute left-[17%] right-[27%] top-[16.2%] flex h-[7.6%] items-center [container-type:inline-size]">
                <h3 className={cn("card-title w-full font-display leading-[1.05] line-clamp-2", card.title.length > 32 ? "text-[6.5cqw]" : card.title.length > 18 ? "text-[8cqw]" : "text-[10cqw]")}>
                  {card.title}
                </h3>
              </div>
              <div className="absolute left-[19%] right-[19%] top-[27.5%] bottom-[23%] flex flex-col gap-[3%] overflow-hidden text-center [container-type:inline-size]">
                <p className="text-[5.2cqw] font-semibold uppercase tracking-[0.12em] opacity-80">
                  {card.category === "jurisprudence"
                    ? [card.authority, card.text_date].filter(Boolean).join(" · ")
                    : [card.source_code, card.article].filter(Boolean).join(" · ")}
                </p>
                <p className={cn("card-body text-[6.2cqw] leading-snug", compact ? "line-clamp-[9]" : "line-clamp-[11]")}>
                  {card.summary || card.content}
                </p>
              </div>
              <p className="card-title absolute inset-x-[20%] top-[80.5%] h-[7.5%] flex items-center justify-center font-display text-[clamp(10px,4.2cqw,22px)] uppercase tracking-[0.14em] [container-type:inline-size]">
                <span className="text-[9cqw]">{rarityLabel[card.rarity]}</span>
              </p>
            </div>
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
