import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type ImportInput = { ids: string[] };

function stripHtml(html: string) {
  return html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function rarityFor(text: string): { rarity: string; value: number } {
  const n = text.length;
  if (n < 120) return { rarity: "legendaire", value: 900 };
  if (n < 260) return { rarity: "epique", value: 550 };
  if (n < 500) return { rarity: "rare", value: 320 };
  if (n < 900) return { rarity: "peu_commune", value: 150 };
  return { rarity: "commune", value: 60 };
}

/**
 * Importe des articles depuis l'Open Data Légifrance (API PISTE)
 * à partir d'identifiants d'articles (LEGIARTI...).
 */
export const importLegifranceArticles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: ImportInput) => {
    const ids = (input?.ids ?? [])
      .map((id) => String(id).trim().toUpperCase())
      .filter((id) => /^[A-Z0-9]{8,40}$/.test(id))
      .slice(0, 50);
    if (ids.length === 0) throw new Error("Aucun identifiant d'article valide fourni.");
    return { ids };
  })
  .handler(async ({ data }) => {
    const clientId = process.env["LEGIFRANCE_CLIENT_ID"];
    const clientSecret = process.env["LEGIFRANCE_CLIENT_SECRET"];
    if (!clientId || !clientSecret) {
      return { imported: 0, errors: ["Identifiants Légifrance manquants."] };
    }

    const tokenRes = await fetch("https://oauth.piste.gouv.fr/api/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
        scope: "openid",
      }),
    });
    if (!tokenRes.ok) {
      return {
        imported: 0,
        errors: ["Connexion à Légifrance refusée (vérifiez les identifiants PISTE)."],
      };
    }
    const token = ((await tokenRes.json()) as { access_token?: string }).access_token;
    if (!token) return { imported: 0, errors: ["Jeton Légifrance indisponible."] };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const errors: string[] = [];
    let imported = 0;

    for (const id of data.ids) {
      try {
        const res = await fetch(
          "https://api.piste.gouv.fr/dila/legifrance/lf-engine-app/consult/getArticle",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify({ id }),
          },
        );
        if (!res.ok) {
          errors.push(`${id} : non trouvé (${res.status})`);
          continue;
        }
        const payload = (await res.json()) as {
          article?: {
            num?: string;
            texte?: string;
            texteHtml?: string;
            context?: { titreTxt?: { titre?: string }[] };
          };
        };
        const article = payload.article;
        const raw = article?.texteHtml ?? article?.texte ?? "";
        const content = stripHtml(raw);
        if (!content) {
          errors.push(`${id} : texte vide`);
          continue;
        }
        const code = article?.context?.titreTxt?.[0]?.titre ?? "Texte officiel";
        const { rarity, value } = rarityFor(content);
        const { error } = await supabaseAdmin.from("cards").upsert(
          {
            ref: id,
            source_code: code,
            article: article?.num ? `Article ${article.num}` : "Article",
            title: content.slice(0, 80),
            content,
            rarity: rarity as never,
            base_value: value,
            source_url: `https://www.legifrance.gouv.fr/codes/article_lc/${id}`,
          },
          { onConflict: "ref" },
        );
        if (error) errors.push(`${id} : ${error.message}`);
        else imported += 1;
      } catch {
        errors.push(`${id} : erreur réseau`);
      }
    }

    return { imported, errors };
  });
