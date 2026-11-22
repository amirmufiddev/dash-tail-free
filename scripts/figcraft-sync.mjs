import { spawn, execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DESIGN_DIR = path.join(ROOT, "design");
const DESIGN_FILE = path.join(DESIGN_DIR, "dash-tail.figcraft");
const TOKENS_DIR = path.join(DESIGN_DIR, "tokens");
const EXPORTS_DIR = path.join(DESIGN_DIR, "exports");
const CONNECT_FILE = path.join(ROOT, "figcraft.connect.json");
const GLOBALS_SCSS = path.join(ROOT, "app/assets/scss/globals.scss");

function hslToHex(hslString) {
  const parts = hslString
    .trim()
    .replace(/,/g, " ")
    .split(/\s+/)
    .map((p) => parseFloat(p.replace("%", "")));
  if (parts.length < 3 || parts.some(Number.isNaN)) {
    return null;
  }
  const [hDeg, sPct, lPct] = parts;
  const h = ((hDeg % 360) + 360) % 360;
  const s = Math.max(0, Math.min(100, sPct)) / 100;
  const l = Math.max(0, Math.min(100, lPct)) / 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;

  if (h < 60) {
    [r, g, b] = [c, x, 0];
  } else if (h < 120) {
    [r, g, b] = [x, c, 0];
  } else if (h < 180) {
    [r, g, b] = [0, c, x];
  } else if (h < 240) {
    [r, g, b] = [0, x, c];
  } else if (h < 300) {
    [r, g, b] = [x, 0, c];
  } else {
    [r, g, b] = [c, 0, x];
  }

  const toHex = (v) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, "0")
      .toUpperCase();

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function parseBlockVars(blockBody) {
  const vars = {};
  const re = /--([a-z0-9-]+)\s*:\s*([^;]+);/gi;
  let m;
  while ((m = re.exec(blockBody)) !== null) {
    vars[m[1]] = m[2].trim();
  }
  return vars;
}

function extractBraceBlock(source, selectorRegex) {
  const match = selectorRegex.exec(source);
  if (!match) return "";
  let idx = match.index + match[0].length;
  let depth = 1;
  const start = idx;
  while (idx < source.length && depth > 0) {
    if (source[idx] === "{") depth += 1;
    else if (source[idx] === "}") depth -= 1;
    idx += 1;
  }
  return source.slice(start, idx - 1);
}

function loadThemeTokens() {
  const scss = fs.readFileSync(GLOBALS_SCSS, "utf8");
  const rootRaw = parseBlockVars(extractBraceBlock(scss, /:root\s*\{/));
  const darkRaw = parseBlockVars(extractBraceBlock(scss, /\.dark\s*\{/));

  const colorKeys = [
    "background",
    "foreground",
    "card",
    "card-foreground",
    "popover",
    "popover-foreground",
    "primary",
    "primary-foreground",
    "secondary",
    "secondary-foreground",
    "muted",
    "muted-foreground",
    "accent",
    "accent-foreground",
    "destructive",
    "destructive-foreground",
    "success",
    "success-foreground",
    "info",
    "info-foreground",
    "warning",
    "warning-foreground",
    "border",
    "input",
    "ring",
    "primary-50",
    "primary-100",
    "primary-200",
    "primary-300",
    "primary-400",
    "primary-500",
    "primary-600",
    "primary-700",
    "primary-800",
    "primary-900",
    "primary-950",
    "default-50",
    "default-100",
    "default-200",
    "default-300",
    "default-400",
    "default-500",
    "default-600",
    "default-700",
    "default-800",
    "default-900",
    "default-950",
  ];

  const colors = {};
  for (const key of colorKeys) {
    const lightHex = rootRaw[key] ? hslToHex(rootRaw[key]) : null;
    const darkHex = darkRaw[key] ? hslToHex(darkRaw[key]) : lightHex;
    if (lightHex) {
      colors[key] = {
        name: `color/${key}`,
        light: lightHex,
        dark: darkHex ?? lightHex,
        cssVar: `hsl(var(--${key}))`,
      };
    }
  }

  colors["page-bg"] = {
    name: "color/page-bg",
    light: "#EEF1F9",
    dark: colors.background?.dark ?? "#0F172A",
    cssVar: "var(--page-bg)",
  };

  const radiusRem = parseFloat(rootRaw.radius ?? "0.5rem");
  const baseRadius = Number.isNaN(radiusRem) ? 8 : Math.round(radiusRem * 16);

  return {
    colors,
    numbers: {
      "radius/sm": Math.max(0, baseRadius - 4),
      "radius/md": Math.max(0, baseRadius - 2),
      "radius/lg": baseRadius,
      "radius/xl": baseRadius + 4,
      "spacing/xs": 4,
      "spacing/sm": 8,
      "spacing/md": 16,
      "spacing/lg": 24,
      "spacing/xl": 32,
    },
    strings: {
      "font/sans": "Inter",
    },
  };
}

class FigCraftClient {
  constructor() {
    this.proc = spawn(
      "figcraft-cli",
      [
        "mcp",
        "--automation-read-root",
        ROOT,
        "--automation-write-root",
        ROOT,
      ],
      { stdio: ["pipe", "pipe", "pipe"] }
    );
    this.buffer = "";
    this.nextId = 1;
    this.pending = new Map();
    this.stderr = "";

    this.proc.stdout.on("data", (chunk) => {
      this.buffer += chunk.toString();
      const lines = this.buffer.split("\n");
      this.buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.trim()) continue;
        const msg = JSON.parse(line);
        if (msg.id && this.pending.has(msg.id)) {
          const { resolve, reject } = this.pending.get(msg.id);
          this.pending.delete(msg.id);
          if (msg.error) {
            reject(new Error(`MCP error: ${JSON.stringify(msg.error)}`));
          } else {
            resolve(msg.result);
          }
        }
      }
    });

    this.proc.stderr.on("data", (chunk) => {
      this.stderr += chunk.toString();
    });
  }

  request(method, params) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.proc.stdin.write(
        `${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`
      );
    });
  }

  notify(method, params) {
    const payload = params
      ? { jsonrpc: "2.0", method, params }
      : { jsonrpc: "2.0", method };
    this.proc.stdin.write(`${JSON.stringify(payload)}\n`);
  }

  async init() {
    await this.request("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "dash-tail-figcraft-sync", version: "1.0.0" },
    });
    this.notify("notifications/initialized");
  }

  async tool(name, args = {}) {
    const res = await this.request("tools/call", { name, arguments: args });
    if (res?.isError) {
      throw new Error(`${name} failed: ${JSON.stringify(res.content)}`);
    }
    const text = res?.content?.[0]?.text ?? "{}";
    return JSON.parse(text);
  }

  cmd(command, params = {}) {
    return this.tool("run_command", { command, params });
  }

  createNode(args) {
    return this.tool("create_node", args);
  }

  setProps(ids, props) {
    return this.tool("set_properties", {
      ids: Array.isArray(ids) ? ids : [ids],
      props,
    });
  }

  close() {
    this.proc.kill();
  }
}

async function setupVariables(fc, tokens) {
  await fc.cmd("variable.createCollection", {
    name: "Theme",
    modes: ["Light", "Dark"],
  });

  for (const [, token] of Object.entries(tokens.colors)) {
    const created = await fc.cmd("variable.create", {
      collection: "Theme",
      name: token.name,
      type: "color",
      values: { Light: token.light, Dark: token.dark },
    });
    await fc.cmd("variable.update", {
      variable: created.id,
      codeSyntax: { WEB: token.cssVar },
    });
  }

  for (const softKey of ["primary", "info", "success", "warning", "destructive"]) {
    await fc.cmd("variable.create", {
      collection: "Theme",
      name: `color/${softKey}-soft`,
      type: "color",
      values: {
        Light: { alpha: { variable: `color/${softKey}`, opacity: 0.12 } },
        Dark: { alpha: { variable: `color/${softKey}`, opacity: 0.16 } },
      },
    });
  }

  await fc.cmd("variable.createCollection", {
    name: "Tokens",
    modes: ["Base"],
  });

  for (const [name, value] of Object.entries(tokens.numbers)) {
    await fc.cmd("variable.create", {
      collection: "Tokens",
      name,
      type: "number",
      value,
    });
  }

  for (const [name, value] of Object.entries(tokens.strings)) {
    await fc.cmd("variable.create", {
      collection: "Tokens",
      name,
      type: "string",
      value,
    });
  }
}

async function setupTextStyles(fc) {
  const styles = [
    { name: "Heading/H1", fontSize: 24, fontStyle: "SemiBold", lineHeight: 32 },
    { name: "Heading/H2", fontSize: 20, fontStyle: "Medium", lineHeight: 28 },
    { name: "Heading/H3", fontSize: 18, fontStyle: "Medium", lineHeight: 24 },
    { name: "Body/Base", fontSize: 14, fontStyle: "Regular", lineHeight: 20 },
    { name: "Body/Small", fontSize: 12, fontStyle: "Regular", lineHeight: 16 },
    { name: "Label/Button", fontSize: 14, fontStyle: "SemiBold", lineHeight: 20 },
    { name: "Label/Badge", fontSize: 12, fontStyle: "SemiBold", lineHeight: 16 },
  ];

  for (const s of styles) {
    await fc.cmd("style.create", {
      type: "text",
      name: s.name,
      value: {
        fontFamily: "Inter",
        fontStyle: s.fontStyle,
        fontSize: s.fontSize,
        lineHeight: s.lineHeight,
      },
    });
  }
}

async function createText(fc, parent, name, characters, opts = {}) {
  return fc.createNode({
    type: "text",
    name,
    parent,
    text: characters,
    select: false,
    props: {
      fontFamily: "Inter",
      fontStyle: opts.fontStyle ?? "Regular",
      fontSize: opts.fontSize ?? 14,
      fill: opts.fill ?? { $var: "color/foreground" },
      ...(opts.props ?? {}),
    },
  });
}

async function buildTokensPage(fc, tokens) {
  await fc.cmd("page.rename", { name: "Tokens" });
  await fc.cmd("page.setBackground", { color: "#EEF1F9" });

  const createThemeBoard = async (x, mode) => {
    const board = await fc.createNode({
      type: "frame",
      name: `Theme / ${mode}`,
      x,
      y: 40,
      width: 680,
      height: 100,
      props: {
        layout: "vertical",
        sizingH: "fixed",
        sizingV: "hug",
        gap: 24,
        padding: 32,
        cornerRadius: 12,
        fill: { $var: "color/page-bg" },
        stroke: { $var: "color/border" },
        strokeWeight: 1,
      },
    });
    await fc.cmd("variable.setMode", {
      ids: [board.id],
      collection: "Theme",
      mode,
    });

    await createText(fc, board.id, "Title", `DashTail Theme — ${mode} Mode`, {
      fontSize: 24,
      fontStyle: "SemiBold",
    });
    await createText(
      fc,
      board.id,
      "Subtitle",
      "Synced from app/assets/scss/globals.scss (violet default theme)",
      { fontSize: 13, fill: { $var: "color/muted-foreground" } }
    );

    const grid = await fc.createNode({
      type: "frame",
      name: "Semantic Swatches",
      parent: board.id,
      width: 616,
      height: 100,
      props: {
        layout: "horizontal",
        wrap: true,
        gap: 12,
        crossGap: 12,
        sizingH: "fill",
        sizingV: "hug",
        fill: "none",
      },
    });

    const semanticKeys = [
      "background",
      "foreground",
      "card",
      "primary",
      "secondary",
      "muted",
      "accent",
      "destructive",
      "success",
      "info",
      "warning",
      "border",
    ];

    for (const key of semanticKeys) {
      const card = await fc.createNode({
        type: "frame",
        name: `swatch/${key}`,
        parent: grid.id,
        width: 145,
        height: 92,
        props: {
          layout: "vertical",
          gap: 8,
          padding: 10,
          cornerRadius: 8,
          fill: { $var: "color/card" },
          stroke: { $var: "color/border" },
          strokeWeight: 1,
          sizingH: "fixed",
          sizingV: "hug",
        },
      });
      await fc.createNode({
        type: "rectangle",
        name: "Color",
        parent: card.id,
        width: 125,
        height: 44,
        props: {
          cornerRadius: 6,
          fill: { $var: `color/${key}` },
          stroke: { $var: "color/border" },
          strokeWeight: 1,
        },
      });
      await createText(fc, card.id, "Name", `--${key}`, {
        fontSize: 12,
        fontStyle: "Medium",
      });
      await createText(
        fc,
        card.id,
        "Hex",
        mode === "Light" ? tokens.colors[key].light : tokens.colors[key].dark,
        {
          fontSize: 11,
          fill: { $var: "color/muted-foreground" },
        }
      );
    }

    const rampRow = await fc.createNode({
      type: "frame",
      name: "Primary Scale",
      parent: board.id,
      width: 616,
      height: 68,
      props: {
        layout: "horizontal",
        gap: 6,
        sizingH: "fill",
        sizingV: "hug",
        fill: "none",
      },
    });

    for (const shade of [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]) {
      const cell = await fc.createNode({
        type: "frame",
        name: `primary-${shade}`,
        parent: rampRow.id,
        width: 50,
        height: 60,
        props: {
          layout: "vertical",
          gap: 4,
          sizingH: "fill",
          sizingV: "hug",
          crossAlign: "center",
          fill: "none",
        },
      });
      await fc.createNode({
        type: "rectangle",
        name: "Chip",
        parent: cell.id,
        width: 48,
        height: 36,
        props: {
          cornerRadius: 6,
          fill: { $var: `color/primary-${shade}` },
        },
      });
      await createText(fc, cell.id, "Shade", String(shade), {
        fontSize: 10,
        fill: { $var: "color/muted-foreground" },
      });
    }

    return board.id;
  };

  await createThemeBoard(40, "Light");
  await createThemeBoard(760, "Dark");
}

async function combineAndLabel(fc, variantIds, setName, x, y, textProps = []) {
  const set = await fc.cmd("component.combineVariants", { ids: variantIds });
  await fc.setProps(set.id, {
    name: setName,
    x,
    y,
    layout: "horizontal",
    wrap: true,
    gap: 16,
    crossGap: 16,
    padding: 20,
    sizingH: "fixed",
    sizingV: "hug",
    width: 660,
    fill: "#FFFFFF",
    stroke: "#E2E8F0",
    strokeWeight: 1,
    cornerRadius: 10,
  });

  for (const prop of textProps) {
    await fc.cmd("component.addProperty", {
      id: set.id,
      name: prop.name,
      type: "text",
      default: prop.default,
    });
    for (const layerId of prop.layerIds) {
      await fc.cmd("component.bindProperty", {
        layer: layerId,
        property: prop.name,
        field: "characters",
      });
    }
  }
  return set.id;
}

async function buildComponentsPage(fc) {
  const page = await fc.cmd("page.add", { name: "Components" });
  await fc.cmd("page.select", { id: page.id });
  await fc.cmd("page.setBackground", { color: "#F1F5F9" });

  // 1. Button Component Set
  const btnSpecs = [
    { name: "color=default, variant=solid, size=default", fill: "color/primary", fg: "color/primary-foreground", stroke: null, h: 40, px: 16, fs: 14 },
    { name: "color=default, variant=outline, size=default", fill: null, fg: "color/primary", stroke: "color/primary", h: 40, px: 16, fs: 14 },
    { name: "color=default, variant=soft, size=default", fill: "color/primary-100", fg: "color/primary", stroke: null, h: 40, px: 16, fs: 14 },
    { name: "color=default, variant=ghost, size=default", fill: null, fg: "color/primary", stroke: null, h: 40, px: 16, fs: 14 },
    { name: "color=destructive, variant=solid, size=default", fill: "color/destructive", fg: "color/destructive-foreground", stroke: null, h: 40, px: 16, fs: 14 },
    { name: "color=success, variant=solid, size=default", fill: "color/success", fg: "color/success-foreground", stroke: null, h: 40, px: 16, fs: 14 },
    { name: "color=info, variant=solid, size=default", fill: "color/info", fg: "color/info-foreground", stroke: null, h: 40, px: 16, fs: 14 },
    { name: "color=warning, variant=solid, size=default", fill: "color/warning", fg: "color/warning-foreground", stroke: null, h: 40, px: 16, fs: 14 },
    { name: "color=secondary, variant=solid, size=default", fill: "color/secondary", fg: "color/secondary-foreground", stroke: null, h: 40, px: 16, fs: 14 },
    { name: "color=dark, variant=solid, size=default", fill: "color/default-900", fg: "color/default-50", stroke: null, h: 40, px: 16, fs: 13 },
    { name: "color=destructive, variant=soft, size=default", fill: "color/destructive-soft", fg: "color/destructive", stroke: null, h: 40, px: 16, fs: 13 },
    { name: "color=secondary, variant=outline, size=sm", fill: "color/background", fg: "color/default-700", stroke: "color/border", h: 36, px: 12, fs: 13 },
    {
      name: "color=secondary, variant=outline, size=icon",
      fill: "color/background",
      fg: "color/default-600",
      stroke: "color/border",
      h: 36,
      w: 36,
      px: 0,
      fs: 15,
      iconPath: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6 M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1",
    },
    {
      name: "color=secondary, variant=solid, size=icon",
      fill: "color/default-100",
      fg: "color/default-700",
      stroke: "color/border",
      h: 36,
      w: 36,
      px: 0,
      fs: 15,
      iconPath: "M21 12a9 9 0 1 1-2.64-6.36 M21 3v6h-6",
    },
    {
      name: "color=destructive, variant=soft, size=icon",
      fill: "color/destructive-soft",
      fg: "color/destructive",
      stroke: null,
      h: 36,
      w: 36,
      px: 0,
      fs: 15,
      iconPath: "M3 6h18 M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6 M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2 M10 11v6 M14 11v6",
    },
    { name: "color=default, variant=solid, size=sm", fill: "color/primary", fg: "color/primary-foreground", stroke: null, h: 36, px: 12, fs: 13 },
    { name: "color=default, variant=solid, size=lg", fill: "color/primary", fg: "color/primary-foreground", stroke: null, h: 44, px: 18, fs: 16 },
  ];
  const btnIds = [];
  const btnTextIds = [];
  for (const b of btnSpecs) {
    const c = await fc.createNode({
      type: "component",
      name: b.name,
      width: b.w ?? 120,
      height: b.h,
      props: {
        layout: "horizontal",
        sizingH: b.w ? "fixed" : "hug",
        sizingV: "fixed",
        mainAlign: "center",
        crossAlign: "center",
        padding: b.w ? 0 : [10, b.px, 10, b.px],
        cornerRadius: 6,
        fill: b.fill ? { $var: b.fill } : "none",
        ...(b.stroke
          ? { stroke: { $var: b.stroke }, strokeWeight: 1 }
          : {}),
      },
    });
    if (b.iconPath) {
      await fc.createNode({
        type: "vector",
        name: "Icon",
        parent: c.id,
        width: 15,
        height: 15,
        path: b.iconPath,
        props: {
          fill: "none",
          stroke: { $var: b.fg },
          strokeWeight: 1.8,
          strokeCap: "round",
          strokeJoin: "round",
        },
      });
    } else {
      const t = await createText(fc, c.id, "Label", "Button", {
        fontSize: b.fs,
        fontStyle: "SemiBold",
        fill: { $var: b.fg },
      });
      btnTextIds.push(t.id);
    }
    btnIds.push(c.id);
  }
  const buttonSetId = await combineAndLabel(fc, btnIds, "Button", 40, 40, [
    { name: "label", default: "Button", layerIds: btnTextIds },
  ]);

  // 2. Badge Component Set
  const badgeSpecs = [
    { name: "color=default, variant=solid", fill: "color/primary", fg: "color/primary-foreground", stroke: null },
    { name: "color=destructive, variant=solid", fill: "color/destructive", fg: "color/destructive-foreground", stroke: null },
    { name: "color=success, variant=solid", fill: "color/success", fg: "color/success-foreground", stroke: null },
    { name: "color=info, variant=solid", fill: "color/info", fg: "color/info-foreground", stroke: null },
    { name: "color=warning, variant=solid", fill: "color/warning", fg: "color/warning-foreground", stroke: null },
    { name: "color=secondary, variant=solid", fill: "color/secondary", fg: "color/foreground", stroke: null },
    { name: "color=default, variant=outline", fill: "color/background", fg: "color/primary", stroke: "color/primary" },
    { name: "color=default, variant=soft", fill: "color/primary-100", fg: "color/primary", stroke: null },
    { name: "color=success, variant=soft", fill: "color/success-soft", fg: "color/success", stroke: null },
    { name: "color=info, variant=soft", fill: "color/info-soft", fg: "color/info", stroke: null },
    { name: "color=warning, variant=soft", fill: "color/warning-soft", fg: "color/warning", stroke: null },
    { name: "color=destructive, variant=soft", fill: "color/destructive-soft", fg: "color/destructive", stroke: null },
  ];
  const badgeIds = [];
  const badgeTextIds = [];
  for (const b of badgeSpecs) {
    const c = await fc.createNode({
      type: "component",
      name: b.name,
      width: 72,
      height: 22,
      props: {
        layout: "horizontal",
        sizingH: "hug",
        sizingV: "hug",
        mainAlign: "center",
        crossAlign: "center",
        padding: [2, 10, 2, 10],
        cornerRadius: 999,
        fill: { $var: b.fill },
        ...(b.stroke
          ? { stroke: { $var: b.stroke }, strokeWeight: 1 }
          : {}),
      },
    });
    const t = await createText(fc, c.id, "Label", "Badge", {
      fontSize: 12,
      fontStyle: "SemiBold",
      fill: { $var: b.fg },
    });
    badgeIds.push(c.id);
    badgeTextIds.push(t.id);
  }
  const badgeSetId = await combineAndLabel(fc, badgeIds, "Badge", 40, 280, [
    { name: "label", default: "Badge", layerIds: badgeTextIds },
  ]);

  // 3. Input Component Set
  const inputSpecs = [
    { name: "variant=bordered, color=default, size=md", fill: "color/background", stroke: "color/default-300", fg: "color/muted-foreground" },
    { name: "variant=bordered, color=primary, size=md", fill: "color/background", stroke: "color/primary", fg: "color/primary" },
    { name: "variant=bordered, color=destructive, size=md", fill: "color/background", stroke: "color/destructive", fg: "color/destructive" },
    { name: "variant=bordered, color=success, size=md", fill: "color/background", stroke: "color/success", fg: "color/success" },
    { name: "variant=flat, color=default, size=md", fill: "color/default-100", stroke: null, fg: "color/muted-foreground" },
    { name: "variant=faded, color=default, size=md", fill: "color/default-100", stroke: "color/default-300", fg: "color/muted-foreground" },
  ];
  const inputIds = [];
  const inputTextIds = [];
  for (const inp of inputSpecs) {
    const c = await fc.createNode({
      type: "component",
      name: inp.name,
      width: 260,
      height: 36,
      props: {
        layout: "horizontal",
        sizingH: "fixed",
        sizingV: "fixed",
        crossAlign: "center",
        padding: [8, 12, 8, 12],
        cornerRadius: 8,
        fill: { $var: inp.fill },
        ...(inp.stroke
          ? { stroke: { $var: inp.stroke }, strokeWeight: 1 }
          : {}),
      },
    });
    const t = await createText(fc, c.id, "Placeholder", "Enter value...", {
      fontSize: 12,
      fill: { $var: inp.fg },
    });
    inputIds.push(c.id);
    inputTextIds.push(t.id);
  }
  const inputSetId = await combineAndLabel(fc, inputIds, "Input", 40, 470, [
    { name: "placeholder", default: "Enter value...", layerIds: inputTextIds },
  ]);

  // 4. Textarea Component Set
  const textareaSpecs = [
    { name: "variant=bordered, color=default", fill: "color/background", stroke: "color/default-300" },
    { name: "variant=flat, color=default", fill: "color/default-100", stroke: null },
    { name: "variant=faded, color=default", fill: "color/default-100", stroke: "color/default-300" },
  ];
  const taIds = [];
  const taTextIds = [];
  for (const ta of textareaSpecs) {
    const c = await fc.createNode({
      type: "component",
      name: ta.name,
      width: 280,
      height: 84,
      props: {
        layout: "vertical",
        sizingH: "fixed",
        sizingV: "fixed",
        padding: [10, 12, 10, 12],
        cornerRadius: 6,
        fill: { $var: ta.fill },
        ...(ta.stroke ? { stroke: { $var: ta.stroke }, strokeWeight: 1 } : {}),
      },
    });
    const t = await createText(fc, c.id, "Placeholder", "Write a description...", {
      fontSize: 13,
      fill: { $var: "color/muted-foreground" },
      props: { sizingH: "fill", textAutoResize: "height", lineHeight: 20 },
    });
    taIds.push(c.id);
    taTextIds.push(t.id);
  }
  const textareaSetId = await combineAndLabel(fc, taIds, "Textarea", 40, 700, [
    { name: "placeholder", default: "Write a description...", layerIds: taTextIds },
  ]);

  // 5. Alert Component Set
  const alertSpecs = [
    { name: "color=default, variant=solid", fill: "color/primary", fg: "color/primary-foreground", stroke: null },
    { name: "color=info, variant=soft", fill: "color/info-soft", fg: "color/info", stroke: "color/info" },
    { name: "color=success, variant=soft", fill: "color/success-soft", fg: "color/success", stroke: "color/success" },
    { name: "color=warning, variant=soft", fill: "color/warning-soft", fg: "color/warning", stroke: "color/warning" },
    { name: "color=destructive, variant=soft", fill: "color/destructive-soft", fg: "color/destructive", stroke: "color/destructive" },
    { name: "color=default, variant=outline", fill: "color/background", fg: "color/primary", stroke: "color/primary" },
  ];
  const alertIds = [];
  const alertTitles = [];
  const alertDescs = [];
  for (const al of alertSpecs) {
    const c = await fc.createNode({
      type: "component",
      name: al.name,
      width: 300,
      height: 76,
      props: {
        layout: "vertical",
        sizingH: "fixed",
        sizingV: "hug",
        gap: 6,
        padding: 16,
        cornerRadius: 8,
        fill: { $var: al.fill },
        ...(al.stroke ? { stroke: { $var: al.stroke }, strokeWeight: 1 } : {}),
      },
    });
    const t = await createText(fc, c.id, "AlertTitle", "Heads up!", {
      fontSize: 16,
      fontStyle: "Medium",
      fill: { $var: al.fg },
    });
    const d = await createText(
      fc,
      c.id,
      "AlertDescription",
      "Design tokens and components are synced with FigCraft.",
      { fontSize: 13, fill: { $var: al.fg }, props: { width: 268 } }
    );
    alertIds.push(c.id);
    alertTitles.push(t.id);
    alertDescs.push(d.id);
  }
  const alertSetId = await combineAndLabel(fc, alertIds, "Alert", 760, 40, [
    { name: "title", default: "Heads up!", layerIds: alertTitles },
    {
      name: "description",
      default: "Design tokens and components are synced with FigCraft.",
      layerIds: alertDescs,
    },
  ]);

  // 6. Card Component
  const cardComp = await fc.createNode({
    type: "component",
    name: "Card",
    x: 760,
    y: 440,
    width: 340,
    height: 220,
    props: {
      layout: "vertical",
      sizingH: "fixed",
      sizingV: "hug",
      cornerRadius: 6,
      fill: { $var: "color/card" },
      stroke: { $var: "color/border" },
      strokeWeight: 1,
      effects: [
        {
          type: "dropShadow",
          color: "#0F162414",
          offset: [0, 2],
          radius: 6,
        },
      ],
    },
  });
  const cardHeader = await fc.createNode({
    type: "frame",
    name: "CardHeader",
    parent: cardComp.id,
    width: 340,
    height: 76,
    props: {
      layout: "vertical",
      sizingH: "fill",
      sizingV: "hug",
      gap: 6,
      padding: 16,
      fill: "none",
      stroke: { $var: "color/border" },
      strokeBottomWeight: 1,
    },
  });
  const cardTitle = await createText(fc, cardHeader.id, "CardTitle", "Project Summary", {
    fontSize: 18,
    fontStyle: "Medium",
    fill: { $var: "color/card-foreground" },
  });
  const cardDesc = await createText(
    fc,
    cardHeader.id,
    "CardDescription",
    "Active sprint metrics and progress",
    { fontSize: 13, fill: { $var: "color/muted-foreground" } }
  );
  const cardContent = await fc.createNode({
    type: "frame",
    name: "CardContent",
    parent: cardComp.id,
    width: 340,
    height: 80,
    props: {
      layout: "vertical",
      sizingH: "fill",
      sizingV: "hug",
      gap: 8,
      padding: 20,
      fill: "none",
    },
  });
  const cardBody = await createText(
    fc,
    cardContent.id,
    "Body",
    "12 components connected to React code via figcraft.connect.json.",
    {
      fontSize: 14,
      fill: { $var: "color/card-foreground" },
      props: { width: 300 },
    }
  );
  const cardFooter = await fc.createNode({
    type: "frame",
    name: "CardFooter",
    parent: cardComp.id,
    width: 340,
    height: 44,
    props: {
      layout: "horizontal",
      sizingH: "fill",
      sizingV: "hug",
      mainAlign: "spaceBetween",
      crossAlign: "center",
      padding: [0, 20, 20, 20],
      fill: "none",
    },
  });
  const cardFooterAction = await createText(
    fc,
    cardFooter.id,
    "FooterAction",
    "View details →",
    { fontSize: 13, fontStyle: "Medium", fill: { $var: "color/primary" } }
  );
  for (const prop of [
    { name: "title", default: "Project Summary", id: cardTitle.id },
    { name: "description", default: "Active sprint metrics and progress", id: cardDesc.id },
    { name: "body", default: "12 components connected to React code via figcraft.connect.json.", id: cardBody.id },
    { name: "footerAction", default: "View details →", id: cardFooterAction.id },
  ]) {
    await fc.cmd("component.addProperty", {
      id: cardComp.id,
      name: prop.name,
      type: "text",
      default: prop.default,
    });
    await fc.cmd("component.bindProperty", {
      layer: prop.id,
      property: prop.name,
      field: "characters",
    });
  }

  // 7. Avatar Component
  const avatarComp = await fc.createNode({
    type: "component",
    name: "Avatar",
    x: 1140,
    y: 440,
    width: 40,
    height: 40,
    props: {
      layout: "horizontal",
      mainAlign: "center",
      crossAlign: "center",
      cornerRadius: 999,
      fill: { $var: "color/muted" },
      stroke: { $var: "color/border" },
      strokeWeight: 1,
    },
  });
  const avatarInitials = await createText(fc, avatarComp.id, "Initials", "DT", {
    fontSize: 14,
    fontStyle: "SemiBold",
    fill: { $var: "color/foreground" },
  });
  await fc.cmd("component.addProperty", {
    id: avatarComp.id,
    name: "initials",
    type: "text",
    default: "DT",
  });
  await fc.cmd("component.bindProperty", {
    layer: avatarInitials.id,
    property: "initials",
    field: "characters",
  });

  // 8. Checkbox Component Set
  const cbSpecs = [
    { name: "checked=false, color=default", checked: false, fill: "color/card", stroke: "color/default-400" },
    { name: "checked=true, color=default", checked: true, fill: "color/primary", stroke: "color/primary" },
    { name: "checked=true, color=success", checked: true, fill: "color/success", stroke: "color/success" },
    { name: "checked=true, color=destructive", checked: true, fill: "color/destructive", stroke: "color/destructive" },
  ];
  const cbIds = [];
  const cbLabelIds = [];
  for (const cb of cbSpecs) {
    const c = await fc.createNode({
      type: "component",
      name: cb.name,
      width: 140,
      height: 24,
      props: {
        layout: "horizontal",
        sizingH: "hug",
        sizingV: "hug",
        crossAlign: "center",
        gap: 10,
        fill: "none",
      },
    });
    const box = await fc.createNode({
      type: "frame",
      name: "Box",
      parent: c.id,
      width: 20,
      height: 20,
      props: {
        layout: "horizontal",
        mainAlign: "center",
        crossAlign: "center",
        cornerRadius: 4,
        fill: { $var: cb.fill },
        stroke: { $var: cb.stroke },
        strokeWeight: 1,
      },
    });
    if (cb.checked) {
      await createText(fc, box.id, "Check", "✓", {
        fontSize: 12,
        fontStyle: "Bold",
        fill: "#FFFFFF",
      });
    }
    const lbl = await createText(fc, c.id, "Label", "Checkbox", {
      fontSize: 14,
      fill: { $var: "color/muted-foreground" },
    });
    cbIds.push(c.id);
    cbLabelIds.push(lbl.id);
  }
  const cbSetId = await combineAndLabel(fc, cbIds, "Checkbox", 760, 710, [
    { name: "label", default: "Checkbox", layerIds: cbLabelIds },
  ]);

  // 9. Switch Component Set
  const swSpecs = [
    { name: "checked=false, color=primary", checked: false, fill: "color/default-300" },
    { name: "checked=true, color=primary", checked: true, fill: "color/primary" },
    { name: "checked=true, color=success", checked: true, fill: "color/success" },
    { name: "checked=true, color=warning", checked: true, fill: "color/warning" },
    { name: "checked=true, color=destructive", checked: true, fill: "color/destructive" },
    { name: "checked=false, color=dark", checked: false, fill: "color/default-200" },
    { name: "checked=true, color=dark", checked: true, fill: "color/default-900" },
  ];
  const swIds = [];
  for (const sw of swSpecs) {
    const c = await fc.createNode({
      type: "component",
      name: sw.name,
      width: 38,
      height: 20,
      props: {
        layout: "horizontal",
        mainAlign: sw.checked ? "max" : "min",
        crossAlign: "center",
        padding: 2,
        cornerRadius: 999,
        fill: { $var: sw.fill },
      },
    });
    await fc.createNode({
      type: "ellipse",
      name: "Thumb",
      parent: c.id,
      width: 16,
      height: 16,
      props: { fill: { $var: "color/background" } },
    });
    swIds.push(c.id);
  }
  const swSetId = await combineAndLabel(fc, swIds, "Switch", 760, 820);

  // 10. Tabs Component
  const tabsComp = await fc.createNode({
    type: "component",
    name: "Tabs",
    x: 40,
    y: 920,
    width: 260,
    height: 40,
    props: {
      layout: "horizontal",
      sizingH: "hug",
      sizingV: "fixed",
      gap: 4,
      padding: 4,
      cornerRadius: 6,
      fill: { $var: "color/default-200" },
    },
  });
  const tab1Frame = await fc.createNode({
    type: "frame",
    name: "TabActive",
    parent: tabsComp.id,
    width: 110,
    height: 32,
    props: {
      layout: "horizontal",
      sizingH: "hug",
      sizingV: "fill",
      mainAlign: "center",
      crossAlign: "center",
      padding: [0, 12, 0, 12],
      cornerRadius: 4,
      fill: { $var: "color/background" },
    },
  });
  const tab1Text = await createText(fc, tab1Frame.id, "Tab1", "Overview", {
    fontSize: 14,
    fontStyle: "Medium",
    fill: { $var: "color/foreground" },
  });
  const tab2Frame = await fc.createNode({
    type: "frame",
    name: "TabInactive",
    parent: tabsComp.id,
    width: 110,
    height: 32,
    props: {
      layout: "horizontal",
      sizingH: "hug",
      sizingV: "fill",
      mainAlign: "center",
      crossAlign: "center",
      padding: [0, 12, 0, 12],
      cornerRadius: 4,
      fill: "none",
    },
  });
  const tab2Text = await createText(fc, tab2Frame.id, "Tab2", "Analytics", {
    fontSize: 14,
    fontStyle: "Medium",
    fill: { $var: "color/muted-foreground" },
  });
  await fc.cmd("component.addProperty", {
    id: tabsComp.id,
    name: "tab1",
    type: "text",
    default: "Overview",
  });
  await fc.cmd("component.bindProperty", {
    layer: tab1Text.id,
    property: "tab1",
    field: "characters",
  });
  await fc.cmd("component.addProperty", {
    id: tabsComp.id,
    name: "tab2",
    type: "text",
    default: "Analytics",
  });
  await fc.cmd("component.bindProperty", {
    layer: tab2Text.id,
    property: "tab2",
    field: "characters",
  });

  // 11. Progress Component Set
  const progSpecs = [
    { name: "color=primary, size=md", fill: "color/primary", h: 12 },
    { name: "color=success, size=md", fill: "color/success", h: 12 },
    { name: "color=info, size=md", fill: "color/info", h: 12 },
    { name: "color=warning, size=md", fill: "color/warning", h: 12 },
    { name: "color=destructive, size=md", fill: "color/destructive", h: 12 },
  ];
  const progIds = [];
  for (const pr of progSpecs) {
    const c = await fc.createNode({
      type: "component",
      name: pr.name,
      width: 220,
      height: pr.h,
      props: {
        layout: "horizontal",
        cornerRadius: 999,
        fill: { $var: "color/default-200" },
        clip: true,
      },
    });
    await fc.createNode({
      type: "rectangle",
      name: "Indicator",
      parent: c.id,
      width: 140,
      height: pr.h,
      props: { fill: { $var: pr.fill }, cornerRadius: 999 },
    });
    progIds.push(c.id);
  }
  const progressSetId = await combineAndLabel(fc, progIds, "Progress", 760, 930);

  // 12. Select Component
  const selectComp = await fc.createNode({
    type: "component",
    name: "Select",
    x: 40,
    y: 1010,
    width: 240,
    height: 40,
    props: {
      layout: "horizontal",
      mainAlign: "spaceBetween",
      crossAlign: "center",
      padding: [8, 12, 8, 12],
      cornerRadius: 8,
      fill: { $var: "color/background" },
      stroke: { $var: "color/default-300" },
      strokeWeight: 1,
    },
  });
  const selectText = await createText(fc, selectComp.id, "Placeholder", "Select option", {
    fontSize: 14,
    fill: { $var: "color/muted-foreground" },
  });
  await createText(fc, selectComp.id, "Chevron", "▾", {
    fontSize: 12,
    fill: { $var: "color/default-600" },
  });
  await fc.cmd("component.addProperty", {
    id: selectComp.id,
    name: "placeholder",
    type: "text",
    default: "Select option",
  });
  await fc.cmd("component.bindProperty", {
    layer: selectText.id,
    property: "placeholder",
    field: "characters",
  });

  return {
    buttonSetId,
    badgeSetId,
    inputSetId,
    textareaSetId,
    alertSetId,
    cardCompId: cardComp.id,
    avatarCompId: avatarComp.id,
    cbSetId,
    swSetId,
    tabsCompId: tabsComp.id,
    progressSetId,
    selectCompId: selectComp.id,
  };
}

function buildSmoothAreaPaths(values, width, height, minVal = 60, maxVal = 90) {
  const stepX = width / (values.length - 1);
  const pts = values.map((v, i) => ({
    x: i * stepX,
    y: height - ((v - minVal) / (maxVal - minVal)) * height,
  }));

  let stroke = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i += 1) {
    const p0 = pts[i];
    const p1 = pts[i + 1];
    const cx = ((p0.x + p1.x) / 2).toFixed(1);
    stroke += ` C ${cx} ${p0.y.toFixed(1)}, ${cx} ${p1.y.toFixed(1)}, ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
  }
  const area = `${stroke} L ${width.toFixed(1)} ${height.toFixed(1)} L 0 ${height.toFixed(1)} Z`;
  return { stroke, area };
}

async function createDonutChart(fc, parent, segments, totalText) {
  const chartBox = await fc.createNode({
    type: "frame",
    name: "DonutChart",
    parent,
    width: 148,
    height: 148,
    props: { fill: "none", clip: false },
  });

  let startAngle = -90;
  for (let i = 0; i < segments.length; i += 1) {
    const seg = segments[i];
    await fc.createNode({
      type: "ellipse",
      name: seg.label,
      parent: chartBox.id,
      x: 0,
      y: 0,
      width: 148,
      height: 148,
      props: {
        arcStart: startAngle,
        arcSweep: seg.sweep,
        arcInner: 0.66,
        fill: seg.fill,
      },
    });
    startAngle += seg.sweep;
  }

  const center = await fc.createNode({
    type: "frame",
    name: "CenterLabel",
    parent: chartBox.id,
    x: 24,
    y: 50,
    width: 100,
    height: 48,
    props: {
      layout: "vertical",
      mainAlign: "center",
      crossAlign: "center",
      gap: 2,
      fill: "none",
    },
  });
  await createText(fc, center.id, "TotalLabel", "Total", {
    fontSize: 13,
    fontStyle: "Medium",
    fill: { $var: "color/muted-foreground" },
  });
  await createText(fc, center.id, "TotalValue", totalText, {
    fontSize: 16,
    fontStyle: "SemiBold",
    fill: { $var: "color/foreground" },
  });
}

async function createDashTailShell(
  fc,
  {
    name,
    x,
    y = 40,
    width = 1440,
    height = 940,
    mode = "Light",
    railActive = "Dashboard",
    sidebarTitle = "Dashboard",
    sidebarItems = [
      { label: "Analytics", icon: "◔", active: true },
      { label: "Ecommerce", icon: "◫", active: false },
      { label: "Project", icon: "▤", active: false },
    ],
  }
) {
  const thumbPath = path.join(ROOT, "public/images/all-img/thumbnail.png");
  const avatarPath = path.join(ROOT, "public/images/avatar/avatar-2.jpg");
  const hasThumb = fs.existsSync(thumbPath);
  const hasAvatar = fs.existsSync(avatarPath);

  const screen = await fc.createNode({
    type: "frame",
    name,
    x,
    y,
    width,
    height,
    props: {
      layout: "horizontal",
      fill: { $var: "color/page-bg" },
      devStatus: "readyForDev",
    },
  });
  await fc.cmd("variable.setMode", {
    ids: [screen.id],
    collection: "Theme",
    mode,
  });

  // 1. Module Icon Rail (72px)
  const rail = await fc.createNode({
    type: "frame",
    name: "ModuleRail",
    parent: screen.id,
    width: 72,
    height,
    props: {
      layout: "vertical",
      sizingH: "fixed",
      sizingV: "fill",
      mainAlign: "spaceBetween",
      crossAlign: "center",
      padding: [16, 0, 20, 0],
      fill: { $var: "color/card" },
      stroke: { $var: "color/border" },
      strokeRightWeight: 1,
    },
  });

  const railTop = await fc.createNode({
    type: "frame",
    name: "RailTop",
    parent: rail.id,
    width: 72,
    height: 540,
    props: {
      layout: "vertical",
      sizingH: "fill",
      sizingV: "hug",
      crossAlign: "center",
      gap: 14,
      fill: "none",
    },
  });

  const logoBox = await fc.createNode({
    type: "frame",
    name: "SiteLogo",
    parent: railTop.id,
    width: 32,
    height: 32,
    props: { fill: "none", clip: true },
  });
  const logoPaths = [
    "M0 18.3826C0 16.8785 1.19391 15.6592 2.66667 15.6592H18V17.7017C18 19.2058 16.8061 20.4251 15.3333 20.4251H0V18.3826Z",
    "M9.33329 32.0001C7.86056 32.0001 6.66663 30.7807 6.66663 29.2767V21.1064H8.66663C10.1394 21.1064 11.3333 22.3258 11.3333 23.8298V32.0001H9.33329Z",
    "M0 0H18.6667C26.0305 0 32 6.09655 32 13.617H0V0Z",
    "M16 31.9996C18.1011 31.9996 20.1817 31.5769 22.1229 30.7558C24.0641 29.9346 25.828 28.731 27.3137 27.2136C28.7995 25.6963 29.978 23.8949 30.7821 21.9124C31.5861 19.9299 32 17.805 32 15.6592H22.8411C22.8411 16.5767 22.6641 17.4852 22.3203 18.3329C21.9765 19.1805 21.4727 19.9507 20.8374 20.5995C20.2021 21.2483 19.448 21.7629 18.618 22.114C17.788 22.4651 16.8984 22.6458 16 22.6458V31.9996Z",
  ];
  for (const d of logoPaths) {
    await fc.createNode({
      type: "vector",
      name: "LogoShape",
      parent: logoBox.id,
      path: d,
      props: { fill: { $var: "color/primary" } },
    });
  }

  const railIcons = [
    { name: "Dashboard", sym: "◫" },
    { name: "Application", sym: "◷" },
    { name: "Users", sym: "◎" },
    { name: "Pages", sym: "▤" },
    { name: "Docs", sym: "▥" },
    { name: "Components", sym: "⊞" },
    { name: "Charts", sym: "◔" },
    { name: "Analytics", sym: "▂" },
    { name: "Maps", sym: "▣" },
  ];
  for (const item of railIcons) {
    const isActive = item.name === railActive;
    const btn = await fc.createNode({
      type: "frame",
      name: `RailIcon/${item.name}`,
      parent: railTop.id,
      width: 44,
      height: 44,
      props: {
        layout: "horizontal",
        mainAlign: "center",
        crossAlign: "center",
        cornerRadius: 8,
        fill: isActive ? { $var: "color/primary-soft" } : "none",
      },
    });
    await createText(fc, btn.id, "Glyph", item.sym, {
      fontSize: 16,
      fill: isActive
        ? { $var: "color/primary" }
        : { $var: "color/default-500" },
    });
  }

  const railBottom = await fc.createNode({
    type: "frame",
    name: "RailBottom",
    parent: rail.id,
    width: 72,
    height: 88,
    props: {
      layout: "vertical",
      sizingH: "fill",
      sizingV: "hug",
      crossAlign: "center",
      gap: 16,
      fill: "none",
    },
  });
  await createText(fc, railBottom.id, "SettingsIcon", "⚙", {
    fontSize: 18,
    fill: { $var: "color/default-500" },
  });
  const nBadge = await fc.createNode({
    type: "frame",
    name: "RailBadge",
    parent: railBottom.id,
    width: 34,
    height: 34,
    props: {
      layout: "horizontal",
      mainAlign: "center",
      crossAlign: "center",
      cornerRadius: 999,
      fill: "#0F172A",
    },
  });
  await createText(fc, nBadge.id, "N", "N", {
    fontSize: 14,
    fontStyle: "SemiBold",
    fill: "#FFFFFF",
  });

  // 2. Module Sub-Sidebar Panel (228px)
  const subSidebar = await fc.createNode({
    type: "frame",
    name: "ModuleSidebar",
    parent: screen.id,
    width: 228,
    height,
    props: {
      layout: "vertical",
      sizingH: "fixed",
      sizingV: "fill",
      mainAlign: "spaceBetween",
      fill: { $var: "color/card" },
      stroke: { $var: "color/border" },
      strokeRightWeight: 1,
    },
  });

  const subTop = await fc.createNode({
    type: "frame",
    name: "SidebarMenu",
    parent: subSidebar.id,
    width: 228,
    height: 240,
    props: {
      layout: "vertical",
      sizingH: "fill",
      sizingV: "hug",
      gap: 8,
      padding: [18, 14, 14, 14],
      fill: "none",
    },
  });
  await createText(fc, subTop.id, "SectionTitle", sidebarTitle, {
    fontSize: 18,
    fontStyle: "SemiBold",
    fill: { $var: "color/default-700" },
  });

  for (const lnk of sidebarItems) {
    const row = await fc.createNode({
      type: "frame",
      name: `Nav/${lnk.label}`,
      parent: subTop.id,
      width: 200,
      height: 40,
      props: {
        layout: "horizontal",
        sizingH: "fill",
        crossAlign: "center",
        gap: 10,
        padding: [8, 12, 8, 12],
        cornerRadius: 6,
        fill: lnk.active ? { $var: "color/primary" } : "none",
      },
    });
    await createText(fc, row.id, "Icon", lnk.icon, {
      fontSize: 14,
      fill: lnk.active
        ? { $var: "color/primary-foreground" }
        : { $var: "color/default-600" },
    });
    await createText(fc, row.id, "Label", lnk.label, {
      fontSize: 14,
      fontStyle: "Medium",
      fill: lnk.active
        ? { $var: "color/primary-foreground" }
        : { $var: "color/default-600" },
    });
  }

  const subBottom = await fc.createNode({
    type: "frame",
    name: "SidebarBottom",
    parent: subSidebar.id,
    width: 228,
    height: 360,
    props: {
      layout: "vertical",
      sizingH: "fill",
      sizingV: "hug",
      gap: 10,
      padding: [0, 12, 14, 12],
      fill: "none",
    },
  });

  const addBlock = await fc.createNode({
    type: "frame",
    name: "AddBlock",
    parent: subBottom.id,
    width: 204,
    height: 260,
    props: {
      layout: "vertical",
      sizingH: "fill",
      sizingV: "hug",
      gap: 10,
      padding: 16,
      cornerRadius: 6,
      fill: { $var: "color/primary" },
    },
  });
  await createText(fc, addBlock.id, "Title", "Storage capacity", {
    fontSize: 15,
    fontStyle: "SemiBold",
    fill: { $var: "color/primary-foreground" },
  });
  await createText(
    fc,
    addBlock.id,
    "Desc",
    "Out of your total storage on Premium Plan, you have used up 40%.",
    {
      fontSize: 12,
      fill: { $var: "color/primary-foreground" },
      props: { width: 172 },
    }
  );
  const thumbWrap = await fc.createNode({
    type: "frame",
    name: "Thumbnail",
    parent: addBlock.id,
    width: 172,
    height: 98,
    props: { cornerRadius: 4, clip: true, fill: "#312E81" },
  });
  if (hasThumb) {
    await fc.cmd("image.place", {
      path: thumbPath,
      parent: thumbWrap.id,
      x: 0,
      y: 0,
      width: 172,
      height: 98,
      mode: "fill",
    });
  }
  await createText(fc, addBlock.id, "Upgrade", "Upgrade Now  →", {
    fontSize: 13,
    fontStyle: "SemiBold",
    fill: { $var: "color/primary-foreground" },
  });

  const logoutRow = await fc.createNode({
    type: "frame",
    name: "LogoutFooter",
    parent: subBottom.id,
    width: 204,
    height: 48,
    props: {
      layout: "horizontal",
      sizingH: "fill",
      sizingV: "hug",
      mainAlign: "spaceBetween",
      crossAlign: "center",
      padding: [8, 6, 4, 6],
      fill: "none",
    },
  });
  const logoutInfo = await fc.createNode({
    type: "frame",
    name: "AccountInfo",
    parent: logoutRow.id,
    width: 160,
    height: 36,
    props: { layout: "vertical", sizingH: "hug", sizingV: "hug", gap: 2, fill: "none" },
  });
  await createText(fc, logoutInfo.id, "Brand", "Dashtail", {
    fontSize: 13,
    fontStyle: "SemiBold",
    fill: { $var: "color/default-700" },
  });
  await createText(fc, logoutInfo.id, "Email", "dashtail@codeshaper.net", {
    fontSize: 11,
    fill: { $var: "color/default-400" },
  });
  await createText(fc, logoutRow.id, "LogoutIcon", "↪", {
    fontSize: 16,
    fill: { $var: "color/default-500" },
  });

  // 3. Right Content Area
  const rightCol = await fc.createNode({
    type: "frame",
    name: "ContentColumn",
    parent: screen.id,
    width: width - 300,
    height,
    props: {
      layout: "vertical",
      sizingH: "fill",
      sizingV: "fill",
      fill: "none",
    },
  });

  const header = await fc.createNode({
    type: "frame",
    name: "Header",
    parent: rightCol.id,
    width: width - 300,
    height: 60,
    props: {
      layout: "horizontal",
      sizingH: "fill",
      sizingV: "fixed",
      mainAlign: "spaceBetween",
      crossAlign: "center",
      padding: [12, 24, 12, 24],
      fill: { $var: "color/card" },
      stroke: { $var: "color/border" },
      strokeBottomWeight: 1,
    },
  });
  const headerLeft = await fc.createNode({
    type: "frame",
    name: "HeaderLeft",
    parent: header.id,
    width: 240,
    height: 32,
    props: {
      layout: "horizontal",
      sizingH: "hug",
      sizingV: "hug",
      crossAlign: "center",
      gap: 14,
      fill: "none",
    },
  });
  await createText(fc, headerLeft.id, "MenuToggle", "☰", {
    fontSize: 16,
    fill: { $var: "color/default-600" },
  });
  await createText(fc, headerLeft.id, "SearchTrigger", "🔍  Search...", {
    fontSize: 14,
    fill: { $var: "color/default-400" },
  });

  const navTools = await fc.createNode({
    type: "frame",
    name: "NavTools",
    parent: header.id,
    width: 280,
    height: 36,
    props: {
      layout: "horizontal",
      sizingH: "hug",
      sizingV: "hug",
      crossAlign: "center",
      gap: 14,
      fill: "none",
    },
  });
  const langChip = await fc.createNode({
    type: "frame",
    name: "Language",
    parent: navTools.id,
    width: 56,
    height: 28,
    props: {
      layout: "horizontal",
      sizingH: "hug",
      crossAlign: "center",
      gap: 6,
      fill: "none",
    },
  });
  await fc.createNode({
    type: "ellipse",
    name: "Flag",
    parent: langChip.id,
    width: 20,
    height: 20,
    props: { fill: "#2563EB", stroke: "#EF4444", strokeWeight: 2 },
  });
  await createText(fc, langChip.id, "LangCode", "En", {
    fontSize: 13,
    fontStyle: "Medium",
    fill: { $var: "color/default-600" },
  });
  await createText(fc, navTools.id, "Fullscreen", "⛶", {
    fontSize: 15,
    fill: { $var: "color/default-500" },
  });
  await createText(fc, navTools.id, "ThemeToggle", mode === "Dark" ? "☾" : "☀", {
    fontSize: 15,
    fill: { $var: "color/default-500" },
  });
  await createText(fc, navTools.id, "Inbox", "✉", {
    fontSize: 15,
    fill: { $var: "color/default-500" },
  });
  await createText(fc, navTools.id, "Bell", "🔔", {
    fontSize: 15,
    fill: { $var: "color/default-500" },
  });
  const headerAvatar = await fc.createNode({
    type: "frame",
    name: "ProfileAvatar",
    parent: navTools.id,
    width: 34,
    height: 34,
    props: { cornerRadius: 999, clip: true, fill: { $var: "color/primary-soft" } },
  });
  if (hasAvatar) {
    await fc.cmd("image.place", {
      path: avatarPath,
      parent: headerAvatar.id,
      x: 0,
      y: 0,
      width: 34,
      height: 34,
      mode: "fill",
    });
  }

  const body = await fc.createNode({
    type: "frame",
    name: "PageBody",
    parent: rightCol.id,
    width: width - 300,
    height: height - 60,
    props: {
      layout: "vertical",
      sizingH: "fill",
      sizingV: "fill",
      gap: 20,
      padding: 24,
      fill: "none",
    },
  });

  return { screen, body };
}

async function buildPreviewPage(fc, comps) {
  const page = await fc.cmd("page.add", { name: "Preview" });
  await fc.cmd("page.select", { id: page.id });
  await fc.cmd("page.setBackground", { color: "#E2E8F0" });

  const createDashboardScreen = async (x, mode) => {
    const { body } = await createDashTailShell(fc, {
      name: `Analytics Dashboard / ${mode}`,
      x,
      y: 40,
      width: 1440,
      height: 940,
      mode,
    });

    // Page Title Row
    const titleRow = await fc.createNode({
      type: "frame",
      name: "PageHeader",
      parent: body.id,
      width: 1092,
      height: 40,
      props: {
        layout: "horizontal",
        sizingH: "fill",
        sizingV: "hug",
        mainAlign: "spaceBetween",
        crossAlign: "center",
        fill: "none",
      },
    });
    await createText(fc, titleRow.id, "Heading", "Analytics Dashboard", {
      fontSize: 22,
      fontStyle: "Medium",
      fill: { $var: "color/default-800" },
    });
    const dateBtn = await fc.createNode({
      type: "frame",
      name: "DatePickerWithRange",
      parent: titleRow.id,
      width: 132,
      height: 36,
      props: {
        layout: "horizontal",
        sizingH: "hug",
        mainAlign: "center",
        crossAlign: "center",
        gap: 8,
        padding: [8, 14, 8, 14],
        cornerRadius: 6,
        fill: { $var: "color/card" },
        stroke: { $var: "color/border" },
        strokeWeight: 1,
      },
    });
    await createText(fc, dateBtn.id, "CalendarIcon", "📅", {
      fontSize: 12,
      fill: { $var: "color/default-600" },
    });
    await createText(fc, dateBtn.id, "DateLabel", "Pick a date", {
      fontSize: 13,
      fontStyle: "Medium",
      fill: { $var: "color/default-700" },
    });

    // ROW 1: Reports Snapshot (8 cols) + UsersStat (4 cols)
    const row1 = await fc.createNode({
      type: "frame",
      name: "Row1",
      parent: body.id,
      width: 1092,
      height: 430,
      props: {
        layout: "horizontal",
        sizingH: "fill",
        sizingV: "hug",
        gap: 20,
        fill: "none",
      },
    });

    // ReportsSnapshot Card (716px)
    const snapCard = await fc.createNode({
      type: "frame",
      name: "ReportsSnapshot",
      parent: row1.id,
      width: 716,
      height: 430,
      props: {
        layout: "vertical",
        sizingH: "fill",
        sizingV: "hug",
        gap: 18,
        padding: 20,
        cornerRadius: 8,
        fill: { $var: "color/card" },
        stroke: { $var: "color/border" },
        strokeWeight: 1,
      },
    });
    const snapHeader = await fc.createNode({
      type: "frame",
      name: "SnapshotHeader",
      parent: snapCard.id,
      width: 676,
      height: 44,
      props: {
        layout: "horizontal",
        sizingH: "fill",
        sizingV: "hug",
        mainAlign: "spaceBetween",
        crossAlign: "center",
        fill: "none",
      },
    });
    const snapTitles = await fc.createNode({
      type: "frame",
      name: "TitleGroup",
      parent: snapHeader.id,
      width: 300,
      height: 44,
      props: {
        layout: "vertical",
        sizingH: "hug",
        sizingV: "hug",
        gap: 4,
        fill: "none",
      },
    });
    await createText(fc, snapTitles.id, "Title", "Reports Snapshot", {
      fontSize: 18,
      fontStyle: "SemiBold",
      fill: { $var: "color/default-900" },
    });
    await createText(
      fc,
      snapTitles.id,
      "Subtitle",
      "Demographic properties of your customer",
      { fontSize: 12, fill: { $var: "color/default-600" } }
    );
    const selectInst = await fc.cmd("instance.create", {
      component: comps.selectCompId,
      parent: snapHeader.id,
    });
    await fc.cmd("instance.setProperties", {
      ids: [selectInst.id],
      properties: { placeholder: "Select Date" },
    });
    await fc.setProps(selectInst.id, { width: 128, height: 34 });

    // 4 Snapshot KPI Tabs
    const snapTabs = await fc.createNode({
      type: "frame",
      name: "SnapshotTabs",
      parent: snapCard.id,
      width: 676,
      height: 78,
      props: {
        layout: "horizontal",
        sizingH: "fill",
        sizingV: "hug",
        gap: 16,
        fill: "none",
      },
    });
    const kpiTabItems = [
      { label: "All User", val: "10,234", bg: "color/primary-soft", fg: "color/primary", active: true },
      { label: "Event Count", val: "536", bg: "color/warning-soft", fg: "color/warning", active: false },
      { label: "Conversations", val: "21", bg: "color/success-soft", fg: "color/success", active: false },
      { label: "New User", val: "3321", bg: "color/info-soft", fg: "color/info", active: false },
    ];
    for (const kt of kpiTabItems) {
      const box = await fc.createNode({
        type: "frame",
        name: `Tab/${kt.label}`,
        parent: snapTabs.id,
        width: 156,
        height: 78,
        props: {
          sizingH: "fill",
          sizingV: "fixed",
          cornerRadius: 6,
          clip: true,
          fill: { $var: kt.bg },
        },
      });
      await fc.createNode({
        type: "ellipse",
        name: "OrbOuter",
        parent: box.id,
        x: 124,
        y: -14,
        width: 46,
        height: 46,
        props: { fill: { $var: kt.fg }, opacity: 0.2 },
      });
      await fc.createNode({
        type: "ellipse",
        name: "OrbInner",
        parent: box.id,
        x: 132,
        y: -8,
        width: 30,
        height: 30,
        props: { fill: { $var: kt.fg }, opacity: 0.35 },
      });
      await fc.createNode({
        type: "text",
        name: "Label",
        parent: box.id,
        x: 14,
        y: 16,
        text: kt.label,
        props: {
          fontFamily: "Inter",
          fontStyle: "SemiBold",
          fontSize: 13,
          fill: { $var: "color/default-800" },
        },
      });
      await fc.createNode({
        type: "text",
        name: "Value",
        parent: box.id,
        x: 14,
        y: 40,
        text: kt.val,
        props: {
          fontFamily: "Inter",
          fontStyle: "SemiBold",
          fontSize: 17,
          fill: { $var: kt.fg },
        },
      });
      if (kt.active) {
        await fc.createNode({
          type: "rectangle",
          name: "ActiveUnderline",
          parent: box.id,
          x: 58,
          y: 72,
          width: 40,
          height: 2,
          props: { fill: { $var: "color/primary" }, cornerRadius: 2 },
        });
      }
    }

    // Smooth Area Chart Canvas
    const areaWrap = await fc.createNode({
      type: "frame",
      name: "ReportsChart",
      parent: snapCard.id,
      width: 676,
      height: 224,
      props: { sizingH: "fill", sizingV: "fixed", fill: "none" },
    });
    const yTicks = [90, 85, 80, 75, 70, 65, 60];
    for (let i = 0; i < yTicks.length; i += 1) {
      const yy = 8 + i * 31;
      await fc.createNode({
        type: "text",
        name: `Y-${yTicks[i]}`,
        parent: areaWrap.id,
        x: 4,
        y: yy - 6,
        text: String(yTicks[i]),
        props: { fontFamily: "Inter", fontSize: 11, fill: { $var: "color/muted-foreground" } },
      });
      await fc.createNode({
        type: "rectangle",
        name: `Grid-${i}`,
        parent: areaWrap.id,
        x: 34,
        y: yy,
        width: 634,
        height: 1,
        props: { fill: { $var: "color/border" } },
      });
    }
    const { stroke: areaStrokePath, area: areaFillPath } = buildSmoothAreaPaths(
      [90, 70, 85, 60, 80, 70, 90, 75, 60, 80],
      634,
      186,
      60,
      90
    );
    await fc.createNode({
      type: "vector",
      name: "AreaFill",
      parent: areaWrap.id,
      x: 34,
      y: 8,
      path: areaFillPath,
      props: {
        fills: [
          {
            type: "linearGradient",
            from: [0.5, 0],
            to: [0.5, 1],
            stops: [
              { position: 0, color: "#846CF966" },
              { position: 1, color: "#846CF905" },
            ],
          },
        ],
      },
    });
    await fc.createNode({
      type: "vector",
      name: "AreaStroke",
      parent: areaWrap.id,
      x: 34,
      y: 8,
      path: areaStrokePath,
      props: {
        fill: "none",
        stroke: { $var: "color/primary" },
        strokeWeight: 2.5,
      },
    });
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct"];
    for (let i = 0; i < months.length; i += 1) {
      await fc.createNode({
        type: "text",
        name: `X-${months[i]}`,
        parent: areaWrap.id,
        x: 30 + i * 68,
        y: 204,
        text: months[i],
        props: { fontFamily: "Inter", fontSize: 11, fill: { $var: "color/muted-foreground" } },
      });
    }

    // UsersStat Card (356px)
    const usersCard = await fc.createNode({
      type: "frame",
      name: "UsersStat",
      parent: row1.id,
      width: 356,
      height: 430,
      props: {
        layout: "vertical",
        sizingH: "fixed",
        sizingV: "fill",
        gap: 12,
        padding: 20,
        cornerRadius: 8,
        fill: { $var: "color/card" },
        stroke: { $var: "color/border" },
        strokeWeight: 1,
      },
    });
    const usersHead = await fc.createNode({
      type: "frame",
      name: "UsersHeader",
      parent: usersCard.id,
      width: 316,
      height: 48,
      props: {
        layout: "horizontal",
        sizingH: "fill",
        sizingV: "hug",
        mainAlign: "spaceBetween",
        crossAlign: "center",
        fill: "none",
      },
    });
    const usersTitle = await fc.createNode({
      type: "frame",
      name: "Titles",
      parent: usersHead.id,
      width: 150,
      height: 44,
      props: { layout: "vertical", sizingH: "hug", sizingV: "hug", gap: 4, fill: "none" },
    });
    await createText(fc, usersTitle.id, "Title", "Users", {
      fontSize: 18,
      fontStyle: "SemiBold",
      fill: { $var: "color/default-900" },
    });
    await createText(fc, usersTitle.id, "Sub", "In Last 30 Minutes", {
      fontSize: 12,
      fill: { $var: "color/default-600" },
    });
    const usersCount = await fc.createNode({
      type: "frame",
      name: "LiveCount",
      parent: usersHead.id,
      width: 80,
      height: 44,
      props: {
        layout: "horizontal",
        sizingH: "hug",
        crossAlign: "center",
        gap: 4,
        fill: "none",
      },
    });
    await createText(fc, usersCount.id, "Count", "63", {
      fontSize: 34,
      fontStyle: "SemiBold",
      fill: { $var: "color/primary" },
    });
    await createText(fc, usersCount.id, "Trend", "↗", {
      fontSize: 20,
      fontStyle: "Bold",
      fill: { $var: "color/success" },
    });

    await createText(fc, usersCard.id, "ChartLabel", "User Per Minutes", {
      fontSize: 12,
      fontStyle: "Medium",
      fill: { $var: "color/default-800" },
    });

    // Bar Chart (8 bars)
    const barChart = await fc.createNode({
      type: "frame",
      name: "UsersDataChart",
      parent: usersCard.id,
      width: 316,
      height: 112,
      props: { sizingH: "fill", sizingV: "fixed", fill: "none" },
    });
    for (let g = 0; g < 4; g += 1) {
      await fc.createNode({
        type: "rectangle",
        name: `BarGrid-${g}`,
        parent: barChart.id,
        x: 0,
        y: 12 + g * 30,
        width: 316,
        height: 1,
        props: { fill: { $var: "color/border" } },
      });
    }
    const barVals = [400, 60, 448, 50, 540, 580, 690, 800];
    for (let i = 0; i < barVals.length; i += 1) {
      const bh = Math.max(8, Math.round((barVals[i] / 800) * 102));
      await fc.createNode({
        type: "rectangle",
        name: `Bar-${i}`,
        parent: barChart.id,
        x: i * 40,
        y: 108 - bh,
        width: 36,
        height: bh,
        props: { fill: { $var: "color/primary" } },
      });
    }

    // Top Countries Table
    const countriesBox = await fc.createNode({
      type: "frame",
      name: "UsersDataTable",
      parent: usersCard.id,
      width: 316,
      height: 170,
      props: {
        layout: "vertical",
        sizingH: "fill",
        sizingV: "hug",
        cornerRadius: 6,
        stroke: { $var: "color/border" },
        strokeWeight: 1,
        fill: "none",
      },
    });
    const tblHead = await fc.createNode({
      type: "frame",
      name: "TableHeader",
      parent: countriesBox.id,
      width: 316,
      height: 32,
      props: {
        layout: "horizontal",
        sizingH: "fill",
        mainAlign: "spaceBetween",
        crossAlign: "center",
        padding: [6, 12, 6, 12],
        stroke: { $var: "color/border" },
        strokeBottomWeight: 1,
        fill: "none",
      },
    });
    await createText(fc, tblHead.id, "Col1", "Top Countries", {
      fontSize: 12,
      fontStyle: "SemiBold",
      fill: { $var: "color/default-800" },
    });
    await createText(fc, tblHead.id, "Col2", "Users", {
      fontSize: 12,
      fontStyle: "SemiBold",
      fill: { $var: "color/default-800" },
    });
    const countryRows = [
      ["Bangladesh", "05"],
      ["India", "06"],
      ["Pakistan", "06"],
      ["Australia", "10"],
      ["America", "08"],
    ];
    for (let r = 0; r < countryRows.length; r += 1) {
      const [cName, cVal] = countryRows[r];
      const tr = await fc.createNode({
        type: "frame",
        name: `Row/${cName}`,
        parent: countriesBox.id,
        width: 316,
        height: 28,
        props: {
          layout: "horizontal",
          sizingH: "fill",
          mainAlign: "spaceBetween",
          crossAlign: "center",
          padding: [4, 12, 4, 12],
          fill: "none",
          ...(r < countryRows.length - 1
            ? { stroke: { $var: "color/border" }, strokeBottomWeight: 1 }
            : {}),
        },
      });
      await createText(fc, tr.id, "Country", cName, {
        fontSize: 12,
        fill: { $var: "color/default-600" },
      });
      await createText(fc, tr.id, "Users", cVal, {
        fontSize: 12,
        fill: { $var: "color/default-600" },
      });
    }

    // ROW 2: 2x2 ReportsArea + New vs Returning Visitors + Device Breakdown
    const row2 = await fc.createNode({
      type: "frame",
      name: "Row2",
      parent: body.id,
      width: 1092,
      height: 310,
      props: {
        layout: "horizontal",
        sizingH: "fill",
        sizingV: "hug",
        gap: 20,
        fill: "none",
      },
    });

    // Col 1: 2x2 ReportsArea
    const areaGrid = await fc.createNode({
      type: "frame",
      name: "ReportsArea",
      parent: row2.id,
      width: 350,
      height: 304,
      props: {
        layout: "horizontal",
        wrap: true,
        gap: 14,
        crossGap: 14,
        sizingH: "fixed",
        sizingV: "hug",
        fill: "none",
      },
    });
    const miniStats = [
      { name: "Sessions", count: "6,132", rate: "150%", up: true, color: "color/primary", soft: "color/primary-soft", icon: "◔" },
      { name: "Page Views", count: "11,236", rate: "202", up: false, color: "color/info", soft: "color/info-soft", icon: "◉" },
      { name: "Avg. Duration", count: "46s", rate: "22%", up: true, color: "color/warning", soft: "color/warning-soft", icon: "↗" },
      { name: "Bounce Rate", count: "46s", rate: "30", up: false, color: "color/destructive", soft: "color/destructive-soft", icon: "⚑" },
    ];
    for (const ms of miniStats) {
      const mCard = await fc.createNode({
        type: "frame",
        name: `KPI/${ms.name}`,
        parent: areaGrid.id,
        width: 168,
        height: 145,
        props: {
          layout: "vertical",
          sizingH: "fixed",
          sizingV: "fixed",
          mainAlign: "spaceBetween",
          padding: 16,
          cornerRadius: 8,
          fill: { $var: "color/card" },
          stroke: { $var: "color/border" },
          strokeWeight: 1,
        },
      });
      const mTop = await fc.createNode({
        type: "frame",
        name: "Top",
        parent: mCard.id,
        width: 136,
        height: 36,
        props: {
          layout: "horizontal",
          sizingH: "fill",
          mainAlign: "spaceBetween",
          crossAlign: "center",
          fill: "none",
        },
      });
      await createText(fc, mTop.id, "Name", ms.name, {
        fontSize: 13,
        fontStyle: "Medium",
        fill: { $var: "color/default-900" },
      });
      const iconCircle = await fc.createNode({
        type: "frame",
        name: "IconBadge",
        parent: mTop.id,
        width: 32,
        height: 32,
        props: {
          layout: "horizontal",
          mainAlign: "center",
          crossAlign: "center",
          cornerRadius: 999,
          fill: { $var: ms.soft },
        },
      });
      await createText(fc, iconCircle.id, "Sym", ms.icon, {
        fontSize: 13,
        fill: { $var: ms.color },
      });

      await createText(fc, mCard.id, "Value", ms.count, {
        fontSize: 22,
        fontStyle: "SemiBold",
        fill: { $var: "color/default-900" },
      });

      const trendCol = await fc.createNode({
        type: "frame",
        name: "Trend",
        parent: mCard.id,
        width: 136,
        height: 34,
        props: { layout: "vertical", sizingH: "fill", sizingV: "hug", gap: 2, fill: "none" },
      });
      await createText(
        fc,
        trendCol.id,
        "Rate",
        `${ms.rate} ${ms.up ? "↗" : "↘"}`,
        {
          fontSize: 13,
          fontStyle: "SemiBold",
          fill: { $var: ms.up ? "color/success" : "color/destructive" },
        }
      );
      await createText(fc, trendCol.id, "Sub", "vs Previous 30 Days", {
        fontSize: 11,
        fill: { $var: "color/default-600" },
      });
    }

    // Col 2: New vs Returning Visitors
    const visitorsCard = await fc.createNode({
      type: "frame",
      name: "NewVsReturningVisitors",
      parent: row2.id,
      width: 351,
      height: 304,
      props: {
        layout: "vertical",
        sizingH: "fill",
        sizingV: "fill",
        mainAlign: "spaceBetween",
        crossAlign: "center",
        padding: 20,
        cornerRadius: 8,
        fill: { $var: "color/card" },
        stroke: { $var: "color/border" },
        strokeWeight: 1,
      },
    });
    const vTitleWrap = await fc.createNode({
      type: "frame",
      name: "Header",
      parent: visitorsCard.id,
      width: 311,
      height: 24,
      props: { layout: "horizontal", sizingH: "fill", fill: "none" },
    });
    await createText(fc, vTitleWrap.id, "Title", "New vs Returning Visitors", {
      fontSize: 17,
      fontStyle: "SemiBold",
      fill: { $var: "color/default-900" },
    });
    await createDonutChart(
      fc,
      visitorsCard.id,
      [
        { label: "Old User", sweep: 166, fill: { $var: "color/primary" } },
        { label: "New User", sweep: 194, fill: { $var: "color/info" } },
      ],
      "2600"
    );
    const vLegend = await fc.createNode({
      type: "frame",
      name: "Legend",
      parent: visitorsCard.id,
      width: 240,
      height: 20,
      props: {
        layout: "horizontal",
        mainAlign: "center",
        crossAlign: "center",
        gap: 18,
        fill: "none",
      },
    });
    for (const lg of [
      { label: "Old User", fill: { $var: "color/primary" } },
      { label: "New User", fill: { $var: "color/info" } },
    ]) {
      const li = await fc.createNode({
        type: "frame",
        name: lg.label,
        parent: vLegend.id,
        width: 90,
        height: 18,
        props: { layout: "horizontal", sizingH: "hug", crossAlign: "center", gap: 6, fill: "none" },
      });
      await fc.createNode({
        type: "ellipse",
        name: "Dot",
        parent: li.id,
        width: 10,
        height: 10,
        props: { fill: lg.fill },
      });
      await createText(fc, li.id, "Label", lg.label, {
        fontSize: 12,
        fill: { $var: "color/default-600" },
      });
    }

    // Col 3: Device Breakdown
    const deviceCard = await fc.createNode({
      type: "frame",
      name: "DeviceBreakdown",
      parent: row2.id,
      width: 351,
      height: 304,
      props: {
        layout: "vertical",
        sizingH: "fill",
        sizingV: "fill",
        mainAlign: "spaceBetween",
        crossAlign: "center",
        padding: 20,
        cornerRadius: 8,
        fill: { $var: "color/card" },
        stroke: { $var: "color/border" },
        strokeWeight: 1,
      },
    });
    const dTitleWrap = await fc.createNode({
      type: "frame",
      name: "Header",
      parent: deviceCard.id,
      width: 311,
      height: 24,
      props: { layout: "horizontal", sizingH: "fill", fill: "none" },
    });
    await createText(fc, dTitleWrap.id, "Title", "Device Breakdown", {
      fontSize: 17,
      fontStyle: "SemiBold",
      fill: { $var: "color/default-900" },
    });
    await createDonutChart(
      fc,
      deviceCard.id,
      [
        { label: "Desktop", sweep: 176, fill: { $var: "color/primary" } },
        { label: "Tablet", sweep: 64, fill: "#FF9E69" },
        { label: "Mobile", sweep: 120, fill: "#FFD1A7" },
      ],
      "4500"
    );
    const dLegend = await fc.createNode({
      type: "frame",
      name: "Legend",
      parent: deviceCard.id,
      width: 280,
      height: 20,
      props: {
        layout: "horizontal",
        mainAlign: "center",
        crossAlign: "center",
        gap: 14,
        fill: "none",
      },
    });
    for (const lg of [
      { label: "Desktop", fill: { $var: "color/primary" } },
      { label: "Tablet", fill: "#FF9E69" },
      { label: "Mobile", fill: "#FFD1A7" },
    ]) {
      const li = await fc.createNode({
        type: "frame",
        name: lg.label,
        parent: dLegend.id,
        width: 80,
        height: 18,
        props: { layout: "horizontal", sizingH: "hug", crossAlign: "center", gap: 6, fill: "none" },
      });
      await fc.createNode({
        type: "ellipse",
        name: "Dot",
        parent: li.id,
        width: 10,
        height: 10,
        props: { fill: lg.fill },
      });
      await createText(fc, li.id, "Label", lg.label, {
        fontSize: 12,
        fill: { $var: "color/default-600" },
      });
    }
  };

  await createDashboardScreen(40, "Light");
  await createDashboardScreen(1540, "Dark");
}

async function buildApiKeyPage(fc, comps) {
  const page = await fc.cmd("page.add", { name: "API Key" });
  await fc.cmd("page.select", { id: page.id });
  await fc.cmd("page.setBackground", { color: "#E2E8F0" });

  const rows = [
    {
      name: "Web Client API Key",
      keyMask: "web_live_************5182",
      status: "Active",
      statusColor: "success",
      created: "11 Feb, 2025",
      lastUsed: "Today, 09:30 AM",
      enabled: "true",
    },
    {
      name: "Development API key",
      keyMask: "dev_live_************9471",
      status: "Active",
      statusColor: "success",
      created: "19 Dec, 2024",
      lastUsed: "Today, 01:30 AM",
      enabled: "true",
    },
    {
      name: "Production API Key",
      keyMask: "pro_live_************3845",
      status: "Disabled",
      statusColor: "destructive",
      created: "23 Mar, 2024",
      lastUsed: "Today, 06:30 PM",
      enabled: "false",
    },
  ];

  const createApiKeyScreen = async (x, mode) => {
    const { body } = await createDashTailShell(fc, {
      name: `API Key / ${mode}`,
      x,
      y: 40,
      width: 1440,
      height: 760,
      mode,
      railActive: "Users",
      sidebarTitle: "Settings",
      sidebarItems: [
        { label: "Profile", icon: "◎", active: false },
        { label: "API Key", icon: "⚿", active: true },
        { label: "Billing", icon: "▤", active: false },
      ],
    });

    // Main Card Container (reusing Card styling & existing component instances inside)
    const card = await fc.createNode({
      type: "frame",
      name: "ApiKeysCard",
      parent: body.id,
      width: 1092,
      height: 440,
      props: {
        layout: "vertical",
        sizingH: "fill",
        sizingV: "hug",
        cornerRadius: 12,
        fill: { $var: "color/card" },
        stroke: { $var: "color/border" },
        strokeWeight: 1,
        effects: [
          {
            type: "dropShadow",
            color: "#0F16240D",
            offset: [0, 1],
            radius: 4,
          },
        ],
      },
    });

    // Card Header
    const cardHeader = await fc.createNode({
      type: "frame",
      name: "CardHeader",
      parent: card.id,
      width: 1092,
      height: 84,
      props: {
        layout: "horizontal",
        sizingH: "fill",
        sizingV: "hug",
        mainAlign: "spaceBetween",
        crossAlign: "center",
        padding: [20, 24, 20, 24],
        fill: "none",
      },
    });
    await fc.createNode({
      type: "rectangle",
      name: "HeaderDivider",
      parent: card.id,
      width: 1092,
      height: 1,
      props: { sizingH: "fill", fill: { $var: "color/border" } },
    });
    const headerTitles = await fc.createNode({
      type: "frame",
      name: "Titles",
      parent: cardHeader.id,
      width: 460,
      height: 44,
      props: {
        layout: "vertical",
        sizingH: "hug",
        sizingV: "hug",
        gap: 4,
        fill: "none",
      },
    });
    await createText(fc, headerTitles.id, "Title", "API Keys", {
      fontSize: 18,
      fontStyle: "SemiBold",
      fill: { $var: "color/default-900" },
    });
    await createText(
      fc,
      headerTitles.id,
      "Subtitle",
      "API keys are used to authentication requests to the dashtail API",
      {
        fontSize: 13,
        fill: { $var: "color/muted-foreground" },
      }
    );

    const genBtn = await fc.cmd("instance.create", {
      component: comps.buttonSetId,
      parent: cardHeader.id,
    });
    await fc.cmd("instance.setProperties", {
      ids: [genBtn.id],
      properties: {
        color: "dark",
        variant: "solid",
        size: "default",
        label: "⊕  Generate API key",
      },
    });

    // Table Area
    const tableWrap = await fc.createNode({
      type: "frame",
      name: "ApiKeyTable",
      parent: card.id,
      width: 1092,
      height: 330,
      props: {
        layout: "vertical",
        sizingH: "fill",
        sizingV: "hug",
        padding: [4, 24, 12, 24],
        fill: "none",
      },
    });

    const cols = [
      { label: "Name", width: 396 },
      { label: "Status", width: 112 },
      { label: "Created", width: 138 },
      { label: "Last used", width: 168 },
      { label: "Disable/Enable", width: 140 },
      { label: "Action", width: 90 },
    ];

    const thead = await fc.createNode({
      type: "frame",
      name: "TableHeader",
      parent: tableWrap.id,
      width: 1044,
      height: 48,
      props: {
        layout: "horizontal",
        sizingH: "fill",
        sizingV: "fixed",
        crossAlign: "center",
        fill: "none",
      },
    });
    for (const col of cols) {
      const cell = await fc.createNode({
        type: "frame",
        name: `Head/${col.label}`,
        parent: thead.id,
        width: col.width,
        height: 48,
        props: {
          layout: "horizontal",
          sizingH: col.label === "Name" ? "fill" : "fixed",
          sizingV: "fill",
          mainAlign: col.label === "Action" ? "center" : "min",
          crossAlign: "center",
          fill: "none",
        },
      });
      await createText(fc, cell.id, "Label", col.label, {
        fontSize: 13,
        fontStyle: "SemiBold",
        fill: { $var: "color/default-800" },
      });
    }
    await fc.createNode({
      type: "rectangle",
      name: "TableHeaderDivider",
      parent: tableWrap.id,
      width: 1044,
      height: 1,
      props: { sizingH: "fill", fill: { $var: "color/border" } },
    });

    for (let i = 0; i < rows.length; i += 1) {
      const r = rows[i];
      const tr = await fc.createNode({
        type: "frame",
        name: `Row/${r.name}`,
        parent: tableWrap.id,
        width: 1044,
        height: 94,
        props: {
          layout: "horizontal",
          sizingH: "fill",
          sizingV: "hug",
          crossAlign: "center",
          padding: [16, 0, 16, 0],
          fill: "none",
        },
      });

      // Col 1: Name + Key Input + Copy Button + Refresh Button
      const nameCol = await fc.createNode({
        type: "frame",
        name: "Cell/Name",
        parent: tr.id,
        width: 396,
        height: 62,
        props: {
          layout: "vertical",
          sizingH: "fill",
          sizingV: "hug",
          gap: 8,
          fill: "none",
        },
      });
      await createText(fc, nameCol.id, "KeyName", r.name, {
        fontSize: 14,
        fontStyle: "SemiBold",
        fill: { $var: "color/default-900" },
      });

      const keyControls = await fc.createNode({
        type: "frame",
        name: "KeyControls",
        parent: nameCol.id,
        width: 320,
        height: 36,
        props: {
          layout: "horizontal",
          sizingH: "hug",
          sizingV: "hug",
          crossAlign: "center",
          gap: 8,
          fill: "none",
        },
      });

      const keyGroup = await fc.createNode({
        type: "frame",
        name: "KeyCopyGroup",
        parent: keyControls.id,
        width: 266,
        height: 36,
        props: {
          layout: "horizontal",
          sizingH: "hug",
          sizingV: "fixed",
          crossAlign: "center",
          fill: "none",
        },
      });
      const keyInput = await fc.cmd("instance.create", {
        component: comps.inputSetId,
        parent: keyGroup.id,
      });
      await fc.cmd("instance.setProperties", {
        ids: [keyInput.id],
        properties: {
          variant: "bordered",
          color: "default",
          size: "md",
          placeholder: r.keyMask,
        },
      });
      await fc.setProps(keyInput.id, {
        width: 196,
        height: 36,
        cornerRadius: [6, 0, 0, 6],
      });

      const copyBtn = await fc.cmd("instance.create", {
        component: comps.buttonSetId,
        parent: keyGroup.id,
      });
      await fc.cmd("instance.setProperties", {
        ids: [copyBtn.id],
        properties: {
          color: "secondary",
          variant: "outline",
          size: "sm",
          label: "❐  Copy",
        },
      });
      await fc.setProps(copyBtn.id, {
        height: 36,
        cornerRadius: [0, 6, 6, 0],
      });

      const refreshBtn = await fc.cmd("instance.create", {
        component: comps.buttonSetId,
        parent: keyControls.id,
      });
      await fc.cmd("instance.setProperties", {
        ids: [refreshBtn.id],
        properties: {
          color: "secondary",
          variant: "solid",
          size: "icon",
        },
      });

      // Col 2: Status Badge
      const statusCol = await fc.createNode({
        type: "frame",
        name: "Cell/Status",
        parent: tr.id,
        width: 112,
        height: 62,
        props: {
          layout: "horizontal",
          sizingH: "fixed",
          sizingV: "fill",
          crossAlign: "center",
          fill: "none",
        },
      });
      const statusBadge = await fc.cmd("instance.create", {
        component: comps.badgeSetId,
        parent: statusCol.id,
      });
      await fc.cmd("instance.setProperties", {
        ids: [statusBadge.id],
        properties: {
          color: r.statusColor,
          variant: "soft",
          label: r.status,
        },
      });

      // Col 3: Created
      const createdCol = await fc.createNode({
        type: "frame",
        name: "Cell/Created",
        parent: tr.id,
        width: 138,
        height: 62,
        props: {
          layout: "horizontal",
          sizingH: "fixed",
          sizingV: "fill",
          crossAlign: "center",
          fill: "none",
        },
      });
      await createText(fc, createdCol.id, "CreatedAt", r.created, {
        fontSize: 13,
        fill: { $var: "color/default-600" },
      });

      // Col 4: Last used
      const lastUsedCol = await fc.createNode({
        type: "frame",
        name: "Cell/LastUsed",
        parent: tr.id,
        width: 168,
        height: 62,
        props: {
          layout: "horizontal",
          sizingH: "fixed",
          sizingV: "fill",
          crossAlign: "center",
          fill: "none",
        },
      });
      await createText(fc, lastUsedCol.id, "LastUsed", r.lastUsed, {
        fontSize: 13,
        fill: { $var: "color/default-600" },
      });

      // Col 5: Disable/Enable Switch
      const switchCol = await fc.createNode({
        type: "frame",
        name: "Cell/Switch",
        parent: tr.id,
        width: 140,
        height: 62,
        props: {
          layout: "horizontal",
          sizingH: "fixed",
          sizingV: "fill",
          crossAlign: "center",
          fill: "none",
        },
      });
      const swInst = await fc.cmd("instance.create", {
        component: comps.swSetId,
        parent: switchCol.id,
      });
      await fc.cmd("instance.setProperties", {
        ids: [swInst.id],
        properties: {
          checked: r.enabled,
          color: "dark",
        },
      });

      // Col 6: Action Delete Button
      const actionCol = await fc.createNode({
        type: "frame",
        name: "Cell/Action",
        parent: tr.id,
        width: 90,
        height: 62,
        props: {
          layout: "horizontal",
          sizingH: "fixed",
          sizingV: "fill",
          mainAlign: "center",
          crossAlign: "center",
          fill: "none",
        },
      });
      const delBtn = await fc.cmd("instance.create", {
        component: comps.buttonSetId,
        parent: actionCol.id,
      });
      await fc.cmd("instance.setProperties", {
        ids: [delBtn.id],
        properties: {
          color: "destructive",
          variant: "soft",
          size: "icon",
        },
      });

      if (i < rows.length - 1) {
        await fc.createNode({
          type: "rectangle",
          name: `RowDivider-${i}`,
          parent: tableWrap.id,
          width: 1044,
          height: 1,
          props: { sizingH: "fill", fill: { $var: "color/border" } },
        });
      }
    }
  };

  await createApiKeyScreen(40, "Light");
  await createApiKeyScreen(1540, "Dark");
}

async function buildOnboardingPage(fc) {
  const page = await fc.cmd("page.add", { name: "Onboarding" });
  await fc.cmd("page.select", { id: page.id });
  await fc.cmd("page.setBackground", { color: "#E2E8F0" });

  const options = [
    {
      title: "Client Workspace",
      desc: "Manage client projects, files, and communication in one place.",
      badgeFill: "color/info-soft",
      iconStroke: "color/info",
      iconPath:
        "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M22 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75",
    },
    {
      title: "Internal Operations",
      desc: "Streamline team workflows, tasks, and internal processes.",
      badgeFill: "color/destructive-soft",
      iconStroke: "color/destructive",
      iconPath:
        "M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18 M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2 M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2 M10 6h4 M10 10h4 M10 14h4 M10 18h4",
    },
    {
      title: "Research & Planning",
      desc: "Collect ideas, insights, and plan your next big move.",
      badgeFill: "color/warning-soft",
      iconStroke: "color/warning",
      iconPath:
        "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16 M21 21l-4.35-4.35",
    },
  ];

  const createOnboardingScreen = async (x, mode) => {
    const screen = await fc.createNode({
      type: "frame",
      name: `Onboarding / ${mode}`,
      x,
      y: 40,
      width: 1440,
      height: 820,
      props: {
        layout: "vertical",
        mainAlign: "center",
        crossAlign: "center",
        fill: { $var: "color/background" },
        devStatus: "readyForDev",
      },
    });
    await fc.cmd("variable.setMode", {
      ids: [screen.id],
      collection: "Theme",
      mode,
    });

    const card = await fc.createNode({
      type: "frame",
      name: "OnboardingCard",
      parent: screen.id,
      width: 580,
      height: 460,
      props: {
        layout: "vertical",
        sizingH: "fixed",
        sizingV: "hug",
        crossAlign: "center",
        gap: 24,
        padding: [36, 36, 32, 36],
        cornerRadius: 12,
        fill: { $var: "color/card" },
        stroke: { $var: "color/border" },
        strokeWeight: 1,
        effects: [
          {
            type: "dropShadow",
            color: "#0F16240D",
            offset: [0, 2],
            radius: 8,
          },
        ],
      },
    });

    const header = await fc.createNode({
      type: "frame",
      name: "Header",
      parent: card.id,
      width: 468,
      height: 54,
      props: {
        layout: "vertical",
        sizingH: "fill",
        sizingV: "hug",
        crossAlign: "center",
        gap: 8,
        fill: "none",
      },
    });
    await createText(fc, header.id, "Title", "Create your first project", {
      fontSize: 22,
      fontStyle: "Bold",
      fill: { $var: "color/default-900" },
    });
    await createText(
      fc,
      header.id,
      "Subtitle",
      "Pick a starting point or create your project from scratch.",
      {
        fontSize: 13,
        fill: { $var: "color/muted-foreground" },
      }
    );

    const list = await fc.createNode({
      type: "frame",
      name: "WorkspaceOptions",
      parent: card.id,
      width: 468,
      height: 256,
      props: {
        layout: "vertical",
        sizingH: "fill",
        sizingV: "hug",
        gap: 12,
        fill: "none",
      },
    });

    for (const opt of options) {
      const item = await fc.createNode({
        type: "frame",
        name: `Option/${opt.title}`,
        parent: list.id,
        width: 468,
        height: 76,
        props: {
          layout: "horizontal",
          sizingH: "fill",
          sizingV: "hug",
          mainAlign: "spaceBetween",
          crossAlign: "center",
          gap: 14,
          padding: [16, 18, 16, 18],
          cornerRadius: 10,
          fill: { $var: "color/card" },
          stroke: { $var: "color/border" },
          strokeWeight: 1,
        },
      });

      const left = await fc.createNode({
        type: "frame",
        name: "Left",
        parent: item.id,
        width: 390,
        height: 44,
        props: {
          layout: "horizontal",
          sizingH: "fill",
          sizingV: "hug",
          crossAlign: "center",
          gap: 14,
          fill: "none",
        },
      });

      const badge = await fc.createNode({
        type: "frame",
        name: "IconBadge",
        parent: left.id,
        width: 40,
        height: 40,
        props: {
          layout: "horizontal",
          sizingH: "fixed",
          sizingV: "fixed",
          mainAlign: "center",
          crossAlign: "center",
          cornerRadius: 999,
          fill: { $var: opt.badgeFill },
        },
      });
      await fc.createNode({
        type: "vector",
        name: "Icon",
        parent: badge.id,
        width: 18,
        height: 18,
        path: opt.iconPath,
        props: {
          fill: "none",
          stroke: { $var: opt.iconStroke },
          strokeWeight: 1.8,
          strokeCap: "round",
          strokeJoin: "round",
        },
      });

      const textCol = await fc.createNode({
        type: "frame",
        name: "Copy",
        parent: left.id,
        width: 330,
        height: 38,
        props: {
          layout: "vertical",
          sizingH: "fill",
          sizingV: "hug",
          gap: 4,
          fill: "none",
        },
      });
      await createText(fc, textCol.id, "OptionTitle", opt.title, {
        fontSize: 14,
        fontStyle: "SemiBold",
        fill: { $var: "color/default-900" },
      });
      await createText(fc, textCol.id, "OptionDesc", opt.desc, {
        fontSize: 12,
        fill: { $var: "color/muted-foreground" },
        props: { sizingH: "fill", textAutoResize: "height" },
      });

      const arrowCircle = await fc.createNode({
        type: "frame",
        name: "ArrowCircle",
        parent: item.id,
        width: 28,
        height: 28,
        props: {
          layout: "horizontal",
          sizingH: "fixed",
          sizingV: "fixed",
          mainAlign: "center",
          crossAlign: "center",
          cornerRadius: 999,
          fill: { $var: "color/background" },
          stroke: { $var: "color/border" },
          strokeWeight: 1,
        },
      });
      await fc.createNode({
        type: "vector",
        name: "ChevronRight",
        parent: arrowCircle.id,
        width: 10,
        height: 10,
        path: "M9 6l6 6-6 6",
        props: {
          fill: "none",
          stroke: { $var: "color/default-600" },
          strokeWeight: 1.8,
          strokeCap: "round",
          strokeJoin: "round",
        },
      });
    }

    const footerLink = await fc.createNode({
      type: "frame",
      name: "BlankProjectLink",
      parent: card.id,
      width: 220,
      height: 20,
      props: {
        layout: "horizontal",
        sizingH: "hug",
        sizingV: "hug",
        mainAlign: "center",
        crossAlign: "center",
        gap: 6,
        fill: "none",
      },
    });
    await createText(
      fc,
      footerLink.id,
      "Label",
      "or start with a blank project",
      {
        fontSize: 13,
        fontStyle: "Medium",
        fill: { $var: "color/default-700" },
      }
    );
    await fc.createNode({
      type: "vector",
      name: "ArrowUpRight",
      parent: footerLink.id,
      width: 11,
      height: 11,
      path: "M7 17L17 7 M7 7h10v10",
      props: {
        fill: "none",
        stroke: { $var: "color/default-600" },
        strokeWeight: 1.8,
        strokeCap: "round",
        strokeJoin: "round",
      },
    });
  };

  await createOnboardingScreen(40, "Light");
  await createOnboardingScreen(1540, "Dark");
}

async function buildIntegrationsPage(fc, comps) {
  const page = await fc.cmd("page.add", { name: "Integrations" });
  await fc.cmd("page.select", { id: page.id });
  await fc.cmd("page.setBackground", { color: "#E2E8F0" });

  const apps = [
    {
      name: "Gmail",
      desc: "Integrate Gmail to send, receive, and manage emails directly from your workspace.",
      enabled: "false",
      badgeBg: "#FEF2F2",
      glyph: "M",
      glyphColor: "#EA4335",
      highlightMenu: false,
    },
    {
      name: "Google Meet",
      desc: "Connect your Google Meet account for seamless video conferencing.",
      enabled: "false",
      badgeBg: "#ECFDF5",
      glyph: "▶",
      glyphColor: "#059669",
      highlightMenu: false,
    },
    {
      name: "Linear",
      desc: "Integrate Linear to manage issues, track progress, and streamline your team's.",
      enabled: "false",
      badgeBg: "#4F46E5",
      glyph: "◒",
      glyphColor: "#FFFFFF",
      highlightMenu: false,
    },
    {
      name: "Loom",
      desc: "Integrate Loom to easily record, share, and manage video messages.",
      enabled: "false",
      badgeBg: "#EEF2FF",
      glyph: "✺",
      glyphColor: "#625DF5",
      highlightMenu: true,
    },
    {
      name: "Zoom",
      desc: "Integrate Zoom to streamline your virtual meetings and team collaborations.",
      enabled: "true",
      badgeBg: "#2563EB",
      glyph: "▣",
      glyphColor: "#FFFFFF",
      highlightMenu: false,
    },
    {
      name: "Mailchimp",
      desc: "Connect Mailchimp to streamline your email marketing—automate campaigns.",
      enabled: "true",
      badgeBg: "#F3F4F6",
      glyph: "🐵",
      glyphColor: "#111827",
      highlightMenu: false,
    },
    {
      name: "Notion",
      desc: "Capture, organize, and tackle your to-dos from anywhere.",
      enabled: "false",
      badgeBg: "#FFFFFF",
      glyph: "N",
      glyphColor: "#111827",
      badgeStroke: "#E5E7EB",
      highlightMenu: false,
    },
    {
      name: "Trello",
      desc: "Capture, organize, and tackle your to-dos from anywhere.",
      enabled: "false",
      badgeBg: "#0284C7",
      glyph: "▥",
      glyphColor: "#FFFFFF",
      highlightMenu: false,
    },
    {
      name: "Jira",
      desc: "Track issues and manage projects with ease and full team visibility.",
      enabled: "false",
      badgeBg: "#EFF6FF",
      glyph: "◆",
      glyphColor: "#2563EB",
      highlightMenu: false,
    },
  ];

  const createIntegrationsScreen = async (x, mode) => {
    const { body } = await createDashTailShell(fc, {
      name: `Integrations / ${mode}`,
      x,
      y: 40,
      width: 1440,
      height: 890,
      mode,
      railActive: "Application",
      sidebarTitle: "Workspace",
      sidebarItems: [
        { label: "Integrations", icon: "⊞", active: true },
        { label: "Contacts", icon: "◎", active: false },
        { label: "Notes", icon: "▤", active: false },
      ],
    });

    const card = await fc.createNode({
      type: "frame",
      name: "IntegrationsCard",
      parent: body.id,
      width: 1092,
      height: 750,
      props: {
        layout: "vertical",
        sizingH: "fill",
        sizingV: "hug",
        cornerRadius: 12,
        fill: { $var: "color/card" },
        stroke: { $var: "color/border" },
        strokeWeight: 1,
      },
    });

    const cardHeader = await fc.createNode({
      type: "frame",
      name: "CardHeader",
      parent: card.id,
      width: 1092,
      height: 76,
      props: {
        layout: "horizontal",
        sizingH: "fill",
        sizingV: "hug",
        mainAlign: "spaceBetween",
        crossAlign: "center",
        padding: [18, 24, 18, 24],
        fill: "none",
      },
    });
    await createText(fc, cardHeader.id, "Title", "Integrations", {
      fontSize: 18,
      fontStyle: "SemiBold",
      fill: { $var: "color/default-900" },
    });
    const addBtn = await fc.cmd("instance.create", {
      component: comps.buttonSetId,
      parent: cardHeader.id,
    });
    await fc.cmd("instance.setProperties", {
      ids: [addBtn.id],
      properties: {
        color: "dark",
        variant: "solid",
        size: "default",
        label: "⊕  Add New Integration",
      },
    });

    await fc.createNode({
      type: "rectangle",
      name: "HeaderDivider",
      parent: card.id,
      width: 1092,
      height: 1,
      props: { sizingH: "fill", fill: { $var: "color/border" } },
    });

    const grid = await fc.createNode({
      type: "frame",
      name: "IntegrationsGrid",
      parent: card.id,
      width: 1092,
      height: 660,
      props: {
        layout: "horizontal",
        wrap: true,
        gap: 18,
        crossGap: 18,
        padding: 24,
        sizingH: "fill",
        sizingV: "hug",
        fill: "none",
      },
    });

    for (const app of apps) {
      const appCard = await fc.createNode({
        type: "frame",
        name: `Integration/${app.name}`,
        parent: grid.id,
        width: 332,
        height: 200,
        props: {
          layout: "vertical",
          sizingH: "fixed",
          sizingV: "fixed",
          mainAlign: "spaceBetween",
          cornerRadius: 10,
          fill: { $var: "color/card" },
          stroke: { $var: "color/border" },
          strokeWeight: 1,
        },
      });

      const appTop = await fc.createNode({
        type: "frame",
        name: "Body",
        parent: appCard.id,
        width: 336,
        height: 138,
        props: {
          layout: "vertical",
          sizingH: "fill",
          sizingV: "hug",
          gap: 10,
          padding: [18, 18, 14, 18],
          fill: "none",
        },
      });

      const iconRow = await fc.createNode({
        type: "frame",
        name: "IconRow",
        parent: appTop.id,
        width: 300,
        height: 34,
        props: {
          layout: "horizontal",
          sizingH: "fill",
          mainAlign: "spaceBetween",
          crossAlign: "center",
          fill: "none",
        },
      });
      const logoBadge = await fc.createNode({
        type: "frame",
        name: "AppLogo",
        parent: iconRow.id,
        width: 34,
        height: 34,
        props: {
          layout: "horizontal",
          mainAlign: "center",
          crossAlign: "center",
          cornerRadius: 8,
          fill: app.badgeBg,
          ...(app.badgeStroke
            ? { stroke: app.badgeStroke, strokeWeight: 1 }
            : {}),
        },
      });
      await createText(fc, logoBadge.id, "Glyph", app.glyph, {
        fontSize: 16,
        fontStyle: "Bold",
        fill: app.glyphColor,
      });

      const dotsWrap = await fc.createNode({
        type: "frame",
        name: "MoreMenu",
        parent: iconRow.id,
        width: 28,
        height: 28,
        props: {
          layout: "horizontal",
          mainAlign: "center",
          crossAlign: "center",
          cornerRadius: 999,
          fill: app.highlightMenu ? { $var: "color/muted" } : "none",
        },
      });
      await createText(fc, dotsWrap.id, "Dots", "•••", {
        fontSize: 12,
        fill: { $var: "color/default-500" },
      });

      await createText(fc, appTop.id, "AppName", app.name, {
        fontSize: 15,
        fontStyle: "SemiBold",
        fill: { $var: "color/default-900" },
      });
      await createText(fc, appTop.id, "AppDesc", app.desc, {
        fontSize: 12,
        fill: { $var: "color/muted-foreground" },
        props: { sizingH: "fill", textAutoResize: "height", lineHeight: 17 },
      });

      await fc.createNode({
        type: "rectangle",
        name: "CardDivider",
        parent: appCard.id,
        width: 332,
        height: 1,
        props: { sizingH: "fill", fill: { $var: "color/border" } },
      });

      const appFoot = await fc.createNode({
        type: "frame",
        name: "Footer",
        parent: appCard.id,
        width: 332,
        height: 54,
        props: {
          layout: "horizontal",
          sizingH: "fill",
          sizingV: "hug",
          mainAlign: "spaceBetween",
          crossAlign: "center",
          padding: [10, 18, 10, 18],
          fill: "none",
        },
      });

      const footLeft = await fc.createNode({
        type: "frame",
        name: "Actions",
        parent: appFoot.id,
        width: 140,
        height: 36,
        props: {
          layout: "horizontal",
          sizingH: "hug",
          crossAlign: "center",
          gap: 8,
          fill: "none",
        },
      });
      const gearBtn = await fc.cmd("instance.create", {
        component: comps.buttonSetId,
        parent: footLeft.id,
      });
      await fc.cmd("instance.setProperties", {
        ids: [gearBtn.id],
        properties: {
          color: "secondary",
          variant: "outline",
          size: "icon",
        },
      });

      const detailsBtn = await fc.cmd("instance.create", {
        component: comps.buttonSetId,
        parent: footLeft.id,
      });
      await fc.cmd("instance.setProperties", {
        ids: [detailsBtn.id],
        properties: {
          color: "secondary",
          variant: "outline",
          size: "sm",
          label: "Details",
        },
      });

      const sw = await fc.cmd("instance.create", {
        component: comps.swSetId,
        parent: appFoot.id,
      });
      await fc.cmd("instance.setProperties", {
        ids: [sw.id],
        properties: {
          checked: app.enabled,
          color: "dark",
        },
      });
    }
  };

  await createIntegrationsScreen(40, "Light");
  await createIntegrationsScreen(1540, "Dark");
}

async function buildContactsPage(fc, comps) {
  const page = await fc.cmd("page.add", { name: "Contacts" });
  await fc.cmd("page.select", { id: page.id });
  await fc.cmd("page.setBackground", { color: "#E2E8F0" });

  const contacts = [
    { name: "Georgeanna Ramero", dept: "Sales", starred: true, avatar: "avatar-1.jpg", active: true },
    { name: "Cami Macha", dept: "Support", starred: false, avatar: "avatar-2.jpg" },
    { name: "Alda Ziemer", dept: "Engineering", starred: false, avatar: "avatar-3.jpg" },
    { name: "Luciano Macpherson", dept: "Support", starred: true, avatar: "avatar-4.jpg" },
    { name: "Dalton Paden", dept: "Engineering", starred: false, avatar: "avatar-5.jpg" },
    { name: "Juan Granado", dept: "Support", starred: false, avatar: "avatar-6.jpg" },
    { name: "Revan Allen", dept: "Support", starred: false, avatar: "avatar-7.jpg" },
    { name: "Juley Huseman", dept: "Sales", starred: true, avatar: "avatar-8.jpg" },
    { name: "Bridgette Phung", dept: "Engineering", starred: true, avatar: "avatar-9.jpg" },
    { name: "Ernest Cousins", dept: "Support", starred: false, avatar: "avatar-10.jpg" },
    { name: "Nicolette Trapani", dept: "Engineering", starred: false, avatar: "avatar-11.jpg" },
  ];

  const createContactsScreen = async (x, mode) => {
    const { body } = await createDashTailShell(fc, {
      name: `Contacts / ${mode}`,
      x,
      y: 40,
      width: 1440,
      height: 860,
      mode,
      railActive: "Application",
      sidebarTitle: "Workspace",
      sidebarItems: [
        { label: "Integrations", icon: "⊞", active: false },
        { label: "Contacts", icon: "◎", active: true },
        { label: "Notes", icon: "▤", active: false },
      ],
    });

    const shell = await fc.createNode({
      type: "frame",
      name: "ContactsWorkspace",
      parent: body.id,
      width: 1092,
      height: 752,
      props: {
        layout: "horizontal",
        sizingH: "fill",
        sizingV: "fill",
        cornerRadius: 12,
        clip: true,
        fill: { $var: "color/card" },
        stroke: { $var: "color/border" },
        strokeWeight: 1,
      },
    });

    // Left Filter Pane (200px)
    const leftPane = await fc.createNode({
      type: "frame",
      name: "FilterPane",
      parent: shell.id,
      width: 200,
      height: 752,
      props: {
        layout: "vertical",
        sizingH: "fixed",
        sizingV: "fill",
        gap: 14,
        padding: 16,
        fill: "none",
      },
    });
    const addContactBtn = await fc.cmd("instance.create", {
      component: comps.buttonSetId,
      parent: leftPane.id,
    });
    await fc.cmd("instance.setProperties", {
      ids: [addContactBtn.id],
      properties: {
        color: "dark",
        variant: "solid",
        size: "default",
        label: "Add New Contact",
      },
    });
    await fc.setProps(addContactBtn.id, { sizingH: "fill" });

    for (const f of [
      { label: "All", icon: "✉", active: true },
      { label: "Frequent", icon: "➤", active: false },
      { label: "Starred", icon: "☆", active: false },
    ]) {
      const fRow = await fc.createNode({
        type: "frame",
        name: `Filter/${f.label}`,
        parent: leftPane.id,
        width: 168,
        height: 36,
        props: {
          layout: "horizontal",
          sizingH: "fill",
          crossAlign: "center",
          gap: 10,
          padding: [8, 12, 8, 12],
          cornerRadius: 6,
          fill: f.active ? { $var: "color/muted" } : "none",
        },
      });
      await createText(fc, fRow.id, "Icon", f.icon, {
        fontSize: 13,
        fill: f.active ? { $var: "color/default-900" } : { $var: "color/default-500" },
      });
      await createText(fc, fRow.id, "Label", f.label, {
        fontSize: 13,
        fontStyle: f.active ? "SemiBold" : "Medium",
        fill: f.active ? { $var: "color/default-900" } : { $var: "color/default-600" },
      });
    }

    await fc.createNode({
      type: "rectangle",
      name: "FilterDivider",
      parent: leftPane.id,
      width: 168,
      height: 1,
      props: { sizingH: "fill", fill: { $var: "color/border" } },
    });

    await createText(fc, leftPane.id, "CategoriesLabel", "CATEGORIES", {
      fontSize: 11,
      fontStyle: "SemiBold",
      fill: { $var: "color/muted-foreground" },
    });
    for (const cat of [
      { label: "Engineering", icon: "📁" },
      { label: "Support", icon: "ⓘ" },
      { label: "Sales", icon: "▤" },
    ]) {
      const cRow = await fc.createNode({
        type: "frame",
        name: `Category/${cat.label}`,
        parent: leftPane.id,
        width: 168,
        height: 32,
        props: {
          layout: "horizontal",
          sizingH: "fill",
          crossAlign: "center",
          gap: 10,
          padding: [6, 10, 6, 10],
          fill: "none",
        },
      });
      await createText(fc, cRow.id, "Icon", cat.icon, {
        fontSize: 12,
        fill: { $var: "color/default-500" },
      });
      await createText(fc, cRow.id, "Label", cat.label, {
        fontSize: 13,
        fill: { $var: "color/default-600" },
      });
    }

    await fc.createNode({
      type: "rectangle",
      name: "LeftVerticalDivider",
      parent: shell.id,
      width: 1,
      height: 752,
      props: { sizingV: "fill", fill: { $var: "color/border" } },
    });

    // Middle Contact List Pane (300px)
    const listPane = await fc.createNode({
      type: "frame",
      name: "ContactListPane",
      parent: shell.id,
      width: 300,
      height: 752,
      props: {
        layout: "vertical",
        sizingH: "fixed",
        sizingV: "fill",
        fill: "none",
      },
    });
    const searchWrap = await fc.createNode({
      type: "frame",
      name: "SearchWrap",
      parent: listPane.id,
      width: 300,
      height: 60,
      props: {
        layout: "vertical",
        sizingH: "fill",
        sizingV: "hug",
        padding: 12,
        fill: "none",
      },
    });
    const searchInput = await fc.cmd("instance.create", {
      component: comps.inputSetId,
      parent: searchWrap.id,
    });
    await fc.cmd("instance.setProperties", {
      ids: [searchInput.id],
      properties: {
        variant: "bordered",
        color: "default",
        size: "md",
        placeholder: "🔍  Find top Contacts..",
      },
    });
    await fc.setProps(searchInput.id, { sizingH: "fill" });

    for (const c of contacts) {
      const row = await fc.createNode({
        type: "frame",
        name: `Contact/${c.name}`,
        parent: listPane.id,
        width: 300,
        height: 60,
        props: {
          layout: "horizontal",
          sizingH: "fill",
          sizingV: "fixed",
          mainAlign: "spaceBetween",
          crossAlign: "center",
          padding: [10, 14, 10, 14],
          fill: c.active ? { $var: "color/muted" } : "none",
        },
      });

      const leftInfo = await fc.createNode({
        type: "frame",
        name: "Person",
        parent: row.id,
        width: 210,
        height: 40,
        props: {
          layout: "horizontal",
          sizingH: "fill",
          crossAlign: "center",
          gap: 10,
          fill: "none",
        },
      });
      const avFrame = await fc.createNode({
        type: "frame",
        name: "Avatar",
        parent: leftInfo.id,
        width: 36,
        height: 36,
        props: {
          cornerRadius: 999,
          clip: true,
          fill: { $var: "color/primary-soft" },
        },
      });
      const avFile = path.join(ROOT, "public/images/avatar", c.avatar);
      if (fs.existsSync(avFile)) {
        await fc.cmd("image.place", {
          path: avFile,
          parent: avFrame.id,
          x: 0,
          y: 0,
          width: 36,
          height: 36,
          mode: "fill",
        });
      }
      const nameStack = await fc.createNode({
        type: "frame",
        name: "Meta",
        parent: leftInfo.id,
        width: 160,
        height: 34,
        props: { layout: "vertical", sizingH: "fill", sizingV: "hug", gap: 2, fill: "none" },
      });
      await createText(fc, nameStack.id, "Name", c.name, {
        fontSize: 13,
        fontStyle: "SemiBold",
        fill: { $var: "color/default-900" },
      });
      await createText(fc, nameStack.id, "Dept", c.dept, {
        fontSize: 11,
        fill: { $var: "color/muted-foreground" },
      });

      const rowIcons = await fc.createNode({
        type: "frame",
        name: "Actions",
        parent: row.id,
        width: 44,
        height: 20,
        props: { layout: "horizontal", sizingH: "hug", crossAlign: "center", gap: 10, fill: "none" },
      });
      await createText(fc, rowIcons.id, "Star", c.starred ? "★" : "☆", {
        fontSize: 14,
        fill: c.starred ? "#F59E0B" : { $var: "color/default-400" },
      });
      await fc.createNode({
        type: "vector",
        name: "Trash",
        parent: rowIcons.id,
        width: 12,
        height: 12,
        path: "M3 6h18 M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6 M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",
        props: {
          fill: "none",
          stroke: { $var: "color/default-500" },
          strokeWeight: 1.6,
          strokeCap: "round",
          strokeJoin: "round",
        },
      });
    }

    await fc.createNode({
      type: "rectangle",
      name: "MiddleVerticalDivider",
      parent: shell.id,
      width: 1,
      height: 752,
      props: { sizingV: "fill", fill: { $var: "color/border" } },
    });

    // Right Detail Pane
    const detailPane = await fc.createNode({
      type: "frame",
      name: "ContactDetailsPane",
      parent: shell.id,
      width: 590,
      height: 752,
      props: {
        layout: "vertical",
        sizingH: "fill",
        sizingV: "fill",
        fill: "none",
      },
    });

    const detailHead = await fc.createNode({
      type: "frame",
      name: "DetailsHeader",
      parent: detailPane.id,
      width: 590,
      height: 60,
      props: {
        layout: "horizontal",
        sizingH: "fill",
        sizingV: "fixed",
        mainAlign: "spaceBetween",
        crossAlign: "center",
        padding: [16, 24, 16, 24],
        fill: "none",
      },
    });
    await createText(fc, detailHead.id, "Title", "Contact Details", {
      fontSize: 16,
      fontStyle: "SemiBold",
      fill: { $var: "color/default-900" },
    });
    const headActions = await fc.createNode({
      type: "frame",
      name: "HeaderActions",
      parent: detailHead.id,
      width: 80,
      height: 24,
      props: { layout: "horizontal", sizingH: "hug", crossAlign: "center", gap: 14, fill: "none" },
    });
    await createText(fc, headActions.id, "Star", "★", {
      fontSize: 15,
      fill: "#F59E0B",
    });
    await createText(fc, headActions.id, "Edit", "✎", {
      fontSize: 14,
      fill: { $var: "color/default-600" },
    });
    await fc.createNode({
      type: "vector",
      name: "Delete",
      parent: headActions.id,
      width: 14,
      height: 14,
      path: "M3 6h18 M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6 M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",
      props: {
        fill: "none",
        stroke: { $var: "color/default-600" },
        strokeWeight: 1.6,
        strokeCap: "round",
        strokeJoin: "round",
      },
    });

    await fc.createNode({
      type: "rectangle",
      name: "DetailHeaderDivider",
      parent: detailPane.id,
      width: 590,
      height: 1,
      props: { sizingH: "fill", fill: { $var: "color/border" } },
    });

    const detailBody = await fc.createNode({
      type: "frame",
      name: "DetailsBody",
      parent: detailPane.id,
      width: 590,
      height: 460,
      props: {
        layout: "vertical",
        sizingH: "fill",
        sizingV: "hug",
        gap: 24,
        padding: 24,
        fill: "none",
      },
    });

    const profileRow = await fc.createNode({
      type: "frame",
      name: "ProfileHeader",
      parent: detailBody.id,
      width: 542,
      height: 64,
      props: { layout: "horizontal", sizingH: "fill", crossAlign: "center", gap: 16, fill: "none" },
    });
    const bigAvatar = await fc.createNode({
      type: "frame",
      name: "ProfileAvatar",
      parent: profileRow.id,
      width: 60,
      height: 60,
      props: { cornerRadius: 999, clip: true, fill: { $var: "color/primary-soft" } },
    });
    const bigAvFile = path.join(ROOT, "public/images/avatar/avatar-1.jpg");
    if (fs.existsSync(bigAvFile)) {
      await fc.cmd("image.place", {
        path: bigAvFile,
        parent: bigAvatar.id,
        x: 0,
        y: 0,
        width: 60,
        height: 60,
        mode: "fill",
      });
    }
    const profileMeta = await fc.createNode({
      type: "frame",
      name: "ProfileMeta",
      parent: profileRow.id,
      width: 240,
      height: 54,
      props: { layout: "vertical", sizingH: "hug", sizingV: "hug", gap: 3, fill: "none" },
    });
    await createText(fc, profileMeta.id, "Name", "Georgeanna Ramero", {
      fontSize: 16,
      fontStyle: "SemiBold",
      fill: { $var: "color/default-900" },
    });
    await createText(fc, profileMeta.id, "Dept", "Sales", {
      fontSize: 12,
      fill: { $var: "color/muted-foreground" },
    });
    await createText(fc, profileMeta.id, "Company", "Muller Inc", {
      fontSize: 12,
      fill: { $var: "color/muted-foreground" },
    });

    const createFieldRow = async (fields) => {
      const fRow = await fc.createNode({
        type: "frame",
        name: "FieldRow",
        parent: detailBody.id,
        width: 542,
        height: 40,
        props: { layout: "horizontal", sizingH: "fill", sizingV: "hug", gap: 24, fill: "none" },
      });
      for (const fld of fields) {
        const col = await fc.createNode({
          type: "frame",
          name: `Field/${fld.label}`,
          parent: fRow.id,
          width: 240,
          height: 38,
          props: { layout: "vertical", sizingH: "fill", sizingV: "hug", gap: 4, fill: "none" },
        });
        await createText(fc, col.id, "Label", fld.label, {
          fontSize: 12,
          fill: { $var: "color/muted-foreground" },
        });
        await createText(fc, col.id, "Value", fld.value, {
          fontSize: 13,
          fontStyle: "SemiBold",
          fill: { $var: "color/default-900" },
          props: { sizingH: "fill", textAutoResize: "height", lineHeight: 19 },
        });
      }
    };

    await createFieldRow([
      { label: "Phone Number", value: "456-485-5623" },
      { label: "Email address", value: "qq739v47ggn@claimab.com" },
    ]);
    await createFieldRow([
      { label: "Address", value: "19214 110th Rd, Saint Albans, NY, 1141" },
    ]);
    await createFieldRow([
      { label: "Department", value: "Sales" },
      { label: "Company", value: "Muller Inc" },
    ]);
    await createFieldRow([
      {
        label: "Notes",
        value:
          "Zac la bewaseipi kib pul fopigu div pic puwubew jeserbor wezuba tuc ne. Fi pujworot ezilawiz nujdol ge te enedeot reckoof lincutna viano pedepop zeje ni ipkiw zu.",
      },
    ]);

    await fc.createNode({
      type: "rectangle",
      name: "DetailFooterDivider",
      parent: detailPane.id,
      width: 590,
      height: 1,
      props: { sizingH: "fill", fill: { $var: "color/border" } },
    });

    const detailFooter = await fc.createNode({
      type: "frame",
      name: "DetailsFooter",
      parent: detailPane.id,
      width: 590,
      height: 76,
      props: {
        layout: "horizontal",
        sizingH: "fill",
        sizingV: "hug",
        crossAlign: "center",
        gap: 12,
        padding: [18, 24, 18, 24],
        fill: "none",
      },
    });
    const editBtn = await fc.cmd("instance.create", {
      component: comps.buttonSetId,
      parent: detailFooter.id,
    });
    await fc.cmd("instance.setProperties", {
      ids: [editBtn.id],
      properties: {
        color: "dark",
        variant: "solid",
        size: "default",
        label: "Edit",
      },
    });
    const deleteBtn = await fc.cmd("instance.create", {
      component: comps.buttonSetId,
      parent: detailFooter.id,
    });
    await fc.cmd("instance.setProperties", {
      ids: [deleteBtn.id],
      properties: {
        color: "destructive",
        variant: "soft",
        size: "default",
        label: "Delete",
      },
    });
  };

  await createContactsScreen(40, "Light");
  await createContactsScreen(1540, "Dark");
}

async function buildNotesPage(fc, comps) {
  const page = await fc.cmd("page.add", { name: "Notes" });
  await fc.cmd("page.select", { id: page.id });
  await fc.cmd("page.setBackground", { color: "#E2E8F0" });

  const notes = [
    {
      title: "Lorem ipsum dolor sit amet, c...",
      date: "6/4/2023",
      bg: "color/muted",
      fg: "color/default-900",
    },
    {
      title: "Sed ut perspiciatis unde omni...",
      date: "6/3/2023",
      bg: "color/destructive-soft",
      fg: "color/destructive",
    },
    {
      title: "consectetur, adipisci velit, se...",
      date: "6/2/2023",
      bg: "color/warning-soft",
      fg: "color/warning",
    },
    {
      title: "Lorem ipsum dolor sit amet, c...",
      date: "6/4/2023",
      bg: "color/info-soft",
      fg: "color/info",
    },
  ];

  const noteColors = [
    { name: "Amber", hex: "#F59E0B", selected: false },
    { name: "Charcoal", hex: "#18181B", selected: true },
    { name: "Red", hex: "#DC2626", selected: false },
    { name: "Teal", hex: "#0D9488", selected: false },
    { name: "Navy", hex: "#1E4E68", selected: false },
  ];

  const createNotesScreen = async (x, mode) => {
    const { body } = await createDashTailShell(fc, {
      name: `Notes / ${mode}`,
      x,
      y: 40,
      width: 1440,
      height: 740,
      mode,
      railActive: "Application",
      sidebarTitle: "Workspace",
      sidebarItems: [
        { label: "Integrations", icon: "⊞", active: false },
        { label: "Contacts", icon: "◎", active: false },
        { label: "Notes", icon: "▤", active: true },
      ],
    });

    const shell = await fc.createNode({
      type: "frame",
      name: "NotesWorkspace",
      parent: body.id,
      width: 1092,
      height: 620,
      props: {
        layout: "horizontal",
        sizingH: "fill",
        sizingV: "fill",
        cornerRadius: 12,
        clip: true,
        fill: { $var: "color/card" },
        stroke: { $var: "color/border" },
        strokeWeight: 1,
      },
    });

    // Left Notes List Pane (260px)
    const leftPane = await fc.createNode({
      type: "frame",
      name: "NotesListPane",
      parent: shell.id,
      width: 260,
      height: 620,
      props: {
        layout: "vertical",
        sizingH: "fixed",
        sizingV: "fill",
        gap: 14,
        padding: 18,
        fill: "none",
      },
    });
    const searchInput = await fc.cmd("instance.create", {
      component: comps.inputSetId,
      parent: leftPane.id,
    });
    await fc.cmd("instance.setProperties", {
      ids: [searchInput.id],
      properties: {
        variant: "bordered",
        color: "default",
        size: "md",
        placeholder: "🔍  Search Notes...",
      },
    });
    await fc.setProps(searchInput.id, { sizingH: "fill" });

    await createText(fc, leftPane.id, "AllNotesHeading", "All Notes", {
      fontSize: 14,
      fontStyle: "SemiBold",
      fill: { $var: "color/default-900" },
    });

    for (let i = 0; i < notes.length; i += 1) {
      const n = notes[i];
      const nCard = await fc.createNode({
        type: "frame",
        name: `NoteCard/${i + 1}`,
        parent: leftPane.id,
        width: 224,
        height: 74,
        props: {
          layout: "vertical",
          sizingH: "fill",
          sizingV: "hug",
          gap: 10,
          padding: 14,
          cornerRadius: 8,
          fill: { $var: n.bg },
        },
      });
      await createText(fc, nCard.id, "Title", n.title, {
        fontSize: 13,
        fontStyle: "SemiBold",
        fill: { $var: n.fg },
      });
      const foot = await fc.createNode({
        type: "frame",
        name: "Footer",
        parent: nCard.id,
        width: 196,
        height: 16,
        props: {
          layout: "horizontal",
          sizingH: "fill",
          mainAlign: "spaceBetween",
          crossAlign: "center",
          fill: "none",
        },
      });
      await createText(fc, foot.id, "Date", n.date, {
        fontSize: 11,
        fill: { $var: n.fg },
      });
      await fc.createNode({
        type: "vector",
        name: "Trash",
        parent: foot.id,
        width: 12,
        height: 12,
        path: "M3 6h18 M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6 M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",
        props: {
          fill: "none",
          stroke: { $var: "color/default-600" },
          strokeWeight: 1.6,
          strokeCap: "round",
          strokeJoin: "round",
        },
      });
    }

    await fc.createNode({
      type: "rectangle",
      name: "NotesDivider",
      parent: shell.id,
      width: 1,
      height: 620,
      props: { sizingV: "fill", fill: { $var: "color/border" } },
    });

    // Right Note Editor Pane
    const editorPane = await fc.createNode({
      type: "frame",
      name: "NoteEditorPane",
      parent: shell.id,
      width: 831,
      height: 620,
      props: {
        layout: "vertical",
        sizingH: "fill",
        sizingV: "fill",
        fill: "none",
      },
    });
    const editorHead = await fc.createNode({
      type: "frame",
      name: "EditorHeader",
      parent: editorPane.id,
      width: 831,
      height: 68,
      props: {
        layout: "horizontal",
        sizingH: "fill",
        sizingV: "fixed",
        mainAlign: "spaceBetween",
        crossAlign: "center",
        padding: [14, 24, 14, 24],
        fill: "none",
      },
    });
    await createText(fc, editorHead.id, "Title", "Edit Note", {
      fontSize: 15,
      fontStyle: "SemiBold",
      fill: { $var: "color/default-900" },
    });
    const addNoteBtn = await fc.cmd("instance.create", {
      component: comps.buttonSetId,
      parent: editorHead.id,
    });
    await fc.cmd("instance.setProperties", {
      ids: [addNoteBtn.id],
      properties: {
        color: "dark",
        variant: "solid",
        size: "default",
        label: "Add Note",
      },
    });

    await fc.createNode({
      type: "rectangle",
      name: "EditorHeaderDivider",
      parent: editorPane.id,
      width: 831,
      height: 1,
      props: { sizingH: "fill", fill: { $var: "color/border" } },
    });

    const editorBody = await fc.createNode({
      type: "frame",
      name: "EditorBody",
      parent: editorPane.id,
      width: 831,
      height: 300,
      props: {
        layout: "vertical",
        sizingH: "fill",
        sizingV: "hug",
        gap: 20,
        padding: 24,
        fill: "none",
      },
    });
    const taInst = await fc.cmd("instance.create", {
      component: comps.textareaSetId,
      parent: editorBody.id,
    });
    await fc.cmd("instance.setProperties", {
      ids: [taInst.id],
      properties: {
        variant: "bordered",
        color: "default",
        placeholder:
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
      },
    });
    await fc.setProps(taInst.id, { sizingH: "fill", height: 136 });

    await createText(fc, editorBody.id, "ColorHeading", "Change Note Color", {
      fontSize: 14,
      fontStyle: "SemiBold",
      fill: { $var: "color/default-900" },
    });

    const swatches = await fc.createNode({
      type: "frame",
      name: "ColorSwatches",
      parent: editorBody.id,
      width: 220,
      height: 32,
      props: { layout: "horizontal", sizingH: "hug", crossAlign: "center", gap: 10, fill: "none" },
    });
    for (const sw of noteColors) {
      const dot = await fc.createNode({
        type: "frame",
        name: `Swatch/${sw.name}`,
        parent: swatches.id,
        width: 28,
        height: 28,
        props: {
          layout: "horizontal",
          mainAlign: "center",
          crossAlign: "center",
          cornerRadius: 999,
          fill: sw.hex,
          ...(sw.selected ? { stroke: { $var: "color/border" }, strokeWeight: 1 } : {}),
        },
      });
      if (sw.selected) {
        await createText(fc, dot.id, "Check", "✓", {
          fontSize: 12,
          fontStyle: "Bold",
          fill: "#FFFFFF",
        });
      }
    }
  };

  await createNotesScreen(40, "Light");
  await createNotesScreen(1540, "Dark");
}

async function buildAiChatBotPage(fc, comps) {
  const page = await fc.cmd("page.add", { name: "AI Chat Bot" });
  await fc.cmd("page.select", { id: page.id });
  await fc.cmd("page.setBackground", { color: "#E2E8F0" });

  const avatarPath = path.join(ROOT, "public/images/avatar/avatar-2.jpg");
  const hasAvatar = fs.existsSync(avatarPath);

  const historyItems = [
    {
      title: "How can I improve my skincare rou...",
      preview: "Cleanse twice daily, moisturize, and always we...",
    },
    {
      title: "What is React?",
      preview: "React is a JavaScript library for building user i...",
    },
    {
      title: "How much water should I drink dai...",
      preview: "Aim for about 8 glasses (2 liters) daily, but adju...",
    },
    {
      title: "How can I develop a daily reading ...",
      preview: "Set aside 10-15 minutes daily, choose books yo...",
    },
    {
      title: "What is a hook in React?",
      preview: "Hooks are functions like useState and useEffe...",
    },
  ];

  const promptCards = [
    {
      title: "Write clean code snippets",
      sub: "💻  efficient and readable code",
      bg: "color/warning-soft",
      fg: "color/warning",
      iconPath: "M16 18l6-6-6-6 M8 6l-6 6 6 6",
    },
    {
      title: "Write a reply to this email",
      sub: "🖊  professional response",
      bg: "color/warning-soft",
      fg: "#D97706",
      iconPath: "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z M22 6l-10 7L2 6",
    },
    {
      title: "Help me debug this code",
      sub: "⚡  fix bugs quickly",
      bg: "color/destructive-soft",
      fg: "color/destructive",
      iconPath: "M8 2l1.88 1.88 M14.12 3.88L16 2 M9 7.13v-1a3 3 0 1 1 6 0v1 M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6 M12 20v-9 M6.53 9C4.6 8.8 3 7.1 3 5 M6 13H2 M3 21c0-2.1 1.7-3.9 3.8-4 M20.97 5c0 2.1-1.6 3.8-3.5 4 M22 13h-4 M17.2 17c2.1.1 3.8 1.9 3.8 4",
    },
  ];

  const createAiBadge = async (parent, dark = false) => {
    const circle = await fc.createNode({
      type: "frame",
      name: "AiAvatar",
      parent,
      width: 30,
      height: 30,
      props: {
        layout: "horizontal",
        sizingH: "fixed",
        sizingV: "fixed",
        mainAlign: "center",
        crossAlign: "center",
        cornerRadius: 999,
        fill: dark ? { $var: "color/default-900" } : { $var: "color/muted" },
        stroke: { $var: "color/border" },
        strokeWeight: 1,
      },
    });
    await createText(fc, circle.id, "Spark", "✦", {
      fontSize: 13,
      fontStyle: "Bold",
      fill: dark ? { $var: "color/default-50" } : { $var: "color/default-700" },
    });
  };

  const createUserAvatar = async (parent) => {
    const av = await fc.createNode({
      type: "frame",
      name: "UserAvatar",
      parent,
      width: 30,
      height: 30,
      props: {
        sizingH: "fixed",
        sizingV: "fixed",
        cornerRadius: 999,
        clip: true,
        fill: { $var: "color/primary-soft" },
      },
    });
    if (hasAvatar) {
      await fc.cmd("image.place", {
        path: avatarPath,
        parent: av.id,
        x: 0,
        y: 0,
        width: 30,
        height: 30,
        mode: "fill",
      });
    }
  };

  const createUserRow = async (parent, text) => {
    const row = await fc.createNode({
      type: "frame",
      name: "UserMessage",
      parent,
      width: 740,
      height: 38,
      props: {
        layout: "horizontal",
        sizingH: "fill",
        sizingV: "hug",
        mainAlign: "max",
        crossAlign: "center",
        gap: 10,
        fill: "none",
      },
    });
    const bubble = await fc.createNode({
      type: "frame",
      name: "Bubble",
      parent: row.id,
      width: 200,
      height: 38,
      props: {
        layout: "horizontal",
        sizingH: "hug",
        sizingV: "hug",
        padding: [10, 14, 10, 14],
        cornerRadius: 8,
        fill: { $var: "color/muted" },
      },
    });
    await createText(fc, bubble.id, "Text", text, {
      fontSize: 13,
      fill: { $var: "color/default-900" },
    });
    await createUserAvatar(row.id);
  };

  const createReactionRow = async (parent) => {
    const row = await fc.createNode({
      type: "frame",
      name: "Reactions",
      parent,
      width: 100,
      height: 20,
      props: {
        layout: "horizontal",
        sizingH: "hug",
        sizingV: "hug",
        crossAlign: "center",
        gap: 14,
        padding: [2, 0, 2, 0],
        fill: "none",
      },
    });
    for (const pathD of [
      "M8 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-2 M10 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z",
      "M7 10v12 M15 5.88L14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88z",
      "M17 14V2 M9 18.12L10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88z",
    ]) {
      await fc.createNode({
        type: "vector",
        name: "ActionIcon",
        parent: row.id,
        width: 13,
        height: 13,
        path: pathD,
        props: {
          fill: "none",
          stroke: { $var: "color/default-500" },
          strokeWeight: 1.6,
          strokeCap: "round",
          strokeJoin: "round",
        },
      });
    }
  };

  const createAiChatScreen = async ({ name, x, y, mode, variant }) => {
    const { body } = await createDashTailShell(fc, {
      name,
      x,
      y,
      width: 1440,
      height: 840,
      mode,
      railActive: "Application",
      sidebarTitle: "Workspace",
      sidebarItems: [
        { label: "AI Chat Bot", icon: "✦", active: true },
        { label: "Integrations", icon: "⊞", active: false },
        { label: "Contacts", icon: "◎", active: false },
        { label: "Notes", icon: "▤", active: false },
      ],
    });

    const shell = await fc.createNode({
      type: "frame",
      name: "AiChatWorkspace",
      parent: body.id,
      width: 1092,
      height: 732,
      props: {
        layout: "horizontal",
        sizingH: "fill",
        sizingV: "fill",
        cornerRadius: 12,
        clip: true,
        fill: { $var: "color/card" },
        stroke: { $var: "color/border" },
        strokeWeight: 1,
      },
    });

    // Left Chat History Sidebar (280px)
    const chatSide = await fc.createNode({
      type: "frame",
      name: "ChatHistorySidebar",
      parent: shell.id,
      width: 280,
      height: 732,
      props: {
        layout: "vertical",
        sizingH: "fixed",
        sizingV: "fill",
        mainAlign: "spaceBetween",
        fill: "none",
      },
    });

    const sideHeader = await fc.createNode({
      type: "frame",
      name: "BrandHeader",
      parent: chatSide.id,
      width: 280,
      height: 60,
      props: {
        layout: "horizontal",
        sizingH: "fill",
        sizingV: "fixed",
        mainAlign: "center",
        crossAlign: "center",
        gap: 8,
        fill: "none",
      },
    });
    const brandDot = await fc.createNode({
      type: "frame",
      name: "LogoCircle",
      parent: sideHeader.id,
      width: 26,
      height: 26,
      props: {
        layout: "horizontal",
        mainAlign: "center",
        crossAlign: "center",
        cornerRadius: 999,
        fill: { $var: "color/default-900" },
      },
    });
    await createText(fc, brandDot.id, "Spark", "✦", {
      fontSize: 12,
      fill: { $var: "color/default-50" },
    });
    await createText(fc, sideHeader.id, "BrandName", "dashtail.ai", {
      fontSize: 15,
      fontStyle: "Bold",
      fill: { $var: "color/default-900" },
    });

    await fc.createNode({
      type: "rectangle",
      name: "SideHeadDivider",
      parent: chatSide.id,
      width: 280,
      height: 1,
      props: { sizingH: "fill", fill: { $var: "color/border" } },
    });

    const sideBody = await fc.createNode({
      type: "frame",
      name: "HistoryContent",
      parent: chatSide.id,
      width: 280,
      height: 590,
      props: {
        layout: "vertical",
        sizingH: "fill",
        sizingV: "fill",
        gap: 14,
        padding: 16,
        fill: "none",
      },
    });

    const searchInput = await fc.cmd("instance.create", {
      component: comps.inputSetId,
      parent: sideBody.id,
    });
    await fc.cmd("instance.setProperties", {
      ids: [searchInput.id],
      properties: {
        variant: "bordered",
        color: "default",
        size: "md",
        placeholder:
          variant === "switcher"
            ? "🔍  Search Chat History..."
            : "🔍  Look up Chat History...",
      },
    });
    await fc.setProps(searchInput.id, { sizingH: "fill" });

    const historyList = await fc.createNode({
      type: "frame",
      name: "HistoryList",
      parent: sideBody.id,
      width: 248,
      height: 480,
      props: {
        layout: "vertical",
        sizingH: "fill",
        sizingV: "hug",
        gap: 8,
        fill: "none",
      },
    });

    for (let i = 0; i < historyItems.length; i += 1) {
      const h = historyItems[i];
      const isActive = variant === "switcher" && i === 4;
      const itemRow = await fc.createNode({
        type: "frame",
        name: `History/${i + 1}`,
        parent: historyList.id,
        width: 248,
        height: 56,
        props: {
          layout: "horizontal",
          sizingH: "fill",
          sizingV: "hug",
          mainAlign: "spaceBetween",
          crossAlign: "center",
          gap: 8,
          padding: [10, 10, 10, 10],
          cornerRadius: 8,
          fill: isActive ? { $var: "color/muted" } : "none",
        },
      });
      const copy = await fc.createNode({
        type: "frame",
        name: "Copy",
        parent: itemRow.id,
        width: 200,
        height: 36,
        props: { layout: "vertical", sizingH: "fill", sizingV: "hug", gap: 3, fill: "none" },
      });
      await createText(fc, copy.id, "Title", h.title, {
        fontSize: 12,
        fontStyle: "SemiBold",
        fill: { $var: "color/default-900" },
      });
      await createText(fc, copy.id, "Preview", h.preview, {
        fontSize: 11,
        fill: { $var: "color/muted-foreground" },
      });
      if (isActive) {
        const more = await fc.createNode({
          type: "frame",
          name: "More",
          parent: itemRow.id,
          width: 22,
          height: 22,
          props: {
            layout: "horizontal",
            mainAlign: "center",
            crossAlign: "center",
            cornerRadius: 6,
            fill: { $var: "color/background" },
          },
        });
        await createText(fc, more.id, "Dots", "•••", {
          fontSize: 9,
          fill: { $var: "color/default-600" },
        });
      }
    }

    const sideFooter = await fc.createNode({
      type: "frame",
      name: "SideFooter",
      parent: chatSide.id,
      width: 280,
      height: 72,
      props: {
        layout: "vertical",
        sizingH: "fill",
        sizingV: "hug",
        padding: 16,
        fill: "none",
      },
    });
    const newChatBtn = await fc.cmd("instance.create", {
      component: comps.buttonSetId,
      parent: sideFooter.id,
    });
    await fc.cmd("instance.setProperties", {
      ids: [newChatBtn.id],
      properties: {
        color: "dark",
        variant: "solid",
        size: "default",
        label: "New Chat",
      },
    });
    await fc.setProps(newChatBtn.id, { sizingH: "fill" });

    await fc.createNode({
      type: "rectangle",
      name: "ChatDivider",
      parent: shell.id,
      width: 1,
      height: 732,
      props: { sizingV: "fill", fill: { $var: "color/border" } },
    });

    // Right Chat Area
    const chatMain = await fc.createNode({
      type: "frame",
      name: "ChatMain",
      parent: shell.id,
      width: 811,
      height: 732,
      props: {
        layout: "vertical",
        sizingH: "fill",
        sizingV: "fill",
        mainAlign: "spaceBetween",
        padding: 28,
        fill: "none",
      },
    });

    const stage = await fc.createNode({
      type: "frame",
      name: "ChatStage",
      parent: chatMain.id,
      width: 755,
      height: 520,
      props: {
        layout: "vertical",
        sizingH: "fill",
        sizingV: "fill",
        gap: 20,
        fill: "none",
        clip: false,
      },
    });

    if (variant === "welcome") {
      const hero = await fc.createNode({
        type: "frame",
        name: "WelcomeHero",
        parent: stage.id,
        width: 755,
        height: 74,
        props: { layout: "vertical", sizingH: "fill", sizingV: "hug", gap: 6, fill: "none" },
      });
      await createText(fc, hero.id, "Greeting", "Hey there!", {
        fontSize: 30,
        fontStyle: "Bold",
        fill: { $var: "color/default-400" },
      });
      await createText(
        fc,
        hero.id,
        "PromptTitle",
        "What would you like to explore today?",
        {
          fontSize: 22,
          fontStyle: "SemiBold",
          fill: { $var: "color/default-900" },
        }
      );

      const cardsRow = await fc.createNode({
        type: "frame",
        name: "PromptSuggestions",
        parent: stage.id,
        width: 755,
        height: 190,
        props: {
          layout: "horizontal",
          sizingH: "fill",
          sizingV: "hug",
          gap: 16,
          fill: "none",
        },
      });

      for (const pc of promptCards) {
        const pCard = await fc.createNode({
          type: "frame",
          name: `Suggestion/${pc.title}`,
          parent: cardsRow.id,
          width: 240,
          height: 184,
          props: {
            layout: "vertical",
            sizingH: "fill",
            sizingV: "fixed",
            mainAlign: "spaceBetween",
            padding: 20,
            cornerRadius: 12,
            fill: { $var: "color/card" },
            stroke: { $var: "color/border" },
            strokeWeight: 1,
          },
        });
        const iconBox = await fc.createNode({
          type: "frame",
          name: "IconBadge",
          parent: pCard.id,
          width: 44,
          height: 44,
          props: {
            layout: "horizontal",
            mainAlign: "center",
            crossAlign: "center",
            cornerRadius: 10,
            fill: { $var: pc.bg },
          },
        });
        await fc.createNode({
          type: "vector",
          name: "Icon",
          parent: iconBox.id,
          width: 18,
          height: 18,
          path: pc.iconPath,
          props: {
            fill: "none",
            stroke: pc.fg.startsWith("#") ? pc.fg : { $var: pc.fg },
            strokeWeight: 1.8,
            strokeCap: "round",
            strokeJoin: "round",
          },
        });
        const copyCol = await fc.createNode({
          type: "frame",
          name: "Copy",
          parent: pCard.id,
          width: 200,
          height: 50,
          props: { layout: "vertical", sizingH: "fill", sizingV: "hug", gap: 6, fill: "none" },
        });
        await createText(fc, copyCol.id, "Title", pc.title, {
          fontSize: 14,
          fontStyle: "SemiBold",
          fill: { $var: "color/default-900" },
        });
        await createText(fc, copyCol.id, "Sub", pc.sub, {
          fontSize: 12,
          fill: { $var: "color/muted-foreground" },
        });
      }
    } else if (variant === "conversation") {
      await createUserRow(stage.id, "Write clean code snippets");

      const aiBlock = await fc.createNode({
        type: "frame",
        name: "AiResponse",
        parent: stage.id,
        width: 755,
        height: 290,
        props: {
          layout: "horizontal",
          sizingH: "fill",
          sizingV: "hug",
          crossAlign: "min",
          gap: 12,
          fill: "none",
        },
      });
      await createAiBadge(aiBlock.id, false);

      const aiCol = await fc.createNode({
        type: "frame",
        name: "ResponseStack",
        parent: aiBlock.id,
        width: 700,
        height: 280,
        props: {
          layout: "vertical",
          sizingH: "fill",
          sizingV: "hug",
          gap: 10,
          fill: "none",
        },
      });

      const introBubble = await fc.createNode({
        type: "frame",
        name: "IntroBubble",
        parent: aiCol.id,
        width: 190,
        height: 36,
        props: {
          layout: "horizontal",
          sizingH: "hug",
          sizingV: "hug",
          padding: [9, 14, 9, 14],
          cornerRadius: 8,
          fill: { $var: "color/muted" },
        },
      });
      await createText(fc, introBubble.id, "Text", "Here is a code example:", {
        fontSize: 13,
        fill: { $var: "color/default-900" },
      });

      const codeOuter = await fc.createNode({
        type: "frame",
        name: "CodeCard",
        parent: aiCol.id,
        width: 700,
        height: 112,
        props: {
          layout: "vertical",
          sizingH: "fill",
          sizingV: "hug",
          padding: 10,
          cornerRadius: 8,
          fill: { $var: "color/muted" },
        },
      });
      const codeDark = await fc.createNode({
        type: "frame",
        name: "CodeBlock",
        parent: codeOuter.id,
        width: 680,
        height: 92,
        props: {
          layout: "vertical",
          sizingH: "fill",
          sizingV: "hug",
          gap: 6,
          padding: 14,
          cornerRadius: 6,
          fill: "#111827",
        },
      });
      await createText(fc, codeDark.id, "Line1", "function example() {", {
        fontSize: 12,
        fill: "#C084FC",
      });
      await createText(
        fc,
        codeDark.id,
        "Line2",
        "  console.log('This is a mock code snippet.');",
        {
          fontSize: 12,
          fill: "#FBBF24",
        }
      );
      await createText(fc, codeDark.id, "Line3", "}", {
        fontSize: 12,
        fill: "#E5E7EB",
      });

      const noteBubble = await fc.createNode({
        type: "frame",
        name: "DisclaimerBubble",
        parent: aiCol.id,
        width: 360,
        height: 36,
        props: {
          layout: "horizontal",
          sizingH: "hug",
          sizingV: "hug",
          padding: [9, 14, 9, 14],
          cornerRadius: 8,
          fill: { $var: "color/muted" },
        },
      });
      await createText(
        fc,
        noteBubble.id,
        "Text",
        "Please note that this is not generated by an actual AI model.",
        {
          fontSize: 13,
          fill: { $var: "color/default-900" },
        }
      );

      await createReactionRow(aiCol.id);
    } else {
      // Switcher / Multi-turn + Floating Model Popover
      await createUserRow(stage.id, "Here is an image I uploaded.");

      const aiMsg1 = await fc.createNode({
        type: "frame",
        name: "AiTurn1",
        parent: stage.id,
        width: 755,
        height: 92,
        props: {
          layout: "horizontal",
          sizingH: "fill",
          sizingV: "hug",
          crossAlign: "min",
          gap: 12,
          fill: "none",
        },
      });
      await createAiBadge(aiMsg1.id, false);
      const aiCol1 = await fc.createNode({
        type: "frame",
        name: "Col",
        parent: aiMsg1.id,
        width: 700,
        height: 86,
        props: { layout: "vertical", sizingH: "fill", sizingV: "hug", gap: 8, fill: "none" },
      });
      const b1 = await fc.createNode({
        type: "frame",
        name: "Bubble",
        parent: aiCol1.id,
        width: 700,
        height: 54,
        props: {
          layout: "vertical",
          sizingH: "fill",
          sizingV: "hug",
          padding: [10, 14, 10, 14],
          cornerRadius: 8,
          fill: { $var: "color/muted" },
        },
      });
      await createText(
        fc,
        b1.id,
        "Text",
        "This is a sample response for demonstration purposes only. It's not generated by a real AI. Try including keywords like 'title', 'alert', 'code', or 'list'.",
        {
          fontSize: 13,
          fill: { $var: "color/default-900" },
          props: { sizingH: "fill", textAutoResize: "height", lineHeight: 19 },
        }
      );
      await createReactionRow(aiCol1.id);

      await createUserRow(stage.id, "Hallo");

      const thinkingRow = await fc.createNode({
        type: "frame",
        name: "AiThinkingTurn",
        parent: stage.id,
        width: 240,
        height: 36,
        props: {
          layout: "horizontal",
          sizingH: "hug",
          sizingV: "hug",
          crossAlign: "center",
          gap: 10,
          fill: "none",
        },
      });
      await createAiBadge(thinkingRow.id, true);
      await createText(fc, thinkingRow.id, "Dots", "•••", {
        fontSize: 14,
        fill: { $var: "color/default-500" },
      });

      // Floating Model Switcher Dropdown Card
      const dropdown = await fc.createNode({
        type: "frame",
        name: "ModelSwitcherPopover",
        parent: stage.id,
        width: 204,
        height: 168,
        props: {
          layout: "vertical",
          sizingH: "fixed",
          sizingV: "hug",
          gap: 4,
          padding: 8,
          cornerRadius: 10,
          fill: { $var: "color/card" },
          stroke: { $var: "color/border" },
          strokeWeight: 1,
          effects: [
            {
              type: "dropShadow",
              color: "#0F16241F",
              offset: [0, 8],
              radius: 20,
            },
          ],
        },
      });
      for (const m of [
        { name: "Claude 3.5 sonnet", active: false },
        { name: "Gemini 1.5 Pro", active: true },
        { name: "GPT-4o", active: false },
        { name: "Llama 3.1", active: false },
      ]) {
        const mRow = await fc.createNode({
          type: "frame",
          name: `Model/${m.name}`,
          parent: dropdown.id,
          width: 188,
          height: 36,
          props: {
            layout: "horizontal",
            sizingH: "fill",
            sizingV: "fixed",
            crossAlign: "center",
            gap: 10,
            padding: [6, 10, 6, 10],
            cornerRadius: 6,
            fill: m.active ? { $var: "color/muted" } : "none",
          },
        });
        await createText(fc, mRow.id, "Globe", "🌐", {
          fontSize: 12,
          fill: { $var: "color/default-600" },
        });
        await createText(fc, mRow.id, "Name", m.name, {
          fontSize: 13,
          fontStyle: m.active ? "SemiBold" : "Medium",
          fill: { $var: "color/default-900" },
        });
      }
    }

    // Bottom Composer Box
    const composer = await fc.createNode({
      type: "frame",
      name: "ComposerBox",
      parent: chatMain.id,
      width: 755,
      height: 112,
      props: {
        layout: "vertical",
        sizingH: "fill",
        sizingV: "hug",
        gap: 18,
        padding: 16,
        cornerRadius: 12,
        fill: { $var: "color/card" },
        stroke: { $var: "color/border" },
        strokeWeight: 1,
      },
    });
    await createText(fc, composer.id, "Placeholder", "Ask me anything...", {
      fontSize: 13,
      fill: { $var: "color/muted-foreground" },
    });

    const compBar = await fc.createNode({
      type: "frame",
      name: "ComposerToolbar",
      parent: composer.id,
      width: 723,
      height: 36,
      props: {
        layout: "horizontal",
        sizingH: "fill",
        sizingV: "hug",
        mainAlign: "spaceBetween",
        crossAlign: "center",
        fill: "none",
      },
    });

    const compLeft = await fc.createNode({
      type: "frame",
      name: "LeftControls",
      parent: compBar.id,
      width: 190,
      height: 34,
      props: {
        layout: "horizontal",
        sizingH: "hug",
        crossAlign: "center",
        gap: 12,
        fill: "none",
      },
    });
    await fc.createNode({
      type: "vector",
      name: "AttachIcon",
      parent: compLeft.id,
      width: 15,
      height: 15,
      path: "M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48",
      props: {
        fill: "none",
        stroke: { $var: "color/default-600" },
        strokeWeight: 1.7,
        strokeCap: "round",
        strokeJoin: "round",
      },
    });

    const modelPill = await fc.createNode({
      type: "frame",
      name: "ModelSelectorPill",
      parent: compLeft.id,
      width: 132,
      height: 34,
      props: {
        layout: "horizontal",
        sizingH: "hug",
        crossAlign: "center",
        gap: 8,
        padding: [6, 12, 6, 12],
        cornerRadius: 999,
        fill: { $var: "color/background" },
        stroke: { $var: "color/border" },
        strokeWeight: 1,
      },
    });
    await createText(fc, modelPill.id, "Globe", "🌐", {
      fontSize: 12,
      fill: { $var: "color/default-600" },
    });
    await createText(fc, modelPill.id, "Model", "Gemini 1.5", {
      fontSize: 12,
      fontStyle: "Medium",
      fill: { $var: "color/default-800" },
    });
    await createText(fc, modelPill.id, "Caret", "▾", {
      fontSize: 11,
      fill: { $var: "color/default-500" },
    });

    const compRight = await fc.createNode({
      type: "frame",
      name: "RightControls",
      parent: compBar.id,
      width: 80,
      height: 34,
      props: {
        layout: "horizontal",
        sizingH: "hug",
        crossAlign: "center",
        gap: 8,
        fill: "none",
      },
    });
    const micBtn = await fc.createNode({
      type: "frame",
      name: "MicButton",
      parent: compRight.id,
      width: 34,
      height: 34,
      props: {
        layout: "horizontal",
        mainAlign: "center",
        crossAlign: "center",
        cornerRadius: 999,
        fill: { $var: "color/background" },
        stroke: { $var: "color/border" },
        strokeWeight: 1,
      },
    });
    await fc.createNode({
      type: "vector",
      name: "Mic",
      parent: micBtn.id,
      width: 14,
      height: 14,
      path: "M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z M19 10v2a7 7 0 0 1-14 0v-2 M12 19v4 M8 23h8",
      props: {
        fill: "none",
        stroke: { $var: "color/default-700" },
        strokeWeight: 1.7,
        strokeCap: "round",
        strokeJoin: "round",
      },
    });

    const sendBtn = await fc.createNode({
      type: "frame",
      name: "SendButton",
      parent: compRight.id,
      width: 34,
      height: 34,
      props: {
        layout: "horizontal",
        mainAlign: "center",
        crossAlign: "center",
        cornerRadius: 999,
        fill: { $var: "color/muted" },
      },
    });
    await fc.createNode({
      type: "vector",
      name: "ArrowUp",
      parent: sendBtn.id,
      width: 14,
      height: 14,
      path: "M12 19V5 M5 12l7-7 7 7",
      props: {
        fill: "none",
        stroke: { $var: "color/default-600" },
        strokeWeight: 1.8,
        strokeCap: "round",
        strokeJoin: "round",
      },
    });
  };

  await createAiChatScreen({
    name: "AI Chat Bot — Welcome / Light",
    x: 40,
    y: 40,
    mode: "Light",
    variant: "welcome",
  });
  await createAiChatScreen({
    name: "AI Chat Bot — Conversation / Light",
    x: 1540,
    y: 40,
    mode: "Light",
    variant: "conversation",
  });
  await createAiChatScreen({
    name: "AI Chat Bot — Model Switcher / Light",
    x: 40,
    y: 940,
    mode: "Light",
    variant: "switcher",
  });
  await createAiChatScreen({
    name: "AI Chat Bot — Conversation / Dark",
    x: 1540,
    y: 940,
    mode: "Dark",
    variant: "conversation",
  });
}

async function buildAccountSettingPage(fc, comps) {
  const page = await fc.cmd("page.add", { name: "Account Setting" });
  await fc.cmd("page.select", { id: page.id });
  await fc.cmd("page.setBackground", { color: "#E2E8F0" });

  const avatarPath = path.join(ROOT, "public/images/avatar/avatar-2.jpg");
  const hasAvatar = fs.existsSync(avatarPath);

  const createSettingCard = async (parent, name, width) =>
    fc.createNode({
      type: "frame",
      name,
      parent,
      width,
      height: 180,
      props: {
        layout: "vertical",
        sizingH: "fill",
        sizingV: "hug",
        gap: 16,
        padding: 24,
        cornerRadius: 12,
        fill: { $var: "color/card" },
        stroke: { $var: "color/border" },
        strokeWeight: 1,
      },
    });

  const createLabeledInput = async (parent, labelText, placeholder) => {
    const col = await fc.createNode({
      type: "frame",
      name: `Field/${labelText}`,
      parent,
      width: 280,
      height: 60,
      props: { layout: "vertical", sizingH: "fill", sizingV: "hug", gap: 6, fill: "none" },
    });
    await createText(fc, col.id, "Label", labelText, {
      fontSize: 12,
      fontStyle: "Medium",
      fill: { $var: "color/default-700" },
    });
    const inp = await fc.cmd("instance.create", {
      component: comps.inputSetId,
      parent: col.id,
    });
    await fc.cmd("instance.setProperties", {
      ids: [inp.id],
      properties: {
        variant: "bordered",
        color: "default",
        size: "md",
        placeholder,
      },
    });
    await fc.setProps(inp.id, { sizingH: "fill" });
    return col;
  };

  const createToggleRow = async (
    parent,
    title,
    desc,
    checked,
    color = "primary"
  ) => {
    const row = await fc.createNode({
      type: "frame",
      name: `Toggle/${title}`,
      parent,
      width: 320,
      height: 44,
      props: {
        layout: "horizontal",
        sizingH: "fill",
        sizingV: "hug",
        mainAlign: "spaceBetween",
        crossAlign: "center",
        gap: 12,
        fill: "none",
      },
    });
    const copy = await fc.createNode({
      type: "frame",
      name: "Copy",
      parent: row.id,
      width: 240,
      height: 36,
      props: { layout: "vertical", sizingH: "fill", sizingV: "hug", gap: 3, fill: "none" },
    });
    await createText(fc, copy.id, "Title", title, {
      fontSize: 13,
      fontStyle: "SemiBold",
      fill: { $var: "color/default-900" },
    });
    await createText(fc, copy.id, "Desc", desc, {
      fontSize: 11,
      fill: { $var: "color/muted-foreground" },
      props: { sizingH: "fill", textAutoResize: "height", lineHeight: 16 },
    });
    const sw = await fc.cmd("instance.create", {
      component: comps.swSetId,
      parent: row.id,
    });
    await fc.cmd("instance.setProperties", {
      ids: [sw.id],
      properties: { checked, color },
    });
  };

  const createAccountScreen = async ({ name, x, y, mode, activeTab }) => {
    const { body } = await createDashTailShell(fc, {
      name,
      x,
      y,
      width: 1440,
      height: 920,
      mode,
      railActive: "Users",
      sidebarTitle: "Account",
      sidebarItems: [
        { label: "Account Setting", icon: "◎", active: true },
        { label: "API Key", icon: "⚿", active: false },
        { label: "Integrations", icon: "⊞", active: false },
        { label: "Billing", icon: "▤", active: false },
      ],
    });

    // SaaS Header Banner
    const topBar = await fc.createNode({
      type: "frame",
      name: "AccountHeader",
      parent: body.id,
      width: 1092,
      height: 54,
      props: {
        layout: "horizontal",
        sizingH: "fill",
        sizingV: "hug",
        mainAlign: "spaceBetween",
        crossAlign: "center",
        fill: "none",
      },
    });
    const titleGroup = await fc.createNode({
      type: "frame",
      name: "Titles",
      parent: topBar.id,
      width: 560,
      height: 50,
      props: { layout: "vertical", sizingH: "hug", sizingV: "hug", gap: 4, fill: "none" },
    });
    await createText(fc, titleGroup.id, "Title", "Account Settings", {
      fontSize: 22,
      fontStyle: "Bold",
      fill: { $var: "color/default-900" },
    });
    await createText(
      fc,
      titleGroup.id,
      "Subtitle",
      "Manage your personal profile, notification channels, and workspace security.",
      { fontSize: 13, fill: { $var: "color/muted-foreground" } }
    );
    const planBadge = await fc.cmd("instance.create", {
      component: comps.badgeSetId,
      parent: topBar.id,
    });
    await fc.cmd("instance.setProperties", {
      ids: [planBadge.id],
      properties: { color: "default", variant: "soft", label: "Pro Workspace" },
    });

    // 3-Tab Segmented Navigation Bar
    const tabBar = await fc.createNode({
      type: "frame",
      name: "AccountTabs",
      parent: body.id,
      width: 1092,
      height: 48,
      props: {
        layout: "horizontal",
        sizingH: "hug",
        sizingV: "fixed",
        crossAlign: "center",
        gap: 6,
        padding: 5,
        cornerRadius: 10,
        fill: { $var: "color/card" },
        stroke: { $var: "color/border" },
        strokeWeight: 1,
      },
    });
    const tabDefs = [
      { id: "account", label: "Account Page", icon: "◎" },
      { id: "notifications", label: "Notifications", icon: "🔔" },
      { id: "security", label: "Security", icon: "🛡" },
    ];
    for (const td of tabDefs) {
      const isSelected = td.id === activeTab;
      const tabBtn = await fc.createNode({
        type: "frame",
        name: `Tab/${td.label}`,
        parent: tabBar.id,
        width: 152,
        height: 38,
        props: {
          layout: "horizontal",
          sizingH: "hug",
          sizingV: "fill",
          mainAlign: "center",
          crossAlign: "center",
          gap: 8,
          padding: [0, 16, 0, 16],
          cornerRadius: 7,
          fill: isSelected ? { $var: "color/primary" } : "none",
        },
      });
      await createText(fc, tabBtn.id, "Icon", td.icon, {
        fontSize: 12,
        fill: isSelected
          ? { $var: "color/primary-foreground" }
          : { $var: "color/default-500" },
      });
      await createText(fc, tabBtn.id, "Label", td.label, {
        fontSize: 13,
        fontStyle: isSelected ? "SemiBold" : "Medium",
        fill: isSelected
          ? { $var: "color/primary-foreground" }
          : { $var: "color/default-600" },
      });
    }

    // 2-Column SaaS Body Grid (Left 680px + Right 392px)
    const columns = await fc.createNode({
      type: "frame",
      name: "SettingsGrid",
      parent: body.id,
      width: 1092,
      height: 680,
      props: {
        layout: "horizontal",
        sizingH: "fill",
        sizingV: "hug",
        gap: 20,
        fill: "none",
      },
    });
    const leftCol = await fc.createNode({
      type: "frame",
      name: "MainColumn",
      parent: columns.id,
      width: 680,
      height: 660,
      props: {
        layout: "vertical",
        sizingH: "fill",
        sizingV: "hug",
        gap: 20,
        fill: "none",
      },
    });
    const rightCol = await fc.createNode({
      type: "frame",
      name: "SideColumn",
      parent: columns.id,
      width: 392,
      height: 660,
      props: {
        layout: "vertical",
        sizingH: "fixed",
        sizingV: "hug",
        gap: 20,
        fill: "none",
      },
    });

    if (activeTab === "account") {
      // Profile Details Card
      const profileCard = await createSettingCard(leftCol.id, "ProfileDetailsCard", 680);
      await createText(fc, profileCard.id, "CardTitle", "Profile Information", {
        fontSize: 16,
        fontStyle: "SemiBold",
        fill: { $var: "color/default-900" },
      });

      const avatarRow = await fc.createNode({
        type: "frame",
        name: "AvatarUpload",
        parent: profileCard.id,
        width: 632,
        height: 68,
        props: {
          layout: "horizontal",
          sizingH: "fill",
          sizingV: "hug",
          crossAlign: "center",
          gap: 16,
          fill: "none",
        },
      });
      const avWrap = await fc.createNode({
        type: "frame",
        name: "Avatar",
        parent: avatarRow.id,
        width: 64,
        height: 64,
        props: { cornerRadius: 999, clip: true, fill: { $var: "color/primary-soft" } },
      });
      if (hasAvatar) {
        await fc.cmd("image.place", {
          path: avatarPath,
          parent: avWrap.id,
          x: 0,
          y: 0,
          width: 64,
          height: 64,
          mode: "fill",
        });
      }
      const avActions = await fc.createNode({
        type: "frame",
        name: "AvatarActions",
        parent: avatarRow.id,
        width: 320,
        height: 58,
        props: { layout: "vertical", sizingH: "hug", sizingV: "hug", gap: 8, fill: "none" },
      });
      const avBtns = await fc.createNode({
        type: "frame",
        name: "Buttons",
        parent: avActions.id,
        width: 220,
        height: 36,
        props: { layout: "horizontal", sizingH: "hug", crossAlign: "center", gap: 10, fill: "none" },
      });
      const changePhotoBtn = await fc.cmd("instance.create", {
        component: comps.buttonSetId,
        parent: avBtns.id,
      });
      await fc.cmd("instance.setProperties", {
        ids: [changePhotoBtn.id],
        properties: {
          color: "secondary",
          variant: "outline",
          size: "sm",
          label: "Change Photo",
        },
      });
      const removeBtn = await fc.cmd("instance.create", {
        component: comps.buttonSetId,
        parent: avBtns.id,
      });
      await fc.cmd("instance.setProperties", {
        ids: [removeBtn.id],
        properties: {
          color: "destructive",
          variant: "soft",
          size: "default",
          label: "Remove",
        },
      });
      await fc.setProps(removeBtn.id, { height: 36 });
      await createText(
        fc,
        avActions.id,
        "Hint",
        "JPG, PNG or WebP. Recommended 400×400px (max 2MB).",
        { fontSize: 11, fill: { $var: "color/muted-foreground" } }
      );

      const gridRow1 = await fc.createNode({
        type: "frame",
        name: "FormRow1",
        parent: profileCard.id,
        width: 632,
        height: 62,
        props: { layout: "horizontal", sizingH: "fill", sizingV: "hug", gap: 16, fill: "none" },
      });
      await createLabeledInput(gridRow1.id, "Full Name", "Amir Mufid");
      await createLabeledInput(gridRow1.id, "Role / Title", "Product Engineer");

      const gridRow2 = await fc.createNode({
        type: "frame",
        name: "FormRow2",
        parent: profileCard.id,
        width: 632,
        height: 62,
        props: { layout: "horizontal", sizingH: "fill", sizingV: "hug", gap: 16, fill: "none" },
      });
      await createLabeledInput(gridRow2.id, "Email Address", "amir@dashtail.dev");
      await createLabeledInput(gridRow2.id, "Phone Number", "+62 812 3456 7890");

      const bioCol = await fc.createNode({
        type: "frame",
        name: "Field/Bio",
        parent: profileCard.id,
        width: 632,
        height: 102,
        props: { layout: "vertical", sizingH: "fill", sizingV: "hug", gap: 6, fill: "none" },
      });
      await createText(fc, bioCol.id, "Label", "Bio", {
        fontSize: 12,
        fontStyle: "Medium",
        fill: { $var: "color/default-700" },
      });
      const bioTa = await fc.cmd("instance.create", {
        component: comps.textareaSetId,
        parent: bioCol.id,
      });
      await fc.cmd("instance.setProperties", {
        ids: [bioTa.id],
        properties: {
          variant: "bordered",
          color: "default",
          placeholder:
            "Building modern SaaS dashboards and design systems with Next.js, Tailwind CSS v4, and FigCraft.",
        },
      });
      await fc.setProps(bioTa.id, { sizingH: "fill", height: 78 });

      await fc.createNode({
        type: "rectangle",
        name: "FormDivider",
        parent: profileCard.id,
        width: 632,
        height: 1,
        props: { sizingH: "fill", fill: { $var: "color/border" } },
      });

      const formFoot = await fc.createNode({
        type: "frame",
        name: "FormFooter",
        parent: profileCard.id,
        width: 632,
        height: 40,
        props: {
          layout: "horizontal",
          sizingH: "fill",
          sizingV: "hug",
          mainAlign: "spaceBetween",
          crossAlign: "center",
          fill: "none",
        },
      });
      await createText(fc, formFoot.id, "Meta", "Last updated 2 hours ago", {
        fontSize: 12,
        fill: { $var: "color/muted-foreground" },
      });
      const footBtns = await fc.createNode({
        type: "frame",
        name: "Actions",
        parent: formFoot.id,
        width: 220,
        height: 40,
        props: { layout: "horizontal", sizingH: "hug", crossAlign: "center", gap: 10, fill: "none" },
      });
      const cancelBtn = await fc.cmd("instance.create", {
        component: comps.buttonSetId,
        parent: footBtns.id,
      });
      await fc.cmd("instance.setProperties", {
        ids: [cancelBtn.id],
        properties: {
          color: "secondary",
          variant: "outline",
          size: "sm",
          label: "Cancel",
        },
      });
      const saveBtn = await fc.cmd("instance.create", {
        component: comps.buttonSetId,
        parent: footBtns.id,
      });
      await fc.cmd("instance.setProperties", {
        ids: [saveBtn.id],
        properties: {
          color: "default",
          variant: "solid",
          size: "default",
          label: "Save Changes",
        },
      });

      // Danger Zone Card
      const dangerCard = await createSettingCard(leftCol.id, "DangerZoneCard", 680);
      await fc.setProps(dangerCard.id, { stroke: { $var: "color/destructive" } });
      const dangerRow = await fc.createNode({
        type: "frame",
        name: "DangerRow",
        parent: dangerCard.id,
        width: 632,
        height: 46,
        props: {
          layout: "horizontal",
          sizingH: "fill",
          sizingV: "hug",
          mainAlign: "spaceBetween",
          crossAlign: "center",
          fill: "none",
        },
      });
      const dangerCopy = await fc.createNode({
        type: "frame",
        name: "Copy",
        parent: dangerRow.id,
        width: 420,
        height: 40,
        props: { layout: "vertical", sizingH: "hug", sizingV: "hug", gap: 4, fill: "none" },
      });
      await createText(fc, dangerCopy.id, "Title", "Delete Account", {
        fontSize: 15,
        fontStyle: "SemiBold",
        fill: { $var: "color/destructive" },
      });
      await createText(
        fc,
        dangerCopy.id,
        "Desc",
        "Permanently delete your personal account and all associated data.",
        { fontSize: 12, fill: { $var: "color/muted-foreground" } }
      );
      const delAccBtn = await fc.cmd("instance.create", {
        component: comps.buttonSetId,
        parent: dangerRow.id,
      });
      await fc.cmd("instance.setProperties", {
        ids: [delAccBtn.id],
        properties: {
          color: "destructive",
          variant: "soft",
          size: "default",
          label: "Delete Account",
        },
      });

      // Right Side: Preferences + Plan Usage
      const prefCard = await createSettingCard(rightCol.id, "PreferencesCard", 392);
      await createText(fc, prefCard.id, "Title", "Workspace Preferences", {
        fontSize: 16,
        fontStyle: "SemiBold",
        fill: { $var: "color/default-900" },
      });

      const langWrap = await fc.createNode({
        type: "frame",
        name: "LanguageField",
        parent: prefCard.id,
        width: 344,
        height: 64,
        props: { layout: "vertical", sizingH: "fill", sizingV: "hug", gap: 6, fill: "none" },
      });
      await createText(fc, langWrap.id, "Label", "Display Language", {
        fontSize: 12,
        fontStyle: "Medium",
        fill: { $var: "color/default-700" },
      });
      const langSel = await fc.cmd("instance.create", {
        component: comps.selectCompId,
        parent: langWrap.id,
      });
      await fc.cmd("instance.setProperties", {
        ids: [langSel.id],
        properties: { placeholder: "English (US)" },
      });
      await fc.setProps(langSel.id, { sizingH: "fill" });

      const tzWrap = await fc.createNode({
        type: "frame",
        name: "TimezoneField",
        parent: prefCard.id,
        width: 344,
        height: 64,
        props: { layout: "vertical", sizingH: "fill", sizingV: "hug", gap: 6, fill: "none" },
      });
      await createText(fc, tzWrap.id, "Label", "Timezone", {
        fontSize: 12,
        fontStyle: "Medium",
        fill: { $var: "color/default-700" },
      });
      const tzSel = await fc.cmd("instance.create", {
        component: comps.selectCompId,
        parent: tzWrap.id,
      });
      await fc.cmd("instance.setProperties", {
        ids: [tzSel.id],
        properties: { placeholder: "Asia/Jakarta (UTC+07:00)" },
      });
      await fc.setProps(tzSel.id, { sizingH: "fill" });

      await fc.createNode({
        type: "rectangle",
        name: "PrefDivider",
        parent: prefCard.id,
        width: 344,
        height: 1,
        props: { sizingH: "fill", fill: { $var: "color/border" } },
      });

      await createToggleRow(
        prefCard.id,
        "Public Profile",
        "Allow teammates to view your profile details.",
        "true",
        "primary"
      );
      await createToggleRow(
        prefCard.id,
        "Weekly Summary",
        "Receive a Monday morning digest of workspace metrics.",
        "true",
        "primary"
      );

      // Plan & Storage Card
      const planCard = await createSettingCard(rightCol.id, "PlanUsageCard", 392);
      const planHead = await fc.createNode({
        type: "frame",
        name: "PlanHeader",
        parent: planCard.id,
        width: 344,
        height: 28,
        props: {
          layout: "horizontal",
          sizingH: "fill",
          mainAlign: "spaceBetween",
          crossAlign: "center",
          fill: "none",
        },
      });
      await createText(fc, planHead.id, "Title", "Plan & Usage", {
        fontSize: 16,
        fontStyle: "SemiBold",
        fill: { $var: "color/default-900" },
      });
      const activeBadge = await fc.cmd("instance.create", {
        component: comps.badgeSetId,
        parent: planHead.id,
      });
      await fc.cmd("instance.setProperties", {
        ids: [activeBadge.id],
        properties: { color: "success", variant: "soft", label: "Active" },
      });

      const usageMeta = await fc.createNode({
        type: "frame",
        name: "UsageMeta",
        parent: planCard.id,
        width: 344,
        height: 18,
        props: {
          layout: "horizontal",
          sizingH: "fill",
          mainAlign: "spaceBetween",
          fill: "none",
        },
      });
      await createText(fc, usageMeta.id, "Label", "Cloud Storage", {
        fontSize: 12,
        fill: { $var: "color/muted-foreground" },
      });
      await createText(fc, usageMeta.id, "Value", "4.2 GB / 10 GB", {
        fontSize: 12,
        fontStyle: "SemiBold",
        fill: { $var: "color/default-900" },
      });

      const prog = await fc.cmd("instance.create", {
        component: comps.progressSetId,
        parent: planCard.id,
      });
      await fc.cmd("instance.setProperties", {
        ids: [prog.id],
        properties: { color: "primary", size: "md" },
      });
      await fc.setProps(prog.id, { sizingH: "fill" });

      await createText(fc, planCard.id, "ManageLink", "Manage Billing & Invoices →", {
        fontSize: 13,
        fontStyle: "Medium",
        fill: { $var: "color/primary" },
      });
    } else if (activeTab === "notifications") {
      // Tab 2: Notifications Matrix
      const notifCard = await createSettingCard(
        leftCol.id,
        "NotificationChannelsCard",
        680
      );
      const nHead = await fc.createNode({
        type: "frame",
        name: "Header",
        parent: notifCard.id,
        width: 632,
        height: 44,
        props: { layout: "vertical", sizingH: "fill", sizingV: "hug", gap: 4, fill: "none" },
      });
      await createText(fc, nHead.id, "Title", "Notification Channels", {
        fontSize: 16,
        fontStyle: "SemiBold",
        fill: { $var: "color/default-900" },
      });
      await createText(
        fc,
        nHead.id,
        "Sub",
        "Choose which events trigger email or in-app push notifications.",
        { fontSize: 12, fill: { $var: "color/muted-foreground" } }
      );

      const matrixHead = await fc.createNode({
        type: "frame",
        name: "MatrixHeader",
        parent: notifCard.id,
        width: 632,
        height: 28,
        props: {
          layout: "horizontal",
          sizingH: "fill",
          mainAlign: "spaceBetween",
          crossAlign: "center",
          fill: "none",
        },
      });
      await createText(fc, matrixHead.id, "EventCol", "ACTIVITY", {
        fontSize: 11,
        fontStyle: "SemiBold",
        fill: { $var: "color/muted-foreground" },
      });
      const colLabels = await fc.createNode({
        type: "frame",
        name: "ChannelCols",
        parent: matrixHead.id,
        width: 140,
        height: 20,
        props: {
          layout: "horizontal",
          sizingH: "fixed",
          mainAlign: "spaceBetween",
          fill: "none",
        },
      });
      await createText(fc, colLabels.id, "Email", "EMAIL", {
        fontSize: 11,
        fontStyle: "SemiBold",
        fill: { $var: "color/muted-foreground" },
      });
      await createText(fc, colLabels.id, "Push", "PUSH", {
        fontSize: 11,
        fontStyle: "SemiBold",
        fill: { $var: "color/muted-foreground" },
      });

      const notifRows = [
        {
          title: "Product Updates & Releases",
          desc: "New features, UI improvements, and changelog highlights.",
          email: "true",
          push: "false",
        },
        {
          title: "Team Mentions & Comments",
          desc: "Notify when teammates mention you in tasks, projects, or notes.",
          email: "true",
          push: "true",
        },
        {
          title: "API Key & Webhook Alerts",
          desc: "Alerts when API keys are rotated, disabled, or approach quota.",
          email: "true",
          push: "true",
        },
        {
          title: "Security & Sign-in Alerts",
          desc: "Immediate notice for new device logins or password changes.",
          email: "true",
          push: "true",
        },
      ];

      for (let i = 0; i < notifRows.length; i += 1) {
        const nr = notifRows[i];
        await fc.createNode({
          type: "rectangle",
          name: `NotifDivider-${i}`,
          parent: notifCard.id,
          width: 632,
          height: 1,
          props: { sizingH: "fill", fill: { $var: "color/border" } },
        });
        const row = await fc.createNode({
          type: "frame",
          name: `NotifRow/${nr.title}`,
          parent: notifCard.id,
          width: 632,
          height: 46,
          props: {
            layout: "horizontal",
            sizingH: "fill",
            sizingV: "hug",
            mainAlign: "spaceBetween",
            crossAlign: "center",
            gap: 16,
            fill: "none",
          },
        });
        const copy = await fc.createNode({
          type: "frame",
          name: "Copy",
          parent: row.id,
          width: 450,
          height: 40,
          props: { layout: "vertical", sizingH: "fill", sizingV: "hug", gap: 3, fill: "none" },
        });
        await createText(fc, copy.id, "Title", nr.title, {
          fontSize: 14,
          fontStyle: "SemiBold",
          fill: { $var: "color/default-900" },
        });
        await createText(fc, copy.id, "Desc", nr.desc, {
          fontSize: 12,
          fill: { $var: "color/muted-foreground" },
        });

        const swGroup = await fc.createNode({
          type: "frame",
          name: "Switches",
          parent: row.id,
          width: 140,
          height: 24,
          props: {
            layout: "horizontal",
            sizingH: "fixed",
            mainAlign: "spaceBetween",
            crossAlign: "center",
            fill: "none",
          },
        });
        const swEmail = await fc.cmd("instance.create", {
          component: comps.swSetId,
          parent: swGroup.id,
        });
        await fc.cmd("instance.setProperties", {
          ids: [swEmail.id],
          properties: { checked: nr.email, color: "primary" },
        });
        const swPush = await fc.cmd("instance.create", {
          component: comps.swSetId,
          parent: swGroup.id,
        });
        await fc.cmd("instance.setProperties", {
          ids: [swPush.id],
          properties: { checked: nr.push, color: "primary" },
        });
      }

      // Right Side: Digest & Quiet Hours
      const digestCard = await createSettingCard(rightCol.id, "QuietHoursCard", 392);
      await createText(fc, digestCard.id, "Title", "Digest & Quiet Hours", {
        fontSize: 16,
        fontStyle: "SemiBold",
        fill: { $var: "color/default-900" },
      });

      const freqField = await fc.createNode({
        type: "frame",
        name: "DigestFrequency",
        parent: digestCard.id,
        width: 344,
        height: 64,
        props: { layout: "vertical", sizingH: "fill", sizingV: "hug", gap: 6, fill: "none" },
      });
      await createText(fc, freqField.id, "Label", "Email Digest Cadence", {
        fontSize: 12,
        fontStyle: "Medium",
        fill: { $var: "color/default-700" },
      });
      const freqSel = await fc.cmd("instance.create", {
        component: comps.selectCompId,
        parent: freqField.id,
      });
      await fc.cmd("instance.setProperties", {
        ids: [freqSel.id],
        properties: { placeholder: "Daily Summary — 09:00 AM" },
      });
      await fc.setProps(freqSel.id, { sizingH: "fill" });

      await createToggleRow(
        digestCard.id,
        "Do Not Disturb",
        "Pause push notifications from 22:00 to 07:00.",
        "true",
        "dark"
      );
      await createToggleRow(
        digestCard.id,
        "Slack Forwarder",
        "Mirror critical alerts to #ops-alerts channel.",
        "false",
        "primary"
      );
      await createToggleRow(
        digestCard.id,
        "Desktop Sound",
        "Play subtle chime for direct mentions.",
        "true",
        "primary"
      );
    } else {
      // Tab 3: Security
      const pwdCard = await createSettingCard(leftCol.id, "ChangePasswordCard", 680);
      await createText(fc, pwdCard.id, "Title", "Password & Credentials", {
        fontSize: 16,
        fontStyle: "SemiBold",
        fill: { $var: "color/default-900" },
      });
      await createLabeledInput(pwdCard.id, "Current Password", "••••••••••••");

      const pwdRow = await fc.createNode({
        type: "frame",
        name: "NewPasswordRow",
        parent: pwdCard.id,
        width: 632,
        height: 62,
        props: { layout: "horizontal", sizingH: "fill", sizingV: "hug", gap: 16, fill: "none" },
      });
      await createLabeledInput(pwdRow.id, "New Password", "Min. 12 characters");
      await createLabeledInput(pwdRow.id, "Confirm Password", "Re-enter new password");

      const strengthProg = await fc.cmd("instance.create", {
        component: comps.progressSetId,
        parent: pwdCard.id,
      });
      await fc.cmd("instance.setProperties", {
        ids: [strengthProg.id],
        properties: { color: "success", size: "md" },
      });
      await fc.setProps(strengthProg.id, { sizingH: "fill", height: 8 });
      await createText(
        fc,
        pwdCard.id,
        "StrengthText",
        "Password strength: Strong (uppercase, number & symbol included)",
        { fontSize: 11, fill: { $var: "color/success" } }
      );

      const pwdFoot = await fc.createNode({
        type: "frame",
        name: "PasswordFooter",
        parent: pwdCard.id,
        width: 632,
        height: 40,
        props: {
          layout: "horizontal",
          sizingH: "fill",
          mainAlign: "max",
          fill: "none",
        },
      });
      const updatePwdBtn = await fc.cmd("instance.create", {
        component: comps.buttonSetId,
        parent: pwdFoot.id,
      });
      await fc.cmd("instance.setProperties", {
        ids: [updatePwdBtn.id],
        properties: {
          color: "dark",
          variant: "solid",
          size: "default",
          label: "Update Password",
        },
      });

      // Active Sessions Card
      const sessionsCard = await createSettingCard(leftCol.id, "ActiveSessionsCard", 680);
      const sessHead = await fc.createNode({
        type: "frame",
        name: "SessionsHeader",
        parent: sessionsCard.id,
        width: 632,
        height: 36,
        props: {
          layout: "horizontal",
          sizingH: "fill",
          mainAlign: "spaceBetween",
          crossAlign: "center",
          fill: "none",
        },
      });
      await createText(fc, sessHead.id, "Title", "Active Sessions", {
        fontSize: 16,
        fontStyle: "SemiBold",
        fill: { $var: "color/default-900" },
      });
      const signOutAllBtn = await fc.cmd("instance.create", {
        component: comps.buttonSetId,
        parent: sessHead.id,
      });
      await fc.cmd("instance.setProperties", {
        ids: [signOutAllBtn.id],
        properties: {
          color: "destructive",
          variant: "soft",
          size: "default",
          label: "Sign out all",
        },
      });
      await fc.setProps(signOutAllBtn.id, { height: 34 });

      const sessions = [
        {
          device: "MacBook Pro 16\" · Chrome 131",
          meta: "Jakarta, ID · 103.42.19.8 · Current session",
          current: true,
        },
        {
          device: "Ubuntu Workstation · FigCraft CLI",
          meta: "Jakarta, ID · 103.42.19.12 · Active 14 mins ago",
          current: false,
        },
        {
          device: "iPhone 15 Pro · Safari Mobile",
          meta: "Bandung, ID · 182.1.74.22 · Yesterday",
          current: false,
        },
      ];
      for (let i = 0; i < sessions.length; i += 1) {
        const s = sessions[i];
        await fc.createNode({
          type: "rectangle",
          name: `SessDivider-${i}`,
          parent: sessionsCard.id,
          width: 632,
          height: 1,
          props: { sizingH: "fill", fill: { $var: "color/border" } },
        });
        const sRow = await fc.createNode({
          type: "frame",
          name: `Session/${s.device}`,
          parent: sessionsCard.id,
          width: 632,
          height: 44,
          props: {
            layout: "horizontal",
            sizingH: "fill",
            sizingV: "hug",
            mainAlign: "spaceBetween",
            crossAlign: "center",
            fill: "none",
          },
        });
        const sCopy = await fc.createNode({
          type: "frame",
          name: "Copy",
          parent: sRow.id,
          width: 440,
          height: 38,
          props: { layout: "vertical", sizingH: "fill", sizingV: "hug", gap: 3, fill: "none" },
        });
        await createText(fc, sCopy.id, "Device", s.device, {
          fontSize: 13,
          fontStyle: "SemiBold",
          fill: { $var: "color/default-900" },
        });
        await createText(fc, sCopy.id, "Meta", s.meta, {
          fontSize: 11,
          fill: { $var: "color/muted-foreground" },
        });
        if (s.current) {
          const curBadge = await fc.cmd("instance.create", {
            component: comps.badgeSetId,
            parent: sRow.id,
          });
          await fc.cmd("instance.setProperties", {
            ids: [curBadge.id],
            properties: { color: "success", variant: "soft", label: "Current" },
          });
        } else {
          const revBtn = await fc.cmd("instance.create", {
            component: comps.buttonSetId,
            parent: sRow.id,
          });
          await fc.cmd("instance.setProperties", {
            ids: [revBtn.id],
            properties: {
              color: "secondary",
              variant: "outline",
              size: "sm",
              label: "Revoke",
            },
          });
        }
      }

      // Right Side: 2FA + Security Audit Alert
      const twoFaCard = await createSettingCard(rightCol.id, "TwoFactorCard", 392);
      const twoFaHead = await fc.createNode({
        type: "frame",
        name: "Header",
        parent: twoFaCard.id,
        width: 344,
        height: 28,
        props: {
          layout: "horizontal",
          sizingH: "fill",
          mainAlign: "spaceBetween",
          crossAlign: "center",
          fill: "none",
        },
      });
      await createText(fc, twoFaHead.id, "Title", "Two-Factor Auth", {
        fontSize: 16,
        fontStyle: "SemiBold",
        fill: { $var: "color/default-900" },
      });
      const twoFaBadge = await fc.cmd("instance.create", {
        component: comps.badgeSetId,
        parent: twoFaHead.id,
      });
      await fc.cmd("instance.setProperties", {
        ids: [twoFaBadge.id],
        properties: { color: "success", variant: "soft", label: "Enabled" },
      });

      await createToggleRow(
        twoFaCard.id,
        "Authenticator App",
        "TOTP codes via Google Authenticator or 1Password (8 recovery codes left).",
        "true",
        "primary"
      );
      await createToggleRow(
        twoFaCard.id,
        "Hardware Passkey",
        "Sign in faster using WebAuthn / YubiKey security key.",
        "false",
        "primary"
      );

      const passkeyBtn = await fc.cmd("instance.create", {
        component: comps.buttonSetId,
        parent: twoFaCard.id,
      });
      await fc.cmd("instance.setProperties", {
        ids: [passkeyBtn.id],
        properties: {
          color: "secondary",
          variant: "outline",
          size: "sm",
          label: "+ Register New Passkey",
        },
      });
      await fc.setProps(passkeyBtn.id, { sizingH: "fill" });

      const secAlert = await fc.cmd("instance.create", {
        component: comps.alertSetId,
        parent: rightCol.id,
      });
      await fc.cmd("instance.setProperties", {
        ids: [secAlert.id],
        properties: {
          color: "info",
          variant: "soft",
          title: "Audit Log Retention Active",
          description:
            "All authentication events and API key changes are logged for 90 days.",
        },
      });
      await fc.setProps(secAlert.id, { sizingH: "fill" });
    }
  };

  await createAccountScreen({
    name: "Account Setting — Account Page / Light",
    x: 40,
    y: 40,
    mode: "Light",
    activeTab: "account",
  });
  await createAccountScreen({
    name: "Account Setting — Notifications / Light",
    x: 1540,
    y: 40,
    mode: "Light",
    activeTab: "notifications",
  });
  await createAccountScreen({
    name: "Account Setting — Security / Light",
    x: 40,
    y: 990,
    mode: "Light",
    activeTab: "security",
  });
  await createAccountScreen({
    name: "Account Setting — Account Page / Dark",
    x: 1540,
    y: 990,
    mode: "Dark",
    activeTab: "account",
  });
}

async function buildRbacPages(fc, comps) {
  const rbacMenuItems = (activeLabel) => [
    { label: "Permissions", icon: "⚿", active: activeLabel === "Permissions" },
    { label: "Roles", icon: "🛡", active: activeLabel === "Roles" },
    { label: "Team Members", icon: "◎", active: activeLabel === "Team Members" },
    { label: "Org Setting", icon: "⚙", active: activeLabel === "Org Setting" },
  ];

  const createRbacCard = async (parent, name, width) =>
    fc.createNode({
      type: "frame",
      name,
      parent,
      width,
      height: 160,
      props: {
        layout: "vertical",
        sizingH: "fill",
        sizingV: "hug",
        gap: 16,
        padding: 20,
        cornerRadius: 12,
        fill: { $var: "color/card" },
        stroke: { $var: "color/border" },
        strokeWeight: 1,
      },
    });

  const createRbacPageHeader = async (
    parent,
    title,
    subtitle,
    ctaLabel,
    badgeLabel = null
  ) => {
    const row = await fc.createNode({
      type: "frame",
      name: "PageHeader",
      parent,
      width: 1092,
      height: 52,
      props: {
        layout: "horizontal",
        sizingH: "fill",
        sizingV: "hug",
        mainAlign: "spaceBetween",
        crossAlign: "center",
        fill: "none",
      },
    });
    const titles = await fc.createNode({
      type: "frame",
      name: "Titles",
      parent: row.id,
      width: 620,
      height: 48,
      props: { layout: "vertical", sizingH: "hug", sizingV: "hug", gap: 4, fill: "none" },
    });
    await createText(fc, titles.id, "Title", title, {
      fontSize: 22,
      fontStyle: "Bold",
      fill: { $var: "color/default-900" },
    });
    await createText(fc, titles.id, "Subtitle", subtitle, {
      fontSize: 13,
      fill: { $var: "color/muted-foreground" },
    });

    if (ctaLabel) {
      const btn = await fc.cmd("instance.create", {
        component: comps.buttonSetId,
        parent: row.id,
      });
      await fc.cmd("instance.setProperties", {
        ids: [btn.id],
        properties: {
          color: "dark",
          variant: "solid",
          size: "default",
          label: ctaLabel,
        },
      });
    } else if (badgeLabel) {
      const b = await fc.cmd("instance.create", {
        component: comps.badgeSetId,
        parent: row.id,
      });
      await fc.cmd("instance.setProperties", {
        ids: [b.id],
        properties: { color: "default", variant: "soft", label: badgeLabel },
      });
    }
  };

  const createLabeledField = async (parent, label, placeholder) => {
    const col = await fc.createNode({
      type: "frame",
      name: `Field/${label}`,
      parent,
      width: 280,
      height: 58,
      props: { layout: "vertical", sizingH: "fill", sizingV: "hug", gap: 6, fill: "none" },
    });
    await createText(fc, col.id, "Label", label, {
      fontSize: 12,
      fontStyle: "Medium",
      fill: { $var: "color/default-700" },
    });
    const inp = await fc.cmd("instance.create", {
      component: comps.inputSetId,
      parent: col.id,
    });
    await fc.cmd("instance.setProperties", {
      ids: [inp.id],
      properties: {
        variant: "bordered",
        color: "default",
        size: "md",
        placeholder,
      },
    });
    await fc.setProps(inp.id, { sizingH: "fill" });
  };

  const createPolicyToggle = async (parent, title, desc, checked, color = "primary") => {
    const row = await fc.createNode({
      type: "frame",
      name: `Policy/${title}`,
      parent,
      width: 320,
      height: 44,
      props: {
        layout: "horizontal",
        sizingH: "fill",
        sizingV: "hug",
        mainAlign: "spaceBetween",
        crossAlign: "center",
        gap: 12,
        fill: "none",
      },
    });
    const copy = await fc.createNode({
      type: "frame",
      name: "Copy",
      parent: row.id,
      width: 250,
      height: 36,
      props: { layout: "vertical", sizingH: "fill", sizingV: "hug", gap: 3, fill: "none" },
    });
    await createText(fc, copy.id, "Title", title, {
      fontSize: 13,
      fontStyle: "SemiBold",
      fill: { $var: "color/default-900" },
    });
    await createText(fc, copy.id, "Desc", desc, {
      fontSize: 11,
      fill: { $var: "color/muted-foreground" },
      props: { sizingH: "fill", textAutoResize: "height", lineHeight: 16 },
    });
    const sw = await fc.cmd("instance.create", {
      component: comps.swSetId,
      parent: row.id,
    });
    await fc.cmd("instance.setProperties", {
      ids: [sw.id],
      properties: { checked, color },
    });
  };

  // =========================================================================
  // PAGE 1: Permissions / Access Control
  // =========================================================================
  const permPage = await fc.cmd("page.add", { name: "Permissions" });
  await fc.cmd("page.select", { id: permPage.id });
  await fc.cmd("page.setBackground", { color: "#E2E8F0" });

  const apiKeyPerms = [
    {
      key: "org:api-key:create",
      action: "create",
      actionColor: "success",
      desc: "Generate new organization API keys",
      roles: "Owner, Admin",
    },
    {
      key: "org:api-key:read",
      action: "read",
      actionColor: "info",
      desc: "Inspect metadata of a single API key",
      roles: "Owner, Admin, Developer",
    },
    {
      key: "org:api-key:list",
      action: "list",
      actionColor: "info",
      desc: "List all organization API keys",
      roles: "Owner, Admin, Developer",
    },
    {
      key: "org:api-key:update",
      action: "update",
      actionColor: "warning",
      desc: "Rotate, rename, or toggle key status",
      roles: "Owner, Admin",
    },
    {
      key: "org:api-key:delete",
      action: "delete",
      actionColor: "destructive",
      desc: "Revoke and permanently delete API keys",
      roles: "Owner",
    },
  ];

  const createPermissionsScreen = async (x, mode) => {
    const { body } = await createDashTailShell(fc, {
      name: `Permissions / ${mode}`,
      x,
      y: 40,
      width: 1440,
      height: 880,
      mode,
      railActive: "Users",
      sidebarTitle: "RBAC",
      sidebarItems: rbacMenuItems("Permissions"),
    });

    await createRbacPageHeader(
      body.id,
      "Permissions & Access Control",
      "Create, inspect, and manage granular module permission keys across your organization.",
      "+ Create Permission"
    );

    // Filter Toolbar
    const filterBar = await fc.createNode({
      type: "frame",
      name: "FilterToolbar",
      parent: body.id,
      width: 1092,
      height: 52,
      props: {
        layout: "horizontal",
        sizingH: "fill",
        sizingV: "hug",
        mainAlign: "spaceBetween",
        crossAlign: "center",
        gap: 12,
        padding: [10, 14, 10, 14],
        cornerRadius: 10,
        fill: { $var: "color/card" },
        stroke: { $var: "color/border" },
        strokeWeight: 1,
      },
    });
    const filterLeft = await fc.createNode({
      type: "frame",
      name: "Controls",
      parent: filterBar.id,
      width: 580,
      height: 36,
      props: { layout: "horizontal", sizingH: "hug", crossAlign: "center", gap: 12, fill: "none" },
    });
    const permSearch = await fc.cmd("instance.create", {
      component: comps.inputSetId,
      parent: filterLeft.id,
    });
    await fc.cmd("instance.setProperties", {
      ids: [permSearch.id],
      properties: {
        variant: "bordered",
        color: "default",
        size: "md",
        placeholder: "🔍  Search permission key (e.g. org:api-key)...",
      },
    });
    await fc.setProps(permSearch.id, { width: 320 });
    const modSel = await fc.cmd("instance.create", {
      component: comps.selectCompId,
      parent: filterLeft.id,
    });
    await fc.cmd("instance.setProperties", {
      ids: [modSel.id],
      properties: { placeholder: "Module: Api Key" },
    });
    await fc.setProps(modSel.id, { width: 190, height: 36 });

    const totalBadge = await fc.cmd("instance.create", {
      component: comps.badgeSetId,
      parent: filterBar.id,
    });
    await fc.cmd("instance.setProperties", {
      ids: [totalBadge.id],
      properties: { color: "default", variant: "soft", label: "5 Scopes Active" },
    });

    // Module Card: Api Key
    const modCard = await fc.createNode({
      type: "frame",
      name: "ModuleApiKeyCard",
      parent: body.id,
      width: 1092,
      height: 460,
      props: {
        layout: "vertical",
        sizingH: "fill",
        sizingV: "hug",
        cornerRadius: 12,
        fill: { $var: "color/card" },
        stroke: { $var: "color/border" },
        strokeWeight: 1,
      },
    });

    const modHead = await fc.createNode({
      type: "frame",
      name: "ModuleHeader",
      parent: modCard.id,
      width: 1092,
      height: 68,
      props: {
        layout: "horizontal",
        sizingH: "fill",
        sizingV: "hug",
        mainAlign: "spaceBetween",
        crossAlign: "center",
        padding: [16, 22, 16, 22],
        fill: "none",
      },
    });
    const modLeft = await fc.createNode({
      type: "frame",
      name: "Left",
      parent: modHead.id,
      width: 440,
      height: 36,
      props: { layout: "horizontal", sizingH: "hug", crossAlign: "center", gap: 10, fill: "none" },
    });
    await createText(fc, modLeft.id, "ModuleTitle", "Module: Api Key", {
      fontSize: 16,
      fontStyle: "SemiBold",
      fill: { $var: "color/default-900" },
    });
    const scopeCount = await fc.cmd("instance.create", {
      component: comps.badgeSetId,
      parent: modLeft.id,
    });
    await fc.cmd("instance.setProperties", {
      ids: [scopeCount.id],
      properties: { color: "default", variant: "soft", label: "org:api-key:*" },
    });
    const addScopeBtn = await fc.cmd("instance.create", {
      component: comps.buttonSetId,
      parent: modHead.id,
    });
    await fc.cmd("instance.setProperties", {
      ids: [addScopeBtn.id],
      properties: {
        color: "secondary",
        variant: "outline",
        size: "sm",
        label: "+ Add Scope",
      },
    });

    await fc.createNode({
      type: "rectangle",
      name: "ModHeadDivider",
      parent: modCard.id,
      width: 1092,
      height: 1,
      props: { sizingH: "fill", fill: { $var: "color/border" } },
    });

    const tbl = await fc.createNode({
      type: "frame",
      name: "PermissionsTable",
      parent: modCard.id,
      width: 1092,
      height: 360,
      props: {
        layout: "vertical",
        sizingH: "fill",
        sizingV: "hug",
        padding: [0, 22, 8, 22],
        fill: "none",
      },
    });
    const pCols = [
      { label: "Permission Key", width: 230 },
      { label: "Action", width: 105 },
      { label: "Description", width: 325 },
      { label: "Assigned Roles", width: 190 },
      { label: "Enabled", width: 95 },
      { label: "Actions", width: 100 },
    ];
    const pHead = await fc.createNode({
      type: "frame",
      name: "TableHeader",
      parent: tbl.id,
      width: 1048,
      height: 44,
      props: { layout: "horizontal", sizingH: "fill", sizingV: "fixed", crossAlign: "center", fill: "none" },
    });
    for (const c of pCols) {
      const hCell = await fc.createNode({
        type: "frame",
        name: `Head/${c.label}`,
        parent: pHead.id,
        width: c.width,
        height: 44,
        props: {
          layout: "horizontal",
          sizingH: c.label === "Description" ? "fill" : "fixed",
          mainAlign: c.label === "Actions" ? "center" : "min",
          crossAlign: "center",
          fill: "none",
        },
      });
      await createText(fc, hCell.id, "Label", c.label, {
        fontSize: 12,
        fontStyle: "SemiBold",
        fill: { $var: "color/muted-foreground" },
      });
    }
    await fc.createNode({
      type: "rectangle",
      name: "TblHeadDiv",
      parent: tbl.id,
      width: 1048,
      height: 1,
      props: { sizingH: "fill", fill: { $var: "color/border" } },
    });

    for (let i = 0; i < apiKeyPerms.length; i += 1) {
      const p = apiKeyPerms[i];
      const tr = await fc.createNode({
        type: "frame",
        name: `Perm/${p.key}`,
        parent: tbl.id,
        width: 1048,
        height: 62,
        props: {
          layout: "horizontal",
          sizingH: "fill",
          sizingV: "fixed",
          crossAlign: "center",
          fill: "none",
        },
      });

      const keyCell = await fc.createNode({
        type: "frame",
        name: "KeyCell",
        parent: tr.id,
        width: 230,
        height: 62,
        props: { layout: "horizontal", sizingH: "fixed", crossAlign: "center", fill: "none" },
      });
      const keyPill = await fc.createNode({
        type: "frame",
        name: "CodeTag",
        parent: keyCell.id,
        width: 170,
        height: 28,
        props: {
          layout: "horizontal",
          sizingH: "hug",
          crossAlign: "center",
          padding: [4, 10, 4, 10],
          cornerRadius: 6,
          fill: { $var: "color/muted" },
        },
      });
      await createText(fc, keyPill.id, "Scope", p.key, {
        fontSize: 12,
        fontStyle: "SemiBold",
        fill: { $var: "color/default-900" },
      });

      const actCell = await fc.createNode({
        type: "frame",
        name: "ActionBadgeCell",
        parent: tr.id,
        width: 105,
        height: 62,
        props: { layout: "horizontal", sizingH: "fixed", crossAlign: "center", fill: "none" },
      });
      const actBadge = await fc.cmd("instance.create", {
        component: comps.badgeSetId,
        parent: actCell.id,
      });
      await fc.cmd("instance.setProperties", {
        ids: [actBadge.id],
        properties: { color: p.actionColor, variant: "soft", label: p.action },
      });

      const descCell = await fc.createNode({
        type: "frame",
        name: "DescCell",
        parent: tr.id,
        width: 325,
        height: 62,
        props: { layout: "horizontal", sizingH: "fill", crossAlign: "center", fill: "none" },
      });
      await createText(fc, descCell.id, "Desc", p.desc, {
        fontSize: 13,
        fill: { $var: "color/default-600" },
      });

      const rolesCell = await fc.createNode({
        type: "frame",
        name: "RolesCell",
        parent: tr.id,
        width: 190,
        height: 62,
        props: { layout: "horizontal", sizingH: "fixed", crossAlign: "center", fill: "none" },
      });
      await createText(fc, rolesCell.id, "Roles", p.roles, {
        fontSize: 12,
        fontStyle: "Medium",
        fill: { $var: "color/default-700" },
      });

      const swCell = await fc.createNode({
        type: "frame",
        name: "SwitchCell",
        parent: tr.id,
        width: 95,
        height: 62,
        props: { layout: "horizontal", sizingH: "fixed", crossAlign: "center", fill: "none" },
      });
      const pSw = await fc.cmd("instance.create", {
        component: comps.swSetId,
        parent: swCell.id,
      });
      await fc.cmd("instance.setProperties", {
        ids: [pSw.id],
        properties: { checked: "true", color: "primary" },
      });

      const crudCell = await fc.createNode({
        type: "frame",
        name: "CrudCell",
        parent: tr.id,
        width: 100,
        height: 62,
        props: {
          layout: "horizontal",
          sizingH: "fixed",
          mainAlign: "center",
          crossAlign: "center",
          gap: 8,
          fill: "none",
        },
      });
      await createText(fc, crudCell.id, "Edit", "✎", {
        fontSize: 14,
        fill: { $var: "color/default-600" },
      });
      const delBtn = await fc.cmd("instance.create", {
        component: comps.buttonSetId,
        parent: crudCell.id,
      });
      await fc.cmd("instance.setProperties", {
        ids: [delBtn.id],
        properties: {
          color: "destructive",
          variant: "soft",
          size: "icon",
        },
      });
      await fc.setProps(delBtn.id, { width: 32, height: 32 });

      if (i < apiKeyPerms.length - 1) {
        await fc.createNode({
          type: "rectangle",
          name: `PermDiv-${i}`,
          parent: tbl.id,
          width: 1048,
          height: 1,
          props: { sizingH: "fill", fill: { $var: "color/border" } },
        });
      }
    }

    // Secondary Module Summary Card
    const otherCard = await fc.createNode({
      type: "frame",
      name: "ModuleMemberSummary",
      parent: body.id,
      width: 1092,
      height: 68,
      props: {
        layout: "horizontal",
        sizingH: "fill",
        sizingV: "hug",
        mainAlign: "spaceBetween",
        crossAlign: "center",
        padding: [16, 22, 16, 22],
        cornerRadius: 12,
        fill: { $var: "color/card" },
        stroke: { $var: "color/border" },
        strokeWeight: 1,
      },
    });
    const otherLeft = await fc.createNode({
      type: "frame",
      name: "Left",
      parent: otherCard.id,
      width: 480,
      height: 30,
      props: { layout: "horizontal", sizingH: "hug", crossAlign: "center", gap: 10, fill: "none" },
    });
    await createText(fc, otherLeft.id, "Title", "Module: Team & Organization", {
      fontSize: 15,
      fontStyle: "SemiBold",
      fill: { $var: "color/default-900" },
    });
    const otherBadge = await fc.cmd("instance.create", {
      component: comps.badgeSetId,
      parent: otherLeft.id,
    });
    await fc.cmd("instance.setProperties", {
      ids: [otherBadge.id],
      properties: { color: "secondary", variant: "solid", label: "org:member:*" },
    });
    await createText(fc, otherCard.id, "Count", "7 scopes configured  ▸", {
      fontSize: 13,
      fontStyle: "Medium",
      fill: { $var: "color/muted-foreground" },
    });
  };

  await createPermissionsScreen(40, "Light");
  await createPermissionsScreen(1540, "Dark");

  // =========================================================================
  // PAGE 2: Roles + Assign Access Control
  // =========================================================================
  const rolesPage = await fc.cmd("page.add", { name: "Roles" });
  await fc.cmd("page.select", { id: rolesPage.id });
  await fc.cmd("page.setBackground", { color: "#E2E8F0" });

  const roleDefs = [
    {
      name: "Owner",
      key: "org:owner",
      members: "2 members · 12 perms",
      system: true,
      active: false,
    },
    {
      name: "Admin",
      key: "org:admin",
      members: "3 members · 10 perms",
      system: false,
      active: true,
    },
    {
      name: "Developer",
      key: "org:developer",
      members: "6 members · 5 perms",
      system: false,
      active: false,
    },
    {
      name: "Viewer",
      key: "org:viewer",
      members: "3 members · 2 perms",
      system: false,
      active: false,
    },
  ];

  const createRolesScreen = async (x, mode) => {
    const { body } = await createDashTailShell(fc, {
      name: `Roles / ${mode}`,
      x,
      y: 40,
      width: 1440,
      height: 900,
      mode,
      railActive: "Users",
      sidebarTitle: "RBAC",
      sidebarItems: rbacMenuItems("Roles"),
    });

    await createRbacPageHeader(
      body.id,
      "Roles & Access Assignment",
      "Create custom roles and assign module-level access control permissions.",
      "+ Create Role"
    );

    const workspace = await fc.createNode({
      type: "frame",
      name: "RolesWorkspace",
      parent: body.id,
      width: 1092,
      height: 700,
      props: {
        layout: "horizontal",
        sizingH: "fill",
        sizingV: "hug",
        gap: 20,
        fill: "none",
      },
    });

    // Left Role List Card (320px)
    const roleListCard = await fc.createNode({
      type: "frame",
      name: "RoleListCard",
      parent: workspace.id,
      width: 320,
      height: 520,
      props: {
        layout: "vertical",
        sizingH: "fixed",
        sizingV: "hug",
        gap: 12,
        padding: 18,
        cornerRadius: 12,
        fill: { $var: "color/card" },
        stroke: { $var: "color/border" },
        strokeWeight: 1,
      },
    });
    const roleSearch = await fc.cmd("instance.create", {
      component: comps.inputSetId,
      parent: roleListCard.id,
    });
    await fc.cmd("instance.setProperties", {
      ids: [roleSearch.id],
      properties: {
        variant: "bordered",
        color: "default",
        size: "md",
        placeholder: "🔍  Filter roles...",
      },
    });
    await fc.setProps(roleSearch.id, { sizingH: "fill" });

    for (const r of roleDefs) {
      const rItem = await fc.createNode({
        type: "frame",
        name: `Role/${r.name}`,
        parent: roleListCard.id,
        width: 284,
        height: 72,
        props: {
          layout: "vertical",
          sizingH: "fill",
          sizingV: "hug",
          gap: 6,
          padding: 14,
          cornerRadius: 10,
          fill: r.active ? { $var: "color/primary-soft" } : { $var: "color/background" },
          stroke: r.active ? { $var: "color/primary" } : { $var: "color/border" },
          strokeWeight: 1,
        },
      });
      const top = await fc.createNode({
        type: "frame",
        name: "Top",
        parent: rItem.id,
        width: 256,
        height: 22,
        props: {
          layout: "horizontal",
          sizingH: "fill",
          mainAlign: "spaceBetween",
          crossAlign: "center",
          fill: "none",
        },
      });
      await createText(fc, top.id, "Name", r.name, {
        fontSize: 14,
        fontStyle: "SemiBold",
        fill: r.active ? { $var: "color/primary" } : { $var: "color/default-900" },
      });
      await createText(fc, top.id, "Key", r.key, {
        fontSize: 11,
        fill: { $var: "color/muted-foreground" },
      });
      await createText(fc, rItem.id, "Meta", r.members, {
        fontSize: 12,
        fill: { $var: "color/muted-foreground" },
      });
    }

    // Right Role Editor + Assign Access Control
    const editorCard = await createRbacCard(workspace.id, "RoleEditorCard", 752);
    const edHead = await fc.createNode({
      type: "frame",
      name: "EditorHeader",
      parent: editorCard.id,
      width: 712,
      height: 36,
      props: {
        layout: "horizontal",
        sizingH: "fill",
        mainAlign: "spaceBetween",
        crossAlign: "center",
        fill: "none",
      },
    });
    await createText(fc, edHead.id, "Title", "Edit Role: Admin", {
      fontSize: 17,
      fontStyle: "SemiBold",
      fill: { $var: "color/default-900" },
    });
    const customBadge = await fc.cmd("instance.create", {
      component: comps.badgeSetId,
      parent: edHead.id,
    });
    await fc.cmd("instance.setProperties", {
      ids: [customBadge.id],
      properties: { color: "default", variant: "soft", label: "3 Assigned Members" },
    });

    const roleFields = await fc.createNode({
      type: "frame",
      name: "RoleFields",
      parent: editorCard.id,
      width: 712,
      height: 60,
      props: { layout: "horizontal", sizingH: "fill", sizingV: "hug", gap: 14, fill: "none" },
    });
    await createLabeledField(roleFields.id, "Role Name", "Admin");
    await createLabeledField(roleFields.id, "Role Identifier", "org:admin");

    await createLabeledField(
      editorCard.id,
      "Description",
      "Manage organization API keys, team roles, and integrations."
    );

    await fc.createNode({
      type: "rectangle",
      name: "AssignDivider",
      parent: editorCard.id,
      width: 712,
      height: 1,
      props: { sizingH: "fill", fill: { $var: "color/border" } },
    });

    await createText(fc, editorCard.id, "AssignHeading", "Assign Access Control", {
      fontSize: 15,
      fontStyle: "SemiBold",
      fill: { $var: "color/default-900" },
    });

    const assignGroups = [
      {
        module: "Module: Api Key",
        count: "4 / 5",
        expanded: true,
        perms: [
          { key: "org:api-key:create", checked: "true" },
          { key: "org:api-key:read", checked: "true" },
          { key: "org:api-key:list", checked: "true" },
          { key: "org:api-key:update", checked: "true" },
          { key: "org:api-key:delete", checked: "false" },
        ],
      },
      {
        module: "Module: Organization & Members",
        count: "2 / 4",
        expanded: true,
        perms: [
          { key: "org:member:invite", checked: "true" },
          { key: "org:member:assign-role", checked: "true" },
          { key: "org:settings:update", checked: "false" },
          { key: "org:member:remove", checked: "false" },
        ],
      },
      {
        module: "Module: Billing & Invoices",
        count: "0 / 3",
        expanded: false,
        perms: [],
      },
    ];

    for (const grp of assignGroups) {
      const accItem = await fc.createNode({
        type: "frame",
        name: `Accordion/${grp.module}`,
        parent: editorCard.id,
        width: 712,
        height: grp.expanded ? 150 : 48,
        props: {
          layout: "vertical",
          sizingH: "fill",
          sizingV: "hug",
          cornerRadius: 8,
          fill: { $var: "color/background" },
          stroke: { $var: "color/border" },
          strokeWeight: 1,
        },
      });

      const accTrigger = await fc.createNode({
        type: "frame",
        name: "AccordionTrigger",
        parent: accItem.id,
        width: 712,
        height: 46,
        props: {
          layout: "horizontal",
          sizingH: "fill",
          sizingV: "fixed",
          mainAlign: "spaceBetween",
          crossAlign: "center",
          padding: [10, 14, 10, 14],
          fill: "none",
        },
      });
      const trigLeft = await fc.createNode({
        type: "frame",
        name: "Left",
        parent: accTrigger.id,
        width: 340,
        height: 24,
        props: { layout: "horizontal", sizingH: "hug", crossAlign: "center", gap: 10, fill: "none" },
      });
      await createText(fc, trigLeft.id, "ModuleName", grp.module, {
        fontSize: 13,
        fontStyle: "SemiBold",
        fill: { $var: "color/default-900" },
      });
      const cntBadge = await fc.cmd("instance.create", {
        component: comps.badgeSetId,
        parent: trigLeft.id,
      });
      await fc.cmd("instance.setProperties", {
        ids: [cntBadge.id],
        properties: {
          color: grp.expanded ? "default" : "secondary",
          variant: grp.expanded ? "soft" : "solid",
          label: grp.count,
        },
      });

      await fc.createNode({
        type: "vector",
        name: "Chevron",
        parent: accTrigger.id,
        width: 10,
        height: 6,
        path: grp.expanded ? "M18 15l-6-6-6 6" : "M6 9l6 6 6-6",
        props: {
          fill: "none",
          stroke: { $var: "color/default-600" },
          strokeWeight: 1.8,
          strokeCap: "round",
          strokeJoin: "round",
        },
      });

      if (grp.expanded) {
        await fc.createNode({
          type: "rectangle",
          name: "AccordionDivider",
          parent: accItem.id,
          width: 712,
          height: 1,
          props: { sizingH: "fill", fill: { $var: "color/border" } },
        });
        const accGrid = await fc.createNode({
          type: "frame",
          name: "AccordionContent2Col",
          parent: accItem.id,
          width: 712,
          height: 100,
          props: {
            layout: "horizontal",
            wrap: true,
            gap: 12,
            crossGap: 12,
            padding: 14,
            sizingH: "fill",
            sizingV: "hug",
            fill: "none",
          },
        });
        for (const perm of grp.perms) {
          const cbCell = await fc.createNode({
            type: "frame",
            name: `Cell/${perm.key}`,
            parent: accGrid.id,
            width: 314,
            height: 28,
            props: {
              layout: "horizontal",
              sizingH: "fixed",
              sizingV: "hug",
              crossAlign: "center",
              fill: "none",
            },
          });
          const cb = await fc.cmd("instance.create", {
            component: comps.cbSetId,
            parent: cbCell.id,
          });
          await fc.cmd("instance.setProperties", {
            ids: [cb.id],
            properties: {
              checked: perm.checked,
              color: "default",
              label: perm.key,
            },
          });
        }
      }
    }

    const edFoot = await fc.createNode({
      type: "frame",
      name: "EditorFooter",
      parent: editorCard.id,
      width: 712,
      height: 40,
      props: {
        layout: "horizontal",
        sizingH: "fill",
        mainAlign: "spaceBetween",
        crossAlign: "center",
        fill: "none",
      },
    });
    const delRoleBtn = await fc.cmd("instance.create", {
      component: comps.buttonSetId,
      parent: edFoot.id,
    });
    await fc.cmd("instance.setProperties", {
      ids: [delRoleBtn.id],
      properties: {
        color: "destructive",
        variant: "soft",
        size: "default",
        label: "Delete Role",
      },
    });
    const saveRoleBtn = await fc.cmd("instance.create", {
      component: comps.buttonSetId,
      parent: edFoot.id,
    });
    await fc.cmd("instance.setProperties", {
      ids: [saveRoleBtn.id],
      properties: {
        color: "default",
        variant: "solid",
        size: "default",
        label: "Save Permissions",
      },
    });
  };

  await createRolesScreen(40, "Light");
  await createRolesScreen(1540, "Dark");

  // =========================================================================
  // PAGE 3: Org Team Member + Assign Role
  // =========================================================================
  const membersPage = await fc.cmd("page.add", { name: "Team Members" });
  await fc.cmd("page.select", { id: membersPage.id });
  await fc.cmd("page.setBackground", { color: "#E2E8F0" });

  const members = [
    {
      name: "Amir Mufid",
      email: "amir@dashtail.dev",
      avatar: "avatar-1.jpg",
      role: "Owner",
      status: "Active",
      statusColor: "success",
      joined: "12 Jan, 2025",
    },
    {
      name: "Georgeanna Ramero",
      email: "georgeanna@dashtail.dev",
      avatar: "avatar-2.jpg",
      role: "Admin",
      status: "Active",
      statusColor: "success",
      joined: "04 Feb, 2025",
    },
    {
      name: "Alda Ziemer",
      email: "alda@dashtail.dev",
      avatar: "avatar-3.jpg",
      role: "Developer",
      status: "Active",
      statusColor: "success",
      joined: "19 Mar, 2025",
    },
    {
      name: "Dalton Paden",
      email: "dalton@dashtail.dev",
      avatar: "avatar-4.jpg",
      role: "Developer",
      status: "Active",
      statusColor: "success",
      joined: "02 Apr, 2025",
    },
    {
      name: "Cami Macha",
      email: "cami@dashtail.dev",
      avatar: "avatar-5.jpg",
      role: "Viewer",
      status: "Pending",
      statusColor: "warning",
      joined: "Invited today",
    },
  ];

  const createMembersScreen = async ({ name, x, y, mode, view }) => {
    const { body } = await createDashTailShell(fc, {
      name,
      x,
      y,
      width: 1440,
      height: view === "grid" ? 940 : 880,
      mode,
      railActive: "Users",
      sidebarTitle: "RBAC",
      sidebarItems: rbacMenuItems("Team Members"),
    });

    await createRbacPageHeader(
      body.id,
      "Organization Team Members",
      "Invite team members, manage seat access, and assign organization RBAC roles.",
      "+ Invite Member"
    );

    // 3 KPI Mini Cards
    const kpiRow = await fc.createNode({
      type: "frame",
      name: "SeatSummary",
      parent: body.id,
      width: 1092,
      height: 88,
      props: { layout: "horizontal", sizingH: "fill", sizingV: "hug", gap: 16, fill: "none" },
    });
    for (const k of [
      { label: "Total Members", val: "14", sub: "+2 joined this month" },
      { label: "Active Seats", val: "12 / 20", sub: "Pro Organization Plan" },
      { label: "Pending Invites", val: "2", sub: "Awaiting acceptance" },
    ]) {
      const kCard = await fc.createNode({
        type: "frame",
        name: `KPI/${k.label}`,
        parent: kpiRow.id,
        width: 350,
        height: 86,
        props: {
          layout: "vertical",
          sizingH: "fill",
          sizingV: "hug",
          gap: 4,
          padding: 16,
          cornerRadius: 10,
          fill: { $var: "color/card" },
          stroke: { $var: "color/border" },
          strokeWeight: 1,
        },
      });
      await createText(fc, kCard.id, "Label", k.label, {
        fontSize: 12,
        fill: { $var: "color/muted-foreground" },
      });
      await createText(fc, kCard.id, "Val", k.val, {
        fontSize: 22,
        fontStyle: "Bold",
        fill: { $var: "color/default-900" },
      });
      await createText(fc, kCard.id, "Sub", k.sub, {
        fontSize: 11,
        fill: { $var: "color/primary" },
      });
    }

    // Members Container Card
    const card = await fc.createNode({
      type: "frame",
      name: "MembersContainerCard",
      parent: body.id,
      width: 1092,
      height: view === "grid" ? 540 : 490,
      props: {
        layout: "vertical",
        sizingH: "fill",
        sizingV: "hug",
        cornerRadius: 12,
        fill: { $var: "color/card" },
        stroke: { $var: "color/border" },
        strokeWeight: 1,
      },
    });

    const toolbar = await fc.createNode({
      type: "frame",
      name: "TableToolbar",
      parent: card.id,
      width: 1092,
      height: 64,
      props: {
        layout: "horizontal",
        sizingH: "fill",
        sizingV: "hug",
        mainAlign: "spaceBetween",
        crossAlign: "center",
        padding: [14, 20, 14, 20],
        fill: "none",
      },
    });
    const mSearch = await fc.cmd("instance.create", {
      component: comps.inputSetId,
      parent: toolbar.id,
    });
    await fc.cmd("instance.setProperties", {
      ids: [mSearch.id],
      properties: {
        variant: "bordered",
        color: "default",
        size: "md",
        placeholder: "🔍  Search member name or email...",
      },
    });
    await fc.setProps(mSearch.id, { width: 320 });

    const toolbarRight = await fc.createNode({
      type: "frame",
      name: "ToolbarRight",
      parent: toolbar.id,
      width: 340,
      height: 36,
      props: { layout: "horizontal", sizingH: "hug", crossAlign: "center", gap: 12, fill: "none" },
    });

    const roleFilter = await fc.cmd("instance.create", {
      component: comps.selectCompId,
      parent: toolbarRight.id,
    });
    await fc.cmd("instance.setProperties", {
      ids: [roleFilter.id],
      properties: { placeholder: "Role: All Roles" },
    });
    await fc.setProps(roleFilter.id, { width: 170, height: 36 });

    // List / Grid View Switcher Pill
    const viewSwitch = await fc.createNode({
      type: "frame",
      name: "ViewModeToggle",
      parent: toolbarRight.id,
      width: 146,
      height: 36,
      props: {
        layout: "horizontal",
        sizingH: "hug",
        sizingV: "fixed",
        crossAlign: "center",
        gap: 4,
        padding: 3,
        cornerRadius: 8,
        fill: { $var: "color/background" },
        stroke: { $var: "color/border" },
        strokeWeight: 1,
      },
    });
    for (const opt of [
      { id: "list", label: "☰  List" },
      { id: "grid", label: "⊞  Grid" },
    ]) {
      const isActive = opt.id === view;
      const pill = await fc.createNode({
        type: "frame",
        name: `View/${opt.id}`,
        parent: viewSwitch.id,
        width: 68,
        height: 28,
        props: {
          layout: "horizontal",
          sizingH: "hug",
          sizingV: "fill",
          mainAlign: "center",
          crossAlign: "center",
          padding: [0, 10, 0, 10],
          cornerRadius: 6,
          fill: isActive ? { $var: "color/primary" } : "none",
        },
      });
      await createText(fc, pill.id, "Label", opt.label, {
        fontSize: 12,
        fontStyle: isActive ? "SemiBold" : "Medium",
        fill: isActive
          ? { $var: "color/primary-foreground" }
          : { $var: "color/default-600" },
      });
    }

    await fc.createNode({
      type: "rectangle",
      name: "ToolbarDivider",
      parent: card.id,
      width: 1092,
      height: 1,
      props: { sizingH: "fill", fill: { $var: "color/border" } },
    });

    if (view === "list") {
      const mTbl = await fc.createNode({
        type: "frame",
        name: "MembersTable",
        parent: card.id,
        width: 1092,
        height: 390,
        props: {
          layout: "vertical",
          sizingH: "fill",
          sizingV: "hug",
          padding: [0, 20, 8, 20],
          fill: "none",
        },
      });

      const mCols = [
        { label: "Member", width: 350 },
        { label: "Assign Role", width: 220 },
        { label: "Status", width: 130 },
        { label: "Joined", width: 170 },
        { label: "Action", width: 110 },
      ];
      const mHead = await fc.createNode({
        type: "frame",
        name: "TableHeader",
        parent: mTbl.id,
        width: 1052,
        height: 44,
        props: { layout: "horizontal", sizingH: "fill", sizingV: "fixed", crossAlign: "center", fill: "none" },
      });
      for (const c of mCols) {
        const hc = await fc.createNode({
          type: "frame",
          name: `Head/${c.label}`,
          parent: mHead.id,
          width: c.width,
          height: 44,
          props: {
            layout: "horizontal",
            sizingH: c.label === "Member" ? "fill" : "fixed",
            mainAlign: c.label === "Action" ? "center" : "min",
            crossAlign: "center",
            fill: "none",
          },
        });
        await createText(fc, hc.id, "Label", c.label, {
          fontSize: 12,
          fontStyle: "SemiBold",
          fill: { $var: "color/muted-foreground" },
        });
      }
      await fc.createNode({
        type: "rectangle",
        name: "MHeadDiv",
        parent: mTbl.id,
        width: 1052,
        height: 1,
        props: { sizingH: "fill", fill: { $var: "color/border" } },
      });

      for (let i = 0; i < members.length; i += 1) {
        const m = members[i];
        const tr = await fc.createNode({
          type: "frame",
          name: `Member/${m.name}`,
          parent: mTbl.id,
          width: 1052,
          height: 66,
          props: {
            layout: "horizontal",
            sizingH: "fill",
            sizingV: "fixed",
            crossAlign: "center",
            fill: "none",
          },
        });

        const memCell = await fc.createNode({
          type: "frame",
          name: "MemberCell",
          parent: tr.id,
          width: 350,
          height: 66,
          props: { layout: "horizontal", sizingH: "fill", crossAlign: "center", gap: 12, fill: "none" },
        });
        const avBox = await fc.createNode({
          type: "frame",
          name: "Avatar",
          parent: memCell.id,
          width: 38,
          height: 38,
          props: { cornerRadius: 999, clip: true, fill: { $var: "color/primary-soft" } },
        });
        const avFile = path.join(ROOT, "public/images/avatar", m.avatar);
        if (fs.existsSync(avFile)) {
          await fc.cmd("image.place", {
            path: avFile,
            parent: avBox.id,
            x: 0,
            y: 0,
            width: 38,
            height: 38,
            mode: "fill",
          });
        }
        const mMeta = await fc.createNode({
          type: "frame",
          name: "Meta",
          parent: memCell.id,
          width: 240,
          height: 36,
          props: { layout: "vertical", sizingH: "hug", sizingV: "hug", gap: 2, fill: "none" },
        });
        await createText(fc, mMeta.id, "Name", m.name, {
          fontSize: 13,
          fontStyle: "SemiBold",
          fill: { $var: "color/default-900" },
        });
        await createText(fc, mMeta.id, "Email", m.email, {
          fontSize: 11,
          fill: { $var: "color/muted-foreground" },
        });

        const roleCell = await fc.createNode({
          type: "frame",
          name: "RoleCell",
          parent: tr.id,
          width: 220,
          height: 66,
          props: { layout: "horizontal", sizingH: "fixed", crossAlign: "center", fill: "none" },
        });
        const roleSel = await fc.cmd("instance.create", {
          component: comps.selectCompId,
          parent: roleCell.id,
        });
        await fc.cmd("instance.setProperties", {
          ids: [roleSel.id],
          properties: { placeholder: m.role },
        });
        await fc.setProps(roleSel.id, { width: 170, height: 34 });

        const stCell = await fc.createNode({
          type: "frame",
          name: "StatusCell",
          parent: tr.id,
          width: 130,
          height: 66,
          props: { layout: "horizontal", sizingH: "fixed", crossAlign: "center", fill: "none" },
        });
        const stBadge = await fc.cmd("instance.create", {
          component: comps.badgeSetId,
          parent: stCell.id,
        });
        await fc.cmd("instance.setProperties", {
          ids: [stBadge.id],
          properties: {
            color: m.statusColor,
            variant: "soft",
            label: m.status,
          },
        });

        const joinCell = await fc.createNode({
          type: "frame",
          name: "JoinedCell",
          parent: tr.id,
          width: 170,
          height: 66,
          props: { layout: "horizontal", sizingH: "fixed", crossAlign: "center", fill: "none" },
        });
        await createText(fc, joinCell.id, "Date", m.joined, {
          fontSize: 12,
          fill: { $var: "color/default-600" },
        });

        const actCell = await fc.createNode({
          type: "frame",
          name: "ActionCell",
          parent: tr.id,
          width: 110,
          height: 66,
          props: {
            layout: "horizontal",
            sizingH: "fixed",
            mainAlign: "center",
            crossAlign: "center",
            fill: "none",
          },
        });
        const rmBtn = await fc.cmd("instance.create", {
          component: comps.buttonSetId,
          parent: actCell.id,
        });
        await fc.cmd("instance.setProperties", {
          ids: [rmBtn.id],
          properties: {
            color: "destructive",
            variant: "soft",
            size: "icon",
          },
        });
        await fc.setProps(rmBtn.id, { width: 32, height: 32 });

        if (i < members.length - 1) {
          await fc.createNode({
            type: "rectangle",
            name: `MemDiv-${i}`,
            parent: mTbl.id,
            width: 1052,
            height: 1,
            props: { sizingH: "fill", fill: { $var: "color/border" } },
          });
        }
      }
    } else {
      // 3-Column Grid View of Members
      const gridWrap = await fc.createNode({
        type: "frame",
        name: "MembersGrid",
        parent: card.id,
        width: 1092,
        height: 440,
        props: {
          layout: "horizontal",
          wrap: true,
          gap: 16,
          crossGap: 16,
          padding: 20,
          sizingH: "fill",
          sizingV: "hug",
          fill: "none",
        },
      });

      for (const m of members) {
        const mCard = await fc.createNode({
          type: "frame",
          name: `MemberCard/${m.name}`,
          parent: gridWrap.id,
          width: 336,
          height: 196,
          props: {
            layout: "vertical",
            sizingH: "fixed",
            sizingV: "hug",
            gap: 14,
            padding: 18,
            cornerRadius: 10,
            fill: { $var: "color/background" },
            stroke: { $var: "color/border" },
            strokeWeight: 1,
          },
        });

        const top = await fc.createNode({
          type: "frame",
          name: "Top",
          parent: mCard.id,
          width: 300,
          height: 44,
          props: {
            layout: "horizontal",
            sizingH: "fill",
            mainAlign: "spaceBetween",
            crossAlign: "center",
            fill: "none",
          },
        });
        const person = await fc.createNode({
          type: "frame",
          name: "Person",
          parent: top.id,
          width: 220,
          height: 44,
          props: { layout: "horizontal", sizingH: "fill", crossAlign: "center", gap: 10, fill: "none" },
        });
        const avBox = await fc.createNode({
          type: "frame",
          name: "Avatar",
          parent: person.id,
          width: 42,
          height: 42,
          props: { cornerRadius: 999, clip: true, fill: { $var: "color/primary-soft" } },
        });
        const avFile = path.join(ROOT, "public/images/avatar", m.avatar);
        if (fs.existsSync(avFile)) {
          await fc.cmd("image.place", {
            path: avFile,
            parent: avBox.id,
            x: 0,
            y: 0,
            width: 42,
            height: 42,
            mode: "fill",
          });
        }
        const mMeta = await fc.createNode({
          type: "frame",
          name: "Meta",
          parent: person.id,
          width: 165,
          height: 36,
          props: { layout: "vertical", sizingH: "fill", sizingV: "hug", gap: 2, fill: "none" },
        });
        await createText(fc, mMeta.id, "Name", m.name, {
          fontSize: 13,
          fontStyle: "SemiBold",
          fill: { $var: "color/default-900" },
        });
        await createText(fc, mMeta.id, "Email", m.email, {
          fontSize: 11,
          fill: { $var: "color/muted-foreground" },
        });

        const stBadge = await fc.cmd("instance.create", {
          component: comps.badgeSetId,
          parent: top.id,
        });
        await fc.cmd("instance.setProperties", {
          ids: [stBadge.id],
          properties: {
            color: m.statusColor,
            variant: "soft",
            label: m.status,
          },
        });

        const roleRow = await fc.createNode({
          type: "frame",
          name: "AssignRoleRow",
          parent: mCard.id,
          width: 300,
          height: 54,
          props: { layout: "vertical", sizingH: "fill", sizingV: "hug", gap: 6, fill: "none" },
        });
        await createText(fc, roleRow.id, "Label", "Assigned Role", {
          fontSize: 11,
          fontStyle: "Medium",
          fill: { $var: "color/muted-foreground" },
        });
        const roleSel = await fc.cmd("instance.create", {
          component: comps.selectCompId,
          parent: roleRow.id,
        });
        await fc.cmd("instance.setProperties", {
          ids: [roleSel.id],
          properties: { placeholder: m.role },
        });
        await fc.setProps(roleSel.id, { sizingH: "fill", height: 34 });

        const foot = await fc.createNode({
          type: "frame",
          name: "CardFooter",
          parent: mCard.id,
          width: 300,
          height: 32,
          props: {
            layout: "horizontal",
            sizingH: "fill",
            mainAlign: "spaceBetween",
            crossAlign: "center",
            fill: "none",
          },
        });
        await createText(fc, foot.id, "Joined", m.joined, {
          fontSize: 11,
          fill: { $var: "color/muted-foreground" },
        });
        const rmBtn = await fc.cmd("instance.create", {
          component: comps.buttonSetId,
          parent: foot.id,
        });
        await fc.cmd("instance.setProperties", {
          ids: [rmBtn.id],
          properties: {
            color: "destructive",
            variant: "soft",
            size: "icon",
          },
        });
        await fc.setProps(rmBtn.id, { width: 30, height: 30 });
      }
    }
  };

  await createMembersScreen({
    name: "Team Members — List View / Light",
    x: 40,
    y: 40,
    mode: "Light",
    view: "list",
  });
  await createMembersScreen({
    name: "Team Members — Grid View / Light",
    x: 1540,
    y: 40,
    mode: "Light",
    view: "grid",
  });
  await createMembersScreen({
    name: "Team Members — List View / Dark",
    x: 40,
    y: 980,
    mode: "Dark",
    view: "list",
  });
  await createMembersScreen({
    name: "Team Members — Grid View / Dark",
    x: 1540,
    y: 980,
    mode: "Dark",
    view: "grid",
  });

  // =========================================================================
  // PAGE 4: Org Setting
  // =========================================================================
  const orgPage = await fc.cmd("page.add", { name: "Org Setting" });
  await fc.cmd("page.select", { id: orgPage.id });
  await fc.cmd("page.setBackground", { color: "#E2E8F0" });

  const createOrgSettingScreen = async (x, mode) => {
    const { body } = await createDashTailShell(fc, {
      name: `Org Setting / ${mode}`,
      x,
      y: 40,
      width: 1440,
      height: 880,
      mode,
      railActive: "Users",
      sidebarTitle: "RBAC",
      sidebarItems: rbacMenuItems("Org Setting"),
    });

    await createRbacPageHeader(
      body.id,
      "Organization Settings",
      "Manage organization identity, default member roles, and workspace security policies.",
      null,
      "Org ID: org_84k29m"
    );

    const grid = await fc.createNode({
      type: "frame",
      name: "OrgSettingsGrid",
      parent: body.id,
      width: 1092,
      height: 680,
      props: { layout: "horizontal", sizingH: "fill", sizingV: "hug", gap: 20, fill: "none" },
    });

    const leftCol = await fc.createNode({
      type: "frame",
      name: "LeftCol",
      parent: grid.id,
      width: 680,
      height: 640,
      props: { layout: "vertical", sizingH: "fill", sizingV: "hug", gap: 20, fill: "none" },
    });
    const rightCol = await fc.createNode({
      type: "frame",
      name: "RightCol",
      parent: grid.id,
      width: 392,
      height: 640,
      props: { layout: "vertical", sizingH: "fixed", sizingV: "hug", gap: 20, fill: "none" },
    });

    // Org Profile Card
    const orgCard = await createRbacCard(leftCol.id, "OrgProfileCard", 680);
    await createText(fc, orgCard.id, "CardTitle", "Organization Profile", {
      fontSize: 16,
      fontStyle: "SemiBold",
      fill: { $var: "color/default-900" },
    });

    const logoRow = await fc.createNode({
      type: "frame",
      name: "OrgLogoRow",
      parent: orgCard.id,
      width: 640,
      height: 60,
      props: { layout: "horizontal", sizingH: "fill", crossAlign: "center", gap: 16, fill: "none" },
    });
    const orgBadge = await fc.createNode({
      type: "frame",
      name: "OrgMark",
      parent: logoRow.id,
      width: 56,
      height: 56,
      props: {
        layout: "horizontal",
        mainAlign: "center",
        crossAlign: "center",
        cornerRadius: 12,
        fill: { $var: "color/primary-soft" },
      },
    });
    await createText(fc, orgBadge.id, "Initials", "DT", {
      fontSize: 18,
      fontStyle: "Bold",
      fill: { $var: "color/primary" },
    });
    const logoActions = await fc.createNode({
      type: "frame",
      name: "Actions",
      parent: logoRow.id,
      width: 260,
      height: 50,
      props: { layout: "vertical", sizingH: "hug", sizingV: "hug", gap: 6, fill: "none" },
    });
    const upBtn = await fc.cmd("instance.create", {
      component: comps.buttonSetId,
      parent: logoActions.id,
    });
    await fc.cmd("instance.setProperties", {
      ids: [upBtn.id],
      properties: {
        color: "secondary",
        variant: "outline",
        size: "sm",
        label: "Upload Org Logo",
      },
    });
    await createText(
      fc,
      logoActions.id,
      "Hint",
      "Displayed in SSO login screens and shared workspace invites.",
      { fontSize: 11, fill: { $var: "color/muted-foreground" } }
    );

    const rowA = await fc.createNode({
      type: "frame",
      name: "RowA",
      parent: orgCard.id,
      width: 640,
      height: 60,
      props: { layout: "horizontal", sizingH: "fill", sizingV: "hug", gap: 16, fill: "none" },
    });
    await createLabeledField(rowA.id, "Organization Name", "DashTail Labs Inc.");
    await createLabeledField(rowA.id, "Organization Slug", "dashtail-labs");

    const rowB = await fc.createNode({
      type: "frame",
      name: "RowB",
      parent: orgCard.id,
      width: 640,
      height: 60,
      props: { layout: "horizontal", sizingH: "fill", sizingV: "hug", gap: 16, fill: "none" },
    });
    await createLabeledField(rowB.id, "Billing Email", "ops@dashtail.dev");
    await createLabeledField(rowB.id, "Verified Domain", "app.dashtail.dev");

    const defRoleWrap = await fc.createNode({
      type: "frame",
      name: "DefaultRoleField",
      parent: orgCard.id,
      width: 640,
      height: 62,
      props: { layout: "vertical", sizingH: "fill", sizingV: "hug", gap: 6, fill: "none" },
    });
    await createText(fc, defRoleWrap.id, "Label", "Default Role for New Invites", {
      fontSize: 12,
      fontStyle: "Medium",
      fill: { $var: "color/default-700" },
    });
    const defRoleSel = await fc.cmd("instance.create", {
      component: comps.selectCompId,
      parent: defRoleWrap.id,
    });
    await fc.cmd("instance.setProperties", {
      ids: [defRoleSel.id],
      properties: { placeholder: "Developer (org:developer)" },
    });
    await fc.setProps(defRoleSel.id, { sizingH: "fill" });

    const orgFoot = await fc.createNode({
      type: "frame",
      name: "OrgFooter",
      parent: orgCard.id,
      width: 640,
      height: 40,
      props: { layout: "horizontal", sizingH: "fill", mainAlign: "max", fill: "none" },
    });
    const saveOrgBtn = await fc.cmd("instance.create", {
      component: comps.buttonSetId,
      parent: orgFoot.id,
    });
    await fc.cmd("instance.setProperties", {
      ids: [saveOrgBtn.id],
      properties: {
        color: "default",
        variant: "solid",
        size: "default",
        label: "Save Organization",
      },
    });

    // Danger Zone Card
    const dangerCard = await createRbacCard(leftCol.id, "OrgDangerCard", 680);
    await fc.setProps(dangerCard.id, { stroke: { $var: "color/destructive" } });
    const dRow = await fc.createNode({
      type: "frame",
      name: "DangerRow",
      parent: dangerCard.id,
      width: 640,
      height: 44,
      props: {
        layout: "horizontal",
        sizingH: "fill",
        mainAlign: "spaceBetween",
        crossAlign: "center",
        fill: "none",
      },
    });
    const dCopy = await fc.createNode({
      type: "frame",
      name: "Copy",
      parent: dRow.id,
      width: 360,
      height: 38,
      props: { layout: "vertical", sizingH: "hug", sizingV: "hug", gap: 3, fill: "none" },
    });
    await createText(fc, dCopy.id, "Title", "Transfer or Delete Organization", {
      fontSize: 14,
      fontStyle: "SemiBold",
      fill: { $var: "color/destructive" },
    });
    await createText(
      fc,
      dCopy.id,
      "Desc",
      "Deleting removes all API keys, roles, and member records permanently.",
      { fontSize: 12, fill: { $var: "color/muted-foreground" } }
    );
    const delOrgBtn = await fc.cmd("instance.create", {
      component: comps.buttonSetId,
      parent: dRow.id,
    });
    await fc.cmd("instance.setProperties", {
      ids: [delOrgBtn.id],
      properties: {
        color: "destructive",
        variant: "soft",
        size: "default",
        label: "Delete Organization",
      },
    });

    // Right Column: Security Policies + Seat Quota + Alert
    const policyCard = await createRbacCard(rightCol.id, "AccessPoliciesCard", 392);
    await createText(fc, policyCard.id, "Title", "RBAC & Security Policies", {
      fontSize: 16,
      fontStyle: "SemiBold",
      fill: { $var: "color/default-900" },
    });
    await createPolicyToggle(
      policyCard.id,
      "Enforce SSO / SAML",
      "Require identity provider sign-in for all members.",
      "true",
      "primary"
    );
    await createPolicyToggle(
      policyCard.id,
      "Require 2FA for All Members",
      "Block API key management until 2FA is verified.",
      "true",
      "primary"
    );
    await createPolicyToggle(
      policyCard.id,
      "Allow Member API Keys",
      "Permit non-admin developers to issue scoped keys.",
      "false",
      "dark"
    );
    await createPolicyToggle(
      policyCard.id,
      "IP Allowlist Guard",
      "Restrict admin actions to corporate VPN CIDR blocks.",
      "true",
      "primary"
    );

    const quotaCard = await createRbacCard(rightCol.id, "SeatQuotaCard", 392);
    const qHead = await fc.createNode({
      type: "frame",
      name: "QuotaHeader",
      parent: quotaCard.id,
      width: 352,
      height: 24,
      props: {
        layout: "horizontal",
        sizingH: "fill",
        mainAlign: "spaceBetween",
        crossAlign: "center",
        fill: "none",
      },
    });
    await createText(fc, qHead.id, "Title", "Organization Seats", {
      fontSize: 15,
      fontStyle: "SemiBold",
      fill: { $var: "color/default-900" },
    });
    await createText(fc, qHead.id, "Count", "14 / 20 used", {
      fontSize: 12,
      fontStyle: "SemiBold",
      fill: { $var: "color/primary" },
    });
    const qProg = await fc.cmd("instance.create", {
      component: comps.progressSetId,
      parent: quotaCard.id,
    });
    await fc.cmd("instance.setProperties", {
      ids: [qProg.id],
      properties: { color: "primary", size: "md" },
    });
    await fc.setProps(qProg.id, { sizingH: "fill" });

    const rbacAlert = await fc.cmd("instance.create", {
      component: comps.alertSetId,
      parent: rightCol.id,
    });
    await fc.cmd("instance.setProperties", {
      ids: [rbacAlert.id],
      properties: {
        color: "info",
        variant: "soft",
        title: "RBAC Policy Enforced",
        description:
          "Permission updates propagate immediately across all 14 organization members.",
      },
    });
    await fc.setProps(rbacAlert.id, { sizingH: "fill" });
  };

  await createOrgSettingScreen(40, "Light");
  await createOrgSettingScreen(1540, "Dark");
}

async function exportTokens(fc) {
  fs.mkdirSync(TOKENS_DIR, { recursive: true });
  await fc.cmd("variable.export", {
    format: "json",
    path: path.join(TOKENS_DIR, "variables.json"),
  });
  await fc.cmd("variable.export", {
    format: "css",
    path: path.join(TOKENS_DIR, "variables.css"),
  });
  await fc.cmd("variable.export", {
    format: "tailwind",
    path: path.join(TOKENS_DIR, "theme.css"),
  });
}

async function runBuild() {
  fs.mkdirSync(DESIGN_DIR, { recursive: true });
  const tokens = loadThemeTokens();
  const fc = new FigCraftClient();
  try {
    await fc.init();
    await setupVariables(fc, tokens);
    await setupTextStyles(fc);
    await buildTokensPage(fc, tokens);
    const comps = await buildComponentsPage(fc);
    await buildPreviewPage(fc, comps);
    await buildApiKeyPage(fc, comps);
    await buildOnboardingPage(fc);
    await buildIntegrationsPage(fc, comps);
    await buildContactsPage(fc, comps);
    await buildNotesPage(fc, comps);
    await buildAiChatBotPage(fc, comps);
    await buildAccountSettingPage(fc, comps);
    await buildRbacPages(fc, comps);
    await fc.cmd("page.select", { index: 0 });

    if (fs.existsSync(CONNECT_FILE)) {
      const res = await fc.cmd("codeConnect.import", { path: CONNECT_FILE });
      console.log(`Code Connect linked: ${res.linked} component(s)`);
      if (res.warnings?.length) {
        console.warn("Code Connect warnings:", res.warnings);
      }
    }

    await exportTokens(fc);
    await fc.tool("save_file", { path: DESIGN_FILE });
    console.log(`Saved ${path.relative(ROOT, DESIGN_FILE)}`);
  } finally {
    fc.close();
  }
}

async function runSyncTokens() {
  if (!fs.existsSync(DESIGN_FILE)) {
    console.log("Design file not found; running full build...");
    return runBuild();
  }
  const tokens = loadThemeTokens();
  const fc = new FigCraftClient();
  try {
    await fc.init();
    await fc.tool("open_file", { path: DESIGN_FILE });
    const list = await fc.cmd("variable.list", {});
    const existingByName = new Map(
      (list.variables ?? []).map((v) => [v.name, v])
    );

    let updated = 0;
    for (const token of Object.values(tokens.colors)) {
      const existing = existingByName.get(token.name);
      if (existing) {
        await fc.cmd("variable.set", {
          variable: existing.id,
          mode: "Light",
          value: token.light,
        });
        await fc.cmd("variable.set", {
          variable: existing.id,
          mode: "Dark",
          value: token.dark,
        });
        updated += 1;
      }
    }
    await exportTokens(fc);
    await fc.tool("save_file", { path: DESIGN_FILE });
    console.log(`Synced ${updated} color tokens to ${path.relative(ROOT, DESIGN_FILE)}`);
  } finally {
    fc.close();
  }
}

async function runTokensOnly() {
  if (!fs.existsSync(DESIGN_FILE)) {
    throw new Error(`Missing ${DESIGN_FILE}. Run "bun run figcraft:build" first.`);
  }
  const fc = new FigCraftClient();
  try {
    await fc.init();
    await fc.tool("open_file", { path: DESIGN_FILE });
    await exportTokens(fc);
    console.log(`Exported tokens to ${path.relative(ROOT, TOKENS_DIR)}/`);
  } finally {
    fc.close();
  }
}

function runExport() {
  if (!fs.existsSync(DESIGN_FILE)) {
    throw new Error(`Missing ${DESIGN_FILE}. Run "bun run figcraft:build" first.`);
  }
  fs.mkdirSync(EXPORTS_DIR, { recursive: true });
  for (const page of [
    "Tokens",
    "Preview",
    "API Key",
    "Onboarding",
    "Integrations",
    "Contacts",
    "Notes",
    "AI Chat Bot",
    "Account Setting",
    "Permissions",
    "Roles",
    "Team Members",
    "Org Setting",
  ]) {
    execFileSync(
      "figcraft-cli",
      [
        "export",
        DESIGN_FILE,
        "--page",
        page,
        "--format",
        "png",
        "--scale",
        "2",
        "--out",
        EXPORTS_DIR,
      ],
      { stdio: "inherit" }
    );
  }
  console.log(`Exported 2x PNG previews to ${path.relative(ROOT, EXPORTS_DIR)}/`);
}

const command = process.argv[2] ?? "build";
switch (command) {
  case "build":
    await runBuild();
    break;
  case "sync-tokens":
    await runSyncTokens();
    break;
  case "tokens":
    await runTokensOnly();
    break;
  case "export":
    runExport();
    break;
  default:
    console.error(`Unknown subcommand "${command}". Expected: build | sync-tokens | tokens | export`);
    process.exit(1);
}
