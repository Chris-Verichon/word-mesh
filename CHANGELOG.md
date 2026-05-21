# Changelog

All notable changes to this project are documented here.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning follows [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

---

## [0.8.0] — 2026-05-21

### Feature — `feature/validation`

#### Added
- "Vérifier" button in the clue panel sidebar
  - Compares each filled, non-verified cell against `cell.solution`
  - Correct cells: `verified_at` timestamp set, cell rendered in green, locked against further editing
  - Wrong cells: highlighted in red, remain editable for correction
  - Verified cells are broadcast to other players and persisted to DB immediately
  - Room `status` set to `"completed"` when all letter cells are verified correct
- Completion banner displayed above the grid when the room is complete

#### Changed
- `hooks/useGrid.ts`: new `lockedCells?: Set<string>` option — typing and backspace skip verified cells
- `components/grid/GridCell.tsx`: new `isVerified` and `isWrong` props with green/red visual states
- `components/grid/CrosswordGrid.tsx`: new `wrongCells?: Set<string>` prop, derives `isVerified` from `cellState.verified_at`
- `app/play/[slug]/GameBoard.tsx`: complete rewrite of state management — `verifiedState` overlay, `lockedCells` derivation, `handleVerify` callback, full display state merge

---

## [0.7.0] — 2026-05-21

### Feature — `feature/presence`

#### Added
- `hooks/usePresence.ts`: Supabase Realtime Presence channel hook
  - Broadcasts the current player's cursor cell whenever selection changes
  - Returns `cursorMap` (cellId → color of other player there) and `onlineUserIds`
- Cursor dot overlay on letter cells: 8 px colored circle at top-right corner shows where another player is focused

#### Changed
- `components/grid/GridCell.tsx`: new `cursorColor?: string` prop renders presence dot
- `components/grid/CrosswordGrid.tsx`: new `cursorMap?: Record<string, string>` prop, forwarded to each cell
- `app/play/[slug]/GameBoard.tsx`: integrates `usePresence`, passes `cursorMap` to `CrosswordGrid`
- `app/play/[slug]/page.tsx`: resolves `currentDisplayName` from `room_players` or user metadata, passes to `GameBoard`

---

## [0.6.0] — 2026-05-21

### Feature — `feature/realtime-collaboration`

#### Added
- `hooks/useRoomRealtime.ts`: Supabase Realtime broadcast channel hook
  - Subscribes to `room:{roomId}` channel and merges live `cell_update` events from other players into `remoteState`
  - Exposes `broadcastCell(cellId, cellState | null)` to publish local changes
  - Seeds `remoteState` with the DB snapshot (`initialState`) so existing letters appear immediately
- Debounced DB persistence in `GameBoard`: 2 s after the last keystroke, merged state is saved back to `rooms.state`

#### Changed
- `hooks/useGrid.ts`: replaced 4th positional `initialState` param with an `options: UseGridOptions` object
  - New options: `playerId`, `playerColor`, `onCellChange` callback
  - `CellState` entries now carry the real `player_id` and `color`
  - `onCellChange` is called on every letter write and backspace delete
- `app/play/[slug]/GameBoard.tsx`: wires `useRoomRealtime` + `useGrid` together
  - Displays `mergedState = { ...remoteState, ...localState }` so all players' letters are visible
  - Passes `roomId` to enable the Realtime subscription
- `app/play/[slug]/page.tsx`: passes `roomId={room.id}` to `GameBoard`

---

## [0.5.0] — 2026-05-20

### Feature — `feature/room-system`

#### Added
- `lib/room/slug.ts`: random French slug generator (`adj-noun-##`), with uniqueness check against the rooms table
- `lib/room/colors.ts`: 6 player color constants matching `globals.css` CSS variables
- `lib/room/create.ts`: `createRoomForUser` and `joinRoomIfNeeded` shared helpers
- `app/play/actions.ts`: Server Action `createRoom(gridId)` — creates room + first player, redirects to `/play/[slug]`
- `app/api/rooms/route.ts`: `POST /api/rooms` HTTP endpoint (same logic, for external clients)
- `components/room/ShareButton.tsx`: client component — copies room URL to clipboard
- `components/room/PlayerList.tsx`: displays players with colored dot indicators
- `components/room/RoomHeader.tsx`: room header composing title, difficulty, player list and share button

#### Changed
- `app/play/page.tsx`: full lobby — fetches published grids from Supabase, one "Créer une salle" form per grid
- `app/play/[slug]/page.tsx`: fetches real room + grid from Supabase, auto-joins authenticated user, passes `initialState` and `playerColors` to `GameBoard`
- `app/play/[slug]/GameBoard.tsx`: accepts `initialState` and `playerColors` props
- `hooks/useGrid.ts`: `useGrid` now accepts optional `initialState` to seed the board

---

## [0.4.0] — 2026-05-20

### Feature — `feature/keyboard-navigation`

#### Added
- `hooks/useGrid.ts`: client hook managing selected cell, active word/direction, active clue cell, and local room state; handles click selection, direction toggle, arrow key navigation, letter input (with French accent normalization), and Backspace
- `app/play/[slug]/GameBoard.tsx`: client component wrapping `CrosswordGrid` + `CluePanel`, owns keyboard listener and bridges `useGrid` state to both components

#### Changed
- `components/grid/GridCell.tsx`: marked `"use client"` for interactive button handling
- `components/grid/CrosswordGrid.tsx`: marked `"use client"`
- `app/play/[slug]/page.tsx`: refactored to delegate interactive area to `GameBoard`

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
