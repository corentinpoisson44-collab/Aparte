# Aparté

Choisissez un film à deux, sans y passer 30 minutes — et en s'encourageant à
sortir de sa zone de confort.

## Principe

1. Après avoir créé la session, on répond à quelques questions facultatives
   pour orienter le tirage : nombre de films (3 / 5 / 7 / 9, 5 par défaut),
   durée (court / long / peu importe), ambiance (genre présent dans le
   catalogue, ou peu importe). Voir "Questions d'orientation" ci-dessous.
2. L'app pioche ce nombre de films dans la bibliothèque Plex du foyer (une
   fois connectée — sinon les mocks seedés) en tenant compte de ces
   préférences ; si trop peu de films correspondent, elle complète avec
   d'autres et le signale dans l'interface.
3. Chaque personne classe ces films indépendamment sur son écran.
4. Une fois les deux classements soumis, l'app révèle le film gagnant,
   calculé par un Borda count avec garde-fou anti-rejet ; toucher l'affiche
   l'ouvre directement dans Plex.

## Stack (v0)

- **Next.js 16** (App Router, TypeScript, Tailwind CSS v4)
- **Prisma 7** + **Postgres (Neon)**, via l'adapter WebSocket `@prisma/adapter-neon`
  (`PrismaNeon`/`Pool`, pas le mode HTTP `PrismaNeonHttp` — celui-ci rejette
  toute transaction, y compris celle que Prisma ouvre implicitement pour un
  simple `create`, ce qui casse toute écriture)
- **@dnd-kit** pour le classement en glisser-déposer (souris, tactile, clavier)
- Pas d'authentification en v0 : un seul foyer (2 profils fixes), attribué
  automatiquement par appareil selon l'action (créer = Membre 1, rejoindre
  = Membre 2 — voir `src/components/ProfileGate.tsx`) et mémorisé en
  `localStorage`

## Déploiement (Vercel + Neon)

1. Dans le projet Vercel : **Storage → Create Database → Neon**, puis
   *Connect* au projet — Vercel ajoute automatiquement `DATABASE_URL` (et
   variantes, dont `DATABASE_URL_UNPOOLED`) en variable d'environnement.
2. Le script `build` (`prisma migrate deploy && next build`) applique les
   migrations à chaque déploiement : rien à faire manuellement. `prisma
   migrate deploy` a besoin d'une connexion *directe* (pas via le pooler
   pgbouncer de Neon) pour poser son advisory lock le temps de la migration
   — `prisma.config.ts` utilise donc `DATABASE_URL_UNPOOLED` /
   `POSTGRES_URL_NON_POOLING` en priorité (repli sur `DATABASE_URL` si
   absentes). Si le build échoue avec `P1002` / "Timed out trying to
   acquire a postgres advisory lock", vérifier que l'intégration Neon a bien
   fourni une de ces variantes non-poolées.
3. Le foyer et les 15 films mock ne sont pas seedés automatiquement en prod
   — lancer `npm run db:seed` une fois en local avec la même `DATABASE_URL`
   (voir ci-dessous), ou depuis la console SQL de Neon.

## Démarrage local

```bash
npm install
cp .env.example .env      # colle la DATABASE_URL Postgres (Neon) ici
npm run db:migrate        # applique les migrations
npm run db:seed           # foyer "Membre 1 / Membre 2" + 15 films mock
npm run dev
```

Ouvrir http://localhost:3000, créer une session (cet appareil devient
Membre 1), partager le code à 5 caractères, le taper (ou scanner le QR
code) sur le deuxième appareil/onglet pour rejoindre en tant que Membre 2,
puis classer les films de chaque côté.

Les routes de création/révélation de session enchaînent des requêtes
indépendantes plutôt que des écritures imbriquées ou un `$transaction([...])`
— pas de vraie exigence d'atomicité ici, mais si un jour le besoin s'en fait
sentir, l'adapter WebSocket les supporte (contrairement au mode HTTP).

## Modèle de données

`Household` (foyer) → `Member` (2 profils) ; `Movie` (catalogue, source
`PLEX`/`DISCOVERY`, plateforme `platform`) ; `Session` (code, statut) →
`SessionMovie` (les films piochés, avec `matchesFilters` — false si ajouté
en complément faute de films correspondant aux préférences) → `Ranking`
(classement par membre) →
`SessionResult` (gagnant + détail des scores) ; `WatchHistory` (vu / proposé
/ rejeté-dernier, sert à ne pas reproposer un film déjà vu ou trop souvent
rejeté).

## Sources

Seule la bibliothèque Plex du foyer est utilisée : `src/lib/draw.ts` ne
pioche que parmi les films dont la plateforme (`Movie.platform`) vaut
`"Plex"`. Les autres plateformes (Netflix, Disney+, etc.) ont été
désactivées — il n'y a plus de sélecteur de sources sur la page d'accueil.

## Questions d'orientation

`POST /api/sessions` crée la session sans tirer de film. La page d'accueil
enchaîne alors sur `src/components/OrientationQuestions.tsx` : nombre de
films (3 / 5 / 7 / 9, 5 par défaut), durée (court ≤ 100 min / long / peu
importe), ambiance (genres distincts du catalogue, récupérés via
`GET /api/household/genres`, ou peu importe) et valeur sûre (bibliothèque
Plex) vs découverte. Une fois les réponses envoyées,
`POST /api/sessions/[code]/draw` appelle `drawMoviesForHousehold` avec ces
préférences. Le nombre de films est respecté strictement (il détermine
combien de films sont piochés) ; les autres préférences sont des priorités
souples, pas des filtres stricts : `src/lib/draw.ts` complète toujours avec
le reste des films éligibles si trop peu correspondent, pour ne jamais
bloquer une session — les films ajoutés ainsi sont marqués
`matchesFilters: false` et signalés dans l'interface ("hors critères").

## Algorithme de sélection

Borda count (1er = N pts … dernier = 1 pt, où N est le nombre de films de
la session, sommés sur les deux classements), avec
un garde-fou : un film classé dernier par au moins une personne est
disqualifié même s'il a le meilleur score total. En cas d'égalité, le
meilleur classement individuel le plus haut départage. Si le garde-fou
disqualifie tous les films (rejets différents de chaque côté), il est
ignoré pour toujours produire un gagnant. Voir `src/lib/ranking.ts`.

## Intégration Plex

Depuis la page d'accueil, "Se connecter à Plex" démarre le flow
d'authentification officiel de Plex par PIN (aucun mot de passe saisi dans
l'app) : un pin est créé côté serveur, une fenêtre s'ouvre sur
`app.plex.tv/auth` pour lier le compte, et l'app sonde
`GET /api/plex/pin/[id]` jusqu'à obtenir un jeton. Une fois connecté, le
serveur Plex du compte est découvert automatiquement via
`plex.tv/api/v2/resources` (connexion directe, relay ou locale — la première
qui répond est retenue). "Synchroniser ma bibliothèque" importe ensuite tous
les films de ses bibliothèques de type "movie" dans la table `Movie`
(`source = PLEX`), en amont du tirage `src/lib/draw.ts`. Voir
`src/lib/plex/` pour le détail (aucune clé d'API Plex à fournir : le flow PIN
n'en nécessite pas).

### Lancer sur la TV

Une fois le film révélé (`src/components/ResultReveal.tsx`), toucher
l'affiche ouvre directement le film dans Plex via son `plexUrl`.

## Prochaines étapes (v1+)

- **v1** : remplacer les films "découverte" en dur par une vraie pioche TMDB
  (providers de streaming filtrés sur les abonnements).
- **v2** : ratio Plex/découverte configurable, choix manuel du serveur/de la
  bibliothèque Plex si plusieurs sont disponibles.
- **v3** : vrais comptes (magic link), historique enrichi, mobile polish.

### Ce qu'il faudra fournir pour la v1

- **TMDB** : une clé API (gratuite, themoviedb.org).
