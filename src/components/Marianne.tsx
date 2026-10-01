import coin from "@/assets/marianne-coin.png";
import { cn } from "@/lib/utils";

export function MarianneIcon({ className }: { className?: string }) {
  return <img src={coin} alt="Marianne" className={cn("inline-block size-4 rounded-full", className)} />;
}
