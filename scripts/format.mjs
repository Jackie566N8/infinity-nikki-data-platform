import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
const cli = ["node_modules/prettier/bin/prettier.cjs"].find((f) =>
  fs.existsSync(f),
);
if (!cli) {
  console.error("Run npm ci to install the pinned optional formatter.");
  process.exit(1);
}
const scripts = [
  "app",
  "i18n",
  "analytics",
  "wardrobe",
  "planning",
  "quality",
  "advanced",
  "research",
  "module-loader",
  "boot",
  "companion",
  "companion-brain",
  "companion-copy",
  "cursor",
]
  .map((n) => "src/" + n + ".js")
  .filter((f) => fs.existsSync(f));
const styles = fs
  .readdirSync("src")
  .filter((f) => f.endsWith(".css"))
  .map((f) => "src/" + f);
const files = [
  ...scripts,
  ...styles,
  "src/index.html",
  ...fs
    .readdirSync("scripts")
    .filter((f) => f.endsWith(".mjs"))
    .map((f) => "scripts/" + f),
];
// Never format release-locked models/features or generated data scripts.
const r = spawnSync(
  process.execPath,
  [path.resolve(cli), "--write", ...files],
  { stdio: "inherit", windowsHide: true },
);
process.exit(r.status ?? 1);
