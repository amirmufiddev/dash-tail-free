# Upgrade DashTail ke Next.js 16.4.6

Tanggal: 2026-11-18

Spec ini mengunci upgrade di tempat untuk katalog DashTail. Implementasi belum mulai. Rencana implementasi ditulis setelah spec ini disetujui.

## Tujuan

Repo ini berakhir pada stack berikut, dengan 169 halaman App Router tetap ada dan tetap bisa dibuka.

- `next` 16.4.6
- `react` dan `react-dom` 19.3.1
- `tailwindcss` 4.3.5
- CLI `shadcn` 4.23.0, primitif Radix
- TypeScript `strict` untuk seluruh sumber aplikasi
- Setiap nama paket yang tetap dipakai ada di versi tag `latest` npm pada tanggal spec ini, kecuali pengecualian di bagian Pengecualian

## Bukan tujuan

- Redesain token, layout, atau copy
- Auth.js v5 (`next-auth` beta 5)
- FullCalendar 7
- Base UI sebagai pengganti Radix
- Memindahkan impor SVG ke Turbopack
- Menambah fitur produk
- Menghapus paket yang tidak terpakai hanya karena tidak terpakai

## Kondisi awal

- Next 14.1.3, React 18.2.0, Tailwind CSS 3.3.3
- 1.263 file `.jsx`, 169 file `app/**/page.jsx`, 883 file bertanda `use client`
- Tidak ada `package-lock.json`, tidak ada `components.json`, tidak ada file ESLint di root
- `jsconfig.json` menulis `strict: true`, tetapi `include` hanya `*.ts` dan `*.tsx`, jadi katalog JSX tidak diperiksa
- `middleware.js` hanya `console.log`. Runtime Edge tidak dipakai
- `next.config.js` mengubah webpack agar `@svgr/webpack` mengimpor SVG
- Delapan halaman dinamis, semuanya di `app/(dashboard)/(apps)/projects/[id]/`
- `pages/docs/*.mdx` bukan route. `next.config.js` tidak memasang `@next/mdx` dan `pageExtensions` tidak memuat `mdx`
- Node di mesin kerja: v24.18.0. Next 16.4.6 membutuhkan Node `>=20.9.0`

## Definisi selesai

Selesai bila semua ini benar pada waktu yang sama.

- Empat gerbang di bawah lulus di tahap 7
- `package.json` memuat versi target di bagian Versi terkunci
- Sumber aplikasi berakhiran `.ts` atau `.tsx`, `allowJs` mati, `strict` dan `noImplicitAny` hidup
- Tidak ada `any` selebar proyek. `@ts-expect-error` hanya dengan komentar satu baris yang menyebut alasannya
- Daftar pengecualian di spec ini sudah diperbarui bila ada paket yang tidak bisa memakai `latest`

## Gerbang

Setiap tahap menjalankan keempat gerbang ini, berurutan. Tahap berikut tidak mulai bila salah satu gagal.

1. `npx tsc --noEmit`. Tahap 1 sampai 6 memakai `strict: false` dan `noImplicitAny: false`. Tahap 7 memakai `strict: true` dan `noImplicitAny: true`.
2. `npx next build --webpack`. Mulai tahap 3, script `build` adalah `next build --webpack` dan script `dev` adalah `next dev --webpack`.
3. Himpunan 169 URL halaman sama dengan baseline tahap 0. Delapan URL dinamis memakai id `1`.
4. Browser membuka 169 URL itu pada `next start -p 3210`.

Lint bukan gerbang. Tahap 3 tetap mengganti script `lint` karena Next 16.4.6 menghapus `next lint`. Temuan ESLint pada kode lama tidak menggagalkan tahap.

## Pengujian browser

Runner: `@playwright/test` 1.65.1, Chromium, script `scripts/smoke-routes.mjs` di tahap 0. Tahap 1 mengganti nama script itu menjadi `scripts/smoke-routes.ts`.

Script menjalankan `next start -p 3210`, membuka setiap URL, lalu mematikan server. Navigasi memakai `waitUntil: "domcontentloaded"`, lalu menunggu 1 detik agar error klien sempat muncul. Timeout navigasi satu route adalah 30 detik.

Satu route gagal bila salah satu ini terjadi.

- Status HTTP akhir `>= 500`, atau timeout
- Ada event `pageerror`
- Halaman memuat overlay error Next

Peringatan konsol tidak menggagalkan tahap.

Baseline disimpan di `docs/superpowers/specs/route-baseline.json`. Tiap entri menyimpan path file, URL, status akhir, pathname akhir, dan `pageerror` yang sudah dinormalisasi. Normalisasi menggabungkan `name` dengan baris pertama pesan, meruntuhkan whitespace, dan menghapus deretan heksadesimal sepanjang 6 karakter atau lebih.

Pada tahap 1 sampai 7, sebuah URL lulus bila ketiga nilai ini cocok dengan baseline: status akhir, pathname akhir, dan `pageerror` ternormalisasi. Dua perbaikan diizinkan: `pageerror` berubah dari terisi menjadi kosong, dan status berubah dari `>= 500` menjadi di bawah 500. Perubahan pathname adalah kegagalan.

URL dibentuk dengan membuang segmen route group `(...)` dan mengganti `[id]` dengan `1`. Tahap 0 gagal bila 169 file halaman tidak menghasilkan 169 URL unik. Route `app/api` tidak ikut.

Id `1` dipakai karena `app/api/projects/data.js` memuat proyek dengan id itu.

## Penanganan kegagalan

- Satu tahap yang gagal tidak dilanjutkan. Perbaikan terjadi di tahap yang sama.
- `npm install` tidak memakai `--legacy-peer-deps` dan tidak memakai `--force`.
- Bila versi `latest` tidak terpasang bersama React 19.3.1 dan Next 16.4.6, paket itu dipasang pada versi tertinggi yang terpasang. Spec ini mendapat satu baris baru: nama paket, versi yang dipakai, dan teks error peer.
- Tiap tahap yang lulus menjadi satu commit di branch `upgrade/next16-tailwind4`.
- Rollback satu tahap adalah mengembalikan commit tahap itu.

## Arsitektur tahap

Branch `upgrade/next16-tailwind4` dibuat di tahap 0 dari HEAD saat ini.

### Tahap 0 — Baseline

Tidak mengubah kode aplikasi.

- `npm install` dari `package.json` yang ada sekarang
- Menulis `package-lock.json`
- Menambah `@playwright/test` 1.65.1 dan menginstal Chromium
- Menjalankan empat gerbang dan menulis `route-baseline.json`
- Bila build atau browser sudah gagal hari ini, kegagalan itu menjadi baseline. Tahap berikut tidak boleh menambah kegagalan baru

### Tahap 1 — TypeScript longgar

Stack tetap Next 14.1.3 dan React 18.2.0.

- Menambah `typescript` 7.0.2. Bila Next 14.1.3 tidak bisa memuat kompiler itu, tahap ini memakai TypeScript 5 tertinggi yang membuat `next build` lulus, dan tahap 3 mencoba lagi 7.0.2
- `tsconfig.json` menyalin opsi dari `jsconfig.json`, dengan `strict: false` dan `noImplicitAny: false`
- `moduleResolution` tetap `node` sampai tahap 3
- Path `contentlayer/generated` dihapus. Paket Contentlayer tidak ada di `package.json`
- `@types/react` tetap 18 sampai tahap 3
- Semua sumber di `app`, `components`, `lib`, `hooks`, `config`, `action`, `store`, `provider`, `middleware.js`, dan script smoke berganti nama ke `.ts` atau `.tsx`
- `pages/docs/*.mdx` tetap `.mdx`
- `next.config.js`, `postcss.config.js`, dan `tailwind.config.js` tetap `.js` sampai tahap yang menggantinya
- `allowJs` dimatikan setelah tidak ada sumber `.js` atau `.jsx` tersisa di direktori yang disebut di atas
- `jsconfig.json` dihapus

### Tahap 2 — Minor dan patch

Paket di daftar berikut naik ke versi yang tertulis. Daftar ini adalah tag `latest` pada 2026-11-18 untuk paket yang major-nya tidak berubah. Keluarga `@fullcalendar/*` dan paket tahap 3, 4, 5, serta 6 tidak termasuk.

- `@dnd-kit/core` 6.3.1
- `@emoji-mart/data` 1.2.1
- `@emoji-mart/react` 1.1.1
- `@mdx-js/loader` 3.1.1
- `@mdx-js/react` 3.1.1
- `@smastrom/react-rating` 1.5.0
- `@south-paw/react-vector-maps` 3.2.0
- `@tanstack/react-query` 5.108.0
- `@tanstack/react-query-devtools` 5.108.0
- `@types/mdx` 2.0.14
- `@unovis/react` 1.8.1
- `@unovis/ts` 1.8.1
- `autoprefixer` 10.6.2
- `axios` 1.21.1
- `chart.js` 4.6.1
- `class-variance-authority` 0.7.1
- `cleave.js` 1.6.0
- `clsx` 2.1.1
- `d3-shape` 3.2.1
- `dayjs` 1.11.23
- `embla-carousel-auto-height` 8.6.0
- `embla-carousel-autoplay` 8.6.0
- `embla-carousel-react` 8.6.0
- `embla-carousel-wheel-gestures` 8.1.0
- `emoji-mart` 5.6.0
- `google-map-react` 2.2.5
- `leaflet` 1.9.4
- `moment` 2.31.0
- `next-auth` 4.24.15
- `next-themes` 0.4.6
- `postcss` 8.5.33
- `rc-tree` 5.13.1
- `react-chartjs-2` 5.3.1
- `react-dnd` 16.0.1
- `react-dnd-html5-backend` 16.0.1
- `react-hook-form` 7.92.0
- `react-hot-toast` 2.6.1
- `react-select` 5.10.2
- `react-wrap-balancer` 1.1.1
- `reactflow` 11.11.4
- `sass` 1.108.2
- `simplebar-react` 3.3.2
- `styled-components` 6.6.0
- `tailwindcss-animate` 1.0.7
- `unist-util-visit` 5.2.0
- `@svgr/webpack` 8.1.0

### Tahap 3 — Next 16.4.6 dan React 19.3.1

Versi yang dipasang:

- `next` 16.4.6
- `react` dan `react-dom` 19.3.1
- `@types/react` 19.3.0
- `@types/react-dom` 19.3.0
- `@types/node` 26.6.6
- `eslint` 10.15.0
- `eslint-config-next` 16.4.6
- `@next/mdx` 16.4.6
- `typescript` 7.0.2 bila tahap 1 sempat menundanya

Perintah, sesuai panduan upgrade Next 16.4.6:

- `npx @next/codemod@canary upgrade 16.4.6`. Bila CLI hanya menerima `latest`, perintah `latest` dijalankan, lalu `next`, `eslint-config-next`, dan `@next/mdx` dikunci lagi ke 16.4.6 sebelum gerbang
- `npx @next/codemod@canary next-async-request-api .`
- `npx @next/codemod@canary next-lint-to-eslint-cli .`

Perubahan yang menyertai codemod:

- `middleware.ts` berganti nama menjadi `proxy.ts`. Export `middleware` berganti nama menjadi `proxy`. Isi tetap `console.log`. Runtime Edge tidak ditambahkan
- `next.config.js` menjadi `next.config.ts`. Konfigurasi webpack SVG tetap ada
- Script: `"dev": "next dev --webpack"`, `"build": "next build --webpack"`, `"lint": "eslint ."`
- `tsconfig` mengadopsi rekomendasi Next 16.4.6, termasuk `moduleResolution: "bundler"`, dengan `strict` dan `noImplicitAny` tetap mati
- Akses sinkron ke `params`, `searchParams`, `cookies()`, `headers()`, dan `draftMode()` diubah mengikuti hasil codemod. Komentar error sisa codemod dibereskan di tahap ini

`@next/mdx` tetap terpasang meski belum dihubungkan ke `next.config`. Menghubungkannya bukan bagian upgrade ini.

### Tahap 4 — Tailwind CSS 4.3.5

- Menjalankan `npx @tailwindcss/upgrade@4.3.5`, lalu mengunci `tailwindcss` di 4.3.5 dan `tailwind-merge` di 3.7.0
- PostCSS memakai `@tailwindcss/postcss` 4.3.5
- `important: true` dari `tailwind.config.js` menjadi bentuk import `important` milik Tailwind 4
- Variabel CSS di `:root` dan `.dark` pada `app/assets/scss/globals.scss` tetap, termasuk skala `primary`, `default`, `success`, `warning`, `info`, dan `--radius`
- Kelas yang sudah dipakai katalog tetap resolve, termasuk `bg-primary`, `text-primary-foreground`, dan `text-default-500`
- `autoprefixer` boleh dihapus hanya bila konfigurasi PostCSS hasil upgrade tidak lagi memuatnya

### Tahap 5 — shadcn 4.23.0

- CLI yang dijalankan adalah `shadcn@4.23.0`, bukan `@latest`
- `components.json` memakai TypeScript, RSC, dan Radix
- CSS yang ditunjuk `components.json` adalah file globals DashTail setelah tahap 4
- Bila CLI menimpa file CSS itu, palet DashTail dikembalikan dari git sebelum commit tahap ini

Kontrak publik yang harus tetap ada:

- `Button` menerima `color` dengan nilai `default`, `primary`, `destructive`, `success`, `info`, `warning`, `secondary`, `dark`
- `Button` menerima `variant` dengan nilai `outline`, `soft`, `ghost`
- `Button` menerima `size` dengan nilai `default`, `sm`, `md`, `lg`, `xl`, `xs`, `icon`
- Pemanggilan `asChild` yang ada tetap valid

File ini tidak diganti dengan keluaran CLI. Mereka hanya diberi tipe dan disesuaikan dengan versi Radix di tahap ini bila importnya pecah: `watermark`, `steps`, `timeline`, `cleave`, `rating`, `tree`, `affix`, `input-group`, `card-snippet`.

Komponen UI lain boleh diambil ulang dari CLI hanya bila props yang diekspor tetap kompatibel dengan pemanggilan yang ada. Ekstensi warna DashTail dipasang kembali di atas hasil CLI.

Paket yang naik di tahap ini:

- `@radix-ui/react-accordion` 1.3.1, `@radix-ui/react-alert-dialog` 1.2.1, `@radix-ui/react-aspect-ratio` 1.2.0, `@radix-ui/react-avatar` 1.3.1, `@radix-ui/react-checkbox` 1.4.1, `@radix-ui/react-collapsible` 1.2.1, `@radix-ui/react-dialog` 1.3.1, `@radix-ui/react-dropdown-menu` 2.2.1, `@radix-ui/react-hover-card` 1.2.1, `@radix-ui/react-label` 2.1.17, `@radix-ui/react-menubar` 1.2.1, `@radix-ui/react-navigation-menu` 1.4.1, `@radix-ui/react-popover` 1.3.1, `@radix-ui/react-progress` 1.2.1, `@radix-ui/react-radio-group` 1.5.1, `@radix-ui/react-scroll-area` 1.4.0, `@radix-ui/react-select` 2.4.1, `@radix-ui/react-separator` 1.2.0, `@radix-ui/react-slider` 1.6.1, `@radix-ui/react-slot` 1.5.0, `@radix-ui/react-switch` 1.4.1, `@radix-ui/react-tabs` 1.2.1, `@radix-ui/react-toast` 1.3.1, `@radix-ui/react-toggle` 1.2.1, `@radix-ui/react-tooltip` 1.4.1
- `cmdk` 1.1.1
- `vaul` 1.1.2
- `sonner` 2.0.8

### Tahap 6 — Major per keluarga

Satu keluarga dipasang, lalu keempat gerbang dijalankan, sebelum keluarga berikutnya. Urutannya tetap. Commit tahap 6 tetap satu, setelah enam keluarga lulus. Keluarga yang gagal dikembalikan di working tree dan diperbaiki sebelum keluarga berikutnya mulai. Keluarga yang sudah lulus di tahap yang sama tidak dikembalikan.

**Form.** `zod` 4.6.7, `@hookform/resolvers` 7.0.7, `date-fns` 4.4.0, `react-day-picker` 10.0.2, `react-flatpickr` 4.0.11.

**Chart.** `apexcharts` 8.9.0, `react-apexcharts` 2.2.1, `recharts` 3.11.0.

**Kalender.** `@fullcalendar/core`, `@fullcalendar/react`, `@fullcalendar/daygrid`, `@fullcalendar/timegrid`, `@fullcalendar/interaction`, dan `@fullcalendar/list` semuanya di 6.1.22.

**Editor.** `quill` 2.0.3 dan `react-quilljs` 2.0.5. `@ckeditor/ckeditor5-build-classic` dihapus. Penggantinya `ckeditor5` 49.1.0 dan `@ckeditor/ckeditor5-react` 12.0.0. Import di halaman editor mengikuti pemasangan CKEditor 5 dari paket `ckeditor5`.

**Interaksi.** `framer-motion` 14.14.0, `swiper` 14.4.0, `react-resizable-panels` 4.24.0, `@dnd-kit/sortable` 10.0.0, `react-dropzone` 20.2.0, `react-shepherd` 8.0.0, `lucide` 1.74.0, `lucide-react` 1.74.0. Nama paket `framer-motion` tidak diganti.

**Data dan lain-lain.** `@tanstack/react-table` 9.3.1, `zustand` 5.1.0, `react-leaflet` 5.0.0, `bcrypt` 6.0.0, `@iconify/react` 6.0.4, `@vercel/analytics` 2.0.1, `react-syntax-highlighter` 16.1.2, `@faker-js/faker` 10.6.0.

### Tahap 7 — TypeScript strict

- `strict: true` dan `noImplicitAny: true`
- Error tipe diperbaiki di file yang memakainya
- Tidak ada `any` selebar proyek dan tidak ada pemadaman `strict` per direktori

## Pengecualian

Pengecualian ini sudah disetujui. Mereka bukan kegagalan peer.

| Paket | Versi yang dipakai | Alasan |
| --- | --- | --- |
| `next-auth` | 4.24.15 | Tag `latest`. v5 masih `5.0.0-beta.32` |
| `@fullcalendar/core` | 6.1.22 | `latest` 7.1.5 tidak sejalan dengan plugin stabil |
| `@fullcalendar/react` | 6.1.22 | Sama dengan core |
| `@fullcalendar/daygrid` | 6.1.22 | Tag `latest`. Rilis 7 yang ada hanya `7.0.0-rc.0` dan bergantung pada core `7.0.0-rc.0` |
| `@fullcalendar/timegrid` | 6.1.22 | Sama dengan daygrid |
| `@fullcalendar/interaction` | 6.1.22 | Sama dengan daygrid |
| `@fullcalendar/list` | 6.1.22 | Sama dengan daygrid |
| `reactflow` | 11.11.4 | Tag `latest` nama paket ini |
| `typescript` | 5.9.3 | Tahap 0: `typescript@7.0.2` gagal `tsc --noEmit` dengan `tsconfig` gate sempit; 7.0.2 dicoba lagi di Tahap 3 |

Tahap 0 mencatat `buildOk` di baseline. `package.json` boleh memuat `allowScripts` yang menyetujui skrip native `bcrypt` agar `next build` tidak gagal di route auth.

`reactflow` diganti `@xyflow/react` 13.0.2 hanya bila 11.11.4 gagal terpasang pada React 19.3.1. Penggantian itu dicatat di tabel ini bersama teks errornya, dan import `reactflow` di halaman diagram ikut pindah.

`@ckeditor/ckeditor5-build-classic` tidak dipertahankan. Maintainer menandai preset itu tidak lagi dirawat pada 44.3.0.

## Versi terkunci

Angka di bawah adalah tag `latest` yang dibaca pada 2026-11-18. Implementasi memakai angka ini, bukan `latest` yang mungkin bergeser kemudian.

Major yang belum disebut di tabel pengecualian:

- `next` 16.4.6, `react` 19.3.1, `react-dom` 19.3.1
- `tailwindcss` 4.3.5, `tailwind-merge` 3.7.0
- `typescript` 7.0.2, `@types/react` 19.3.0, `@types/react-dom` 19.3.0, `@types/node` 26.6.6
- `eslint` 10.15.0, `eslint-config-next` 16.4.6, `@next/mdx` 16.4.6
- `@playwright/test` 1.65.1
- `zod` 4.6.7, `@hookform/resolvers` 7.0.7, `date-fns` 4.4.0, `react-day-picker` 10.0.2, `react-flatpickr` 4.0.11
- `apexcharts` 8.9.0, `react-apexcharts` 2.2.1, `recharts` 3.11.0
- `quill` 2.0.3, `react-quilljs` 2.0.5, `ckeditor5` 49.1.0, `@ckeditor/ckeditor5-react` 12.0.0
- `framer-motion` 14.14.0, `swiper` 14.4.0, `react-resizable-panels` 4.24.0, `@dnd-kit/sortable` 10.0.0, `react-dropzone` 20.2.0, `react-shepherd` 8.0.0, `lucide` 1.74.0, `lucide-react` 1.74.0
- `@tanstack/react-table` 9.3.1, `zustand` 5.1.0, `react-leaflet` 5.0.0, `bcrypt` 6.0.0, `@iconify/react` 6.0.4, `@vercel/analytics` 2.0.1, `react-syntax-highlighter` 16.1.2, `@faker-js/faker` 10.6.0
- `cmdk` 1.1.1, `vaul` 1.1.2, `sonner` 2.0.8, `@radix-ui/react-select` 2.4.1

## Alur data

Alur data aplikasi tidak berubah. Route API mock, Zustand, TanStack Query, dan sesi `next-auth` 4 tetap pada kontrak yang ada. Upgrade tidak menambah tabel, endpoint, atau bentuk payload.
