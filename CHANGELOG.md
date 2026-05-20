# Changelog

Toutes les modifications notables de ce projet sont documentées ici.

Format basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/).
Versioning selon [Semantic Versioning](https://semver.org/lang/fr/).

---

## [Unreleased]

---

## [0.1.1] — 2026-05-20

### Chore — `chore/database-schema`

#### Added
- `supabase/migrations/001_initial_schema.sql`: tables `profiles`, `grids`, `rooms`, `room_players` with RLS policies and Realtime enabled
- `supabase/seed.sql`: 3 test grids for local development
- `lib/supabase/client.ts`: typed browser client (`createBrowserClient`)
- `lib/supabase/server.ts`: typed server client for RSC/Server Actions + service role client for cron jobs
- `lib/supabase/types.ts`: full TypeScript types for all tables, JSONB structures (`GridCells`, `RoomState`, `CellState`, etc.) and `Database` generic type

---

## [0.1.0] — 2026-05-20

### Chore — `chore/project-setup`

#### Ajouté
- Initialisation Next.js 15 (App Router, TypeScript, Tailwind v4, Turbopack)
- Installation et configuration de shadcn/ui (base color neutral)
- Packages Supabase : `@supabase/supabase-js`, `@supabase/ssr`
- Prettier + `prettier-plugin-tailwindcss`
- Design system dans `globals.css` : fond crème chaud, accent orange cuivré, 6 couleurs joueurs, polices Inter + Lora, radius 0.75rem
- `app/layout.tsx` : métadonnées Word-Mesh, fonts Inter + Lora, lang="fr"
- `app/page.tsx` : page d'accueil placeholder propre
- `.env.example` avec toutes les variables documentées
- `prettier.config.ts`
- `docs/SPEC.md` : spécification technique complète
- `docs/PLAN.md` : plan de développement par branches
