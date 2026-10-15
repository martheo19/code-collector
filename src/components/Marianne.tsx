import denier from "@/assets/denier.png.asset.json";
const coin = denier.url;
import { cn } from "@/lib/utils";

export function MarianneIcon({ className }: { className?: string }) {
  return <img src={coin} alt="Denier" className={cn("inline-block size-4 rounded-full", className)} />;
}
