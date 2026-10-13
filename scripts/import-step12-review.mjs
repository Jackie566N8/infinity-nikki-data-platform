// Import only explicitly supplied user review rows; no model-generated labels or invented timestamps.
import fs from "node:fs";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { liveSearchInputs, liveInputSignature } from "./live-search-input.mjs";
const file = process.argv[2];
if (!file) throw Error("Provide the user-returned Markdown/text review path");
const raw = fs.readFileSync(file, "utf8"),
  ledger = JSON.parse(
    fs.readFileSync("data/review/step10/live-predictions.json"),
  );
assert.ok(
  raw.includes("审核人：human_reviewer_A") && raw.includes("2026-10-12 UTC+1"),
  "This one-time importer expects the explicitly supplied Step12 reviewer/date",
);
const hash = (s) => createHash("sha256").update(s).digest("hex");
const source = JSON.parse(
  fs.readFileSync("data/dataset/search/queries.candidates.json"),
);
const valid = new Set(
  JSON.parse(fs.readFileSync("data/input/catalog.json")).records.map(
    (r) => r.id,
  ),
);
assert.equal(
  liveInputSignature(),
  ledger.semantic_input_sha256,
  "Freeze unchanged production inputs before repair",
);
const rows = [],
  differences = [],
  seen = new Set();
for (const line of raw
  .split(/\r?\n/)
  .filter((l) => /^\|\s*q\d+\s*\|/.test(l))) {
  const c = line
    .split("|")
    .slice(1, -1)
    .map((x) => x.trim());
  assert.equal(c.length, 9);
  const [id, , reported_split, query, ...rest] = c;
  assert.ok(!seen.has(id));
  seen.add(id);
  const q = ledger.rows.find((r) => r.query_id === id);
  assert.ok(q, "Unselected query");
  assert.equal(query, q.query);
  const expected_ids = JSON.parse(c[7].match(/\[[^\]]*\]/)[0]);
  assert.ok(expected_ids.every((id) => valid.has(id)));
  const top3 = c.slice(4, 7).flatMap((s) => s.match(/\b[ocm]\d+\b/) || []);
  assert.deepEqual(
    top3,
    q.ranked.slice(0, 3).map((r) => r.id),
    "User Top3 disagrees with frozen prediction",
  );
  if (reported_split !== q.split)
    differences.push({
      query_id: id,
      field: "split",
      reported: reported_split,
      effective: q.split,
      reason:
        "Retain original family-disjoint split; do not relabel dev as test",
    });
  const prior = source.find((r) => r.query_id === id);
  if (JSON.stringify(prior.expected_ids) !== JSON.stringify(expected_ids))
    differences.push({
      query_id: id,
      field: "answer_ids",
      candidate: prior.expected_ids,
      human: expected_ids,
    });
  rows.push({
    ...q,
    ranked: undefined,
    expected_ids,
    answerable: expected_ids.length > 0,
    reported_split,
    reviewer: "human_reviewer_A",
    reviewed_on: "2026-10-12",
    review_timezone: "+01:00",
    timestamp_precision: "day",
    reviewed_at: null,
    evidence_status: "reviewer_assertion_without_per_item_url_or_screenshot",
    evidence_basis:
      "User reports in-game catalog + official Wiki + community nickname consensus; no per-item links/screenshots supplied",
    notes: c[8],
    status: "approved",
  });
}
assert.equal(rows.length, 50);
assert.ok(
  rows.every((q) => ledger.rows.some((r) => r.query_id === q.query_id)),
);
const dir = "data/review/step12";
fs.mkdirSync(dir, { recursive: true });
const input = liveSearchInputs();
const review = {
  schema_version: 1,
  cohort: "step12-human-50",
  source_sha256: hash(raw),
  snapshot_id: ledger.snapshot_id,
  reviewer: "human_reviewer_A",
  reviewed_on: "2026-10-12",
  review_timezone: "+01:00",
  timestamp_precision: "day",
  origin: "user_supplied_human_review",
  review_independence:
    "Model predictions visible; single reviewer; supporting evidence not independently inspected by this agent",
  reported_no_answer_count: 7,
  actual_no_answer_count: rows.filter((r) => !r.answerable).length,
  answerable_count: rows.filter((r) => r.answerable).length,
  differences,
  corpus_semantic_sha256: ledger.semantic_input_sha256,
  step10_prediction_sha256: hash(
    fs.readFileSync("data/review/step10/live-predictions.json"),
  ),
  rows,
};
const outputs = {
  "review.json": JSON.stringify(review, null, 2) + "\n",
  "corpus.json": JSON.stringify(input),
  "HUMAN_RETURN.md": raw,
  "production-adapter-v1.js": fs.readFileSync("src/smart-search.js", "utf8"),
};
for (const [name, text] of Object.entries(outputs)) {
  const target = dir + "/" + name;
  if (fs.existsSync(target))
    assert.equal(
      fs.readFileSync(target, "utf8"),
      text,
      "Already imported a different review/input",
    );
  else fs.writeFileSync(target, text);
}
console.log(
  JSON.stringify(
    {
      reviewed: 50,
      positive: review.answerable_count,
      negative: review.actual_no_answer_count,
      differences,
    },
    null,
    2,
  ),
);
