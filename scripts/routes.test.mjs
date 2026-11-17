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