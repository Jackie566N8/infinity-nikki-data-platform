import fs from "node:fs";
import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";
for (const name of fs
  .readdirSync("src")
  .filter(
    (n) =>
      n.endsWith(".js") &&
      !n.endsWith("-data.js") &&
      !["data.js", "locales.js", "companion-art.js"].includes(n),
  )) {
  const r = spawnSync(process.execPath, ["--check", "src/" + name], {
    stdio: "pipe",
    windowsHide: true,
  });
  assert.equal(r.status, 0, name + " syntax " + r.stderr);
}
const read = (f) => JSON.parse(fs.readFileSync(f)),
  Q = read("data/dataset/quality-report.json");
for (const f of ["analytics", "planning"])
  assert.equal(
    read("data/dataset/" + f + "/input.json").snapshot_id,
    Q.snapshot.snapshot_id,
  );
assert.equal(Q.validation.error_count, 0);
for (const m of Q.metrics) {
  assert.ok(m.numerator <= m.denominator, m.key);
  assert.equal(
    m.percent,
    m.denominator
      ? Math.round((m.numerator / m.denominator) * 10000) / 100
      : null,
  );
}
assert.equal(
  read("data/dataset/search-improved/comparison.json").annotation_status,
  "provisional_not_human_reviewed",
);
assert.equal(read("data/dataset/advanced/input.json").telemetry.enabled, false);
console.log(
  "PASS syntax, data snapshot consistency, metric denominators, provisional labels and disabled telemetry.",
);
