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