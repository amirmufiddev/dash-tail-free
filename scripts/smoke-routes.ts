// @ts-nocheck
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