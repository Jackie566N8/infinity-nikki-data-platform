import assert from "node:assert/strict";
import M from "./search-model.cjs";
export function validateBenchmark(
  corpus,
  aliases,
  cases,
  { requireHuman = false } = {},
) {
  const byId = new Map(corpus.map((r) => [r.id, r]));
  assert.equal(byId.size, corpus.length, "Duplicate corpus ID");
  const seen = new Set(),
    queries = new Map(),
    groups = new Map(),
    familySplits = new Map();
  for (const q of cases) {
    assert.ok(q.query_id && !seen.has(q.query_id), "Unique query IDs required");
    seen.add(q.query_id);
    assert.ok(q.query.trim());
    assert.ok(["dev", "test"].includes(q.split));
    assert.ok(
      [
        "formal",
        "nickname",
        "typo_pinyin",
        "partial",
        "description",
        "multilingual",
      ].includes(q.type),
    );
    assert.ok(Array.isArray(q.expected_ids));
    assert.equal(q.answerable, q.expected_ids.length > 0);
    assert.equal(new Set(q.expected_ids).size, q.expected_ids.length);
    assert.ok(q.group_id);
    if (groups.has(q.group_id))
      assert.equal(
        groups.get(q.group_id),
        q.split,
        "Group leaked across splits",
      );
    groups.set(q.group_id, q.split);
    const normalized = M.normalize(q.query);
    if (queries.has(normalized))
      assert.equal(queries.get(normalized), q.split, "Normalized query leaked");
    queries.set(normalized, q.split);
    // A negative query can still explicitly mention a known object. Its context must stay with that family.
    if (!q.answerable)
      for (const object of corpus.filter(
        (r) => r.kind === "outfits" && r.is_base,
      )) {
        const name = object.names["zh-CN"];
        if (name.length >= 3 && normalized.includes(M.normalize(name))) {
          if (familySplits.has(object.family_id))
            assert.equal(
              familySplits.get(object.family_id),
              q.split,
              "Negative context family leaked",
            );
          familySplits.set(object.family_id, q.split);
        }
      }
    for (const id of q.expected_ids) {
      assert.ok(byId.has(id), "Unknown gold ID " + id);
      const family = byId.get(id).family_id;
      if (familySplits.has(family))
        assert.equal(
          familySplits.get(family),
          q.split,
          "Answer family leaked: " + family,
        );
      familySplits.set(family, q.split);
    }
    if (requireHuman) {
      assert.equal(
        q.human_review?.status,
        "approved",
        "Human review required: " + q.query_id,
      );
      assert.ok(q.human_review.reviewer?.trim(), "Reviewer required");
      assert.ok(
        Number.isFinite(Date.parse(q.human_review.reviewed_at)),
        "Review timestamp required",
      );
    }
  }
  for (const a of aliases) assert.ok(byId.has(a.outfitId));
  return {
    queries: cases.length,
    groups: groups.size,
    dev: cases.filter((q) => q.split === "dev").length,
    test: cases.filter((q) => q.split === "test").length,
    approved: cases.filter((q) => q.human_review?.status === "approved").length,
  };
}
