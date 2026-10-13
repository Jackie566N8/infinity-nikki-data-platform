import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";
const args = process.argv.slice(2),
  candidates = [process.env.PYTHON, "python3", "python"].filter(Boolean);
let executable;
for (const p of candidates) {
  const r = spawnSync(p, ["-c", "import sys;assert sys.version_info>=(3,12)"], {
    windowsHide: true,
    stdio: "ignore",
  });
  if (r.status === 0) {
    executable = p;
    break;
  }
}
if (!executable) {
  console.error(
    "Python 3.12+ not found. Install it or set PYTHON to the executable path. Node/browser modules can still run.",
  );
  process.exit(1);
}
const r = spawnSync(executable, args, {
  windowsHide: true,
  stdio: "inherit",
  env: process.env,
});
process.exit(r.status ?? 1);
