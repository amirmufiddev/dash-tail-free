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

const smoke = run("node", ["scripts/smoke-routes.ts"]);
process.exit(smoke);