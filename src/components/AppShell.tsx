import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { Coins, LogOut } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { fetchProfile } from "@/lib/game";

const links = [
  { to: "/catalogue", label: "Catalogue" },
  { to: "/boosters", label: "Boosters" },
  { to: "/collection", label: "Ma collection" },
  { to: "/marche", label: "Marché" },
  { to: "/portefeuille", label: "Portefeuille" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: fetchProfile });

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3">
          <Link to="/" className="font-display text-lg tracking-wide">
            Jus<span className="text-gold">Cartae</span>
          </Link>
          <nav className="hidden flex-1 items-center gap-1 md:flex">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground [&.active]:bg-secondary [&.active]:text-foreground"
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            {profile ? (
              <>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-3 py-1 text-sm">
                  <Coins className="size-4 text-gold" />
                  {profile.balance}
                </span>
                <span className="hidden text-sm text-muted-foreground sm:inline">
                  {profile.username}
                </span>
                <Button variant="ghost" size="icon" onClick={signOut} aria-label="Se déconnecter">
                  <LogOut className="size-4" />
                </Button>
              </>
            ) : (
              <Button asChild size="sm">
                <Link to="/auth">Se connecter</Link>
              </Button>
            )}
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto border-t border-border/60 px-4 py-2 md:hidden">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="whitespace-nowrap rounded-md px-3 py-1 text-sm text-muted-foreground [&.active]:bg-secondary [&.active]:text-foreground"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
