import fs from "node:fs";
import crypto from "node:crypto";
import { performance } from "node:perf_hooks";
import M from "./improved-model.cjs";
import Base from "../search/search-model.cjs";
const read = (p) => JSON.parse(fs.readFileSync(new URL(p, import.meta.url))),
  sha = (v) =>
    crypto.createHash("sha256").update(JSON.stringify(v)).digest("hex"),
  lock = read("../../../data/dataset/search-improved/tuning-lock-v3.json"),
  dev = read("../../../data/dataset/search/dev.json"),
  features = read("../../../data/dataset/search-improved/features.json"),
  aliases = read("../../../data/dataset/search/aliases.json");
if (dev.some((q) => q.split !== "dev")) throw Error("Non-dev data");
const engine = M.createEngine(features, aliases),
  latency = {};
for (const method of ["D", "E", "F"]) {
  const timings = [];
  for (let warm = 0; warm < 3; warm++)
    for (const q of dev) engine.search(q.query, method, {}, lock.configuration);
  for (let n = 0; n < 10; n++)
    for (const q of dev) {
      const at = performance.now();
      engine.search(q.query, method, {}, lock.configuration);
      timings.push(performance.now() - at);
    }
  latency[method] = {
    mean_ms: timings.reduce((a, b) => a + b, 0) / timings.length,
    p95_ms: timings.toSorted((a, b) => a - b)[
      Math.floor(timings.length * 0.95)
    ],
    scope:
      "uncached full query parsing, candidate generation, filtering and ranking; warm document index",
  };
}
const eligible = ["F", "D", "E"].filter((m) => latency[m].p95_ms < 50),
  recommended =
    eligible.sort(
      (a, b) =>
        lock.dev_methods[b].objective - lock.dev_methods[a].objective ||
        ["F", "D", "E"].indexOf(a) - ["F", "D", "E"].indexOf(b),
    )[0] || "C";
const release = {
  ...lock,
  version: "smart-search-release-1",
  dev_latency: latency,
  selected_for_deployment: recommended,
  selected_before_test: true,
  selection_note:
    "Development objective plus uncached dev p95 latency <50ms. No test labels or previous test metrics read.",
  ablation_variants: [
    { name: "F-no-pinyin", disable: { pinyin: true } },
    { name: "F-no-fuzzy", disable: { fuzzy: true } },
    { name: "F-no-prefix", disable: { prefix: true } },
    { name: "F-no-semantic", disable: { semantic: true } },
  ],
  frozen_at: new Date().toISOString(),
};
const target = new URL(
  "../../../data/dataset/search-improved/release-lock.json",
  import.meta.url,
);
if (fs.existsSync(target))
  throw Error(
    "Release already frozen; do not overwrite after seeing test results",
  );
fs.writeFileSync(target, JSON.stringify(release, null, 2));
console.log({
  recommended,
  config: release.configuration,
  dev_latency: latency,
});
