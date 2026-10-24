import { MarianneIcon } from "@/components/Marianne";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { fetchProfile } from "@/lib/game";

const announcementStyle = {
  gold: "bg-amber-300 text-amber-950 border-amber-500",
  blue: "bg-blue-700 text-white border-blue-950",
  red: "bg-red-700 text-white border-red-950",
  green: "bg-emerald-700 text-white border-emerald-950",
  purple: "bg-purple-700 text-white border-purple-950",
  dark: "bg-slate-950 text-white border-slate-700",
} as const;
const announcementShape = {
  bar: "rounded-none",
  rounded: "rounded-xl",
  pill: "rounded-full",
} as const;
const announcementFont = {
  sans: "font-sans",
  serif: "font-serif",
  display: "font-display",
} as const;

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
  const { data: isGodAdmin } = useQuery({
    queryKey: ["god-admin"],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("is_god_admin");
      if (error) throw error;
      return data;
    },
  });
  const announcement = useQuery({
    queryKey: ["active-announcement"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("announcements")
        .select("message, color, shape, font, starts_at, expires_at")
        .eq("id", 1)
        .lte("starts_at", new Date().toISOString())
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    refetchInterval: 60_000,
  });

  useEffect(() => {
    const expiresAt = announcement.data?.expires_at;
    if (!expiresAt) return;
    const remaining = new Date(expiresAt).getTime() - Date.now();
    if (remaining <= 0) {
      void queryClient.invalidateQueries({ queryKey: ["active-announcement"] });
      return;
    }
    const timer = window.setTimeout(
      () => void queryClient.invalidateQueries({ queryKey: ["active-announcement"] }),
      remaining,
    );
    return () => window.clearTimeout(timer);
  }, [announcement.data?.expires_at, queryClient]);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      {announcement.data && (
        <div
          role="status"
          className={`announcement-marquee mx-auto w-full overflow-hidden border-y-2 px-0 py-2 ${announcementStyle[announcement.data.color as keyof typeof announcementStyle] ?? announcementStyle.gold} ${announcementShape[announcement.data.shape as keyof typeof announcementShape] ?? announcementShape.bar}`}
        >
          <div className="announcement-marquee-track">
            <span
              className={
                announcementFont[announcement.data.font as keyof typeof announcementFont] ??
                announcementFont.sans
              }
            >
              {announcement.data.message}
            </span>
            <span
              aria-hidden="true"
              className={
                announcementFont[announcement.data.font as keyof typeof announcementFont] ??
                announcementFont.sans
              }
            >
              {announcement.data.message}
            </span>
          </div>
        </div>
      )}
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
            {isGodAdmin && (
              <Link
                to="/god-mode"
                className="rounded-md px-3 py-1.5 text-sm text-gold transition-colors hover:bg-secondary"
              >
                God Mode
              </Link>
            )}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            {profile ? (
              <>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-3 py-1 text-sm">
                  <MarianneIcon className="size-5" />
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
          {isGodAdmin && (
            <Link
              to="/god-mode"
              className="whitespace-nowrap rounded-md px-3 py-1 text-sm text-gold"
            >
              God Mode
            </Link>
          )}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
