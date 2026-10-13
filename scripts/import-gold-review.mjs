import fs from "node:fs";
import assert from "node:assert/strict";
const file = process.argv[2];
if (!file)
  throw Error(
    "Usage: node scripts/import-gold-review.mjs completed-review.csv",
  );
function parse(s) {
  const rows = [],
    row = [];
  let cell = "",
    quoted = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '"') {
      if (quoted && s[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = !quoted;
    } else if (!quoted && (ch === "," || ch === "\n")) {
      row.push(cell.replace(/\r$/, ""));
      cell = "";
      if (ch === "\n") {
        rows.push(row.splice(0));
      }
    } else cell += ch;
  }
  if (quoted) throw Error("Unclosed CSV quote");
  if (cell || row.length) {
    row.push(cell.replace(/\r$/, ""));
    rows.push(row);
  }
  const headers = rows.shift().map((x) => x.replace(/^\ufeff/, ""));
  return rows
    .filter((r) => r.some(Boolean))
    .map((r) => Object.fromEntries(headers.map((h, i) => [h, r[i] || ""])));
}
const rows = parse(fs.readFileSync(file, "utf8")),
  cases = JSON.parse(
    fs.readFileSync("data/dataset/search/queries.candidates.json"),
  ),
  manifest = JSON.parse(fs.readFileSync("data/dataset/search/manifest.json")),
  ids = new Set(),
  validIds = new Set(
    JSON.parse(fs.readFileSync("data/dataset/search/corpus.json")).map(
      (x) => x.id,
    ),
  ),
  annotations = [];
for (const r of rows) {
  if (r.review_status === "pending" || !r.review_status) continue;
  assert.ok(
    ["approved", "rejected"].includes(r.review_status),
    "Invalid status",
  );
  assert.ok(!ids.has(r.data_item), "Duplicate review");
  ids.add(r.data_item);
  assert.ok(
    cases.some((q) => q.query_id === r.data_item),
    "Unknown query",
  );
  assert.ok(
    r.reviewer.trim() && Number.isFinite(Date.parse(r.reviewed_at)),
    "Reviewer and timestamp required",
  );
  assert.ok(/^https:\/\//.test(r.evidence_url), "Evidence URL required");
  let expected_ids;
  try {
    expected_ids = JSON.parse(r.approved_ids);
  } catch {
    throw Error("approved_ids must be JSON array, including [] for no answer");
  }
  assert.ok(
    Array.isArray(expected_ids) && expected_ids.every((id) => validIds.has(id)),
  );
  assert.ok(["true", "false"].includes(r.approved_answerable));
  assert.equal(expected_ids.length > 0, r.approved_answerable === "true");
  annotations.push({
    query_id: r.data_item,
    status: r.review_status,
    expected_ids,
    reviewer: r.reviewer,
    reviewed_at: r.reviewed_at,
    comment: r.notes,
    evidence_url: r.evidence_url,
  });
}
if (!annotations.length)
  throw Error("No actual human review; blank template cannot become Gold");
fs.mkdirSync("data/review", { recursive: true });
fs.writeFileSync(
  "data/review/human-reviews.local.json",
  JSON.stringify({ cases_sha256: manifest.cases_sha256, annotations }, null, 2),
);
console.log(
  "Validated human reviews",
  annotations.length,
  "/100; frozen labels and original test report unchanged. Partial reviews do not constitute a full Gold benchmark.",
);
