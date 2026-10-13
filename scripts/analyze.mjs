import fs from "node:fs";
import { execFileSync } from "node:child_process";
fs.mkdirSync("outputs", { recursive: true });
execFileSync(process.execPath, ["scripts/python.mjs", "analysis/research.py"], {
  stdio: "inherit",
  windowsHide: true,
});
execFileSync(process.execPath, ["scripts/export-research-docs.mjs"], {
  stdio: "inherit",
  windowsHide: true,
});
