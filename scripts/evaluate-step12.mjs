// Same reviewed cohort, same frozen production corpus; no tuning or edits to historical reports.
import fs from "node:fs";
import assert from "node:assert/strict";
import os from "node:os";
import { createHash } from "node:crypto";
import { performance } from "node:perf_hooks";
import Base from "./platform/search/search-model.cjs";
import Smart from "./platform/search-improved/improved-model.cjs";
import Repair from "./platform/search-improved/homophone-model.cjs";
import PY from "./platform/search-improved/vendor/pinyin-pro.cjs";
import { score, summarize } from "./review-50-metrics.mjs";
const read = (f) => JSON.parse(fs.readFileSync(f)),
  digest = (f) => createHash("sha256").update(fs.readFileSync(f)).digest("hex");
const review = read("data/review/step12/review.json"),
  input = read("data/review/step12/corpus.json"),
  ledger = read("data/review/step10/live-predictions.json");
assert.equal(
  digest("data/review/step12/corpus.json"),
  review.corpus_semantic_sha256,
);
assert.equal(
  digest("data/review/step10/live-predictions.json"),
  review.step10_prediction_sha256,
);
assert.equal(
  digest("scripts/platform/search-improved/improved-model.cjs"),
  ledger.hashes["src/smart-search-model.js"],
);
const base = Base.createEngine(input.documents, input.aliases),
  smart = Smart.createEngine(input.documents, input.aliases),
  repair = Repair.createEngine(input.documents, input.aliases);
const methods = ["A", "B", "C", "D", "E", "F", "D_v2", "F_v2"],
  measurements = {},
  predictions = {};
const timing = {
  warmup_rounds: 3,
  repeats_per_query: 20,
  scope:
    "Warmed in-memory Node engine only; excludes input parsing, index construction, browser rendering and network; no caching of query results",
};
const summarizeTimed = (rows) => ({
  ...summarize(rows),
  mean_response_ms: rows.length
    ? rows.reduce((s, r) => s + r.response_ms, 0) / rows.length
    : null,
});
for (const method of methods) {
  const search = (q) =>
    ["A", "B", "C"].includes(method)
      ? base.search(q, method)
      : (method.endsWith("_v2") ? repair : smart).search(
          q,
          method.replace("_v2", ""),
          {},
          input.configuration,
        );
  for (let i = 0; i < timing.warmup_rounds; i++)
    for (const q of review.rows) search(q.query);
  const scores = [];
  predictions[method] = [];
  for (const q of review.rows) {
    const ranked = search(q.query);
    if (method === "F")
      assert.deepEqual(
        ranked.map((r) => r.id),
        ledger.rows
          .find((r) => r.query_id === q.query_id)
          .ranked.map((r) => r.id),
        "Original F changed",
      );
    let elapsed = 0;
    for (let i = 0; i < timing.repeats_per_query; i++) {
      const start = performance.now();
      search(q.query);
      elapsed += performance.now() - start;
    }
    const row = {
      query_id: q.query_id,
      type: q.type,
      split: q.split,
      group_id: q.group_id,
      answerable: q.answerable,
      ...score(q.expected_ids, ranked),
      response_ms: elapsed / timing.repeats_per_query,
    };
    scores.push(row);
    predictions[method].push({
      ...row,
      correct_ids: q.expected_ids,
      ranked: ranked.map((r) => ({
        id: r.id,
        score: r.score ?? null,
        reasons: r.reasons || [],
        match_type: r.match_type || null,
      })),
    });
  }
  measurements[method] = Object.fromEntries(
    ["all", "dev", "test"].map((split) => {
      const rows = scores.filter((r) => split === "all" || r.split === split);
      return [
        split,
        {
          overall: summarizeTimed(rows),
          by_type: Object.fromEntries(
            [...new Set(review.rows.map((q) => q.type))].map((type) => [
              type,
              summarizeTimed(rows.filter((r) => r.type === type)),
            ]),
          ),
        },
      ];
    }),
  );
}
const q063 = {
  query: "古典乐张",
  target: "古典乐章",
  query_pinyin: PY.pinyin("古典乐张", { toneType: "none", type: "array" }).join(
    "",
  ),
  target_pinyin: PY.pinyin("古典乐章", {
    toneType: "none",
    type: "array",
  }).join(""),
  edit_distance: Smart.levenshtein("古典乐张", "古典乐章"),
  edit_similarity: 0.75,
  threshold: input.configuration.name_min,
  previous: predictions.F.find((r) => r.query_id === "q063"),
  repaired: predictions.F_v2.find((r) => r.query_id === "q063"),
  repair_selection_scope:
    "Observed development case q063; post-review regression only, not a new untouched holdout",
};
const report = {
  schema_version: 1,
  cohort: "50_human_reviewed_subset_of_100_AI_candidates",
  snapshot_id: review.snapshot_id,
  annotation_status: "user_supplied_human_reviewed_50",
  reviewer: review.reviewer,
  reviewed_on: review.reviewed_on,
  review_timezone: review.review_timezone,
  timestamp_precision: review.timestamp_precision,
  provenance: review.review_independence,
  evidence_status:
    "Per-item external URLs/screenshots not supplied; accept explicit user reviewer assertions without claiming agent verification",
  sample: {
    total: 50,
    positive: 44,
    negative: 6,
    dev: 35,
    test: 15,
    positive_test: 12,
    negative_test: 3,
    query_types: 5,
  },
  discrepancies: review.differences,
  reported_negative_count: 7,
  actual_negative_count: 6,
  corpus_objects: input.documents.length,
  configuration: input.configuration,
  timing,
  environment: {
    node: process.version,
    platform: os.platform(),
    arch: os.arch(),
    cpu: os.cpus()[0]?.model,
  },
  inputs: {
    review_sha256: digest("data/review/step12/review.json"),
    corpus_sha256: review.corpus_semantic_sha256,
    original_model_sha256: digest(
      "scripts/platform/search-improved/improved-model.cjs",
    ),
    repair_model_sha256: digest(
      "scripts/platform/search-improved/homophone-model.cjs",
    ),
    baseline_sha256: digest("scripts/platform/search/search-model.cjs"),
  },
  methods: measurements,
  predictions,
  q063,
  old_comparison: "data/dataset/search-improved/comparison.json",
  limitations: [
    "Single reviewer with predictions visible; not a blind independent multi-reviewer Gold",
    "Subset and structured templates do not represent natural query frequency; no partial queries",
    "F-v2 repair was selected after viewing development fail; same reviewed test is a regression check, not new generalization evidence",
    "Old candidate comparison uses 8734 objects and different sample; no causal accuracy delta from old scores",
    "Only 3 test negative cases; perfect rejection is not population certainty",
  ],
};
fs.mkdirSync("data/dataset/search-human", { recursive: true });
const output = "data/dataset/search-human/step12-comparison.json";
if (fs.existsSync(output)) {
  const prior = read(output);
  assert.deepEqual(
    prior.inputs,
    report.inputs,
    "New model/review version requires a new output",
  );
  for (const m of methods)
    assert.deepEqual(
      prior.predictions[m].map((q) => [q.query_id, q.ranked]),
      predictions[m].map((q) => [q.query_id, q.ranked]),
    );
  fs.mkdirSync("review/step12", { recursive: true });
  fs.writeFileSync(
    "review/step12/reproduction.json",
    JSON.stringify(
      {
        verified_at: new Date().toISOString(),
        methods,
        identical_rankings: 400,
        timing_remeasured: timing,
        original_report_preserved: true,
      },
      null,
      2,
    ),
  );
  console.log(
    "PASS all 400 Step12 method/query rankings reproduced; preserving first human comparison and latency measurements.",
  );
} else {
  fs.writeFileSync(output, JSON.stringify(report, null, 2) + "\n");
  console.log(
    JSON.stringify(
      {
        F: measurements.F.all.overall,
        F_v2: measurements.F_v2.all.overall,
        q063: {
          query_pinyin: q063.query_pinyin,
          target_pinyin: q063.target_pinyin,
          previous: q063.previous.ranked,
          repaired: q063.repaired.ranked,
        },
      },
      null,
      2,
    ),
  );
}
