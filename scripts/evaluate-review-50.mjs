import fs from "node:fs";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import { score, summarize } from "./review-50-metrics.mjs";
import { liveInputSignature } from "./live-search-input.mjs";
const file = process.argv[2];
if (!file)
  throw Error(
    "Usage: node scripts/evaluate-review-50.mjs completed-review.local.json",
  );
const digest = (s) => createHash("sha256").update(s).digest("hex");
const ledgerFile = "data/review/step10/live-predictions.json",
  ledger = JSON.parse(fs.readFileSync(ledgerFile)),
  input = JSON.parse(fs.readFileSync(file));
assert.ok(input.reviews?.some(r=>r.status==='approved'), 'No human-approved rows; a blank template cannot become Gold');
assert.equal(input.cohort, "step10-human-50");
assert.equal(input.snapshot_id, ledger.snapshot_id);
assert.equal(
  input.prediction_ledger_sha256,
  digest(fs.readFileSync(ledgerFile)),
  "Prediction ledger changed",
);
const validIds = new Set(
  JSON.parse(fs.readFileSync("data/input/catalog.json")).records.map(
    (r) => r.id,
  ),
);
for (const f of [
  "src/smart-search-model.js",
  "src/smart-search.js",
  "src/smart-vendor-opencc.js",
  "src/smart-vendor-pinyin.js",
  "data/dataset/search/queries.candidates.json",
])
  assert.equal(
    digest(fs.readFileSync(f)),
    ledger.hashes[f],
    "Model or original query set changed: " + f,
  );
assert.equal(
  liveInputSignature(),
  ledger.semantic_input_sha256,
  "Search fields/configuration changed; create a new cohort",
);
assert.equal(
  input.reviews.length,
  50,
  "Return all 50 rows, including pending rows",
);
const seen = new Set(),
  scored = [];
for (const r of input.reviews) {
  assert.ok(!seen.has(r.query_id), "Duplicate query ID");
  seen.add(r.query_id);
  const q = ledger.rows.find((q) => q.query_id === r.query_id);
  assert.ok(q, "Unknown query");
  assert.equal(r.query, q.query, "Do not change query text");
  assert.ok(
    ["pending", "uncertain", "approved"].includes(r.status),
    "Invalid review status",
  );
  if (r.status !== "approved") continue;
  assert.ok(
    Array.isArray(r.correct_ids) &&
      new Set(r.correct_ids).size === r.correct_ids.length &&
      r.correct_ids.every((id) => validIds.has(id)),
    "Invalid or duplicate answer ID",
  );
  assert.equal(typeof r.answerable, "boolean");
  assert.equal(r.answerable, r.correct_ids.length > 0);
  assert.ok(
    typeof r.reviewer === "string" && r.reviewer.trim(),
    "Reviewer is required",
  );
  assert.ok(
    typeof r.reviewed_at === "string" &&
      /T.*(?:Z|[+-]\d\d:\d\d)$/.test(r.reviewed_at) &&
      Number.isFinite(Date.parse(r.reviewed_at)),
    "Timezone-aware date is required",
  );
  assert.ok(
    typeof r.evidence === "string" && r.evidence.trim(),
    "Evidence URL, screenshot reference, or checked catalog scope is required",
  );
  if (!r.answerable)
    assert.ok(
      typeof r.notes === "string" && r.notes.trim(),
      "No-answer review must explain checked scope",
    );
  scored.push({
    query_id: q.query_id,
    type: q.type,
    split: q.split,
    group_id: q.group_id,
    answerable: r.answerable,
    ...score(r.correct_ids, q.ranked),
  });
}
assert.ok(
  scored.length,
  "No human-approved rows; a blank template cannot become Gold",
);
const by = (key) =>
  Object.fromEntries(
    [...new Set(ledger.rows.map((r) => r[key]))].map((k) => [
      k,
      summarize(scored.filter((r) => r[key] === k)),
    ]),
  );
const report = {
  created_at: new Date().toISOString(),
  cohort: input.cohort,
  snapshot_id: input.snapshot_id,
  method: "F",
  model_scope: "live_catalog",
  prediction_ledger_sha256: input.prediction_ledger_sha256,
  status:
    scored.length === 50
      ? "human_reviewed_50_query_cohort"
      : "partially_reviewed_cohort",
  total_selected: 50,
  reviewed: scored.length,
  pending_or_uncertain: 50 - scored.length,
  human_review_independence:
    "single reviewer, model predictions visible; not blind, not full 100-query Gold",
  statistics:
    "Positive queries only for Hit@1/Hit@5/MRR; first relevant result across full ranking for MRR. Negative queries only for no-answer. No applicable denominator = null. No tuning.",
  overall: summarize(scored),
  by_split: by("split"),
  by_type: by("type"),
  rows: scored,
};
const directory =
  "data/review/human-50-results/" + digest(fs.readFileSync(file)).slice(0, 16);
assert.ok(
  !fs.existsSync(directory),
  "This review already has an immutable result; do not overwrite",
);
fs.mkdirSync(directory, { recursive: true });
fs.writeFileSync(
  directory + "/report.json",
  JSON.stringify(report, null, 2) + "\n",
);
fs.writeFileSync(
  directory + "/review.local.json",
  JSON.stringify(input, null, 2) + "\n",
);
const display = (m) =>
  m == null ? "待审核 / n.a." : (m * 100).toFixed(2) + "%";
let md =
  "# 真人审核 50 条队列评估\n\n" +
  `审核 ${scored.length}/50；F 模型、${ledger.document_count} 对象；原模型和首次候选报告均未改写。\n\n`;
md +=
  "| 范围 | 正样本 | 无答案样本 | Hit@1 | Hit@5 | MRR | 无答案识别 |\n|---|---:|---:|---:|---:|---:|---:|\n";
for (const [name, m] of Object.entries({
  all: report.overall,
  ...report.by_split,
  ...report.by_type,
}))
  md += `| ${name} | ${m.answerable} | ${m.no_answer} | ${display(m.hit_at_1)} | ${display(m.hit_at_5)} | ${m.mrr == null ? "n.a." : m.mrr.toFixed(4)} | ${display(m.no_answer_identification)} |\n`;
md +=
  "\n本次为可见预测的单人审核；不是盲审或全部 100 条 Gold。类别均衡抽样不代表真实查询频率。开发/测试分开报告；部分审核存在审核选择偏差，缺失指标不是零。此版本不能与旧 8734 对象候选评估直接作准确率增幅比较。\n";
fs.writeFileSync(directory + "/REPORT.md", md);
console.log(
  "Saved new immutable human review result: " +
    directory +
    "; reviewed " +
    scored.length +
    "/50. No original report overwritten.",
);
