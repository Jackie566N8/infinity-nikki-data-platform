import assert from "node:assert/strict";
import fs from "node:fs";
import M from "./search-model.cjs";
import { validateBenchmark } from "./validate.mjs";
const root = new URL("../../../data/dataset/search/", import.meta.url),
  read = (p) => JSON.parse(fs.readFileSync(new URL(p, root))),
  corpus = read("corpus.json"),
  aliases = read("aliases.json"),
  cases = read("queries.candidates.json"),
  report = read("provisional/report.json");
assert.deepEqual(validateBenchmark(corpus, aliases, cases), {
  queries: 100,
  groups: 20,
  dev: 70,
  test: 30,
  approved: 0,
});
assert.throws(() =>
  validateBenchmark(corpus, aliases, cases, { requireHuman: true }),
);
const leak = structuredClone(cases);
leak[0].split = leak[0].split === "dev" ? "test" : "dev";
assert.throws(() => validateBenchmark(corpus, aliases, leak));
const duplicate = structuredClone(cases);
duplicate[1].query_id = duplicate[0].query_id;
assert.throws(() => validateBenchmark(corpus, aliases, duplicate));
const missing = structuredClone(cases);
missing[0].expected_ids = ["no-object"];
assert.throws(() => validateBenchmark(corpus, aliases, missing));
const contextLeak = structuredClone(cases);
for (const q of contextLeak.filter(
  (q) => q.group_id === "negative:impossible-condition",
))
  q.split = "dev";
assert.throws(
  () => validateBenchmark(corpus, aliases, contextLeak),
  /context family leaked/,
);
assert.deepEqual(
  M.scoreCase({ expected_ids: ["right"] }, [{ id: "wrong" }, { id: "right" }]),
  {
    answerable: true,
    hit1: 0,
    hit5: 1,
    rr: 0.5,
    no_answer_correct: null,
    first_relevant_rank: 2,
    returned: 2,
  },
);
assert.equal(
  M.scoreCase(
    { expected_ids: ["right"] },
    Array.from({ length: 8 }, (_, i) => ({
      id: i === 7 ? "right" : "wrong" + i,
    })),
  ).rr,
  1 / 8,
);
assert.equal(M.scoreCase({ expected_ids: ["right"] }, []).rr, 0);
assert.equal(
  M.scoreCase({ expected_ids: [] }, [{ id: "anything" }]).no_answer_correct,
  0,
);
assert.equal(
  M.summarize([M.scoreCase({ expected_ids: ["right"] }, [])])
    .no_answer_accuracy,
  null,
);
const engine = M.createEngine(corpus, aliases);
assert.equal(engine.search("神女套", "B")[0].id, "o10349");
assert.equal(engine.search("Born Flawless", "A")[0].id, "o10349");
assert.equal(engine.search("神女套", "A").length, 0);
assert.equal(engine.search("Born Flawless", "B").length, 0);
assert.equal(
  engine.search("生于无瑕", "C").filter((r) => r.id === "o10349").length,
  1,
);
assert.equal(engine.search("", "C").length, 0);
assert.ok(M.aliasForms("镜子套").includes("鏡子套"));
for (const method of ["A", "B", "C", "L"]) {
  const rows = cases.map((q) => ({
    ...q,
    ...M.scoreCase(q, engine.search(q.query, method)),
    response_ms: 0,
  }));
  for (const split of ["dev", "test", "all"]) {
    const summary = M.summarize(
      rows.filter((q) => split === "all" || q.split === split),
    );
    for (const key of [
      "n",
      "answerable_n",
      "no_answer_n",
      "hit1",
      "hit5",
      "mrr",
      "no_answer_accuracy",
      "positive_abstention",
    ])
      assert.equal(summary[key], report.splits[split][method].overall[key]);
  }
}
assert.equal(report.annotation_status, "provisional_not_human_reviewed");
assert.equal(report.checks.approved, 0);
console.log(
  "PASS: frozen 100 queries, 70/30 family groups, leakage rejection, ID/metric edge cases, no-answer denominators, A/B/C semantics, report recalculation and honest review status.",
);
