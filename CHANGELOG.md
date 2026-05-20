# Changelog

All notable changes to this project are documented here.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning follows [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

---

## [0.3.0] — 2026-05-20

### Feature — `feature/grid-display`

#### Added
- `lib/grid/fixtures.ts`: static fixture grid (5×5, facile) mirroring seed data
- `components/grid/GridCell.tsx`: renders black (clue) cells and letter cells; supports player color, selection, active-word highlight
- `components/grid/CrosswordGrid.tsx`: CSS Grid layout for the full crossword; accepts optional `roomState`, `selectedCell`, `activeWordId`, `playerColors` props for future features
- `components/grid/CluePanel.tsx`: extracts and lists horizontal/vertical clues from the grid cells JSON, with optional active-clue highlight
- `app/play/[slug]/page.tsx`: static game page rendering the fixture grid with header and clue panel
- `app/play/page.tsx`: lobby placeholder page

---

## [0.2.0] — 2026-05-20

### Feature — `feature/auth`

#### Added
- `middleware.ts`: Supabase session refresh on every request + redirect unauthenticated users from `/play` to `/login`
- `lib/auth/actions.ts`: Server Actions for anonymous sign-in (with display name), Google OAuth, and sign-out
- `app/(auth)/callback/route.ts`: OAuth callback route, exchanges code for session and redirects to intended destination
- `app/(auth)/login/page.tsx`: login page with anonymous pseudo input and Google OAuth button (shadcn Card, Input, Button)
- shadcn components added: `card`, `input`, `label`, `separator`

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

#### Added
- Next.js 15 initialization (App Router, TypeScript, Tailwind v4, Turbopack)
- shadcn/ui setup (neutral base color)
- Supabase packages: `@supabase/supabase-js`, `@supabase/ssr`
- Prettier + `prettier-plugin-tailwindcss`
- Design system in `globals.css`: warm cream background, copper orange accent, 6 player colors, Inter + Lora fonts, 0.75rem radius
- `app/layout.tsx`: Word-Mesh metadata, Inter + Lora fonts, lang="fr"
- `app/page.tsx`: clean placeholder home page
- `.env.example` with all variables documented
- `prettier.config.ts`
- `docs/SPEC.md`: full technical specification
- `docs/PLAN.md`: development plan by branches
