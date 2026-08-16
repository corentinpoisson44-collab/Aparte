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
- **Prisma 7** + **SQLite** en local (driver adapter `@prisma/adapter-better-sqlite3`)
- **@dnd-kit** pour le classement en glisser-déposer (souris, tactile, clavier)
- Pas d'authentification en v0 : un seul foyer (2 profils fixes), choisi une
  fois par appareil (mémorisé en `localStorage`)

## Démarrage local

```bash
npm install
cp .env.example .env      # DATABASE_URL="file:./dev.db"
npm run db:migrate        # crée la base SQLite locale
npm run db:seed           # foyer "Corentin / Partenaire" + 15 films mock
npm run dev
```

Ouvrir http://localhost:3000, choisir un profil, créer une session, partager
le code à 5 caractères, classer les films sur le deuxième appareil/onglet
avec l'autre profil.

## ⚠️ Avant de déployer sur Vercel

SQLite (fichier local) **ne fonctionne pas** sur les fonctions serverless de
Vercel (système de fichiers éphémère). Avant de déployer :

1. Provisionner une base Postgres (Vercel Postgres ou Neon).
2. Changer `provider = "sqlite"` en `provider = "postgresql"` dans
   `prisma/schema.prisma`.
3. Remplacer l'adapter `@prisma/adapter-better-sqlite3` par
   `@prisma/adapter-pg` dans `src/lib/prisma.ts` et `prisma/seed.ts`.
4. Définir `DATABASE_URL` dans les variables d'environnement Vercel.
5. Lancer `npx prisma migrate deploy` contre la base de prod, puis le seed
   si besoin.

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
  + providers de streaming filtrés sur les abonnements).
- **v2** : intégration Plex (bibliothèque non-vue), ratio Plex/découverte
  configurable.
- **v3** : vrais comptes (magic link), historique enrichi, mobile polish.

### Ce qu'il faudra fournir pour la v1/v2

- **TMDB** : une clé API (gratuite, themoviedb.org).
- **Plex** : URL du serveur (remote access activé) + token `X-Plex-Token`.
