import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { performance } from "node:perf_hooks";
const dir = path.dirname(fileURLToPath(import.meta.url)),
  require = createRequire(import.meta.url),
  M = require("./advanced-model.cjs"),
  convert = require("../search-improved/vendor/opencc-js.cjs").Converter({
    from: "tw",
    to: "cn",
  }),
  D = JSON.parse(
    fs.readFileSync(
      path.join(dir, "../../../data/dataset/advanced/input.json"),
    ),
  ),
  model = M.createModel(D.documents);
let checks = 0;
const test = (name, fn) => {
  fn();
  checks++;
  console.log("PASS " + name);
};
test("every recommendation has stable IDs, different family, explainable contributions", () => {
  assert.equal(new Set(D.documents.map((r) => r.id)).size, D.documents.length);
  for (const a of D.documents) {
    const list = D.recommendations[a.id];
    assert.ok(list.length <= 6);
    for (const r of list) {
      const b = D.documents.find((d) => d.id === r.id);
      assert.ok(b);
      assert.notEqual(a.family_id, b.family_id);
      assert.ok(r.score <= 1 + 1e-10 && r.score >= 0.35);
      assert.ok(
        Math.abs(r.blocks.reduce((s, c) => s + c.contribution, 0) - r.score) <
          1e-10,
      );
      assert.ok(
        Math.abs(model.pair(a, b).score - model.pair(b, a).score) < 1e-10,
      );
      assert.ok(
        r.blocks.some(
          (b) =>
            ["style", "tags", "colors", "elements"].includes(b.field) &&
            b.shared.length,
        ),
      );
      assert.equal(
        r.blocks.some((b) =>
          ["colors", "elements", "difficulty"].includes(b.field),
        ),
        false,
      );
    }
  }
});
test("self similarity and missing blocks; rarity/channel alone are insufficient", () => {
  const a = {
      id: "a",
      family_id: "a",
      is_base: 1,
      style: "甜美",
      rarity: 5,
      tags: ["幻想"],
      methods: ["gacha"],
    },
    b = { ...a, id: "b", family_id: "b", style: "清新", tags: ["田园"] },
    c = { ...a, id: "c", family_id: "c", methods: [] },
    e = M.createModel([a, b, c]);
  assert.equal(e.pair(a, a).score, 1);
  assert.ok(Math.abs(e.pair(a, c).score - 1) < 1e-10);
  assert.equal(
    e.recommend("a").some((r) => r.id === "b"),
    false,
  );
  assert.ok(e.pair(a, c).coverage < e.pair(a, a).coverage);
});
test("filters are hard constraints; all forms map to existing bases", () => {
  for (const base of Object.values(D.form_to_base))
    assert.ok(model.docs.some((d) => d.id === base));
  assert.equal(model.recommend("o10349", 6, { rarity: 1 }).length, 0);
  for (const r of model.recommend("o10349", 6, { style: "甜美" }))
    assert.equal(D.documents.find((o) => o.id === r.id).style, "甜美");
});
test("true ambiguity differs from multiple nicknames and suffix/traditional normalization", () => {
  const fixture = [
      {
        outfitId: "a",
        name: "生于无瑕",
        aliases: ["神女套", "神女套装", "镜子套"],
        sources: [],
      },
      { outfitId: "b", name: "另一个套装", aliases: ["鏡子套裝"], sources: [] },
    ],
    s = M.aliasStudy(fixture, convert);
  assert.equal(s.object_count, 2);
  assert.equal(s.alias_count, 4);
  assert.equal(s.normalized_alias_count, 2);
  assert.equal(s.ambiguous.length, 1);
  assert.equal(s.multiple_nickname_objects.length, 1);
  assert.equal(s.ambiguity_rate, 0.5);
  assert.equal(M.editDistance("精灵颂歌", "精灵松歌"), 1);
  assert.equal(M.editDistance("", "神女"), 2);
  assert.equal(
    s.bins.reduce((n, b) => n + b.count, 0),
    4,
  );
});
test("regional coverage assigns once; zero/unknown/non-gathering are not fake points", () => {
  const row = (id, regions, shared = false) => ({
      id,
      regions,
      gap: 10,
      unit: "count",
      shared,
      area_evidence: [],
      material: { guidance: { kind: "gathering" } },
    }),
    a = row("a", ["甲", "乙"], true),
    b = row("b", ["甲"]),
    c = row("c", ["乙"]);
  const r = M.regionPlan({
    regions: [
      { region: "甲", rows: [a, b] },
      { region: "乙", rows: [a, c] },
    ],
    unknownRegions: [{ id: "unknown" }],
    nonGathering: [{ id: "coin" }],
  });
  assert.equal(r.steps[0].region, "甲");
  assert.deepEqual(
    r.steps.flatMap((r) => r.rows.map((r) => r.id)),
    ["a", "b", "c"],
  );
  assert.deepEqual(r.points, []);
  assert.deepEqual(r.teleports, []);
  assert.equal(r.distance, null);
  assert.equal(r.optimal, false);
  assert.deepEqual(r.unknown_region_ids, ["unknown"]);
  assert.deepEqual(r.non_gathering_ids, ["coin"]);
  assert.equal(M.regionPlan({ regions: [] }).steps.length, 0);
});
test("SQLite totals reconcile with serialized outputs; proposed telemetry has no events", () => {
  const db = new DatabaseSync(
    path.join(dir, "../../../data/dataset/advanced/advanced.sqlite"),
  );
  assert.equal(
    db.prepare("SELECT COUNT(*) n FROM recommendation_edges").get().n,
    Object.values(D.recommendations).flat().length,
  );
  assert.equal(
    db.prepare("SELECT COUNT(*) n FROM nickname_observations").get().n,
    D.nickname_study.alias_count,
  );
  assert.equal(
    db.prepare("SELECT COUNT(*) n FROM feature_coverage").get().n,
    7,
  );
  db.close();
  const mem = new DatabaseSync(":memory:");
  mem.exec(fs.readFileSync(path.join(dir, "search-usage-design.sql"), "utf8"));
  assert.equal(
    mem.prepare("SELECT COUNT(*) n FROM proposed_search_events").get().n,
    0,
  );
  assert.throws(() =>
    mem.exec(
      "INSERT INTO proposed_search_events(event_id,query_category,result_count,timestamp_hour,search_method_version,classifier_version,consent_version,consent_receipt_hash,expires_at) VALUES('bad','unknown',-1,'2026-10-10T01:00Z','v1','v1','v1','hash','2026-11-09')",
    ),
  );
  mem.close();
  assert.equal(D.telemetry.enabled, false);
  assert.equal(D.telemetry.collected_events, 0);
});
const times = [];
for (let i = 0; i < 30; i++) {
  const started = performance.now();
  model.recommend("o10349", 6, { rarity: 5 });
  times.push(performance.now() - started);
}
times.sort((a, b) => a - b);
console.log(
  JSON.stringify({
    checks,
    filtered_candidates: D.documents.length,
    median_ms: times[15],
    p95_ms: times[28],
    note: "Node model only; UI timing is separate; not recommendation accuracy",
  }),
);
