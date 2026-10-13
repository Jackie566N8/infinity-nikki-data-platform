import fs from "node:fs";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { score, summarize } from "./review-50-metrics.mjs";
const l = JSON.parse(
  fs.readFileSync("data/review/step10/live-predictions.json"),
);
assert.equal(l.rows.length, 50);
assert.equal(new Set(l.rows.map((r) => r.query_id)).size, 50);
for (const type of [
  "formal",
  "nickname",
  "typo_pinyin",
  "description",
  "multilingual",
])
  assert.equal(l.rows.filter((r) => r.type === type).length, 10);
assert.equal(l.rows.filter((r) => r.split === "test").length, 15);
const groups = new Map();
for (const r of l.rows) {
  if (groups.has(r.group_id))
    assert.equal(groups.get(r.group_id), r.split, "Family split leakage");
  groups.set(r.group_id, r.split);
}
const template = JSON.parse(
  fs.readFileSync("docs/templates/HUMAN_REVIEW_50_RETURN.json"),
);
assert.ok(
  template.reviews.every(
    (r) =>
      r.correct_ids === null && r.answerable === null && r.status === "pending",
  ),
);
assert.deepEqual(score(["right"], ["right"]), {
  hit1: 1,
  hit5: 1,
  reciprocal_rank: 1,
  rejected: 0,
});
assert.equal(score(["right"], ["a", "b", "c", "d", "right"]).hit5, 1);
assert.equal(score(["right"], ["a", "b", "c", "d", "e", "right"]).hit5, 0);
assert.equal(
  score(["right"], ["a", "b", "c", "d", "e", "right"]).reciprocal_rank,
  1 / 6,
);
assert.equal(score(["x", "right"], ["wrong", "right"]).reciprocal_rank, 0.5);
assert.equal(summarize([]).hit_at_1, null);
const m = summarize([
  { answerable: true, ...score(["x"], ["x"]) },
  { answerable: false, ...score([], []) },
]);
assert.equal(m.hit_at_1, 1);
assert.equal(m.no_answer_identification, 1);
const blank = spawnSync(
  process.execPath,
  [
    "scripts/evaluate-review-50.mjs",
    "docs/templates/HUMAN_REVIEW_50_RETURN.json",
  ],
  { encoding: "utf8", windowsHide: true },
);
assert.notEqual(blank.status, 0);
assert.ok(blank.stderr.includes("No human-approved rows"));
assert.ok(fs.existsSync("index.html") && fs.existsSync(".nojekyll"));
assert.ok(
  !/[A-Z]:[\\/]Users[\\/]/i.test(fs.readFileSync("index.html", "utf8")),
);
console.log(
  "PASS balanced 50-query cohort, original group splits, blank-label guard, metric edge cases, portable Pages entry.",
);
