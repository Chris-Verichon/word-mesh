# Word-Mesh — Spécification Technique

> Application web collaborative de mots fléchés en temps réel.

---

## 1. Vision Produit

**Word-Mesh** est une application web permettant à des joueurs de résoudre ensemble des grilles de mots fléchés en temps réel. Chaque joueur voit les saisies des autres instantanément, avec attribution colorée par joueur. Le design s'inspire de l'esthétique de **claude.ai** : minimaliste, chaleureux, lisible.

### Principes directeurs
- **Simplicité d'accès** : rejoindre une partie en 2 clics (lien de salle partageable)
- **Temps réel fluide** : pas de rechargement, synchronisation sub-seconde
- **Grilles renouvelées en permanence** : pipeline automatisé d'import et de génération
- **Design soigné** : expérience premium, pas un outil utilitaire

---

## 2. Stack Technique

| Couche | Technologie | Justification |
|---|---|---|
| Framework | **Next.js 15** (App Router) | Full-stack, SSR/RSC, idéal pour Vercel |
| UI | **React 19** + **shadcn/ui** + **Tailwind CSS v4** | Composants accessibles, stylage utilitaire |
| Backend | **Next.js Server Actions** + **API Routes** | Pas de serveur séparé, colocalisé avec le front |
| Base de données | **Supabase** (PostgreSQL) | Relationnel, RLS, extensible |
| Temps réel | **Supabase Realtime** (WebSocket) | Subscriptions sur changements DB natifs |
| Auth | **Supabase Auth** | Magic link, OAuth Google/GitHub |
| Stockage | **Supabase Storage** | Assets statiques des grilles (images, exports) |
| Déploiement | **Vercel** | CI/CD, Edge Network, prévisualisations PR |
| Dictionnaire FR | **Lexique.org** (140k mots, open data) | Génération procédurale de grilles |

---

## 3. Modèle de Données (Supabase / PostgreSQL)

```sql
-- Grilles de mots fléchés
CREATE TABLE grids (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  author      TEXT,                          -- source ou créateur
  difficulty  TEXT CHECK (difficulty IN ('facile', 'moyen', 'difficile')),
  width       INT NOT NULL,                  -- colonnes
  height      INT NOT NULL,                  -- lignes
  cells       JSONB NOT NULL,                -- structure complète (voir §3.1)
  source      TEXT,                          -- 'generated' | 'imported' | 'community'
  created_at  TIMESTAMPTZ DEFAULT now(),
  published   BOOLEAN DEFAULT false
);

-- Salles de jeu (sessions collaboratives)
CREATE TABLE rooms (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT UNIQUE NOT NULL,          -- ex: "bleu-chat-42" (URL friendly)
  grid_id     UUID REFERENCES grids(id),
  owner_id    UUID REFERENCES auth.users(id),
  state       JSONB NOT NULL DEFAULT '{}',   -- { cellId: { value, player_id, color } }
  status      TEXT DEFAULT 'active',         -- 'active' | 'completed' | 'archived'
  created_at  TIMESTAMPTZ DEFAULT now(),
  expires_at  TIMESTAMPTZ                    -- TTL pour salles anonymes
);

-- Présence des joueurs dans une salle
CREATE TABLE room_players (
  room_id     UUID REFERENCES rooms(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES auth.users(id),
  display_name TEXT NOT NULL,
  color       TEXT NOT NULL,                 -- couleur assignée (HSL)
  cursor_cell TEXT,                          -- cellule survolée
  joined_at   TIMESTAMPTZ DEFAULT now(),
  last_seen   TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (room_id, user_id)
);

-- Profils utilisateurs
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id),
  username    TEXT UNIQUE,
  avatar_url  TEXT,
  stats       JSONB DEFAULT '{"completed": 0, "total_letters": 0}'
);
```

### 3.1 Structure `cells` (JSONB)

Chaque cellule est indexée par `"col-row"` (ex: `"3-7"`) :

```json
{
  "0-0": {
    "type": "black",
    "arrows": ["right", "down"],
    "clue_right": "Mammifère marin",
    "clue_down": "Métal précieux"
  },
  "1-0": {
    "type": "letter",
    "solution": "B",
    "word_id_h": "w_1_0_h",
    "word_id_v": null
  }
}
```

### 3.2 Row Level Security

```sql
-- Rooms : lecture si membre ou salle publique
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "room_access" ON rooms FOR SELECT
  USING (auth.uid() IN (
    SELECT user_id FROM room_players WHERE room_id = rooms.id
  ) OR owner_id IS NULL);

-- State mis à jour uniquement par les membres actifs
CREATE POLICY "room_write" ON rooms FOR UPDATE
  USING (auth.uid() IN (
    SELECT user_id FROM room_players WHERE room_id = rooms.id
  ));
```

---

## 4. Architecture Applicative

```
word-mesh/
├── app/
│   ├── (marketing)/          # Page d'accueil, about
│   │   └── page.tsx
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── callback/route.ts
│   ├── play/
│   │   ├── page.tsx           # Lobby — choisir/créer une salle
│   │   └── [slug]/
│   │       ├── page.tsx       # Salle de jeu collaborative
│   │       └── loading.tsx
│   ├── grids/
│   │   ├── page.tsx           # Catalogue des grilles
│   │   └── [id]/page.tsx      # Détail d'une grille
│   ├── api/
│   │   ├── rooms/route.ts     # POST /api/rooms → créer une salle
│   │   ├── grids/
│   │   │   ├── route.ts       # GET /api/grids (paginated)
│   │   │   └── generate/route.ts  # POST → génère une grille
│   │   └── webhooks/
│   │       └── grid-import/route.ts
│   └── layout.tsx
├── components/
│   ├── grid/
│   │   ├── CrosswordGrid.tsx  # Composant principal de la grille
│   │   ├── GridCell.tsx       # Cellule individuelle
│   │   ├── CluePanel.tsx      # Panneau des définitions
│   │   └── PlayerCursors.tsx  # Indicateurs de présence
│   ├── room/
│   │   ├── RoomHeader.tsx     # Titre, joueurs, timer
│   │   ├── PlayerList.tsx
│   │   └── ShareButton.tsx
│   └── ui/                    # shadcn components
├── lib/
│   ├── supabase/
│   │   ├── client.ts          # Browser client
│   │   ├── server.ts          # Server client (RSC / Server Actions)
│   │   └── realtime.ts        # Hooks de subscription
│   ├── grid/
│   │   ├── generator.ts       # Générateur procédural de grilles
│   │   ├── validator.ts       # Vérification solution
│   │   └── importer.ts        # Parser format IPUZ/PUZ
│   └── utils.ts
├── hooks/
│   ├── useRoom.ts             # État de la salle + subscription
│   ├── usePresence.ts         # Présence des joueurs
│   └── useGrid.ts             # Navigation clavier dans la grille
└── stores/
    └── gameStore.ts           # Zustand — état local de jeu
```

---

## 5. Fonctionnalités

### 5.1 MVP (v1)

| Feature | Description |
|---|---|
| **Auth anonyme** | Jouer sans compte avec un pseudo temporaire |
| **Créer une salle** | Sélectionner une grille, obtenir un lien partageable |
| **Rejoindre une salle** | Via lien ou code court |
| **Jeu collaboratif** | Saisie synchronisée en temps réel, couleurs par joueur |
| **Navigation clavier** | Flèches, Tab, Backspace, gestion H/V |
| **Panneau de définitions** | Clue active mise en surbrillance selon la cellule |
| **Validation** | Vérification lettre / mot / grille complète |
| **Catalogue de grilles** | 50+ grilles initiales, filtrage par difficulté |

### 5.2 V2

- Authentification complète (Google, GitHub, magic link)
- Profils joueurs + statistiques
- Éditeur de grilles communautaire
- Classements et achievements
- Mode solo chrono
- Indice payant (reveal letter/word)
- Notifications push (votre tour, grille du jour)

### 5.3 Grille du Jour

Une grille quotidienne mise en avant sur la page d'accueil, partagée par tous les joueurs. Résultats agrégés visibles après résolution.

---

## 6. Pipeline de Grilles

### 6.1 Sources

| Source | Format | Automatisé |
|---|---|---|
| **Générateur interne** | Propriétaire | Oui (cron Vercel) |
| **Archives open-source** | IPUZ, PUZ, JSON | Import one-shot |
| **Lexique.org** | TSV (140k mots FR) | Base du générateur |
| **Soumissions communauté** | Éditeur in-app | Workflow de validation |

### 6.2 Générateur Procédural (lib/grid/generator.ts)

Algorithme en 3 étapes :

1. **Layout** : placement des cases noires selon des contraintes (symétrie, densité ~20%, pas de mots < 3 lettres)
2. **Fill** : backtracking avec dictionnaire filtré par longueur (structure trie pour performance)
3. **Clues** : association définition → mot via base de définitions ou LLM (OpenAI API en fallback)

```typescript
interface GeneratorConfig {
  width: number;          // 10-15 pour mots fléchés standard
  height: number;
  difficulty: 'facile' | 'moyen' | 'difficile';
  blackCellRatio: number; // 0.15 - 0.25
  language: 'fr';
}

async function generateGrid(config: GeneratorConfig): Promise<Grid>
```

**Cron Vercel** (`vercel.json`) : génération de 3 nouvelles grilles chaque nuit à 02h00.

### 6.3 Import IPUZ/PUZ

Le format [IPUZ](http://ipuz.org/) est un standard JSON open-source pour les puzzles de mots. De nombreuses archives publiques l'utilisent.

```typescript
// lib/grid/importer.ts
async function importIPUZ(data: IPUZPuzzle): Promise<Grid>
async function importPUZ(buffer: ArrayBuffer): Promise<Grid>  // format Across Lite
```

### 6.4 Base de Définitions

- `definitions.csv` : base initiale de 50k paires mot↔définition (Wiktionnaire export)
- Enrichissement progressif via contributions communautaires
- Fallback GPT-4o-mini pour générer une définition manquante (coût ~$0.0001/définition)

---

## 7. Temps Réel (Supabase Realtime)

### 7.1 Flux de données

```
Joueur A tape "B" dans cellule (3,2)
  → Server Action : UPDATE rooms SET state = jsonb_set(state, '{3-2}', ...) WHERE id = $room
  → Supabase Realtime broadcast → tous les clients abonnés
  → Joueur B voit "B" apparaître en bleu (couleur de A) en <200ms
```

### 7.2 Canaux

```typescript
// Canal de la salle — changements d'état de la grille
supabase
  .channel(`room:${slug}`)
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'rooms',
    filter: `slug=eq.${slug}`
  }, handleStateChange)

// Canal de présence — curseurs et activité
supabase
  .channel(`presence:${slug}`)
  .on('presence', { event: 'sync' }, handlePresenceSync)
  .on('presence', { event: 'join' }, handlePlayerJoin)
  .on('presence', { event: 'leave' }, handlePlayerLeave)
```

### 7.3 Conflits

Stratégie **Last Write Wins** avec timestamp. Si deux joueurs écrivent simultanément la même cellule, la dernière écriture gagne. Acceptable pour ce cas d'usage collaboratif (pas de conflit métier critique).

---

## 8. Design System

### 8.1 Inspiration Claude.ai

L'interface adopte l'esthétique de claude.ai :
- **Fond** : blanc cassé chaud (`#FAF9F7`)
- **Surfaces** : blanc pur avec ombre subtile (`shadow-sm`)
- **Texte primaire** : quasi-noir (`#1A1A1A`)
- **Accents** : orange cuivré doux (`#D97706`) pour les états actifs
- **Typographie** : `Inter` (UI) + `Lora` (titres et clues — serif pour l'aspect journal)
- **Radius** : `rounded-xl` généralisé, pas de coins agressifs
- **Spacing** : généreux, aéré

### 8.2 Tokens Tailwind

```typescript
// tailwind.config.ts
theme: {
  extend: {
    colors: {
      background: '#FAF9F7',
      surface: '#FFFFFF',
      border: '#E5E3DF',
      text: {
        primary: '#1A1A1A',
        muted: '#6B7280',
      },
      accent: {
        DEFAULT: '#D97706',
        hover: '#B45309',
      },
      players: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'],
    },
    fontFamily: {
      sans: ['Inter', 'sans-serif'],
      serif: ['Lora', 'serif'],
    }
  }
}
```

### 8.3 Composant GridCell

```
┌────────────────────────────────────┐
│  Cellule noire (indice)            │
│  ↓ Capitale      → Fleuve         │
├────────────────────────────────────┤
│  Cellule lettre active             │
│  ┌──────┐  fond: accent/10        │
│  │  A   │  bordure: accent        │
│  └──────┘  lettre: bold           │
├────────────────────────────────────┤
│  Cellule lettre (autre joueur)     │
│  fond: player-color/20             │
│  pastille couleur en coin          │
└────────────────────────────────────┘
```

---

## 9. Performance & Contraintes

| Contrainte | Cible |
|---|---|
| Latence Realtime | < 200ms P95 |
| First Contentful Paint | < 1.5s |
| Taille bundle client | < 150kB gzipped |
| Concurrent users/room | 20 max (Supabase Free : 200 connexions totales) |
| Grilles disponibles | ≥ 100 au lancement |
| Uptime | 99.9% (Vercel + Supabase gèrent l'infra) |

---

## 10. Sécurité

- **RLS Supabase** : isolation stricte des salles, un joueur ne peut écrire que dans les salles où il est enregistré
- **Rate limiting** : middleware Vercel Edge sur `/api/rooms` (max 5 salles créées / IP / heure)
- **Sanitisation** : toutes les saisies utilisateurs (pseudo, lettres) sont validées côté serveur (Zod)
- **Pas de données sensibles** : pas de stockage de mots de passe, OAuth uniquement
- **CSP headers** : configurés via `next.config.ts`

---

## 11. Déploiement

```jsonc
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/generate-grids",
      "schedule": "0 2 * * *"   // chaque nuit à 02h00
    }
  ]
}
```

**Variables d'environnement requises :**
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=              # optionnel, pour génération de définitions
```

**Branches :**
- `main` → production (vercel.app)
- `develop` → preview deployments automatiques

---

## 12. Roadmap

```
Semaine 1-2  → Setup projet, Auth, modèle DB, grille statique affichée
Semaine 3-4  → Realtime collaboratif fonctionnel, navigation clavier
Semaine 5    → Pipeline import grilles, générateur basique
Semaine 6    → Polish UI (design claude.ai), responsive mobile
Semaine 7    → Tests, sécurité RLS, rate limiting
Semaine 8    → Bêta privée, retours, ajustements
             → Lancement public
```
