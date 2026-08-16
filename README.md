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
- **Prisma 7** + **Postgres (Neon)**, via l'adapter HTTP `@prisma/adapter-neon`
  (une requête = un appel HTTPS, pas de connexion persistante — adapté aux
  fonctions serverless de Vercel)
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

Ouvrir http://localhost:3000, choisir un profil, créer une session, partager
le code à 5 caractères, classer les films sur le deuxième appareil/onglet
avec l'autre profil.

⚠️ `src/lib/prisma.ts` utilise l'adapter HTTP de Neon (`PrismaNeonHttp`), qui
ne supporte **aucune transaction** (ni `$transaction([...])` en lot, ni
callback interactif, ni écriture imbriquée du type `session.create({ data: {
sessionMovies: { create: [...] } } })` — Prisma les compile aussi en
transaction). Les routes API enchaînent donc des requêtes indépendantes
(`createMany` pour les insertions en lot). Conséquence : pas d'atomicité
stricte entre ces requêtes (un crash entre deux appels peut laisser un état
partiel) — acceptable pour ce projet solo/couple, mais à garder en tête.

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
