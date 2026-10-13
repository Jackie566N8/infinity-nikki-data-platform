import fs from "node:fs";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { performance } from "node:perf_hooks";
import os from "node:os";
import Base from "./platform/search/search-model.cjs";
import Smart from "./platform/search-improved/improved-model.cjs";
const read = (f) => JSON.parse(fs.readFileSync("data/dataset/" + f)),
  saved = read("search-improved/comparison.json"),
  cases = read("search/queries.candidates.json"),
  aliases = read("search/aliases.json"),
  corpus = read("search/corpus.json"),
  features = read("search-improved/features.json");
// This verifies all frozen bytes before independent prediction reproduction. It never retunes or overwrites the original report.
execFileSync(
  process.execPath,
  ["scripts/platform/search-improved/evaluate-final.mjs"],
  { stdio: "inherit", windowsHide: true },
);
const base = Base.createEngine(corpus, aliases),
  at = performance.now(),
  smart = Smart.createEngine(features, aliases),
  index_build_ms = performance.now() - at,
  methods = ["A", "B", "C", "D", "E", "F"],
  results = {};
for (const method of methods) {
  const search = (q) =>
      ["A", "B", "C"].includes(method)
        ? base.search(q, method)
        : smart.search(q, method, {}, saved.release.configuration),
    rows = [];
  for (let warmup=0;warmup<3;warmup++) for (const q of cases) search(q.query);
  for (const q of cases) {
    const found = search(q.query),
      prior = saved.predictions[method].find((p) => p.query_id === q.query_id);
    assert.deepEqual(
      found.slice(0, 5).map((x) => x.id),
      prior.top5,
      "Frozen top5 changed: " + method + "/" + q.query_id,
    );
    const times = [];
    for (let n = 0; n < 20; n++) {
      const t = performance.now();
      search(q.query);
      times.push(performance.now() - t);
    }
    rows.push({
      query_id: q.query_id,
      split: q.split,
      type: q.type,
      ...Base.scoreCase(q, found),
      response_ms: times.reduce((a, b) => a + b, 0) / times.length,
    });
  }
  const test = rows.filter((x) => x.split === "test");
  const metrics = Base.summarize(test);
  for (const key of ["hit1", "hit5", "mrr", "no_answer_accuracy"])
    if (key in saved.metrics.test[method].overall)
      assert.equal(
        metrics[key],
        saved.metrics.test[method].overall[key],
        method + "/" + key,
      );
  results[method] = {
    test: metrics,
    by_type: Object.fromEntries(
      [...new Set(test.map((x) => x.type))].map((type) => [
        type,
        Base.summarize(test.filter((x) => x.type === type)),
      ]),
    ),
    identical_top5_count: rows.length,
  };
}
const report = {
  generated_at: new Date().toISOString(),
  annotation_status: "provisional_not_human_reviewed",
  original_report_preserved: true,
  test_queries: 30,
  positive_test_queries: 24,
  negative_test_queries: 6,
  human_approved: 0,
  frozen_scope_count: features.length,
  current_live_scope_note:
    "Live catalog has more objects. Frozen scores are not a claim about all live queries.",
  release_sha256: saved.release_sha256,
  cases_sha256: saved.cases_sha256,
  environment: {
    node: process.version,
    os: os.platform(),
    cpu: os.cpus()[0]?.model,
    index_build_ms,
    timing_repeats: 20,
    warmup_rounds: 3,
    timing_scope:
      "warm in-memory model only; excludes page loading, network and rendering",
  },
  results,
};
fs.mkdirSync("review/step8", { recursive: true });
fs.writeFileSync(
  "review/step8/search-reproduction.json",
  JSON.stringify(report, null, 2),
);
console.log(
  "PASS 600 identical frozen top-five predictions; A–F test metrics reproduced; original report preserved.",
);
