<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

# Règles techniques du projet

- Toute l'économie (crédits, ouverture de booster, mise en vente, achat) passe par des fonctions SQL `SECURITY DEFINER` (`open_booster`, `create_listing`, `cancel_listing`, `buy_listing`) exécutables uniquement par les utilisateurs connectés — pour empêcher toute manipulation des soldes côté client.
- Les lectures/écritures de jeu se font via le client Supabase navigateur + TanStack Query (`src/lib/game.ts`), protégées par RLS ; pas de logique métier dupliquée côté serveur.
- L'import Légifrance (API PISTE) vit dans `src/lib/legifrance.functions.ts` (server function authentifiée) car il utilise des secrets serveur et le client admin.
- Les pages nécessitant un compte sont placées sous `src/routes/_authenticated/` ; `/`, `/catalogue` et `/auth` restent publics.
