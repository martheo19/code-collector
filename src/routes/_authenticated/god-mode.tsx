import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/god-mode")({
  head: () => ({
    meta: [{ title: "God Mode — JusCartae" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: GodMode,
});

const rollbackWindows = [
  { value: 30, label: "30 dernières minutes" },
  { value: 120, label: "2 dernières heures" },
  { value: 1440, label: "24 dernières heures" },
] as const;

const dropRarities = [
  { key: "commune", label: "Commune" },
  { key: "peu_commune", label: "Peu commune" },
  { key: "rare", label: "Rare" },
  { key: "epique", label: "Épique" },
  { key: "legendaire", label: "Légendaire" },
  { key: "mythique", label: "Mythique" },
] as const;
const collectionBreakdownTypes = ["Rareté", "Cercle juridique", "Type de carte"] as const;
type CollectionBreakdownType = (typeof collectionBreakdownTypes)[number];
const announcementColors = [
  { value: "gold", label: "Or" },
  { value: "blue", label: "Bleu" },
  { value: "red", label: "Rouge" },
  { value: "green", label: "Vert" },
  { value: "purple", label: "Violet" },
  { value: "dark", label: "Nuit" },
] as const;
const announcementShapes = [
  { value: "bar", label: "Bande droite" },
  { value: "rounded", label: "Coins arrondis" },
  { value: "pill", label: "Pillule" },
] as const;
const announcementFonts = [
  { value: "sans", label: "Sans sérif" },
  { value: "serif", label: "Sérif" },
  { value: "display", label: "Marcellus (titres)" },
] as const;
const announcementPreviewColors = {
  gold: "bg-amber-300 text-amber-950 border-amber-500",
  blue: "bg-blue-700 text-white border-blue-950",
  red: "bg-red-700 text-white border-red-950",
  green: "bg-emerald-700 text-white border-emerald-950",
  purple: "bg-purple-700 text-white border-purple-950",
  dark: "bg-slate-950 text-white border-slate-700",
} as const;
const announcementPreviewShapes = {
  bar: "rounded-none",
  rounded: "rounded-xl",
  pill: "rounded-full",
} as const;
const announcementPreviewFonts = {
  sans: "font-sans",
  serif: "font-serif",
  display: "font-display",
} as const;
const godModeSections = [
  { id: "announcements", label: "Annonce globale" },
  { id: "players", label: "Rechercher un joueur" },
  { id: "player-overview", label: "Remplissage collection" },
  { id: "player-categories", label: "Catégories et cartes manquantes" },
  { id: "player-balance", label: "Solde du joueur" },
  { id: "player-inventory", label: "Inventaire et ajout de carte" },
  { id: "player-drop-rates", label: "Taux de drop" },
  { id: "player-sales", label: "Historique des ventes" },
  { id: "player-draws", label: "Tirages des boosters" },
  { id: "emergency-rollback", label: "Rollback d’urgence" },
  { id: "reset-discoveries", label: "Premières découvertes" },
  { id: "audit-log", label: "Journal d’audit" },
] as const;
type DropRarity = (typeof dropRarities)[number]["key"];

const defaultDropRates: Record<DropRarity, string> = {
  commune: "48",
  peu_commune: "27",
  rare: "15",
  epique: "7.2",
  legendaire: "2.4",
  mythique: "0.4",
};

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString("fr-FR") : "—";
}

function GodMode() {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [cardsPage, setCardsPage] = useState(0);
  const [missingCardsPage, setMissingCardsPage] = useState(0);
  const [missingCardsSearch, setMissingCardsSearch] = useState("");
  const [collectionBreakdownType, setCollectionBreakdownType] =
    useState<CollectionBreakdownType>("Rareté");
  const [delta, setDelta] = useState("");
  const [balanceReason, setBalanceReason] = useState("");
  const [cardReason, setCardReason] = useState("");
  const [grantCardSearch, setGrantCardSearch] = useState("");
  const [grantCardId, setGrantCardId] = useState("");
  const [grantReason, setGrantReason] = useState("");
  const [dropReason, setDropReason] = useState("");
  const [dropRates, setDropRates] = useState<Record<DropRarity, string>>(defaultDropRates);
  const [rollbackReason, setRollbackReason] = useState("");
  const [rollbackWindow, setRollbackWindow] = useState(30);
  const [rollbackConfirmed, setRollbackConfirmed] = useState(false);
  const [discoveryResetReason, setDiscoveryResetReason] = useState("");
  const [discoveryResetConfirmed, setDiscoveryResetConfirmed] = useState(false);
  const [announcementMessage, setAnnouncementMessage] = useState("");
  const [announcementDuration, setAnnouncementDuration] = useState("60");
  const [announcementColor, setAnnouncementColor] =
    useState<(typeof announcementColors)[number]["value"]>("gold");
  const [announcementShape, setAnnouncementShape] =
    useState<(typeof announcementShapes)[number]["value"]>("bar");
  const [announcementFont, setAnnouncementFont] =
    useState<(typeof announcementFonts)[number]["value"]>("sans");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  const access = useQuery({
    queryKey: ["god-admin"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("is_god_admin");
      if (error) throw error;
      return data;
    },
  });
  const isAdmin = access.data === true;

  useEffect(() => {
    if (!isAdmin) return;
    const channel = supabase
      .channel("god-mode-booster-draws")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "booster_draws" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["god-mode", "draws"] });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [isAdmin, queryClient]);

  const players = useQuery({
    queryKey: ["god-mode", "players", debouncedQuery],
    enabled: isAdmin && debouncedQuery.length >= 2,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_search_players", {
        p_query: debouncedQuery,
      });
      if (error) throw error;
      return data;
    },
  });

  const playerCards = useQuery({
    queryKey: ["god-mode", "cards", selectedUserId, cardsPage],
    enabled: isAdmin && !!selectedUserId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_player_cards", {
        p_user_id: selectedUserId!,
        p_limit: 100,
        p_offset: cardsPage * 100,
      });
      if (error) throw error;
      return data;
    },
  });
  const collectionStats = useQuery({
    queryKey: ["god-mode", "collection-stats", selectedUserId],
    enabled: isAdmin && !!selectedUserId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_player_collection_stats", {
        p_user_id: selectedUserId!,
      });
      if (error) throw error;
      return data[0];
    },
  });
  const collectionBreakdown = useQuery({
    queryKey: ["god-mode", "collection-breakdown", selectedUserId],
    enabled: isAdmin && !!selectedUserId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_player_collection_breakdown", {
        p_user_id: selectedUserId!,
      });
      if (error) throw error;
      return data;
    },
  });
  const missingCards = useQuery({
    queryKey: [
      "god-mode",
      "missing-cards",
      selectedUserId,
      missingCardsSearch.trim(),
      missingCardsPage,
    ],
    enabled: isAdmin && !!selectedUserId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_missing_player_cards", {
        p_user_id: selectedUserId!,
        p_query: missingCardsSearch.trim(),
        p_limit: 50,
        p_offset: missingCardsPage * 50,
      });
      if (error) throw error;
      return data;
    },
  });
  const dropRateSettings = useQuery({
    queryKey: ["god-mode", "drop-rates", selectedUserId],
    enabled: isAdmin && !!selectedUserId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_get_player_drop_rates", {
        p_user_id: selectedUserId!,
      });
      if (error) throw error;
      return data[0];
    },
  });
  const cardOptions = useQuery({
    queryKey: ["god-mode", "card-options", grantCardSearch.trim()],
    enabled: isAdmin && grantCardSearch.trim().length >= 2,
    queryFn: async () => {
      const search = grantCardSearch.trim().replace(/[%_,()]/g, " ");
      const { data, error } = await supabase
        .from("cards")
        .select("id, title, ref, rarity")
        .ilike("title", `%${search}%`)
        .order("title")
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });
  const activeAnnouncement = useQuery({
    queryKey: ["active-announcement"],
    enabled: isAdmin,
    refetchInterval: 60_000,
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
  });
  useEffect(() => {
    const rates = dropRateSettings.data;
    if (!rates) return;
    setDropRates({
      commune: String(rates.commune),
      peu_commune: String(rates.peu_commune),
      rare: String(rates.rare),
      epique: String(rates.epique),
      legendaire: String(rates.legendaire),
      mythique: String(rates.mythique),
    });
  }, [dropRateSettings.data]);
  const draws = useQuery({
    queryKey: ["god-mode", "draws", selectedUserId],
    enabled: isAdmin,
    refetchInterval: 15_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_recent_draws", {
        p_user_id: selectedUserId,
      });
      if (error) throw error;
      return data;
    },
  });
  const sales = useQuery({
    queryKey: ["god-mode", "sales", selectedUserId],
    enabled: isAdmin && !!selectedUserId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_market_history", {
        p_user_id: selectedUserId!,
      });
      if (error) throw error;
      return data;
    },
  });
  const audit = useQuery({
    queryKey: ["god-mode", "audit"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_recent_audit");
      if (error) throw error;
      return data;
    },
  });
  const rollbackPreview = useQuery({
    queryKey: ["god-mode", "rollback-preview", rollbackWindow],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_preview_rollback", {
        p_window_minutes: rollbackWindow,
      });
      if (error) throw error;
      return data[0];
    },
  });

  const refreshAdminData = () => {
    void queryClient.invalidateQueries({ queryKey: ["god-mode"] });
    void queryClient.invalidateQueries({ queryKey: ["profile"] });
    void queryClient.invalidateQueries({ queryKey: ["collection"] });
    void queryClient.invalidateQueries({ queryKey: ["transactions"] });
    void queryClient.invalidateQueries({ queryKey: ["listings"] });
  };

  const adjustBalance = useMutation({
    mutationFn: async () => {
      if (!selectedUserId) throw new Error("Choisissez un joueur");
      const amount = Number(delta);
      if (!Number.isInteger(amount) || amount === 0)
        throw new Error("Saisissez un montant entier non nul");
      const { data, error } = await supabase.rpc("admin_adjust_balance", {
        p_user_id: selectedUserId,
        p_delta: amount,
        p_reason: balanceReason,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (balance) => {
      toast.success(`Solde ajusté. Nouveau solde : ${balance} Deniers.`);
      setDelta("");
      setBalanceReason("");
      refreshAdminData();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Ajustement refusé"),
  });

  const revokeCard = useMutation({
    mutationFn: async (userCardId: string) => {
      const { error } = await supabase.rpc("admin_revoke_card", {
        p_user_card_id: userCardId,
        p_reason: cardReason,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Carte supprimée de l’inventaire du compte. Sa trace d’audit est conservée.");
      setCardReason("");
      setCardsPage(0);
      refreshAdminData();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Retrait refusé"),
  });

  const revokeAllPlayerCards = useMutation({
    mutationFn: async () => {
      if (!selectedUserId) throw new Error("Choisissez un joueur");
      const { data, error } = await supabase.rpc("admin_revoke_player_cards", {
        p_user_id: selectedUserId,
        p_reason: cardReason,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (count) => {
      toast.success(`${count} carte(s) retirée(s) de la collection du joueur.`);
      setCardReason("");
      setCardsPage(0);
      refreshAdminData();
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Retrait des cartes impossible"),
  });

  const grantCard = useMutation({
    mutationFn: async () => {
      if (!selectedUserId || !grantCardId) throw new Error("Choisissez un joueur et une carte");
      const { error } = await supabase.rpc("admin_grant_card", {
        p_user_id: selectedUserId,
        p_card_id: grantCardId,
        p_reason: grantReason,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Carte ajoutée à la collection du joueur.");
      setGrantReason("");
      setGrantCardId("");
      setGrantCardSearch("");
      setCardsPage(0);
      refreshAdminData();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Ajout impossible"),
  });

  const parsedDropRates = Object.fromEntries(
    dropRarities.map(({ key }) => [key, Number(dropRates[key])]),
  ) as Record<DropRarity, number>;
  const dropRatesTotal = dropRarities.reduce(
    (sum, { key }) => sum + (Number.isFinite(parsedDropRates[key]) ? parsedDropRates[key] : 0),
    0,
  );
  const validDropRates =
    dropRarities.every(({ key }) => {
      const raw = dropRates[key].trim();
      const value = parsedDropRates[key];
      return (
        raw !== "" &&
        Number.isFinite(value) &&
        value >= 0 &&
        value <= 100 &&
        /^\d{1,3}(\.\d{1,2})?$/.test(raw)
      );
    }) && Math.round(dropRatesTotal * 100) === 10000;

  const saveDropRates = useMutation({
    mutationFn: async () => {
      if (!selectedUserId) throw new Error("Choisissez un joueur");
      if (!validDropRates) throw new Error("La somme des taux doit être égale à 100 %");
      const { error } = await supabase.rpc("admin_set_player_drop_rates", {
        p_user_id: selectedUserId,
        p_commune: parsedDropRates.commune,
        p_peu_commune: parsedDropRates.peu_commune,
        p_rare: parsedDropRates.rare,
        p_epique: parsedDropRates.epique,
        p_legendaire: parsedDropRates.legendaire,
        p_mythique: parsedDropRates.mythique,
        p_reason: dropReason,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Taux de drop individuels mis à jour.");
      setDropReason("");
      void queryClient.invalidateQueries({
        queryKey: ["god-mode", "drop-rates", selectedUserId],
      });
      void queryClient.invalidateQueries({ queryKey: ["god-mode", "audit"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Mise à jour refusée"),
  });

  const resetDropRates = useMutation({
    mutationFn: async () => {
      if (!selectedUserId) throw new Error("Choisissez un joueur");
      const { error } = await supabase.rpc("admin_reset_player_drop_rates", {
        p_user_id: selectedUserId,
        p_reason: dropReason,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Les taux par défaut sont rétablis pour ce joueur.");
      setDropReason("");
      void queryClient.invalidateQueries({
        queryKey: ["god-mode", "drop-rates", selectedUserId],
      });
      void queryClient.invalidateQueries({ queryKey: ["god-mode", "audit"] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Réinitialisation refusée"),
  });

  const resetAllDiscoveries = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("admin_reset_all_first_discoveries", {
        p_reason: discoveryResetReason,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (count) => {
      toast.success(`${count} première(s) découverte(s) réinitialisée(s).`);
      setDiscoveryResetReason("");
      setDiscoveryResetConfirmed(false);
      void queryClient.invalidateQueries({ queryKey: ["cards-page"] });
      void queryClient.invalidateQueries({ queryKey: ["cards-top"] });
      void queryClient.invalidateQueries({ queryKey: ["discoverer"] });
      void queryClient.invalidateQueries({ queryKey: ["god-mode", "audit"] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Réinitialisation impossible"),
  });

  const publishAnnouncement = useMutation({
    mutationFn: async () => {
      const duration = Number(announcementDuration);
      if (!Number.isInteger(duration) || duration < 1 || duration > 10080) {
        throw new Error("La durée doit être comprise entre 1 et 10 080 minutes");
      }
      const message = announcementMessage.trim();
      if (!message || message.length > 500) {
        throw new Error("Le message doit contenir entre 1 et 500 caractères");
      }
      const { data, error } = await supabase.rpc("admin_set_announcement", {
        p_message: message,
        p_duration_minutes: duration,
        p_color: announcementColor,
        p_shape: announcementShape,
        p_font: announcementFont,
      });
      if (error) throw error;
      return data[0];
    },
    onSuccess: () => {
      toast.success("Annonce publiée pour tous les joueurs.");
      setAnnouncementMessage("");
      void queryClient.invalidateQueries({ queryKey: ["active-announcement"] });
      void queryClient.invalidateQueries({ queryKey: ["god-mode", "audit"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Publication refusée"),
  });

  const endAnnouncement = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("admin_end_announcement");
      if (error) throw error;
      return data;
    },
    onSuccess: (ended) => {
      toast.success(ended ? "Annonce terminée." : "Aucune annonce active à terminer.");
      void queryClient.invalidateQueries({ queryKey: ["active-announcement"] });
      void queryClient.invalidateQueries({ queryKey: ["god-mode", "audit"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Action refusée"),
  });

  const applyRollback = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("admin_apply_rollback", {
        p_window_minutes: rollbackWindow,
        p_reason: rollbackReason,
      });
      if (error) throw error;
      return data[0];
    },
    onSuccess: (result) => {
      toast.success(
        `Rollback terminé : ${result.cards_revoked} carte(s) retirée(s), ${result.discoveries_reset} découverte(s) réinitialisée(s).`,
      );
      setRollbackReason("");
      setRollbackConfirmed(false);
      refreshAdminData();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Rollback refusé"),
  });

  if (access.isLoading) {
    return (
      <AppShell>
        <p role="status" className="text-sm text-muted-foreground">
          Vérification des droits administrateur…
        </p>
      </AppShell>
    );
  }
  if (access.error) {
    return (
      <AppShell>
        <p role="alert" className="text-sm text-destructive">
          Impossible de vérifier l’accès administrateur : {access.error.message}
        </p>
      </AppShell>
    );
  }
  if (!isAdmin) {
    return (
      <AppShell>
        <section className="surface-panel p-6">
          <h1 className="font-display text-2xl">Accès refusé</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Ce compte n’a pas les droits God Mode. Chaque action est également protégée côté base de
            données.
          </p>
        </section>
      </AppShell>
    );
  }

  const selectedPlayer = players.data?.find((player) => player.user_id === selectedUserId);
  const preview = rollbackPreview.data;

  return (
    <AppShell>
      <h1 className="font-display text-3xl">God Mode</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Outils d’administration sécurisés. Chaque modification exige un motif et est inscrite dans
        le journal d’audit.
      </p>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <aside className="surface-panel top-24 p-4 lg:sticky">
          <h2 className="font-display text-lg">Rubriques</h2>
          <nav
            aria-label="Rubriques du God Mode"
            className="mt-3 flex gap-1 overflow-x-auto lg:flex-col"
          >
            {godModeSections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="whitespace-nowrap rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {section.label}
              </a>
            ))}
          </nav>
        </aside>
        <div className="min-w-0 space-y-6">
          <section id="announcements" className="surface-panel scroll-mt-24 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-xl">Annonce globale en banderole</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Une seule annonce à la fois ; la publication remplace l’annonce active. Elle
                  disparaît automatiquement à la fin de sa durée.
                </p>
              </div>
              {activeAnnouncement.data && (
                <Button
                  variant="destructive"
                  disabled={endAnnouncement.isPending}
                  onClick={() => endAnnouncement.mutate()}
                >
                  {endAnnouncement.isPending ? "Arrêt…" : "Terminer l’annonce"}
                </Button>
              )}
            </div>
            {activeAnnouncement.error && (
              <p role="alert" className="mt-2 text-sm text-destructive">
                {activeAnnouncement.error.message}
              </p>
            )}
            {activeAnnouncement.data && (
              <p className="mt-3 text-sm text-muted-foreground">
                Annonce active jusqu’au {formatDate(activeAnnouncement.data.expires_at)} :
                <span className="ml-1 font-medium text-foreground">
                  {activeAnnouncement.data.message}
                </span>
              </p>
            )}
            <label htmlFor="announcement-message" className="mt-4 block text-sm font-medium">
              Message (500 caractères maximum)
            </label>
            <textarea
              id="announcement-message"
              value={announcementMessage}
              onChange={(event) => setAnnouncementMessage(event.target.value)}
              maxLength={500}
              rows={3}
              placeholder="Message qui défilera pour tous les joueurs"
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <p className="mt-1 text-right text-xs text-muted-foreground">
              {announcementMessage.length}/500
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="text-sm">
                <span className="mb-1 block">Durée (minutes, maximum 10 080)</span>
                <Input
                  type="number"
                  min={1}
                  max={10080}
                  step={1}
                  value={announcementDuration}
                  onChange={(event) => setAnnouncementDuration(event.target.value)}
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block">Couleur</span>
                <select
                  value={announcementColor}
                  onChange={(event) =>
                    setAnnouncementColor(
                      event.target.value as (typeof announcementColors)[number]["value"],
                    )
                  }
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  {announcementColors.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                <span className="mb-1 block">Forme</span>
                <select
                  value={announcementShape}
                  onChange={(event) =>
                    setAnnouncementShape(
                      event.target.value as (typeof announcementShapes)[number]["value"],
                    )
                  }
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  {announcementShapes.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                <span className="mb-1 block">Police</span>
                <select
                  value={announcementFont}
                  onChange={(event) =>
                    setAnnouncementFont(
                      event.target.value as (typeof announcementFonts)[number]["value"],
                    )
                  }
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  {announcementFonts.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div
              aria-label="Aperçu de la banderole"
              className={`announcement-marquee mt-4 overflow-hidden border-2 px-0 py-2 ${announcementPreviewColors[announcementColor]} ${announcementPreviewShapes[announcementShape]}`}
            >
              <div className="announcement-marquee-track">
                <span className={announcementPreviewFonts[announcementFont]}>
                  {announcementMessage.trim() || "Aperçu de votre annonce"}
                </span>
                <span aria-hidden="true" className={announcementPreviewFonts[announcementFont]}>
                  {announcementMessage.trim() || "Aperçu de votre annonce"}
                </span>
              </div>
            </div>
            <Button
              className="mt-4"
              disabled={
                publishAnnouncement.isPending ||
                announcementMessage.trim().length === 0 ||
                announcementMessage.trim().length > 500 ||
                !Number.isInteger(Number(announcementDuration)) ||
                Number(announcementDuration) < 1 ||
                Number(announcementDuration) > 10080
              }
              onClick={() => publishAnnouncement.mutate()}
            >
              {publishAnnouncement.isPending
                ? "Publication…"
                : activeAnnouncement.data
                  ? "Remplacer et publier l’annonce"
                  : "Publier la banderole"}
            </Button>
          </section>

          <section id="players" className="surface-panel scroll-mt-24 p-5">
            <h2 className="font-display text-xl">Rechercher un joueur</h2>
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Pseudo du joueur (au moins 2 caractères)"
              className="mt-3 max-w-lg"
            />
            {players.isFetching && (
              <p role="status" className="mt-2 text-sm text-muted-foreground">
                Recherche…
              </p>
            )}
            {players.error && (
              <p role="alert" className="mt-2 text-sm text-destructive">
                {players.error.message}
              </p>
            )}
            {players.data && (
              <div className="mt-3 divide-y divide-border">
                {players.data.map((player) => (
                  <button
                    key={player.user_id}
                    type="button"
                    onClick={() => {
                      setSelectedUserId(player.user_id);
                      setCardsPage(0);
                      setMissingCardsPage(0);
                    }}
                    aria-pressed={selectedUserId === player.user_id}
                    className="flex w-full items-center justify-between gap-4 rounded px-3 py-3 text-left hover:bg-secondary/70 aria-pressed:bg-secondary"
                  >
                    <span>
                      <strong>{player.username}</strong>
                      <span className="ml-2 text-xs text-muted-foreground">{player.user_id}</span>
                    </span>
                    <span className="text-sm">{player.balance} Deniers</span>
                  </button>
                ))}
                {players.data.length === 0 && (
                  <p className="py-3 text-sm text-muted-foreground">Aucun joueur trouvé.</p>
                )}
              </div>
            )}
          </section>

          {selectedPlayer && (
            <section id="player-overview" className="surface-panel scroll-mt-24 p-5">
              <h2 className="font-display text-xl">
                {selectedPlayer.username}{" "}
                <span className="text-sm text-muted-foreground">
                  · {selectedPlayer.balance} Deniers
                </span>
              </h2>

              <div id="player-fill" className="scroll-mt-24 rounded-lg border border-border p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-semibold">Remplissage de la collection</h3>
                  {collectionStats.data && (
                    <span className="text-sm text-muted-foreground">
                      {collectionStats.data.unique_cards} / {collectionStats.data.catalog_cards}{" "}
                      cartes uniques · {collectionStats.data.owned_cards} cartes possédées
                    </span>
                  )}
                </div>
                {collectionStats.error && (
                  <p role="alert" className="mt-2 text-sm text-destructive">
                    {collectionStats.error.message}
                  </p>
                )}
                {collectionStats.data && (
                  <>
                    <Progress
                      value={
                        collectionStats.data.catalog_cards > 0
                          ? (collectionStats.data.unique_cards /
                              collectionStats.data.catalog_cards) *
                            100
                          : 0
                      }
                      className="mt-3"
                    />
                    <p className="mt-2 text-xs text-muted-foreground">
                      {collectionStats.data.catalog_cards > 0
                        ? (
                            (collectionStats.data.unique_cards /
                              collectionStats.data.catalog_cards) *
                            100
                          ).toFixed(1)
                        : "0.0"}{" "}
                      % du catalogue découvert et possédé.
                    </p>
                  </>
                )}
              </div>

              <div className="mt-4 grid gap-5 lg:grid-cols-2">
                <div
                  id="player-categories"
                  className="scroll-mt-24 rounded-lg border border-border p-4"
                >
                  <h3 className="font-semibold">Cartes possédées par catégorie</h3>
                  {collectionBreakdown.error && (
                    <p role="alert" className="mt-2 text-sm text-destructive">
                      {collectionBreakdown.error.message}
                    </p>
                  )}
                  <label className="mt-3 block text-sm">
                    <span className="mb-1 block">Catégorie à afficher</span>
                    <select
                      value={collectionBreakdownType}
                      onChange={(event) =>
                        setCollectionBreakdownType(event.target.value as CollectionBreakdownType)
                      }
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                      {collectionBreakdownTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="mt-3 divide-y divide-border">
                    {(collectionBreakdown.data ?? [])
                      .filter((row) => row.category_type === collectionBreakdownType)
                      .map((row) => {
                        const categoryLabels: Record<string, string> = {
                          france: "Droit français",
                          europe: "Droit européen",
                          international: "Droit international",
                          commune: "Commune",
                          peu_commune: "Peu commune",
                          rare: "Rare",
                          epique: "Épique",
                          legendaire: "Légendaire",
                          mythique: "Mythique",
                        };
                        const label = categoryLabels[row.category_name] ?? row.category_name;
                        return (
                          <div
                            key={`${row.category_type}-${row.category_name}`}
                            className="flex items-center justify-between gap-3 py-1.5 text-sm"
                          >
                            <span>{label}</span>
                            <span className="text-right text-muted-foreground">
                              {row.owned_unique}/{row.catalog_cards} uniques · {row.owned_total}{" "}
                              détenues
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </div>

                <div
                  id="player-missing-cards"
                  className="scroll-mt-24 rounded-lg border border-border p-4"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="font-semibold">Cartes manquantes</h3>
                    {missingCards.data?.[0] && (
                      <span className="text-xs text-muted-foreground">
                        {missingCards.data[0].total_missing} à collectionner
                      </span>
                    )}
                  </div>
                  <Input
                    value={missingCardsSearch}
                    onChange={(event) => {
                      setMissingCardsSearch(event.target.value);
                      setMissingCardsPage(0);
                    }}
                    placeholder="Filtrer par titre ou référence"
                    className="mt-3"
                  />
                  {missingCards.error && (
                    <p role="alert" className="mt-2 text-sm text-destructive">
                      {missingCards.error.message}
                    </p>
                  )}
                  <div className="mt-3 max-h-72 space-y-2 overflow-y-auto">
                    {(missingCards.data ?? []).map((card) => (
                      <div
                        key={card.card_id}
                        className="rounded border border-border px-3 py-2 text-sm"
                      >
                        <p className="font-medium">{card.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {card.ref} · {card.rarity} · {card.category || "Autre"}
                        </p>
                      </div>
                    ))}
                    {missingCards.data?.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        {missingCardsSearch
                          ? "Aucune carte manquante ne correspond à cette recherche."
                          : "Le joueur possède au moins un exemplaire de toutes les cartes du catalogue."}
                      </p>
                    )}
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={missingCardsPage === 0 || missingCards.isFetching}
                      onClick={() => setMissingCardsPage((page) => Math.max(0, page - 1))}
                    >
                      Précédent
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      Page {missingCardsPage + 1} · 50 par page
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={
                        missingCards.isFetching ||
                        (missingCards.data?.[0]?.total_missing ?? 0) <= (missingCardsPage + 1) * 50
                      }
                      onClick={() => setMissingCardsPage((page) => page + 1)}
                    >
                      Suivant
                    </Button>
                  </div>
                </div>
              </div>

              <div className="mt-5 grid gap-5 lg:grid-cols-2">
                <div
                  id="player-balance"
                  className="scroll-mt-24 rounded-lg border border-border p-4"
                >
                  <h3 className="font-semibold">Ajuster le solde</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Valeur positive pour ajouter, négative pour retirer.
                  </p>
                  <Input
                    type="number"
                    step={1}
                    value={delta}
                    onChange={(event) => setDelta(event.target.value)}
                    placeholder="Ex. 500 ou -100"
                    className="mt-3"
                  />
                  <Input
                    value={balanceReason}
                    onChange={(event) => setBalanceReason(event.target.value)}
                    placeholder="Motif obligatoire"
                    className="mt-2"
                  />
                  <Button
                    className="mt-3"
                    disabled={adjustBalance.isPending || !delta || balanceReason.trim().length < 3}
                    onClick={() => adjustBalance.mutate()}
                  >
                    {adjustBalance.isPending ? "Enregistrement…" : "Appliquer l’ajustement"}
                  </Button>
                </div>

                <div
                  id="player-inventory"
                  className="scroll-mt-24 rounded-lg border border-border p-4"
                >
                  <h3 className="font-semibold">Cartes en inventaire</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Supprimer du compte masque la carte au joueur et conserve sa trace dans la base
                    et l’audit.
                  </p>
                  {playerCards.error && (
                    <p role="alert" className="mt-2 text-sm text-destructive">
                      {playerCards.error.message}
                    </p>
                  )}
                  <Input
                    value={cardReason}
                    onChange={(event) => setCardReason(event.target.value)}
                    placeholder="Motif obligatoire pour le retrait"
                    className="mt-3"
                  />
                  <Button
                    className="mt-3"
                    variant="destructive"
                    disabled={
                      revokeAllPlayerCards.isPending ||
                      revokeCard.isPending ||
                      cardReason.trim().length < 3
                    }
                    onClick={() => {
                      if (
                        selectedPlayer &&
                        window.confirm(
                          `Retirer toutes les cartes de la collection de ${selectedPlayer.username} ? Cette action est irréversible. Les cartes seront masquées du compte, mais leur trace d’audit sera conservée.`,
                        )
                      ) {
                        revokeAllPlayerCards.mutate();
                      }
                    }}
                  >
                    {revokeAllPlayerCards.isPending
                      ? "Retrait de toutes les cartes…"
                      : "Supprimer toute la collection"}
                  </Button>
                  <div className="mt-3 max-h-80 space-y-2 overflow-y-auto">
                    {(playerCards.data ?? []).map((card) => (
                      <div
                        key={card.user_card_id}
                        className="flex items-center justify-between gap-3 rounded border border-border p-2"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">{card.title}</span>
                          <span className="text-xs text-muted-foreground">
                            {card.rarity} · {card.base_value} M
                            {card.listing_active ? " · annonce active" : ""}
                          </span>
                        </span>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={revokeCard.isPending || cardReason.trim().length < 3}
                          onClick={() => {
                            if (
                              window.confirm(
                                `Supprimer « ${card.title} » de l’inventaire de ${selectedPlayer.username} ? La trace sera conservée pour l’audit.`,
                              )
                            ) {
                              revokeCard.mutate(card.user_card_id);
                            }
                          }}
                        >
                          Supprimer du compte
                        </Button>
                      </div>
                    ))}
                    {playerCards.data?.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        {cardsPage === 0 ? "Inventaire vide." : "Il n’y a plus d’autres cartes."}
                      </p>
                    )}
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={cardsPage === 0 || playerCards.isFetching}
                      onClick={() => setCardsPage((page) => Math.max(0, page - 1))}
                    >
                      Précédent
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      Page {cardsPage + 1} · 100 cartes par page
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={(playerCards.data?.length ?? 0) < 100 || playerCards.isFetching}
                      onClick={() => setCardsPage((page) => page + 1)}
                    >
                      Suivant
                    </Button>
                  </div>

                  <div className="mt-5 border-t border-border pt-4">
                    <h4 className="font-semibold">Ajouter une carte au compte</h4>
                    <p className="mt-1 text-xs text-muted-foreground">
                      La carte est ajoutée à l’inventaire, sans modifier la première découverte.
                    </p>
                    <Input
                      value={grantCardSearch}
                      onChange={(event) => {
                        setGrantCardSearch(event.target.value);
                        setGrantCardId("");
                      }}
                      placeholder="Rechercher un titre (2 caractères minimum)"
                      className="mt-3"
                    />
                    {cardOptions.error && (
                      <p role="alert" className="mt-2 text-sm text-destructive">
                        {cardOptions.error.message}
                      </p>
                    )}
                    {cardOptions.data && cardOptions.data.length > 0 && (
                      <select
                        aria-label="Carte à ajouter au joueur"
                        value={grantCardId}
                        onChange={(event) => setGrantCardId(event.target.value)}
                        className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      >
                        <option value="">Choisir une carte du catalogue</option>
                        {cardOptions.data.map((card) => (
                          <option key={card.id} value={card.id}>
                            {card.title} · {card.rarity} · {card.ref}
                          </option>
                        ))}
                      </select>
                    )}
                    {cardOptions.data?.length === 0 && (
                      <p className="mt-2 text-sm text-muted-foreground">
                        Aucune carte trouvée dans le catalogue.
                      </p>
                    )}
                    <Input
                      value={grantReason}
                      onChange={(event) => setGrantReason(event.target.value)}
                      placeholder="Motif obligatoire (3 à 300 caractères)"
                      className="mt-2"
                    />
                    <Button
                      className="mt-3"
                      disabled={
                        grantCard.isPending ||
                        !grantCardId ||
                        grantReason.trim().length < 3 ||
                        grantReason.trim().length > 300
                      }
                      onClick={() => grantCard.mutate()}
                    >
                      {grantCard.isPending ? "Ajout…" : "Ajouter cette carte"}
                    </Button>
                  </div>
                </div>
              </div>

              <div
                id="player-drop-rates"
                className="mt-5 scroll-mt-24 rounded-lg border border-border p-4"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-semibold">Taux de drop individuels</h3>
                  {dropRateSettings.data && (
                    <span className="text-xs text-muted-foreground">
                      {dropRateSettings.data.is_custom
                        ? "Réglage personnalisé pour ce joueur"
                        : "Taux par défaut du jeu"}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Ces probabilités s’appliquent aux prochains boosters de ce joueur. Le total doit
                  être exactement égal à 100 %.
                </p>
                {dropRateSettings.error && (
                  <p role="alert" className="mt-2 text-sm text-destructive">
                    {dropRateSettings.error.message}
                  </p>
                )}
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {dropRarities.map(({ key, label }) => (
                    <label key={key} className="text-sm">
                      <span className="mb-1 block">{label} (%)</span>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step="0.01"
                        value={dropRates[key]}
                        onChange={(event) =>
                          setDropRates((current) => ({ ...current, [key]: event.target.value }))
                        }
                      />
                    </label>
                  ))}
                </div>
                <p
                  className={`mt-3 text-sm ${validDropRates ? "text-muted-foreground" : "text-destructive"}`}
                  aria-live="polite"
                >
                  Total : {dropRatesTotal.toFixed(2)} %
                  {!validDropRates && " — les taux doivent être valides et totaliser 100 %."}
                </p>
                <Input
                  value={dropReason}
                  onChange={(event) => setDropReason(event.target.value)}
                  placeholder="Motif obligatoire (3 à 300 caractères)"
                  className="mt-3 max-w-xl"
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    disabled={
                      saveDropRates.isPending ||
                      resetDropRates.isPending ||
                      !validDropRates ||
                      dropReason.trim().length < 3 ||
                      dropReason.trim().length > 300
                    }
                    onClick={() => saveDropRates.mutate()}
                  >
                    {saveDropRates.isPending ? "Enregistrement…" : "Enregistrer les taux"}
                  </Button>
                  <Button
                    variant="outline"
                    disabled={
                      resetDropRates.isPending ||
                      saveDropRates.isPending ||
                      !dropRateSettings.data?.is_custom ||
                      dropReason.trim().length < 3 ||
                      dropReason.trim().length > 300
                    }
                    onClick={() => resetDropRates.mutate()}
                  >
                    {resetDropRates.isPending
                      ? "Réinitialisation…"
                      : "Rétablir les taux par défaut"}
                  </Button>
                </div>
              </div>

              <div className="mt-5 grid gap-5 lg:grid-cols-2">
                <div id="player-sales" className="scroll-mt-24 rounded-lg border border-border p-4">
                  <h3 className="font-semibold">Historique des ventes</h3>
                  {sales.error && (
                    <p role="alert" className="mt-2 text-sm text-destructive">
                      {sales.error.message}
                    </p>
                  )}
                  <div className="mt-3 max-h-80 space-y-2 overflow-y-auto">
                    {(sales.data ?? []).map((sale) => (
                      <div
                        key={sale.listing_id}
                        className="rounded border border-border p-2 text-sm"
                      >
                        <p className="font-medium">
                          {sale.card_title} · {sale.price} Deniers
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {sale.seller_username} → {sale.buyer_username ?? "compte supprimé"} ·{" "}
                          {formatDate(sale.sold_at)}
                        </p>
                      </div>
                    ))}
                    {sales.data?.length === 0 && (
                      <p className="text-sm text-muted-foreground">Aucune vente terminée.</p>
                    )}
                  </div>
                </div>

                <div id="player-draws" className="scroll-mt-24 rounded-lg border border-border p-4">
                  <h3 className="font-semibold">Tirages des boosters</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Actualisation en direct et vérification périodique.
                  </p>
                  {draws.error && (
                    <p role="alert" className="mt-2 text-sm text-destructive">
                      {draws.error.message}
                    </p>
                  )}
                  <div className="mt-3 max-h-80 space-y-2 overflow-y-auto">
                    {(draws.data ?? []).map((draw) => (
                      <div key={draw.draw_id} className="rounded border border-border p-2 text-sm">
                        <p className="font-medium">
                          {draw.card_title} · {draw.rarity}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Tirée par {draw.drawer_username} · {formatDate(draw.drawn_at)}
                          {draw.current_owner_username
                            ? ` · possédée par ${draw.current_owner_username}`
                            : ""}
                          {draw.revoked_at ? " · retirée" : ""}
                        </p>
                      </div>
                    ))}
                    {draws.data?.length === 0 && (
                      <p className="text-sm text-muted-foreground">Aucun tirage enregistré.</p>
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}

          <section
            id="emergency-rollback"
            className="surface-panel scroll-mt-24 border-destructive/40 p-5"
          >
            <h2 className="font-display text-xl">Rollback d’urgence</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Retire les cartes encore présentes tirées pendant la période, annule leurs annonces
              actives et réinitialise les premières découvertes concernées. Les ventes terminées et
              les soldes restent inchangés.
            </p>
            <label htmlFor="rollback-window" className="mt-4 block text-sm font-medium">
              Période
            </label>
            <select
              id="rollback-window"
              value={rollbackWindow}
              onChange={(event) => {
                setRollbackWindow(Number(event.target.value));
                setRollbackConfirmed(false);
              }}
              className="mt-1 h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              {rollbackWindows.map((window) => (
                <option key={window.value} value={window.value}>
                  {window.label}
                </option>
              ))}
            </select>
            {rollbackPreview.error && (
              <p role="alert" className="mt-2 text-sm text-destructive">
                {rollbackPreview.error.message}
              </p>
            )}
            {preview && (
              <div className="mt-3 rounded border border-border p-3 text-sm">
                <p>
                  {preview.cards_to_revoke} carte(s) à retirer · {preview.listings_to_cancel}{" "}
                  annonce(s) active(s) à annuler
                </p>
                <p>
                  {preview.discoveries_to_reset} découverte(s) à remettre à zéro ·{" "}
                  {preview.players_affected} joueur(s) concerné(s)
                </p>
              </div>
            )}
            <Input
              value={rollbackReason}
              onChange={(event) => {
                setRollbackReason(event.target.value);
                setRollbackConfirmed(false);
              }}
              placeholder="Motif obligatoire du rollback"
              className="mt-3 max-w-xl"
            />
            <label className="mt-3 flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={rollbackConfirmed}
                onChange={(event) => setRollbackConfirmed(event.target.checked)}
                className="mt-1"
              />
              <span>
                Je confirme le retrait des cartes et l’annulation des annonces actives indiquées
                ci-dessus.
              </span>
            </label>
            <Button
              variant="destructive"
              className="mt-3"
              disabled={
                applyRollback.isPending ||
                !preview ||
                !rollbackConfirmed ||
                rollbackReason.trim().length < 3
              }
              onClick={() => applyRollback.mutate()}
            >
              {applyRollback.isPending ? "Rollback en cours…" : "Confirmer le rollback"}
            </Button>
          </section>

          <section
            id="reset-discoveries"
            className="surface-panel scroll-mt-24 border-destructive/40 p-5"
          >
            <h2 className="font-display text-xl">Réinitialiser toutes les premières découvertes</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Efface le badge de première découverte de toutes les cartes du catalogue. Les
              prochaines personnes qui tireront chaque carte pourront obtenir le badge. Les cartes
              et les collections ne sont pas supprimées.
            </p>
            <Input
              value={discoveryResetReason}
              onChange={(event) => {
                setDiscoveryResetReason(event.target.value);
                setDiscoveryResetConfirmed(false);
              }}
              placeholder="Motif obligatoire (3 à 300 caractères)"
              className="mt-3 max-w-xl"
            />
            <label className="mt-3 flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={discoveryResetConfirmed}
                onChange={(event) => setDiscoveryResetConfirmed(event.target.checked)}
                className="mt-1"
              />
              <span>
                Je confirme la réinitialisation globale des premières découvertes. Cette action est
                irréversible.
              </span>
            </label>
            <Button
              variant="destructive"
              className="mt-3"
              disabled={
                resetAllDiscoveries.isPending ||
                !discoveryResetConfirmed ||
                discoveryResetReason.trim().length < 3 ||
                discoveryResetReason.trim().length > 300
              }
              onClick={() => {
                if (
                  window.confirm(
                    "Réinitialiser les premières découvertes de TOUTES les cartes ? Les badges pourront être obtenus à nouveau lors des prochains tirages.",
                  )
                ) {
                  resetAllDiscoveries.mutate();
                }
              }}
            >
              {resetAllDiscoveries.isPending
                ? "Réinitialisation en cours…"
                : "Réinitialiser toutes les découvertes"}
            </Button>
          </section>

          <section id="audit-log" className="surface-panel scroll-mt-24 p-5">
            <h2 className="font-display text-xl">Journal d’audit récent</h2>
            {audit.error && (
              <p role="alert" className="mt-2 text-sm text-destructive">
                {audit.error.message}
              </p>
            )}
            <div className="mt-3 max-h-96 space-y-2 overflow-y-auto">
              {(audit.data ?? []).map((entry) => (
                <div key={entry.audit_id} className="rounded border border-border p-3 text-sm">
                  <p className="font-medium">
                    {entry.action} · {entry.target_username ?? "opération globale"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {entry.reason} · {formatDate(entry.created_at)}
                  </p>
                  <pre className="mt-1 overflow-x-auto whitespace-pre-wrap text-xs text-muted-foreground">
                    {JSON.stringify(entry.details, null, 2)}
                  </pre>
                </div>
              ))}
              {audit.data?.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Aucune action administrateur enregistrée.
                </p>
              )}
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
