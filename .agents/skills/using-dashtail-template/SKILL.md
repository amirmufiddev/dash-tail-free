---
name: using-dashtail-template
description: >-
  Use when starting a new Next.js web, SaaS, or dashboard project from the DashTail
  boilerplate template, or when creating pages, UI features, menus, and FigCraft
  designs inside a DashTail-based repository.
---

# Using DashTail Template

## Overview

Use **`dash-tail-free`** (Next.js 16 App Router, React 19, Tailwind CSS, shadcn `new-york`, and FigCraft) as the starting boilerplate and architectural baseline instead of running `create-next-app` from scratch or inventing custom UI primitives.

**Template Sources:**
- Local boilerplate path: `/home/amirmufid/projects/boilerplate/dash-tail-free`
- Git repository: `git@github.com:amirmufiddev/dash-tail-free.git`

## 1. Bootstrapping a New Project from This Template

When creating a new project outside this repo:

1. **Copy or clone the boilerplate** into `<target-dir>` without carrying over old build/git history:
   ```bash
   git clone --depth=1 git@github.com:amirmufiddev/dash-tail-free.git <target-dir>
   # Or from local machine copy:
   rsync -a --exclude='.git' --exclude='node_modules' --exclude='.next' \
     /home/amirmufid/projects/boilerplate/dash-tail-free/ <target-dir>/
   ```
2. **Reset git & install dependencies**:
   ```bash
   cd <target-dir> && rm -rf .git && git init && bun install
   ```
3. **Update project identity**:
   - Edit `name` in `package.json`.
   - Update site title/description in `config/site.ts`.
   - Configure `.env.local` if NextAuth or API integrations are enabled.

## 2. Mandatory Implementation Rules Inside the Template

Always read `DESIGN.MD` and `AGENT.MD` at the project root (and follow `AGENTS.md` Next.js 16 rules) before writing UI code:

1. **Reuse `components/ui/*` Exclusively (`@/components/ui/*`)**:
   - Never build new custom base UI primitives or raw `<button>`, `<input>`, `<table>`, or modal `<div>` elements when equivalents exist in `components/ui/` (`Card`, `Button`, `Badge`, `Input`, `Textarea`, `Label`, `Select`, `Checkbox`, `Switch`, `Accordion`, `Tabs`, `Dialog`, `Table`, `Alert`, `Progress`, `Avatar`, `Popover`, `Command`, `DropdownMenu`, `ScrollArea`, `Sonner`).
   - Ask the user for confirmation before adding any new primitive to `components/ui/`.
2. **Use Semantic Theme Tokens**:
   - Style with Tailwind tokens (`bg-card`, `bg-background`, `text-default-900`, `text-muted-foreground`, `border-border`, `bg-primary`, `text-destructive`, `text-success`) backed by `app/assets/scss/globals.scss` so Light and Dark mode both work automatically.
3. **App Router & Menu Synchronization**:
   - Place dashboard app pages under `app/(dashboard)/(apps)/<slug>/page.tsx`.
   - Whenever adding a menu entry, update **all 3** configs in `config/menus.ts`: `mainNav`, `sidebarNav.modern`, and `sidebarNav.classic` (use SVG icons from `@/components/svg`).
   - Wrap any client component calling `useSearchParams()` inside `<Suspense>` so `next build` static prerendering succeeds.
   - Read relevant guides in `node_modules/next/dist/docs/` before using version-specific Next.js 16 APIs.
4. **FigCraft Design Sync (When Designing or Updating Tokens)**:
   - Use `scripts/figcraft-sync.mjs`, `figcraft.connect.json`, and `design/dash-tail.figcraft` (`bun run figcraft:build`, `bun run figcraft:sync-tokens`, `bun run figcraft:export`).

## 3. Common Mistakes to Avoid

| Mistake | Fix |
| --- | --- |
| Running `create-next-app` instead of cloning this template | Always copy/clone `dash-tail-free` |
| Creating duplicate UI components or raw styled controls | Import from `@/components/ui/*` |
| Adding a menu link only to `mainNav` | Update `mainNav`, `sidebarNav.modern`, and `sidebarNav.classic` in `config/menus.ts` |
| Putting borders/padding directly on `AccordionContent` | Put inner borders/padding on a child `<div>` inside `AccordionContent` |
| Calling `useSearchParams()` directly in a page component | Extract inner component and wrap it in `<Suspense>` |

## 4. Verification Checklist

Run after any code changes and confirm `exit code 0`:

```bash
npx tsc --noEmit
npx eslint config/menus.ts <modified-files>
npm run test:routes
bun run build
```
