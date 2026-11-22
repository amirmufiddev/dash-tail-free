# AGENT.MD — Panduan Kerja Agent & Aturan Implementasi

Dokumen ini menjadi pedoman wajib bagi AI coding agent maupun developer yang mengerjakan fitur, halaman, atau perubahan UI di repository **DashTail (`dash-tail-free`)**.

---

## 1. ATURAN WAJIB: Gunakan Komponen yang Sudah Ada di `components/ui`

**WAJIB menggunakan komponen yang sudah tersedia di [`components/ui/`](components/ui) (`@/components/ui/*`).**

1. **Dilarang membuat komponen UI dasar baru** (seperti custom button, card, input, modal, badge, table, tabs, accordion, checkbox, switch, select, progress, alert, avatar, dll.) jika fungsinya sudah dapat dipenuhi oleh komponen di `@/components/ui/*`.
2. **Dilarang duplikasi styling primitif** menggunakan raw `<button>`, `<input>`, `<table>`, atau `<div>` bergaya modal/kartu ketika komponen padanannya tersedia di `components/ui/`.
3. **Jika benar-benar perlu membuat komponen baru**, **WAJIB memeriksa isi `components/ui/` terlebih dahulu** dan **meminta konfirmasi user sebelum membuat komponen baru**.
4. **Komposisi diperbolehkan langsung di dalam halaman (`page.tsx`) atau container fitur** dengan menyusun komponen dari `components/ui/`, `lucide-react`, dan utility `cn()` dari `@/lib/utils`.

### Daftar Komponen Tersedia di `components/ui/`

- **Layout & Pembungkus**: `card`, `separator`, `scroll-area`, `resizable`, `affix`, `aspect-ratio`, `card-snippet`
- **Form & Kontrol Input**: `input`, `input-group`, `textarea`, `label`, `form`, `select`, `checkbox`, `switch`, `radio-group`, `slider`, `toggle`, `autocomplete`, `cleave`, `calendar`, `command`, `rating`
- **Interaksi & Overlay**: `button`, `dialog`, `alert-dialog`, `drawer`, `sheet`, `popover`, `hover-card`, `tooltip`, `dropdown-menu`
- **Navigasi & Struktur**: `accordion`, `tabs`, `breadcrumbs`, `navigation-menu`, `menubar`, `pagination`, `steps`, `collapsible`, `tree`
- **Display & Feedback**: `table`, `badge`, `avatar`, `alert`, `progress`, `skeleton`, `timeline`, `kbd`, `carousel`, `toast`, `toaster`, `sonner`, `watermark`

---

## 2. Kepatuhan Design System (`DESIGN.MD` & FigCraft)

- Rujuk [`DESIGN.MD`](DESIGN.MD) untuk token warna, tipografi (`Inter`), radius, spacing, dan pola layout halaman.
- Gunakan semantic Tailwind tokens (`bg-card`, `text-default-900`, `text-muted-foreground`, `border-border`, `bg-primary`, `text-destructive`, `text-success`, dll.) agar **Light Mode dan Dark Mode** bekerja otomatis. Jangan hardcode warna hex di JSX bila token semantik sudah ada.
- Gunakan ikon dari `lucide-react` di dalam konten halaman, dan ikon SVG dari `@/components/svg` pada konfigurasi navigasi [`config/menus.ts`](config/menus.ts).
- Mapping FigCraft Code Connect berada di [`figcraft.connect.json`](figcraft.connect.json) dan skrip sinkronisasinya berada di [`scripts/figcraft-sync.mjs`](scripts/figcraft-sync.mjs).

---

## 3. Konvensi Next.js 16, Routing, & Menu

- **Next.js Docs Check**: Selalu rujuk dokumentasi lokal di `node_modules/next/dist/docs/` sebelum memakai API Next.js baru/spesifik versi (`AGENTS.md`).
- **Struktur Route Aplikasi**: Halaman aplikasi diletakkan di `app/(dashboard)/(apps)/<route>/page.tsx` sehingga otomatis mewarisi shell layout dashboard (`app/(dashboard)/layout.tsx`).
- **`useSearchParams()` + Prerendering**: Di Next.js 16 (Cache Components / Partial Prerendering aktif), komponen klien yang memanggil `useSearchParams()` **wajib** dibungkus `<Suspense>` agar `next build` tidak gagal saat prerender statis.
- **Konfigurasi Menu**: Setiap penambahan halaman di Menu **Application** atau **Pages** harus didaftarkan secara konsisten pada **ketiga** blok navigasi di [`config/menus.ts`](config/menus.ts):
  1. `menusConfig.mainNav`
  2. `menusConfig.sidebarNav.modern`
  3. `menusConfig.sidebarNav.classic`
- **Detail Komponen DashTail**:
  - `CardHeader` punya default `mb-6 border-b border-border`; gunakan `mb-0` bila tidak memakai divider/spacing bawah besar (misal sebelum `Table` dengan `CardContent className="p-0"`).
  - `Checkbox` menerima `size` (`xs`..`xl`), `color`, `variant`, `checked`, `onCheckedChange`. Untuk grid 2 kolom di dalam `AccordionContent`, pasangkan `Checkbox` dengan `Label htmlFor={...}`.
  - Gunakan `sonner` (`toast.success`, `toast.error`) untuk feedback aksi user.

---

## 4. Checklist Verifikasi Sebelum Selesai

Setelah melakukan perubahan kode, wajib menjalankan dan memastikan seluruh pemeriksaan berikut lolos (`exit code 0`):

```bash
npx tsc --noEmit
npx eslint config/menus.ts app/(dashboard)/(apps)/<file-terkait>.tsx
npm run test:routes
bun run build
```

Jika mengubah desain/token FigCraft:

```bash
bun run figcraft:build
bun run figcraft:export
bun run figcraft:info
```

Dan **pertahankan selalu** blok `<!-- BEGIN:nextjs-agent-rules -->` serta `<!-- BEGIN:nextjs-agent-feedback -->` di [`AGENTS.md`](AGENTS.md).
