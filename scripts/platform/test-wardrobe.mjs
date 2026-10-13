import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import M from "./wardrobe-model.cjs";
import S from "./preferences-schema.cjs";
const root = path.dirname(fileURLToPath(import.meta.url)),
  D = JSON.parse(
    fs.readFileSync(
      path.join(root, "../../data/dataset/analytics/input.json"),
      "utf8",
    ),
  ),
  pub = JSON.parse(
    fs.readFileSync(
      path.join(root, "../../data/input/preferences.json"),
      "utf8",
    ),
  ),
  db = new DatabaseSync(path.join(root, "../../data/dataset/miraland.sqlite"), {
    readOnly: true,
  });
assert.deepEqual(S.validate(pub, D), []);
const base = D.outfits.find(
    (o) =>
      o.is_base &&
      o.part_ids.length >= 6 &&
      D.outfits.some((v) => v.base_id === o.id && !v.is_base),
  ),
  variant = D.outfits.find((o) => o.base_id === base.id && !o.is_base);
assert.equal(M.personal(D, { saved: [base.id] }).totals.owned, 0);
assert.equal(M.personal(D, {}).totals.complete, 0);
const marks = {
    owned: [
      base.id,
      ...D.clothing.filter((_, i) => i % 19 === 0).map((c) => c.id),
    ],
    saved: [base.id, variant.id],
  },
  bound = marks.owned.map(() => "?").join(","),
  effective = db
    .prepare(
      `SELECT clothing_id AS id FROM clothing WHERE clothing_id IN (${bound}) UNION SELECT clothing_id AS id FROM outfit_clothing WHERE outfit_id IN (${bound})`,
    )
    .all(...marks.owned, ...marks.owned)
    .map((r) => r.id)
    .sort();
assert.deepEqual(M.effectiveOwned(D, marks).effective.size, effective.length);
assert.deepEqual([...M.effectiveOwned(D, marks).effective].sort(), effective);
for (const scope of ["base", "variants", "all"])
  for (const rarity of ["", "4", "5"])
    for (const style of ["", ...M.styles]) {
      const p = M.personal(D, marks, { scope, rarity, style }),
        sets = D.outfits.filter(
          (o) =>
            (scope === "all" ||
              (scope === "base" ? o.is_base === 1 : o.is_base === 0)) &&
            (!rarity || o.rarity === Number(rarity)) &&
            (!style || o.style === style),
        );
      assert.equal(p.totals.outfits, sets.length);
      assert.equal(
        p.totals.complete,
        sets.filter(
          (o) =>
            o.part_ids.length &&
            o.part_ids.every((id) => effective.includes(id)),
        ).length,
      );
      assert.equal(
        p.coverage.styles.reduce((n, s) => n + s.total, 0),
        p.totals.clothing,
      );
      assert.equal(
        p.coverage.categories.reduce((n, s) => n + s.owned, 0),
        p.totals.owned,
      );
      assert.equal(
        p.completion.styles.reduce((n, s) => n + s.owned, 0),
        p.totals.complete,
      );
      assert.equal(p.totals.favorites, 1);
    }
assert.ok(
  M.personal(D, { owned: [base.id] }).outfits.find((o) => o.id === base.id)
    .complete,
);
assert.equal(
  M.personal(D, { owned: [base.id] }, { scope: "variants" }).outfits.find(
    (o) => o.id === variant.id,
  ).complete,
  false,
);
for (const missing of [1, 2]) {
  const p = M.personal(D, { owned: base.part_ids.slice(missing) });
  assert.equal(p.near.find((o) => o.id === base.id).missing.length, missing);
}
assert.equal(M.personal(D, {}).near.length, 0);
const c = M.community(D, pub, { saved: ["o10330"] });
assert.equal(c.study.sample_size, 62);
assert.ok(Math.abs(c.rows.find((o) => o.id === "o10330").value - 80.6) < 1e-8);
assert.ok(Math.abs(c.rows.find((o) => o.id === "o10331").value - 61.3) < 1e-8);
assert.equal(c.distribution.find((s) => s.style === "帅气").personal, 100);
assert.ok(
  Math.abs(c.distribution.reduce((n, s) => n + (s.community || 0), 0) - 100) <
    1e-8,
);
assert.equal(
  M.community(D, pub, {}, { style: "帅气" }).rows[0].value,
  c.rows[0].value,
);
assert.equal(M.community(D, pub, {}).recommendations.length, 0);
const sameStyle = D.outfits.find(
  (o) =>
    o.is_base && o.style === "帅气" && !["o10330", "o10331"].includes(o.id),
);
assert.ok(
  M.community(D, pub, { saved: [sameStyle.id] }).recommendations.some(
    (o) => o.id === "o10330",
  ),
);
assert.equal(
  M.community(D, pub, { saved: [sameStyle.id], owned: ["o10330"] })
    .recommendations.length,
  0,
);
const fixtures = structuredClone(pub),
  s = fixtures.studies[0];
s.form_scope = "form";
s.candidate_ids = [base.id, variant.id];
s.options = [
  {
    option_id: "fixture:1",
    label: "A",
    percent: 40,
    vote_count: null,
    outfit_ids: [base.id],
  },
  {
    option_id: "fixture:2",
    label: "B",
    percent: 60,
    vote_count: null,
    outfit_ids: [variant.id],
  },
];
const form = M.community(D, fixtures, { saved: [base.id, variant.id] });
assert.equal(form.all_favorites, 2);
assert.equal(form.comparable_favorites, 2);
assert.ok(
  form.distribution.every((r) => r.personal === null || r.personal <= 100),
);
assert.equal(M.trend(D, pub, "").ready, false);
const waves = structuredClone(pub);
waves.studies = waves.studies.slice(0, 1);
Object.assign(waves.studies[0], {
  comparison_series: "test-series",
  comparability_note: "Test fixture only",
  period_start: "2025-01-01",
  period_end: "2025-01-10",
  period_version_id: D.versions[0].version_id,
});
waves.studies.push({
  ...structuredClone(waves.studies[0]),
  study_id: "study:test-wave2",
  period_start: "2025-02-01",
  period_end: "2025-02-10",
  period_version_id: D.versions[1].version_id,
});
assert.equal(M.trend(D, waves, "test-series").ready, true);
waves.studies[1].question = "different question";
assert.equal(M.trend(D, waves, "test-series").ready, false);
waves.studies[1].question = waves.studies[0].question;
waves.studies[1].period_start = "2025-01-09";
assert.equal(M.trend(D, waves, "test-series").reason, "overlapping_periods");
for (const mutate of [
  (p) => p.sources.push(p.sources[0]),
  (p) => (p.studies[0].candidate_ids[0] = "o-no-such-id"),
  (p) => (p.studies[0].options[0].percent = 130),
  (p) => (p.studies[0].sample_size = null),
  (p) => (p.studies[0].source_id = "bad:source"),
  (p) => (p.studies[0].published_date = "2025-02-30"),
  (p) => (p.studies[0].form_scope = "all-players"),
  (p) => p.studies[0].options[0].outfit_ids.push("o10330"),
]) {
  const invalid = structuredClone(pub);
  mutate(invalid);
  assert.ok(S.validate(invalid, D).length);
}
// Isolated build verifies append-only snapshots, repeatability and validation-before-publish.
const testRoot = path.join(root, "test-output");
fs.mkdirSync(testRoot, { recursive: true });
const temp = fs.mkdtempSync(path.join(testRoot, "miraland-public-test-")),
  input = path.join(temp, "input.json"),
  out = path.join(temp, "dataset");
fs.writeFileSync(input, JSON.stringify(pub));
const build = () =>
    execFileSync(
      process.execPath,
      [
        path.join(root, "build-preferences.mjs"),
        "--input",
        input,
        "--out",
        out,
      ],
      { windowsHide: true, stdio: "pipe" },
    ),
  history = () =>
    JSON.parse(fs.readFileSync(path.join(out, "history/index.json"), "utf8"));
build();
assert.equal(history().length, 1);
build();
assert.equal(history().length, 1);
const originalArchive = fs.readFileSync(
  path.join(out, "history", history()[0].file),
  "utf8",
);
const updated = structuredClone(pub);
updated.update_note = "Test correction";
updated.studies[0].options[0].percent += 1;
updated.studies[0].options[1].percent -= 1;
fs.writeFileSync(input, JSON.stringify(updated));
build();
assert.equal(history().length, 2);
assert.equal(
  fs.readFileSync(path.join(out, "history", history()[0].file), "utf8"),
  originalArchive,
);
const databaseBefore = fs.readFileSync(path.join(out, "community.sqlite"));
updated.studies[0].candidate_ids[0] = "missing";
fs.writeFileSync(input, JSON.stringify(updated));
assert.throws(build);
assert.equal(history().length, 2);
assert.deepEqual(
  fs.readFileSync(path.join(out, "community.sqlite")),
  databaseBefore,
);
const communityDb = new DatabaseSync(path.join(out, "community.sqlite"), {
  readOnly: true,
});
assert.equal(communityDb.prepare("SELECT COUNT(*) n FROM studies").get().n, 4);
assert.deepEqual(communityDb.prepare("PRAGMA foreign_key_check").all(), []);
communityDb.close();
db.close();
console.log(
  "PASS: 54 wardrobe filter combinations; SQL ownership derivation; no form leakage; missing parts; sample-only ranks/radar/recommendations; comparable trend gating; invalid input rejection; idempotent, immutable snapshots. Test fixtures never published.",
);
