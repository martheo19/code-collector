import { Scale } from "lucide-react";

import { rarityClass, rarityLabel, type Card } from "@/lib/game";
import { cn } from "@/lib/utils";

export function LawCard({
  card,
  footer,
  compact = false,
}: {
  card: Card;
  footer?: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl border bg-card shadow-[var(--shadow-card)] transition-transform duration-200 hover:-translate-y-1",
        rarityClass[card.rarity],
      )}
    >
      <div className="tricolore-rule h-1 w-full opacity-80" />
      <div className="flex items-start justify-between gap-3 px-4 pt-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            {card.source_code}
          </p>
          <h3 className="font-display text-lg leading-tight text-foreground">
            {card.article}
          </h3>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
            rarityClass[card.rarity],
          )}
        >
          {rarityLabel[card.rarity]}
        </span>
      </div>

      <p className="px-4 pt-2 font-display text-sm text-gold">{card.title}</p>

      <p
        className={cn(
          "px-4 pb-4 pt-2 text-sm leading-relaxed text-muted-foreground",
          compact ? "line-clamp-3" : "line-clamp-6",
        )}
      >
        {card.content}
      </p>

      <div className="mt-auto flex items-center justify-between border-t border-border/70 px-4 py-3">
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <Scale className="size-3.5" />
          Cote {card.base_value} cr.
        </span>
        {footer}
      </div>
    </article>
  );
}
