# Aparté

Choisissez un film à deux, sans y passer 30 minutes — et en s'encourageant à
sortir de sa zone de confort.

## Principe

1. L'app pioche 5 films (v0 : 3 "Plex" + 2 "découverte" simulés en dur — les
   vraies intégrations Plex/TMDB arrivent en v1/v2, voir plus bas).
2. Chaque personne classe ces 5 films indépendamment sur son écran.
3. Une fois les deux classements soumis, l'app révèle le film gagnant,
   calculé par un Borda count avec garde-fou anti-rejet.

## Stack (v0)

- **Next.js 16** (App Router, TypeScript, Tailwind CSS v4)
- **Prisma 7** + **Postgres (Neon)**, via l'adapter WebSocket `@prisma/adapter-neon`
  (`PrismaNeon`/`Pool`, pas le mode HTTP `PrismaNeonHttp` — celui-ci rejette
  toute transaction, y compris celle que Prisma ouvre implicitement pour un
  simple `create`, ce qui casse toute écriture)
- **@dnd-kit** pour le classement en glisser-déposer (souris, tactile, clavier)
- Pas d'authentification en v0 : un seul foyer (2 profils fixes), choisi une
  fois par appareil (mémorisé en `localStorage`)

## Déploiement (Vercel + Neon)

1. Dans le projet Vercel : **Storage → Create Database → Neon**, puis
   *Connect* au projet — Vercel ajoute automatiquement `DATABASE_URL` (et
   variantes) en variable d'environnement.
2. Le script `build` (`prisma migrate deploy && next build`) applique les
   migrations à chaque déploiement : rien à faire manuellement.
3. Le foyer et les 15 films mock ne sont pas seedés automatiquement en prod
   — lancer `npm run db:seed` une fois en local avec la même `DATABASE_URL`
   (voir ci-dessous), ou depuis la console SQL de Neon.

## Démarrage local

```bash
npm install
cp .env.example .env      # colle la DATABASE_URL Postgres (Neon) ici
npm run db:migrate        # applique les migrations
npm run db:seed           # foyer "Corentin / Partenaire" + 15 films mock
npm run dev
```

Le seed récupère l'affiche et le genre de chaque film sur TMDB si
`TMDB_API_KEY` est renseignée dans `.env` (clé v3 gratuite sur
[themoviedb.org](https://www.themoviedb.org/settings/api)). Sans clé, une
affiche placeholder et un genre de repli sont utilisés pour chaque film.

### (Re)seeder sans terminal (Vercel)

`npm run db:seed` ne tourne pas automatiquement au déploiement. Pour peupler
ou rafraîchir le catalogue (affiches/genres TMDB) sur un environnement
Vercel sans terminal : configure `TMDB_API_KEY` et `ADMIN_SEED_SECRET`
(valeur arbitraire, ex. générée avec `openssl rand -hex 16`) dans les
variables d'environnement Vercel (Preview *et* Production), déploie, puis
visite `https://<ton-app>.vercel.app/api/admin/seed?secret=<ADMIN_SEED_SECRET>`
dans le navigateur. La réponse JSON indique combien de films ont été
trouvés sur TMDB. Garde ce secret privé : la route accepte n'importe quel
appelant qui le connaît.

Ouvrir http://localhost:3000, choisir un profil, créer une session, partager
le code à 5 caractères, classer les films sur le deuxième appareil/onglet
avec l'autre profil.

Les routes de création/révélation de session enchaînent des requêtes
indépendantes plutôt que des écritures imbriquées ou un `$transaction([...])`
— pas de vraie exigence d'atomicité ici, mais si un jour le besoin s'en fait
sentir, l'adapter WebSocket les supporte (contrairement au mode HTTP).

## Modèle de données

`Household` (foyer) → `Member` (2 profils) ; `Movie` (catalogue, source
`PLEX`/`DISCOVERY`) ; `Session` (code, statut) → `SessionMovie` (les 5 films
piochés) → `Ranking` (classement par membre) → `SessionResult` (gagnant +
détail des scores) ; `WatchHistory` (vu / proposé / rejeté-dernier, sert à
ne pas reproposer un film déjà vu ou trop souvent rejeté).

## Algorithme de sélection

Borda count (1er = 5 pts … 5e = 1 pt, sommés sur les deux classements), avec
un garde-fou : un film classé dernier par au moins une personne est
disqualifié même s'il a le meilleur score total. En cas d'égalité, le
meilleur classement individuel le plus haut départage. Si le garde-fou
disqualifie tous les films (rejets différents de chaque côté), il est
ignoré pour toujours produire un gagnant. Voir `src/lib/ranking.ts`.

## Prochaines étapes (v1+)

- **v1** : remplacer les films en dur par une vraie pioche TMDB (découverte
  + providers de streaming filtrés sur les abonnements). Les 15 films mock
  ont déjà leur affiche et leur genre enrichis via TMDB au seed (voir
  ci-dessus) ; il reste à interroger TMDB pour découvrir de nouveaux films
  plutôt que de piocher dans une liste figée.
- **v2** : intégration Plex (bibliothèque non-vue), ratio Plex/découverte
  configurable.
- **v3** : vrais comptes (magic link), historique enrichi, mobile polish.

### Ce qu'il faudra fournir pour la v1/v2

- **TMDB** : une clé API (gratuite, themoviedb.org).
- **Plex** : URL du serveur (remote access activé) + token `X-Plex-Token`.
