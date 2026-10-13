import fs from "node:fs";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import Smart from "./platform/search-improved/improved-model.cjs";
import Repair from "./platform/search-improved/homophone-model.cjs";
import { score, summarize } from "./review-50-metrics.mjs";
const read = (f) => JSON.parse(fs.readFileSync(f));
const r = read("data/dataset/search-human/step12-comparison.json"),
  review = read("data/review/step12/review.json"),
  c = read("data/review/step12/corpus.json");
assert.equal(review.rows.length, 50);
assert.equal(review.rows.filter((q) => !q.answerable).length, 6);
assert.equal(review.rows.filter((q) => q.answerable).length, 44);
assert.equal(review.rows.find((q) => q.query_id === "q091").split, "dev");
assert.equal(
  review.rows.find((q) => q.query_id === "q091").reported_split,
  "test",
);
assert.ok(
  review.rows.every(
    (q) =>
      q.reviewed_at === null &&
      q.timestamp_precision === "day" &&
      q.reviewed_on === "2026-10-12",
  ),
);
const groups = new Map();
for (const q of review.rows) {
  if (groups.has(q.group_id)) assert.equal(groups.get(q.group_id), q.split);
  groups.set(q.group_id, q.split);
}
for (const [method, rows] of Object.entries(r.predictions))
  for (const split of ["all", "dev", "test"]) {
    const subset = rows
      .filter((q) => split === "all" || q.split === split)
      .map((q) => ({ ...q, ...score(q.correct_ids, q.ranked) }));
    const actual = summarize(subset),
      expected = r.methods[method][split].overall;
    for (const [key, value] of Object.entries(actual))
      assert.equal(expected[key], value, method + "/" + split + "/" + key);
  }
assert.equal(r.methods.F.all.overall.hit_at_1, 43 / 44);
assert.equal(r.methods.F.all.by_type.typo_pinyin.hit_at_1, 8 / 9);
assert.equal(r.methods.F_v2.all.overall.hit_at_1, 1);
assert.equal(
  r.methods.F.test.overall.hit_at_1,
  r.methods.F_v2.test.overall.hit_at_1,
);
const original = Smart.createEngine(c.documents, c.aliases),
  fixed = Repair.createEngine(c.documents, c.aliases);
assert.deepEqual(original.search("古典乐张", "F", {}, c.configuration), []);
assert.equal(
  fixed.search("古典乐张", "F", {}, c.configuration)[0].id,
  "o10183",
);
assert.equal(
  fixed.search("古典乐张", "F", {}, c.configuration)[0].reasons[0].kind,
  "homophone",
);
assert.deepEqual(
  fixed.search("古典乐张", "F", { rarity: 4 }, c.configuration),
  [],
);
assert.deepEqual(
  fixed.search("古典乐张", "F", { style: "帅气" }, c.configuration),
  [],
);
assert.deepEqual(fixed.search("古典乐张", "E", {}, c.configuration), []);
for (const q of review.rows) {
  const a = original.search(q.query, "F", {}, c.configuration),
    b = fixed.search(q.query, "F", {}, c.configuration);
  if (q.query_id !== "q063")
    assert.deepEqual(b, a, "Unexpected changed Gold query " + q.query_id);
  if (!q.answerable) assert.deepEqual(b, []);
}
for (const query of ["古典乐猫", "张章", "古典乐张猫", "1星古典乐张套装"])
  assert.deepEqual(
    fixed.search(query, "F", {}, c.configuration),
    original.search(query, "F", {}, c.configuration),
    "Conservative rejection " + query,
  );
assert.equal(
  createHash("sha256")
    .update(
      fs.readFileSync("scripts/platform/search-improved/improved-model.cjs"),
    )
    .digest("hex"),
  r.inputs.original_model_sha256,
);
assert.ok(
  fs
    .readFileSync("docs/reports/step12/COMPARISON_TABLES.md", "utf8")
    .includes("n.a."),
);
console.log(
  "PASS 50 user-approved day-precision labels, 44/6 denominators, original family splits, all method metrics, q063 repair, hard filters, unchanged 49 Gold queries and conservative negative probes.",
);
