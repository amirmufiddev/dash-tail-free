# DashTail × FigCraft Integration

Project ini terintegrasi dengan **FigCraft** untuk design system, sinkronisasi token warna/tema (`Light` & `Dark`), **Code Connect** (`figcraft.connect.json`), dan handoff Developer Mode.

## File Utama

- `design/dash-tail.figcraft` — File design system DashTail (halaman `Tokens`, `Components`, dan `Preview`)
- `figcraft.connect.json` — Mapping komponen FigCraft ke komponen React di `components/ui/*`
- `scripts/figcraft-sync.mjs` — Script headless via `figcraft-cli mcp` untuk membangun/memperbarui `.figcraft`, menyinkronkan token dari `app/assets/scss/globals.scss`, dan mengekspor token/preview
- `design/tokens/` — Hasil ekspor token (`variables.json`, `variables.css`, `theme.css`)
- `design/exports/` — Hasil render PNG preview halaman `Preview` & `Tokens`

## Perintah CLI / Package Scripts

```bash
# Bangun ulang design/dash-tail.figcraft dari globals.scss + publish Code Connect + ekspor token
bun run figcraft:build

# Sinkronkan ulang token warna dari app/assets/scss/globals.scss ke design/dash-tail.figcraft yang sudah ada
bun run figcraft:sync-tokens

# Ekspor variabel FigCraft ke design/tokens/ (JSON, CSS, Tailwind v4)
bun run figcraft:tokens

# Publish mapping figcraft.connect.json ke design/dash-tail.figcraft
bun run figcraft:connect

# Cek informasi halaman, node, variabel, dan komponen di design/dash-tail.figcraft
bun run figcraft:info

# Render preview PNG ke design/exports/
bun run figcraft:export
```

## Membuka di Aplikasi Desktop FigCraft & Live MCP

Untuk membuka file desain di aplikasi desktop FigCraft sambil mengaktifkan kontrol MCP pada port `47800`:

```bash
figcraft --control 47800 design/dash-tail.figcraft
```

Setelah terbuka, Developer Mode di FigCraft akan langsung menampilkan snippet React dari `components/ui/*` sesuai `figcraft.connect.json`, serta mode variabel `Light` dan `Dark` yang selaras dengan `app/assets/scss/globals.scss`.
