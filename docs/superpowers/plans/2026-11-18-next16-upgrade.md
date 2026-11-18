# Next.js 16.4.6 Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Naikkan katalog DashTail di tempat ini ke Next.js 16.4.6, React 19.3.1, Tailwind CSS 4.3.5, dan shadcn 4.23.0, dengan seluruh sumber aplikasi menjadi TypeScript strict dan 169 halaman tetap bisa dibuka.

**Architecture:** Satu branch `upgrade/next16-tailwind4`. Tiap tahap mengunci versi, menjalankan empat gerbang yang sama, lalu satu commit. Gerbang browser memakai Playwright terhadap `next start -p 3210`. SVG tetap lewat webpack. Tahap 0 sampai 2 memakai `next build`. Mulai tahap 3 script build menjadi `next build --webpack`.

**Tech Stack:** Next.js 16.4.6, React 19.3.1, TypeScript 7.0.2, Tailwind CSS 4.3.5, shadcn CLI 4.23.0, Radix, Playwright 1.65.1, Node `>=20.9.0`.

## Global Constraints

- Versi kunci ada di `docs/superpowers/specs/2026-11-18-next16-upgrade-design.md`. Jangan memakai tag `latest` yang bergerak.
- `npm install` tidak memakai `--legacy-peer-deps` dan tidak memakai `--force`.
- `next-auth` tetap 4.24.15. Jangan memasang beta 5.
- Enam paket `@fullcalendar/*` tetap 6.1.22. Jangan memasang core 7.1.5.
- `reactflow` tetap 11.11.4 kecuali 11.11.4 gagal terpasang pada React 19.3.1. Pengganti hanya `@xyflow/react` 13.0.2, dan impor diagram ikut pindah.
- `@ckeditor/ckeditor5-build-classic` dihapus. Penggantinya `ckeditor5` 49.1.0 dan `@ckeditor/ckeditor5-react` 12.0.0.
- shadcn memakai Radix dan `asChild`. Jangan pindah ke Base UI.
- Kontrak `Button`: `color` = `default | primary | destructive | success | info | warning | secondary | dark`; `variant` = `outline | soft | ghost`; `size` = `default | sm | md | lg | xl | xs | icon`.
- File yang tidak diganti CLI: `components/ui/watermark`, `steps`, `timeline`, `cleave`, `rating`, `tree`, `affix`, `input-group`, `card-snippet`.
- Jangan redesign token, layout, atau copy. Jangan menghapus paket hanya karena tidak terpakai, selain penggantian CKEditor yang sudah dikunci.
- SVG tetap memakai aturan webpack di `next.config`. Jangan memindahkannya ke Turbopack.
- `@next/mdx` tetap terpasang dan tidak dihubungkan ke `next.config`.
- `pages/docs/*.mdx` tetap `.mdx` dan bukan route.
- Tidak ada `any` selebar proyek. `@ts-expect-error` hanya dengan komentar satu baris yang menyebut alasan.
- Lint bukan gerbang. Temuan ESLint pada kode lama tidak menggagalkan tahap.
- HEAD saat rencana ini ditulis: branch `feature/update-latest`, commit `faf4d63`.

---

### Task 1: Pustaka route dan perbandingan baseline

**Files:**
- Create: `scripts/routes.mjs`
- Create: `scripts/routes.test.mjs`
- Test: `scripts/routes.test.mjs`

**Interfaces:**
- Consumes: tidak ada
- Produces: `pageFileToUrl(filePath: string): string`, `normalizePageError(error: { name?: string, message?: string } | null): string | null`, `compareResult(baseline: RouteResult, current: RouteResult): { ok: boolean, reason?: "pathname" | "status" | "pageerror" }`. `RouteResult` adalah `{ pathname: string, status: number, pageerror: string | null }`.

- [ ] **Step 1: Buat branch upgrade, lalu tulis tes yang gagal**

```bash
git switch -c upgrade/next16-tailwind4
```

Expected: branch baru dari commit spec `faf4d63`. Semua commit tugas ini berada di branch itu, bukan di `feature/update-latest`.

Buat `scripts/routes.test.mjs`:

```js
import assert from "node:assert/strict";
import test from "node:test";
import { compareResult, normalizePageError, pageFileToUrl } from "./routes.mjs";

test("pageFileToUrl membuang route group dan mengisi id", () => {
  assert.equal(pageFileToUrl("app/page.jsx"), "/");
  assert.equal(pageFileToUrl("app/(dashboard)/(home)/ecommerce/page.jsx"), "/ecommerce");
  assert.equal(
    pageFileToUrl("app/(dashboard)/(apps)/projects/[id]/overview/page.jsx"),
    "/projects/1/overview",
  );
  assert.equal(pageFileToUrl("app/auth/(login)/login5/page.tsx"), "/auth/login5");
});

test("normalizePageError meruntuhkan whitespace dan membuang heks 6+", () => {
  assert.equal(normalizePageError(null), null);
  assert.equal(
    normalizePageError({ name: "Error", message: "failed abcdef123456\nsecond" }),
    "Error failed",
  );
});

test("compareResult mengizinkan perbaikan status dan pageerror", () => {
  const same = { pathname: "/ecommerce", status: 200, pageerror: null };
  assert.deepEqual(compareResult(same, same), { ok: true });
  assert.equal(
    compareResult(
      { pathname: "/ecommerce", status: 500, pageerror: "Error boom" },
      { pathname: "/ecommerce", status: 200, pageerror: null },
    ).ok,
    true,
  );
  assert.equal(
    compareResult(
      { pathname: "/a", status: 200, pageerror: null },
      { pathname: "/b", status: 200, pageerror: null },
    ).reason,
    "pathname",
  );
  assert.equal(
    compareResult(
      { pathname: "/a", status: 200, pageerror: null },
      { pathname: "/a", status: 404, pageerror: null },
    ).reason,
    "status",
  );
  assert.equal(
    compareResult(
      { pathname: "/a", status: 200, pageerror: null },
      { pathname: "/a", status: 200, pageerror: "Error x" },
    ).reason,
    "pageerror",
  );
});
```

- [ ] **Step 2: Jalankan tes dan pastikan gagal**

Run: `node --test scripts/routes.test.mjs`

Expected: FAIL, `Cannot find module './routes.mjs'`

- [ ] **Step 3: Tulis implementasi**

Buat `scripts/routes.mjs`:

```js
export function pageFileToUrl(filePath) {
  const normalized = filePath.replaceAll("\\", "/").replace(/^\.?\//, "");
  const withoutPage = normalized
    .replace(/^app\//, "")
    .replace(/(^|\/)page\.(jsx|tsx|js|ts)$/, "");
  const segments = withoutPage
    .split("/")
    .filter(Boolean)
    .filter((segment) => !/^\([^/]+\)$/.test(segment))
    .map((segment) => segment.replaceAll("[id]", "1"));
  if (segments.length === 0) return "/";
  return `/${segments.join("/")}`;
}

export function normalizePageError(error) {
  if (!error) return null;
  const name = error.name || "Error";
  const firstLine = String(error.message || "").split("\n")[0];
  return `${name} ${firstLine}`
    .replace(/[a-f0-9]{6,}/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function compareResult(baseline, current) {
  if (current.pathname !== baseline.pathname) return { ok: false, reason: "pathname" };
  const statusImproved = baseline.status >= 500 && current.status < 500;
  if (current.status !== baseline.status && !statusImproved) {
    return { ok: false, reason: "status" };
  }
  const errorImproved = Boolean(baseline.pageerror) && !current.pageerror;
  if (current.pageerror !== baseline.pageerror && !errorImproved) {
    return { ok: false, reason: "pageerror" };
  }
  return { ok: true };
}
```

- [ ] **Step 4: Jalankan tes dan pastikan lulus**

Run: `node --test scripts/routes.test.mjs`

Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add scripts/routes.mjs scripts/routes.test.mjs
git commit -m "$(cat <<'EOF'
Add route URL and baseline comparison helpers.

The upgrade gates need a stable way to turn page files into URLs and to allow a route to become healthier than the recorded baseline.
EOF
)"
```

### Task 2: Runner smoke dan gerbang

**Files:**
- Create: `scripts/smoke-routes.mjs`
- Create: `scripts/run-gates.mjs`
- Modify: `package.json` scripts
- Test: `scripts/routes.test.mjs` (tetap lulus; runner ini diuji lewat perintah di bawah)

**Interfaces:**
- Consumes: `pageFileToUrl`, `normalizePageError`, `compareResult` dari `scripts/routes.mjs`
- Produces: `npm run smoke`, `npm run gates`. Env `GATE_BASELINE=1` menulis `docs/superpowers/specs/route-baseline.json` dan keluar 0. Tanpa env itu, runner membandingkan ke file tersebut dan keluar 1 bila ada regresi. Env `GATE_WEBPACK=1` membuat build memakai `--webpack`.

- [ ] **Step 1: Pasang Playwright tanpa menyentuh dependency aplikasi lain**

Run:

```bash
npm install --save-dev @playwright/test@1.65.1
npx playwright install chromium
```

Expected: `package.json` `devDependencies` memuat `"@playwright/test": "^1.65.1"` atau `"1.65.1"`. Kunci ulang ke persis `1.65.1` bila npm menulis range. Tidak ada flag `--force` atau `--legacy-peer-deps`.

- [ ] **Step 2: Tulis runner**

Buat `scripts/smoke-routes.mjs`:

```js
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";
import { compareResult, normalizePageError, pageFileToUrl } from "./routes.mjs";

const root = process.cwd();
const baselinePath = path.join(root, "docs/superpowers/specs/route-baseline.json");
const port = 3210;
const origin = `http://127.0.0.1:${port}`;

function listPageFiles(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) listPageFiles(full, acc);
    else if (/^page\.(jsx|tsx|js|ts)$/.test(entry.name)) acc.push(path.relative(root, full));
  }
  return acc;
}

function waitForServer() {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const tick = async () => {
      try {
        const response = await fetch(origin);
        if (response.status < 500) return resolve();
      } catch {}
      if (Date.now() - started > 120000) return reject(new Error("server tidak siap"));
      setTimeout(tick, 500);
    };
    tick();
  });
}

const baselineMode = process.env.GATE_BASELINE === "1";
const pageFiles = listPageFiles(path.join(root, "app")).sort();
const urls = pageFiles.map(pageFileToUrl);
const unique = new Set(urls);
if (pageFiles.length !== 169 || unique.size !== 169) {
  console.error(`jumlah route tidak 169 unik: files=${pageFiles.length} urls=${unique.size}`);
  process.exit(1);
}

const server = spawn("npx", ["next", "start", "-p", String(port)], {
  stdio: "inherit",
  env: process.env,
});

let exitCode = 0;
try {
  await waitForServer();
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const results = [];
  for (let i = 0; i < pageFiles.length; i += 1) {
    const file = pageFiles[i];
    const url = urls[i];
    const errors = [];
    const onError = (error) => errors.push(error);
    page.on("pageerror", onError);
    let status = 0;
    let pathname = url;
    try {
      const response = await page.goto(origin + url, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });
      await page.waitForTimeout(1000);
      status = response ? response.status() : 0;
      pathname = new URL(page.url()).pathname;
      const body = await page.locator("body").innerText();
      if (/Application error|Unhandled Runtime Error/.test(body)) {
        errors.push({ name: "Error", message: "Next overlay" });
      }
    } catch (error) {
      status = 500;
      errors.push({ name: "Error", message: error.message });
    }
    page.off("pageerror", onError);
    results.push({
      file,
      url,
      status,
      pathname,
      pageerror: normalizePageError(errors[0] || null),
    });
  }
  await browser.close();

  if (baselineMode) {
    fs.mkdirSync(path.dirname(baselinePath), { recursive: true });
    const previous = fs.existsSync(baselinePath)
      ? JSON.parse(fs.readFileSync(baselinePath, "utf8"))
      : {};
    fs.writeFileSync(
      baselinePath,
      JSON.stringify({ ...previous, routes: results }, null, 2) + "\n",
    );
  } else {
    const baseline = JSON.parse(fs.readFileSync(baselinePath, "utf8"));
    const byUrl = new Map(baseline.routes.map((route) => [route.url, route]));
    const failures = [];
    for (const current of results) {
      const recorded = byUrl.get(current.url);
      if (!recorded) {
        failures.push(`${current.url} tidak ada di baseline`);
        continue;
      }
      const verdict = compareResult(recorded, current);
      if (!verdict.ok) failures.push(`${current.url} ${verdict.reason}`);
    }
    if (failures.length > 0) {
      console.error(failures.join("\n"));
      exitCode = 1;
    }
  }
} finally {
  server.kill("SIGTERM");
}
process.exit(exitCode);
```

Buat `scripts/run-gates.mjs`:

```js
import { spawnSync } from "node:child_process";
import fs from "node:fs";

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit" });
  return result.status ?? 1;
}

const tsc = run("npx", ["tsc", "--noEmit"]);
if (tsc !== 0) process.exit(tsc);

const buildArgs = process.env.GATE_WEBPACK === "1" ? ["build", "--webpack"] : ["build"];
const build = run("npx", ["next", ...buildArgs]);
const baselinePath = "docs/superpowers/specs/route-baseline.json";
if (process.env.GATE_BASELINE === "1") {
  const previous = fs.existsSync(baselinePath)
    ? JSON.parse(fs.readFileSync(baselinePath, "utf8"))
    : {};
  fs.mkdirSync("docs/superpowers/specs", { recursive: true });
  fs.writeFileSync(
    baselinePath,
    JSON.stringify({ ...previous, buildOk: build === 0 }, null, 2) + "\n",
  );
} else if (build !== 0) {
  process.exit(build);
}

const smoke = run("node", ["scripts/smoke-routes.mjs"]);
process.exit(smoke);
```

Di `package.json`, ganti `scripts` menjadi:

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "test:routes": "node --test scripts/routes.test.mjs",
  "smoke": "node scripts/smoke-routes.mjs",
  "gates": "node scripts/run-gates.mjs"
}
```

- [ ] **Step 3: Pastikan tes route masih lulus**

Run: `npm run test:routes`

Expected: PASS, 3 tests.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json scripts/smoke-routes.mjs scripts/run-gates.mjs
git commit -m "$(cat <<'EOF'
Add the Playwright route gate used by every upgrade stage.

The runner records 169 URLs against a production server and treats a healthier status or a cleared page error as success.
EOF
)"
```

### Task 3: Tahap 0, baseline

**Files:**
- Create: `docs/superpowers/specs/route-baseline.json`
- Create: `package-lock.json` bila belum ada dari Task 2
- Modify: `package.json` hanya bila `typescript` perlu ditambahkan agar `tsc` ada. Versi awal: `typescript` 7.0.2 di `devDependencies`.

**Interfaces:**
- Consumes: `npm run gates` dengan `GATE_BASELINE=1`
- Produces: `route-baseline.json` dengan `buildOk` dan `routes` sepanjang 169. Branch `upgrade/next16-tailwind4`.

- [ ] **Step 1: Pasang dependency aplikasi yang ada dan TypeScript untuk gerbang**

Branch `upgrade/next16-tailwind4` sudah dibuat di Task 1.

`tsc` belum ada di tahap 0, sedangkan gerbang 1 adalah `tsc --noEmit`. Pasang kompiler tanpa mengubah sumber aplikasi:

```bash
npm install
npm install --save-dev typescript@7.0.2
```

Expected: kedua perintah keluar 0. Bila `typescript@7.0.2` gagal terpasang, pasang `typescript@5.9.3` dan catat baris pengecualian di spec. Jangan memakai `--force`.

- [ ] **Step 2: Beri tsc proyek yang belum memeriksa katalog**

Buat `tsconfig.json` ini. Tahap 1 menggantinya. Include sempit ini membuat gerbang 1 keluar 0 sebelum file JSX diubah.

```json
{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": false,
    "noImplicitAny": false,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "baseUrl": ".",
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Jalankan gerbang dan simpan baseline**

Run: `GATE_BASELINE=1 npm run gates`

Expected: `tsc` keluar 0. `next build` boleh gagal; `buildOk` merekam hasilnya. Smoke menulis 169 entri dan keluar 0. File `docs/superpowers/specs/route-baseline.json` ada.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json tsconfig.json docs/superpowers/specs/route-baseline.json
git commit -m "$(cat <<'EOF'
Record the pre-upgrade build and route baseline.

Later stages may clear a page error or a 5xx, and may not add a new one.
EOF
)"
```

### Task 4: Tahap 1, TypeScript longgar

**Files:**
- Modify: `tsconfig.json`
- Modify: `package.json` scripts `smoke`
- Rename: sumber `.js` dan `.jsx` di `app`, `components`, `lib`, `hooks`, `config`, `action`, `store`, `provider`, serta `middleware.js` dan `scripts/smoke-routes.mjs`
- Delete: `jsconfig.json`
- Keep: `next.config.js`, `postcss.config.js`, `tailwind.config.js`, `pages/docs/*.mdx`, `scripts/routes.mjs`, `scripts/routes.test.mjs`, `scripts/run-gates.mjs`

**Interfaces:**
- Consumes: baseline Task 3
- Produces: sumber aplikasi `.ts`/`.tsx`, `allowJs: false`, `strict: false`. `middleware.ts` masih mengekspor `middleware`.

- [ ] **Step 1: Ganti tsconfig menjadi cakupan katalog**

Tulis `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": false,
    "noImplicitAny": false,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "baseUrl": ".",
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

Pasang tipe React 18, belum 19:

```bash
npm install --save-dev @types/react@18.3.31
```

Bila 18.3.31 tidak ada di registry, pakai versi 18 tertinggi yang `npm view @types/react@18 version` cetak, dan catat angkanya di spec.

- [ ] **Step 2: Ganti nama file**

```bash
node --input-type=module <<'EOF'
import fs from "node:fs";
import path from "node:path";
const roots = ["app", "components", "lib", "hooks", "config", "action", "store", "provider"];
function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith(".jsx")) fs.renameSync(full, full.replace(/\.jsx$/, ".tsx"));
    else if (entry.name.endsWith(".js")) fs.renameSync(full, full.replace(/\.js$/, ".ts"));
  }
}
for (const root of roots) walk(root);
if (fs.existsSync("middleware.js")) fs.renameSync("middleware.js", "middleware.ts");
if (fs.existsSync("scripts/smoke-routes.mjs")) {
  fs.renameSync("scripts/smoke-routes.mjs", "scripts/smoke-routes.ts");
}
EOF
rm -f jsconfig.json
```

Di `package.json`, ganti script smoke menjadi `"smoke": "node scripts/smoke-routes.ts"`. Di `scripts/run-gates.mjs`, ganti argumen smoke menjadi `["scripts/smoke-routes.ts"]`.

`middleware.ts` tetap:

```ts
export function middleware() {
  console.log("hello middleware");
}
```

- [ ] **Step 3: Pastikan tidak ada sumber JS tersisa di direktori tahap ini**

Run:

```bash
find app components lib hooks config action store provider \( -name '*.js' -o -name '*.jsx' \) | wc -l
```

Expected: `0`

- [ ] **Step 4: Jalankan gerbang**

Run: `npm run test:routes && npm run gates`

Expected: tes route PASS. `tsc` dan `next build` keluar 0. Smoke keluar 0. Bila `tsc` gagal hanya karena TypeScript 7.0.2 tidak kompatibel dengan Next 14.1.3, pasang `typescript@5.9.3`, catat pengecualian di spec, dan ulangi gerbang. Perbaikan tipe yang menghalangi `tsc` dilakukan di file yang disebut pesan kompiler. Jangan menambah `any`.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
Convert the catalog to TypeScript without tightening checks.

The loose compiler options keep the Next 14 app building while every application source file becomes a TypeScript module.
EOF
)"
```

### Task 5: Tahap 2, minor dan patch

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: file sumber hanya bila gerbang menyebutnya

**Interfaces:**
- Consumes: katalog TypeScript dari Task 4
- Produces: versi persis di daftar perintah ini. Keluarga `@fullcalendar/*` tidak berubah.

- [ ] **Step 1: Pasang versi yang sudah dikunci**

```bash
npm install \
  @dnd-kit/core@6.3.1 \
  @emoji-mart/data@1.2.1 \
  @emoji-mart/react@1.1.1 \
  @mdx-js/loader@3.1.1 \
  @mdx-js/react@3.1.1 \
  @smastrom/react-rating@1.5.0 \
  @south-paw/react-vector-maps@3.2.0 \
  @tanstack/react-query@5.108.0 \
  @tanstack/react-query-devtools@5.108.0 \
  @types/mdx@2.0.14 \
  @unovis/react@1.8.1 \
  @unovis/ts@1.8.1 \
  autoprefixer@10.6.2 \
  axios@1.21.1 \
  chart.js@4.6.1 \
  class-variance-authority@0.7.1 \
  cleave.js@1.6.0 \
  clsx@2.1.1 \
  d3-shape@3.2.1 \
  dayjs@1.11.23 \
  embla-carousel-auto-height@8.6.0 \
  embla-carousel-autoplay@8.6.0 \
  embla-carousel-react@8.6.0 \
  embla-carousel-wheel-gestures@8.1.0 \
  emoji-mart@5.6.0 \
  google-map-react@2.2.5 \
  leaflet@1.9.4 \
  moment@2.31.0 \
  next-auth@4.24.15 \
  next-themes@0.4.6 \
  postcss@8.5.33 \
  rc-tree@5.13.1 \
  react-chartjs-2@5.3.1 \
  react-dnd@16.0.1 \
  react-dnd-html5-backend@16.0.1 \
  react-hook-form@7.92.0 \
  react-hot-toast@2.6.1 \
  react-select@5.10.2 \
  react-wrap-balancer@1.1.1 \
  reactflow@11.11.4 \
  sass@1.108.2 \
  simplebar-react@3.3.2 \
  styled-components@6.6.0 \
  tailwindcss-animate@1.0.7 \
  unist-util-visit@5.2.0 \
  @svgr/webpack@8.1.0
```

Expected: keluar 0. Bila satu paket gagal peer, hapus paket itu dari perintah, ulangi, lalu pasang paket yang gagal pada versi tertinggi yang npm terima tanpa `--force`. Tambahkan baris di tabel Pengecualian spec: nama, versi, teks error.

- [ ] **Step 2: Jalankan gerbang**

Run: `npm run gates`

Expected: keluar 0. Perbaiki file yang disebut kompiler atau build. Jangan menaikkan paket di luar daftar.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json docs/superpowers/specs/2026-11-18-next16-upgrade-design.md
git add -A app components lib hooks config action store provider
git commit -m "$(cat <<'EOF'
Bump same-major dependencies to the versions locked on 2026-11-18.

FullCalendar and the later major upgrades stay on their current releases until their own stages.
EOF
)"
```

### Task 6: Tahap 3, Next 16.4.6 dan React 19.3.1

**Files:**
- Modify: `package.json`
- Modify: `tsconfig.json`
- Rename: `middleware.ts` menjadi `proxy.ts`
- Rename: `next.config.js` menjadi `next.config.ts`
- Create: `eslint.config.mjs` lewat codemod

**Interfaces:**
- Consumes: Task 5
- Produces: `next` 16.4.6, React 19.3.1, script `dev`/`build` memakai `--webpack`, export `proxy` di `proxy.ts`. `GATE_WEBPACK=1` untuk semua gerbang sesudahnya.

- [ ] **Step 1: Pasang runtime dan tipe**

```bash
npm install next@16.4.6 react@19.3.1 react-dom@19.3.1 eslint@10.15.0 eslint-config-next@16.4.6 @next/mdx@16.4.6
npm install --save-dev typescript@7.0.2 @types/react@19.3.0 @types/react-dom@19.3.0 @types/node@26.6.6
```

Expected: keluar 0. Bila TypeScript 7.0.2 gagal, pertahankan 5.9.3 dan catat pengecualian. Bila `reactflow@11.11.4` gagal peer pada React 19.3.1, ganti dengan `@xyflow/react@13.0.2`, hapus `reactflow`, dan ubah impor di:

- `app/(dashboard)/diagram/reactflow/overview/page.tsx`
- `app/(dashboard)/diagram/reactflow/overview/initial-element.ts`
- `app/(dashboard)/diagram/reactflow/overview/custom-node.tsx`
- `app/(dashboard)/diagram/reactflow/organization-tree/page.tsx`
- `app/(dashboard)/diagram/reactflow/organization-tree/custom-node.tsx`

Impor `from "reactflow"` menjadi `from "@xyflow/react"`. CSS `reactflow/dist/style.css` menjadi `@xyflow/react/dist/style.css` bila file itu ada di paket baru. Catat penggantian di tabel Pengecualian.

- [ ] **Step 2: Jalankan codemod Next**

```bash
npx @next/codemod@canary upgrade 16.4.6
npx @next/codemod@canary next-async-request-api .
npx @next/codemod@canary next-lint-to-eslint-cli .
```

Bila perintah pertama menolak `16.4.6`, jalankan `npx @next/codemod@canary upgrade latest`, lalu pastikan `package.json` kembali memuat persis `next@16.4.6`, `eslint-config-next@16.4.6`, dan `@next/mdx@16.4.6`.

Setelah codemod, `package.json` scripts harus berisi:

```json
"dev": "next dev --webpack",
"build": "next build --webpack",
"start": "next start",
"lint": "eslint ."
```

`proxy.ts` harus berisi:

```ts
export function proxy() {
  console.log("hello middleware");
}
```

Tidak ada `export const runtime = "edge"`. Hapus `middleware.ts` bila codemod belum menghapusnya.

`next.config.ts` mempertahankan fungsi `webpack` SVG yang ada di `next.config.js` sekarang. Jangan menghapus `remotePatterns` untuk `api.lorem.space`.

Di `tsconfig.json`, set `"moduleResolution": "bundler"`. Biarkan `"strict": false` dan `"noImplicitAny": false`.

Hapus komentar `@next-codemod-error` dan cast `UnsafeUnwrapped` yang ditinggalkan codemod dengan `await` pada `params`, `searchParams`, `cookies()`, `headers()`, dan `draftMode()`.

- [ ] **Step 3: Jalankan gerbang dengan webpack**

Run: `GATE_WEBPACK=1 npm run gates`

Expected: keluar 0. Perbaiki error yang disebut log. Jangan menghidupkan Turbopack.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
Upgrade the catalog to Next.js 16.4.6 and React 19.3.1.

Webpack stays on for SVG imports, and the empty middleware moves to the proxy filename required by this Next release.
EOF
)"
```

### Task 7: Tahap 4, Tailwind CSS 4.3.5

**Files:**
- Modify: `package.json`
- Modify: `postcss.config.js`
- Modify: `app/assets/scss/globals.scss`
- Delete: `tailwind.config.js` hanya bila alat upgrade memindahkan theme ke CSS dan build tetap resolve kelas DashTail

**Interfaces:**
- Consumes: Task 6
- Produces: `tailwindcss` 4.3.5, `tailwind-merge` 3.7.0, `@tailwindcss/postcss` 4.3.5. Variabel `:root` dan `.dark` tetap.

- [ ] **Step 1: Jalankan upgrade Tailwind**

```bash
npx @tailwindcss/upgrade@4.3.5
npm install tailwindcss@4.3.5 tailwind-merge@3.7.0 @tailwindcss/postcss@4.3.5
```

`postcss.config.js` harus memuat `@tailwindcss/postcss`, bukan plugin `tailwindcss` lama. Bentuk import important setara dengan `important: true` yang lama. Pertahankan blok `:root` dan `.dark` di `app/assets/scss/globals.scss`, termasuk `--primary-50` sampai `--primary-950`, `--default-50` sampai `--default-950`, `--success`, `--warning`, `--info`, dan `--radius`.

Hapus `autoprefixer` dari PostCSS dan dari `package.json` hanya bila file PostCSS hasil upgrade tidak lagi menyebutnya.

- [ ] **Step 2: Jalankan gerbang**

Run: `GATE_WEBPACK=1 npm run gates`

Expected: keluar 0. Bila kelas `bg-primary`, `text-primary-foreground`, atau `text-default-500` hilang dari CSS yang dihasilkan, kembalikan pemetaan warna itu ke `@theme` sebelum mengulang gerbang.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
Move styling to Tailwind CSS 4.3.5 without changing the DashTail palette.

The existing CSS variables stay the source of the primary, default, and status colors.
EOF
)"
```

### Task 8: Tahap 5, shadcn 4.23.0 di atas Radix

**Files:**
- Create: `components.json`
- Modify: `package.json`
- Modify: `components/ui/*` hanya bila props yang diekspor tetap kompatibel
- Do not replace: `components/ui/watermark/**`, `components/ui/steps.tsx`, `components/ui/timeline.tsx`, `components/ui/cleave.tsx`, `components/ui/rating.tsx`, `components/ui/tree.tsx`, `components/ui/affix.tsx`, `components/ui/input-group.tsx`, `components/ui/card-snippet.tsx`

**Interfaces:**
- Consumes: Tailwind 4 dari Task 7
- Produces: `components.json` dengan `tsx: true`, `rsc: true`, dan base Radix. `Button` tetap menerima kontrak di Global Constraints.

- [ ] **Step 1: Tulis config sebelum CLI sempat menimpa komponen**

Salin `app/assets/scss/globals.scss` ke `/tmp/dashtail-globals.scss`.

Tulis `components.json`:

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "app/assets/scss/globals.scss",
    "baseColor": "slate",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "iconLibrary": "lucide"
}
```

Lalu:

```bash
npx shadcn@4.23.0 init --base radix --force --no-reinstall
```

Bila CLI menolak `--base`, file `components.json` hasil CLI harus tetap memilih Radix. Bila field base menjadi `base`, kembalikan ke `radix` dan jangan menjalankan ulang init dengan preset Base UI.

Kembalikan `app/assets/scss/globals.scss` dari `/tmp/dashtail-globals.scss` bila ukuran atau variabel `--primary` berubah.

- [ ] **Step 2: Naikkan primitif**

```bash
npm install \
  @radix-ui/react-accordion@1.3.1 \
  @radix-ui/react-alert-dialog@1.2.1 \
  @radix-ui/react-aspect-ratio@1.2.0 \
  @radix-ui/react-avatar@1.3.1 \
  @radix-ui/react-checkbox@1.4.1 \
  @radix-ui/react-collapsible@1.2.1 \
  @radix-ui/react-dialog@1.3.1 \
  @radix-ui/react-dropdown-menu@2.2.1 \
  @radix-ui/react-hover-card@1.2.1 \
  @radix-ui/react-label@2.1.17 \
  @radix-ui/react-menubar@1.2.1 \
  @radix-ui/react-navigation-menu@1.4.1 \
  @radix-ui/react-popover@1.3.1 \
  @radix-ui/react-progress@1.2.1 \
  @radix-ui/react-radio-group@1.5.1 \
  @radix-ui/react-scroll-area@1.4.0 \
  @radix-ui/react-select@2.4.1 \
  @radix-ui/react-separator@1.2.0 \
  @radix-ui/react-slider@1.6.1 \
  @radix-ui/react-slot@1.5.0 \
  @radix-ui/react-switch@1.4.1 \
  @radix-ui/react-tabs@1.2.1 \
  @radix-ui/react-toast@1.3.1 \
  @radix-ui/react-toggle@1.2.1 \
  @radix-ui/react-tooltip@1.4.1 \
  cmdk@1.1.1 \
  vaul@1.1.2 \
  sonner@2.0.8
```

Jangan menjalankan `shadcn add button --overwrite`. Sesuaikan import yang pecah di komponen UI yang sudah ada. `components/ui/button.tsx` harus tetap mengekspor `color`, `variant`, dan `size` dengan nilai di Global Constraints.

- [ ] **Step 3: Jalankan gerbang**

Run: `GATE_WEBPACK=1 npm run gates`

Expected: keluar 0.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
Register shadcn 4.23.0 on Radix and bump the primitive packages.

DashTail button props and the custom UI files stay in place so existing pages keep their calls.
EOF
)"
```

### Task 9: Tahap 6, enam keluarga major

**Files:**
- Modify: `package.json`
- Modify: pemanggilan di file yang gagal gerbang keluarga itu
- Modify: `docs/superpowers/specs/2026-11-18-next16-upgrade-design.md` hanya untuk baris pengecualian baru

**Interfaces:**
- Consumes: Task 8
- Produces: enam keluarga pada versi spec. Satu commit setelah keenamnya lulus. Keluarga yang gagal dikembalikan dengan `git checkout --` pada file keluarga itu sebelum diperbaiki. Keluarga yang sudah lulus tidak dikembalikan.

- [ ] **Step 1: Form**

```bash
npm install zod@4.6.7 @hookform/resolvers@7.0.7 date-fns@4.4.0 react-day-picker@10.0.2 react-flatpickr@4.0.11
GATE_WEBPACK=1 npm run gates
```

Expected: keluar 0. Zod 4 dipakai di `lib/doc/utils.ts`, `components/task-board/**`, `components/auth/login-form.tsx`, `components/date-picker-with-range.tsx`, dan form di `app/auth/**` serta `app/(dashboard)/(forms)/validation-*/**`. Perbaiki error kompiler di file itu. Jangan mengganti skema menjadi tipe longgar.

- [ ] **Step 2: Chart**

```bash
npm install apexcharts@8.9.0 react-apexcharts@2.2.1 recharts@3.11.0
GATE_WEBPACK=1 npm run gates
```

Expected: keluar 0. Chart.js dan Unovis sudah naik di Task 5. Jangan menaikkan mereka lagi.

- [ ] **Step 3: Kalender**

```bash
npm install \
  @fullcalendar/core@6.1.22 \
  @fullcalendar/react@6.1.22 \
  @fullcalendar/daygrid@6.1.22 \
  @fullcalendar/timegrid@6.1.22 \
  @fullcalendar/interaction@6.1.22 \
  @fullcalendar/list@6.1.22
GATE_WEBPACK=1 npm run gates
```

Expected: keluar 0. Jangan memasang rilis `7.0.0-rc.0` atau `7.1.5`.

- [ ] **Step 4: Editor**

```bash
rg -n "ckeditor|CKEditor" app components lib || true
npm uninstall @ckeditor/ckeditor5-build-classic
npm install quill@2.0.3 react-quilljs@2.0.5 ckeditor5@49.1.0 @ckeditor/ckeditor5-react@12.0.0
GATE_WEBPACK=1 npm run gates
```

Expected: `rg` tidak menemukan impor CKEditor di sumber saat rencana ini ditulis. Jangan membuat halaman editor baru. Perbaiki impor Quill yang disebut build. Keluar gerbang 0.

- [ ] **Step 5: Interaksi**

```bash
npm install \
  framer-motion@14.14.0 \
  swiper@14.4.0 \
  react-resizable-panels@4.24.0 \
  @dnd-kit/sortable@10.0.0 \
  react-dropzone@20.2.0 \
  react-shepherd@8.0.0 \
  lucide@1.74.0 \
  lucide-react@1.74.0
GATE_WEBPACK=1 npm run gates
```

Expected: keluar 0. Nama paket tetap `framer-motion`, bukan `motion`.

- [ ] **Step 6: Data dan lain-lain**

```bash
npm install \
  @tanstack/react-table@9.3.1 \
  zustand@5.1.0 \
  react-leaflet@5.0.0 \
  bcrypt@6.0.0 \
  @iconify/react@6.0.4 \
  @vercel/analytics@2.0.1 \
  react-syntax-highlighter@16.1.2 \
  @faker-js/faker@10.6.0
GATE_WEBPACK=1 npm run gates
```

Expected: keluar 0.

- [ ] **Step 7: Commit sekali**

```bash
git add -A
git commit -m "$(cat <<'EOF'
Upgrade the remaining major libraries in family order.

FullCalendar stays on the last mutual stable release, and the unmaintained CKEditor preset is replaced by the ckeditor5 package.
EOF
)"
```

### Task 10: Tahap 7, TypeScript strict

**Files:**
- Modify: `tsconfig.json`
- Modify: file `.ts` dan `.tsx` yang dilaporkan `tsc`

**Interfaces:**
- Consumes: Task 9
- Produces: `"strict": true`, `"noImplicitAny": true`, gerbang akhir keluar 0

- [ ] **Step 1: Hidupkan strict**

Di `tsconfig.json`, set kedua opsi ini dan jangan menambah `exclude` untuk direktori aplikasi:

```json
"strict": true,
"noImplicitAny": true
```

- [ ] **Step 2: Jalankan tsc dan perbaiki file yang disebut**

Run: `npx tsc --noEmit`

Expected awal: boleh gagal. Tiap error diperbaiki di file dan baris yang dicetak. Nilai yang belum diketahui memakai `unknown`. `@ts-expect-error` memuat komentar alasan. Jangan menambah `"strict": false` di file manapun.

- [ ] **Step 3: Jalankan gerbang akhir**

Run: `npm run test:routes && GATE_WEBPACK=1 npm run gates`

Expected: tes route PASS dan `gates` keluar 0.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
Typecheck the catalog with strict TypeScript.

The upgrade is complete only when the compiler and the 169-route browser gate both pass on this setting.
EOF
)"
```
