<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# Word-Mesh — Agent Rules

## Language
- **Code comments**: English only
- **CHANGELOG.md**: English only
- **Commit messages**: English only
- **UI strings / user-facing text**: French (the app is in French)

## On every branch (feature, fix, chore)

### 1. CHANGELOG.md
Update `CHANGELOG.md` on every branch before the final commit.
- Add a dated section under `[Unreleased]` or bump to the new version
- List all Added / Changed / Fixed / Removed items in English

### 2. package.json version — Semantic Versioning
Increment the version according to the branch type:
- `chore/*` or `fix/*` → **patch** bump (0.0.x)
- `feature/*` → **minor** bump (0.x.0)
- Breaking change → **major** bump (x.0.0)

### 3. Atomic commits
2–5 commits per branch. Each commit must represent one logical unit of work.
Do not mix unrelated changes in a single commit.

### 4. Git confirmation — REQUIRED
**Always ask the user for confirmation before running any git command** (commit, push, pull, merge, checkout, branch, reset, etc.).
Never run git commands silently or chain them without explicit approval for each step.

### 5. PLAN.md — keep up to date
Update `docs/PLAN.md` on every branch: check off completed tasks and update the progress table at the top.

## Stack
- Next.js 15 (App Router, TypeScript, Tailwind v4, Turbopack)
- shadcn/ui · Prettier + prettier-plugin-tailwindcss
- Supabase (Auth, Realtime, PostgreSQL, Storage)
- Vercel (deploy + crons)
- Fonts: Inter (--font-sans) · Lora (--font-serif, headings)

## Git flow
```
master ← stable releases (merge from develop via PR)
develop ← integration (merge from feature branches via PR)
feature/* · fix/* · chore/* ← daily work
```
