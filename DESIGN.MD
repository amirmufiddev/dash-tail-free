# DESIGN.MD — DashTail Design System

Dokumen ini mendefinisikan standar visual, design token, tipografi, komponen UI, dan pola layout untuk aplikasi **DashTail** (`dash-tail-free`), baik pada kode Next.js maupun sinkronisasi desain **FigCraft**.

---

## 1. Tech Stack & Single Source of Truth

| Aspek | Konvensi / Sumber |
| --- | --- |
| Framework | Next.js `16.4.6` (App Router) + React `19.3.1` |
| Styling | Tailwind CSS (`darkMode: ["class"]`) via [`tailwind.config.js`](tailwind.config.js) |
| CSS Variables | [`app/assets/scss/globals.scss`](app/assets/scss/globals.scss) |
| Component Registry | [`components.json`](components.json) (`style: "new-york"`, `iconLibrary: "lucide"`, alias `@/components/ui`) |
| Design Tool | [`design/dash-tail.figcraft`](design/dash-tail.figcraft) via [`scripts/figcraft-sync.mjs`](scripts/figcraft-sync.mjs) |
| Code Connect | [`figcraft.connect.json`](figcraft.connect.json) |
| Exported Tokens | [`design/tokens/variables.css`](design/tokens/variables.css), `variables.json`, `theme.css` |

---

## 2. Color System & Semantic Tokens

Semua warna didefinisikan menggunakan CSS variables di `:root` (Light) dan `.dark` (Dark) pada `app/assets/scss/globals.scss` dan disinkronkan ke FigCraft melalui `design/tokens/variables.css`.

### Core Surfaces & Brand Tokens

| Token | Light Mode | Dark Mode | Penggunaan |
| --- | --- | --- | --- |
| `--primary` | `#846CF9` | `#6338F0` | CTA utama, active menu, checkbox checked, ring fokus |
| `--primary-foreground` | `#F5F5FF` | `#F5F5FF` | Teks/ikon di atas `--primary` |
| `--background` | `#FFFFFF` | `#0F172A` | Latar panel utama / inner field surface |
| `--foreground` | `#020817` | `#F8FAFC` | Teks utama kontras tinggi |
| `--card` | `#FFFFFF` | `#1F2937` | Container kartu & tabel |
| `--popover` | `#FFFFFF` | `#0F172A` | Dropdown, Select menu, Dialog/Popover surface |
| `--secondary` | `#E2E8F0` | `#334155` | Tombol sekunder, badge netral |
| `--muted` | `#F3F4F6` | `#1F2937` | Surface redup, pill kode permission, header subtle |
| `--muted-foreground` | `#64748B` | `#9CA3AF` | Label sekunder, metadata, deskripsi |
| `--border` | `#E2E8F0` | `#334155` | Garis batas card, divider tabel, accordion border |
| `--input` | `#E2E8F0` | `#1E293B` | Border/latar kontrol input |
| `--ring` | `#7C3AED` | `#6D28D9` | Focus ring |
| `--page-bg` | `#EEF1F9` | `#0F172A` | Latar kanvas dashboard di balik kartu |

### Primary Scale & Neutral Scale

- **Primary (`--primary-50` .. `--primary-950`)**: `#F5F5FF` (`50`), `#E8E7FE` (`100`), `#D8D6FF` (`200`), `#B9B4FE` (`300`), `#9588FC` (`400`), `#846CF9` (`500`), `#6338F0` (`600`), `#5224DB` (`700`), `#451FB7` (`800`), `#3A1B98` (`900/950`).
- **Default Neutral (`--default-50` .. `--default-950`)**: Skala slate dari `#F8FAFC` (`50`) hingga `#020817` (`950`) pada Light mode (dan terbalik secara semantik pada Dark mode).

### Semantic Status Tokens

| Status | Hex | Soft Fill (Light / Dark) | Penggunaan |
| --- | --- | --- | --- |
| `success` | `#22C55E` | `rgba(34, 197, 94, 0.12)` / `0.16` | Status `Active`, verifikasi 2FA, aksi berhasil |
| `info` | `#06B6D4` | `rgba(6, 182, 212, 0.12)` / `0.16` | Banner informasi, scope `Read`, plan `Pro` |
| `warning` | `#F97316` | `rgba(249, 115, 22, 0.12)` / `0.16` | Status `Pending` / `Trial`, scope `Update`, peringatan |
| `destructive` | `#EF4444` | `rgba(239, 68, 68, 0.12)` / `0.16` | Aksi `Delete`, status `Suspended` / `Disabled`, Danger Zone |

---

## 3. Typography, Spacing, Radius & Elevation

### Typography (`Inter`)
- Font utama: **`Inter`** (`next/font/google` di `app/layout.tsx`, `--font-sans: "Inter"`).
- **Page Title**: `text-2xl font-semibold text-default-900 tracking-tight` (24px SemiBold).
- **Section / Card Title**: `text-base` atau `text-lg font-semibold text-default-900` (16–18px SemiBold).
- **Subtitle / Helper**: `text-sm` atau `text-xs text-muted-foreground`.
- **Identifier / Permission Key**: `font-mono text-xs` di dalam pill `bg-muted px-2.5 py-1 rounded-md`.

### Spacing & Radius Tokens
- **Spacing scale**: `xs = 4px`, `sm = 8px`, `md = 16px`, `lg = 24px`, `xl = 32px`.
- **Page vertical rhythm**: `space-y-6` (`24px` antar section utama).
- **Grid gap**: `gap-4` (`16px`) untuk KPI/card grid atau `gap-5` (`20px`) untuk split workspace.
- **Border Radius**: Base `--radius: 0.5rem` (`8px`); tokens `sm: 4px`, `md: 6px`, `lg: 8px`, `xl: 12px` (`rounded-xl` untuk halaman/card modern aplikasi).
- **Elevation**: `shadow-sm` (`0px 1px 2px 0px rgba(15, 22, 36, 0.06), 0px 1px 3px 0px rgba(15, 22, 36, 0.10)`).

---

## 4. UI Component Library (`components/ui/*`)

Seluruh antarmuka dibangun **secara eksklusif** di atas komponen yang tersedia di `components/ui/`:

- **Layout & Surface**: `card.tsx` (`Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`), `separator.tsx`, `scroll-area.tsx`, `resizable.tsx`, `affix.tsx`, `aspect-ratio.tsx`.
- **Navigation & Disclosure**: `accordion.tsx`, `tabs.tsx`, `breadcrumbs.tsx`, `navigation-menu.tsx`, `menubar.tsx`, `pagination.tsx`, `steps.tsx`, `collapsible.tsx`, `tree.tsx`.
- **Actions & Feedback**: `button.tsx`, `badge.tsx`, `alert.tsx`, `alert-dialog.tsx`, `dialog.tsx`, `drawer.tsx`, `sheet.tsx`, `progress.tsx`, `skeleton.tsx`, `toast.tsx`, `toaster.tsx`, `sonner.tsx`, `tooltip.tsx`, `hover-card.tsx`, `popover.tsx`, `watermark`.
- **Forms & Inputs**: `input.tsx`, `input-group.tsx`, `textarea.tsx`, `label.tsx`, `form.tsx`, `select.tsx`, `checkbox.tsx`, `switch.tsx`, `radio-group.tsx`, `slider.tsx`, `toggle.tsx`, `autocomplete.tsx`, `cleave.tsx`, `calendar.tsx`, `command.tsx`, `rating.tsx`.
- **Data Display**: `table.tsx`, `avatar.tsx`, `dropdown-menu.tsx`, `timeline.tsx`, `kbd.tsx`, `card-snippet.tsx`, `carousel.tsx`.

### Konvensi Varian Komponen Utama
- **`Button`**: Mendukung `color` (`default`, `primary`, `secondary`, `destructive`, `success`, `info`, `warning`, `dark`), `variant` (`outline`, `soft`, `ghost`), dan `size` (`default`, `sm`, `md`, `lg`, `xl`, `xs`, `icon`).
- **`Badge`**: Mendukung `color` (`default`, `secondary`, `destructive`, `success`, `info`, `warning`, `dark`) dan `variant` (`outline`, `soft`).
- **`CardHeader`**: Secara default memiliki `mb-6 border-b border-border`. Tambahkan `mb-0` bila konten di bawahnya langsung memisahkan jarak atau langsung menempel ke tabel (`CardContent className="p-0"`).
- **`DialogContent`**: Mendukung prop `size` (`md`, dll.) sesuai konvensi DashTail.

---

## 5. Pola Layout Halaman Aplikasi (`app/(dashboard)/(apps)/*`)

1. **Page Header**: Kiri berisi judul (`h1`) + deskripsi singkat; kanan berisi CTA utama (`Button` dengan ikon `lucide-react`) atau badge konteks.
2. **KPI Summary Strip**: Grid 3–4 kolom (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4`) dengan metrik utama, nilai tebal, dan subtext semantik.
3. **Toolbar Filter + View Toggle**: `Card` dengan input pencarian berikon di kiri dan dropdown `Select` + toggle **List / Grid** (seperti pada `/org-team-member`) di kanan.
4. **Split Workspace (Master–Detail / Role Editor)**: Grid 12 kolom (`lg:grid-cols-12 gap-5`)—panel daftar pilihan di kiri (`lg:col-span-4`) dan panel editor detail di kanan (`lg:col-span-8`).
5. **Assign Access Control Pattern (`/role`)**: Menggunakan `Accordion` (`type="multiple"`) per modul dengan badge progres jumlah permission aktif (`checked / total`), dan grid **checkbox 2 kolom** (`grid-cols-1 sm:grid-cols-2 gap-3`) di dalam `AccordionContent`.
6. **Table + Modal CRUD**: `Table` full-width di dalam `CardContent className="p-0"` dengan `Badge` status, `Switch` toggle, dan aksi ikon edit/hapus yang memicu `Dialog`.
7. **Detail Profile & Security Settings (`/detail-member`, `/org-setting`)**: `Avatar` profil + `Select` role + `Switch` kebijakan keamanan + `Tabs` untuk matriks permission, override, dan audit/session log.

---

## 6. Sinkronisasi FigCraft & Developer Handoff

```bash
# Bangun ulang design/dash-tail.figcraft + publish Code Connect + ekspor token
bun run figcraft:build

# Sinkronkan token Light/Dark dari globals.scss ke FigCraft
bun run figcraft:sync-tokens

# Ekspor token CSS/JSON/Tailwind & preview PNG 2x
bun run figcraft:tokens
bun run figcraft:export

# Publish ulang mapping figcraft.connect.json
bun run figcraft:connect
```

12 komponen inti (`Alert`, `Avatar`, `Badge`, `Button`, `Card`, `Checkbox`, `Input`, `Progress`, `Select`, `Switch`, `Tabs`, `Textarea`) sudah terhubung ke `design/dash-tail.figcraft` melalui `figcraft.connect.json`.
