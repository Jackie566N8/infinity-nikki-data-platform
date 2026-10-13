import { spawnSync } from "node:child_process";
import fs from "node:fs";
const files = [
  "test.mjs",
  "test-analytics.mjs",
  "test-wardrobe.mjs",
  "test-planning.mjs",
  "test-planning-extended.mjs",
  "search/test.mjs",
  "search-improved/test.mjs",
  "advanced/test.mjs",
  "test-review.mjs",
  "test-step8.mjs",
  "test-step9.mjs",
];
let failed = 0;
const report = [];
for (const f of files) {
  const start = Date.now(),
    r = spawnSync(process.execPath, ["scripts/platform/" + f], {
      encoding: "utf8",
      windowsHide: true,
      maxBuffer: 10e6,
    });
  process.stdout.write(r.stdout || "");
  if (r.stderr) process.stderr.write(r.stderr);
  report.push({ file: f, exit: r.status, ms: Date.now() - start });
  if (r.status !== 0) failed++;
}
fs.mkdirSync("review/final", { recursive: true });
fs.writeFileSync(
  "review/final/model-tests.json",
  JSON.stringify(report, null, 2),
);
if (failed) {
  console.error(failed + " test groups failed");
  process.exit(1);
}
console.log("PASS " + files.length + " model/data test groups.");
