import { supabase } from "@/integrations/supabase/client";

export type Rarity =
  | "commune"
  | "peu_commune"
  | "rare"
  | "epique"
  | "legendaire"
  | "mythique";

export type Card = {
  id: string;
  ref: string;
  source_code: string;
  article: string;
  title: string;
  content: string;
  rarity: Rarity;
  base_value: number;
  source_url: string | null;
  status?: string;
  status_note?: string | null;
  circle?: string;
  category?: string;
  text_date?: string | null;
  authority?: string | null;
  summary?: string | null;
};

export const rarityLabel: Record<Rarity, string> = {
  commune: "Commune",
  peu_commune: "Peu commune",
  rare: "Rare",
  epique: "Épique",
  legendaire: "Légendaire",
  mythique: "Mythique",
};

export const rarityClass: Record<Rarity, string> = {
  commune: "text-rarity-commune border-rarity-commune/40",
  peu_commune: "text-rarity-peu-commune border-rarity-peu-commune/40",
  rare: "text-rarity-rare border-rarity-rare/50",
  epique: "text-rarity-epique border-rarity-epique/50",
  legendaire: "text-rarity-legendaire border-rarity-legendaire/60",
  mythique: "text-rarity-mythique border-rarity-mythique/70",
};

export async function fetchCards(): Promise<Card[]> {
  const { data, error } = await supabase
    .from("cards")
    .select("*")
    .order("base_value", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Card[];
}

export async function fetchProfile() {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, balance")
    .eq("id", auth.user.id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export type OwnedCard = { id: string; acquired_at: string; card: Card };

export async function fetchCollection(): Promise<OwnedCard[]> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];
  const { data, error } = await supabase
    .from("user_cards")
    .select("id, acquired_at, cards(*)")
    .eq("user_id", auth.user.id)
    .order("acquired_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: row["id"] as string,
    acquired_at: row["acquired_at"] as string,
    card: row["cards"] as Card,
  }));
}

export type Listing = {
  id: string;
  price: number;
  seller_id: string;
  created_at: string;
  card: Card;
  seller: string;
};

export async function fetchListings(): Promise<Listing[]> {
  const { data, error } = await supabase
    .from("listings")
    .select("id, price, seller_id, created_at, cards(*)")
    .eq("status", "active")
    .order("created_at", { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as Record<string, unknown>[];
  const sellerIds = [...new Set(rows.map((r) => r["seller_id"] as string))];
  const names = new Map<string, string>();
  if (sellerIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username")
      .in("id", sellerIds);
    for (const p of profiles ?? []) names.set(p.id, p.username);
  }
  return rows.map((row) => ({
    id: row["id"] as string,
    price: row["price"] as number,
    seller_id: row["seller_id"] as string,
    created_at: row["created_at"] as string,
    card: row["cards"] as Card,
    seller: names.get(row["seller_id"] as string) ?? "joueur",
  }));
}

export async function fetchTransactions() {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];
  const { data, error } = await supabase
    .from("transactions")
    .select("id, kind, amount, description, created_at")
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: false })
    .limit(40);
  if (error) throw error;
  return data ?? [];
}

export async function openBooster(): Promise<Card[]> {
  const { data, error } = await supabase.rpc("open_booster");
  if (error) throw error;
  const ids = (data ?? []).map((d) => d.card_id);
  const { data: cards, error: cardsError } = await supabase
    .from("cards")
    .select("*")
    .in("id", ids);
  if (cardsError) throw cardsError;
  // Respecte l'ordre du tirage (doublons inclus)
  return ids.map((id) => (cards ?? []).find((c) => c.id === id)).filter(Boolean) as Card[];
}

export async function createListing(userCardId: string, price: number) {
  const { error } = await supabase.rpc("create_listing", {
    p_user_card_id: userCardId,
    p_price: price,
  });
  if (error) throw error;
}

export async function cancelListing(listingId: string) {
  const { error } = await supabase.rpc("cancel_listing", { p_listing_id: listingId });
  if (error) throw error;
}

export async function buyListing(listingId: string) {
  const { error } = await supabase.rpc("buy_listing", { p_listing_id: listingId });
  if (error) throw error;
}

export async function redeemPromoCode(code: string) {
  const { data, error } = await supabase.rpc("redeem_promo_code", {
    p_code: code.trim().toUpperCase(),
  });
  if (error) throw error;
  const row = (data ?? [])[0];
  return {
    credits: row?.credits_amount ?? 0,
    balance: row?.new_balance ?? 0,
  };
}
