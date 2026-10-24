# Code Collector

Tu souhaites créer un jeu de cartes à collectionner (JCC) numérique basé sur le droit français, avec une économie virtuelle inspirée de Wiki Master.

Le concept : Transformer les textes juridiques (Code civil, Constitution, arrêtés locaux) en cartes virtuelles possédant leurs propres niveaux de rareté et visuels.

La source : Récupérer légalement les textes les flux Open Data de Légifrance pour constituer le catalogue de base.

La mécanique de jeu : Un système de collection pure et de marché secondaire où les joueurs acquièrent des lois (via des boosters virtuels) pour les conserver, les échanger ou les revendre à d'autres joueurs en faisant du profit.

Le besoin technique : Développer une application connectée à une base de données sécurisée pour gérer l'authentification des joueurs, leurs portefeuilles virtuels, leurs inventaires de cartes et les transactions entre utilisateurs.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/8c97f2a3-186b-5ec7-9d86-b59a55e017c8).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Hébergement gratuit sur Cloudflare Workers

Le build Nitro produit un Worker Cloudflare dans `.output/server`. Après avoir créé
un compte Cloudflare et connecté Wrangler (`npx wrangler login`), connectez le dépôt
GitHub à Workers Builds. Utilisez `npm run build` comme commande de build et
`npx wrangler deploy --config .output/server/wrangler.json` comme commande de
déploiement.

Dans les variables de build Cloudflare, renseignez `VITE_SUPABASE_URL` et
`VITE_SUPABASE_PUBLISHABLE_KEY`. Dans les variables d'environnement du Worker,
renseignez `SUPABASE_URL` et `SUPABASE_PUBLISHABLE_KEY`.

Ajoutez les secrets serveur dans Cloudflare avec `npx wrangler secret put NOM`,
notamment `SUPABASE_SERVICE_ROLE_KEY`, `LEGIFRANCE_CLIENT_ID` et
`LEGIFRANCE_CLIENT_SECRET`. La clé `SUPABASE_SERVICE_ROLE_KEY` ne doit jamais
être une variable `VITE_*`, ni être commitée ou exposée au navigateur.

Pour le preview local, copiez `.dev.vars.example` en `.dev.vars` et renseignez-y
les valeurs serveur (ce fichier est ignoré par Git). Puis lancez
`npm run preview:cloudflare`. Pour déployer manuellement sur le sous-domaine
Cloudflare `workers.dev`, lancez `npm run deploy:cloudflare`. Le nom du Worker est
défini dans `wrangler.jsonc`. Les migrations SQL Supabase doivent être appliquées
séparément dans le projet Supabase avant la mise en ligne.
