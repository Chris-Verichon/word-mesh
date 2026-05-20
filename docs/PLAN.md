# Word-Mesh — Plan de Développement

> Chaque feature correspond à une branche git. On merge dans `develop`, puis `develop` → `main` pour les releases.

**Convention de branches :** `feature/<nom>`, `chore/<nom>`, `fix/<nom>`

---

## Progression

| Branche | Statut |
|---|---|
| `chore/project-setup` | ✅ Mergé dans develop |
| `chore/database-schema` | ✅ Mergé dans develop |
| `feature/auth` | ✅ En cours — prêt à merger |
| `feature/grid-display` | ⬜ À faire |
| `feature/keyboard-navigation` | ⬜ À faire |
| `feature/room-system` | ⬜ À faire |
| `feature/realtime-collaboration` | ⬜ À faire |
| `feature/presence` | ⬜ À faire |
| `feature/validation` | ⬜ À faire |
| `feature/grid-catalogue` | ⬜ À faire |
| `feature/grid-importer` | ⬜ À faire |
| `feature/grid-generator` | ⬜ À faire |
| `chore/keep-alive` | ⬜ À faire |
| `chore/ui-polish` | ⬜ À faire |

---

## Branches à créer dans l'ordre

---

### ✅ `chore/project-setup`
**Initialisation du projet** — *mergé dans develop le 2026-05-20*

- [x] `npx create-next-app@latest` avec App Router, TypeScript, Tailwind
- [x] Installer et configurer shadcn/ui
- [x] Installer Supabase client (`@supabase/ssr`, `@supabase/supabase-js`)
- [x] Configurer les variables d'environnement (`.env.local`, `.env.example`)
- [x] Configurer ESLint + Prettier
- [ ] Mettre en place le déploiement Vercel + lier le projet Supabase *(à faire manuellement)*
- [x] Configurer le design system : tokens de couleurs, fonts (Inter + Lora) dans `globals.css`

---

### ✅ `chore/database-schema`
**Mise en place du schéma Supabase** — *pushé le 2026-05-20, prêt à merger*

- [x] Créer les tables `grids`, `rooms`, `room_players`, `profiles` via les migrations Supabase
- [x] Configurer les politiques RLS sur `rooms` et `room_players`
- [x] Activer Supabase Realtime sur la table `rooms`
- [x] Seeder la DB avec 3 grilles de test hardcodées (format JSON manuel)

---

### `feature/auth`
**En tant qu'utilisateur, je veux jouer sans créer de compte**

- [ ] US1 : En tant que visiteur, je peux entrer un pseudo et jouer immédiatement (auth anonyme Supabase)
- [ ] US2 : En tant qu'utilisateur, je peux me connecter avec Google pour sauvegarder mon historique
- [ ] US3 : En tant qu'utilisateur connecté, je vois mon nom et mon avatar dans la salle de jeu
- [ ] Middleware Next.js pour protéger les routes `/play/[slug]`
- [ ] Page `/login` avec le composant shadcn `Card`

---

### `feature/grid-display`
**En tant que joueur, je veux voir la grille de mots fléchés**

- [ ] US4 : En tant que joueur, je vois la grille complète avec ses cases noires (indices) et cases lettres
- [ ] US5 : En tant que joueur, je vois les flèches directionnelles dans les cases noires
- [ ] US6 : En tant que joueur, je vois les définitions dans le panneau latéral
- [ ] Composants : `CrosswordGrid`, `GridCell`, `CluePanel`
- [ ] Rendu statique depuis une grille JSON (pas encore de DB)

---

### `feature/keyboard-navigation`
**En tant que joueur, je veux naviguer dans la grille au clavier**

- [ ] US7 : En tant que joueur, je clique sur une case pour la sélectionner (mise en surbrillance)
- [ ] US8 : En tant que joueur, je navigue entre les cases avec les touches fléchées
- [ ] US9 : En tant que joueur, je tape une lettre et le curseur avance automatiquement à la case suivante
- [ ] US10 : En tant que joueur, je peux effacer une lettre avec `Backspace`
- [ ] US11 : En tant que joueur, la définition active dans le panneau se met à jour selon ma case sélectionnée
- [ ] Hook `useGrid` pour toute la logique de navigation

---

### `feature/room-system`
**En tant que joueur, je veux créer une salle et inviter mes amis**

- [ ] US12 : En tant que joueur, je peux créer une salle en choisissant une grille dans le catalogue
- [ ] US13 : En tant que joueur, je reçois un lien court et copiable à partager (ex: `wordmesh.app/play/bleu-chat-42`)
- [ ] US14 : En tant qu'invité, je rejoins la salle en cliquant sur le lien (je saisis mon pseudo si anonyme)
- [ ] US15 : En tant que joueur, je vois la liste des joueurs présents dans la salle avec leur couleur assignée
- [ ] API Route `POST /api/rooms` avec génération du slug aléatoire
- [ ] Page `/play` (lobby) avec sélection de grille + bouton "Créer une salle"

---

### `feature/realtime-collaboration`
**En tant que joueur, je veux voir les saisies de mes amis en temps réel**

- [ ] US16 : En tant que joueur, quand un ami tape une lettre, je la vois apparaître instantanément dans sa couleur
- [ ] US17 : En tant que joueur, si deux amis écrivent en même temps dans la même case, la dernière lettre gagne
- [ ] US18 : En tant que joueur, quand un ami quitte la salle, ses lettres restent mais son curseur disparaît
- [ ] Subscription Supabase Realtime sur `rooms.state`
- [ ] Hook `useRoom` pour gérer l'état global de la partie
- [ ] Store Zustand pour l'état local (optimistic updates)

---

### `feature/presence`
**En tant que joueur, je veux voir où jouent mes amis dans la grille**

- [ ] US19 : En tant que joueur, je vois un indicateur coloré dans la case où se trouve le curseur d'un ami
- [ ] US20 : En tant que joueur, je vois dans le header quels amis sont en ligne / hors ligne
- [ ] US21 : En tant que joueur, une pastille de couleur est affichée dans le coin des cases remplies par un autre joueur
- [ ] Canal Supabase Presence (`presence:${slug}`)
- [ ] Composants `PlayerCursors`, `PlayerList`

---

### `feature/validation`
**En tant que joueur, je veux savoir si mes réponses sont correctes**

- [ ] US22 : En tant que joueur, je peux demander à vérifier une lettre (elle devient verte ✓ ou rouge ✗)
- [ ] US23 : En tant que joueur, je peux demander à vérifier un mot entier
- [ ] US24 : En tant que joueur, quand toute la grille est correctement remplie, un écran de victoire apparaît avec les stats (temps, joueur le plus actif)
- [ ] Fonction `validateGrid` côté serveur (la solution ne doit jamais être exposée au client)
- [ ] Server Action pour la validation (solution stockée en DB, jamais envoyée au client)

---

### `feature/grid-catalogue`
**En tant que joueur, je veux choisir parmi plusieurs grilles**

- [ ] US25 : En tant que joueur, je vois un catalogue de grilles avec titre, difficulté et aperçu miniature
- [ ] US26 : En tant que joueur, je peux filtrer les grilles par difficulté (facile / moyen / difficile)
- [ ] US27 : En tant que joueur, je vois une "Grille du Jour" mise en avant sur la page d'accueil
- [ ] Import des grilles JSON dans Supabase (script d'import one-shot)
- [ ] Page `/grids` avec pagination
- [ ] Composant `GridCard` (shadcn `Card` + aperçu SVG de la structure)

---

### `feature/grid-importer`
**En tant qu'admin, je veux importer des grilles depuis des sources externes**

- [ ] US28 : En tant qu'admin, je peux uploader un fichier `.ipuz` ou `.json` qui est parsé et inséré en DB
- [ ] US29 : En tant qu'admin, les grilles importées passent par un statut `draft` avant d'être publiées
- [ ] Parser `lib/grid/importer.ts` pour le format IPUZ
- [ ] Route admin protégée `POST /api/admin/grids/import`
- [ ] Script Node.js pour import en masse depuis un dossier local

---

### `feature/grid-generator`
**En tant que système, je veux générer de nouvelles grilles automatiquement chaque nuit**

- [ ] US30 : En tant que joueur, de nouvelles grilles apparaissent régulièrement dans le catalogue sans intervention manuelle
- [ ] Générateur procédural `lib/grid/generator.ts` (backtracking + Lexique.org)
- [ ] Intégration dictionnaire Lexique.org (fichier TSV chargé au démarrage)
- [ ] Route cron `GET /api/cron/generate-grids` (protégée par `CRON_SECRET`)
- [ ] Configuration `vercel.json` avec le cron à 02h00

---

### `chore/keep-alive`
**Empêcher la mise en pause de Supabase (free tier)**

- [ ] Route `GET /api/cron/ping` qui exécute une requête SQL simple sur la DB
- [ ] Ajouter ce cron dans `vercel.json` (toutes les 24h)

---

### `chore/ui-polish`
**Finalisation du design et responsive mobile**

- [ ] Ajustements finaux du design system (couleurs, shadows, typographie)
- [ ] Responsive mobile : la grille passe en plein écran, panneau de définitions en drawer bas
- [ ] Animations subtiles : apparition des lettres, transition victoire
- [ ] Page d'accueil (landing) avec CTA "Jouer maintenant"
- [ ] Dark mode (optionnel, selon priorité)
- [ ] Favicon + métadonnées Open Graph (pour le partage de lien)

---

## Résumé des branches dans l'ordre

```
chore/project-setup
chore/database-schema
feature/auth
feature/grid-display
feature/keyboard-navigation
feature/room-system
feature/realtime-collaboration
feature/presence
feature/validation
feature/grid-catalogue
feature/grid-importer
feature/grid-generator
chore/keep-alive
chore/ui-polish
```

> **Règle** : on ne merge pas une branche dans `develop` sans que les US associées soient testées manuellement à plusieurs (au moins 2 joueurs pour tout ce qui est temps réel).
