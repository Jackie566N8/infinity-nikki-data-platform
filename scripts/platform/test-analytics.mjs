import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import M from "./analytics-model.cjs";
const root = path.dirname(fileURLToPath(import.meta.url)),
  D = JSON.parse(
    fs.readFileSync(
      path.join(root, "../../data/dataset/analytics/input.json"),
      "utf8",
    ),
  ),
  db = new DatabaseSync(path.join(root, "../../data/dataset/miraland.sqlite"), {
    readOnly: true,
  });
const count = (sql, args = []) => db.prepare(sql).get(...args).n,
  plain = (rows) => rows.map((r) => ({ ...r }));
assert.equal(
  D.snapshot_id,
  JSON.parse(
    fs.readFileSync(
      path.join(root, "../../data/dataset/quality-report.json"),
      "utf8",
    ),
  ).snapshot.snapshot_id,
);
for (const scope of ["base", "all"])
  for (const rarity of ["", "3", "4", "5"])
    for (const style of ["", ...M.styles]) {
      const r = M.analyze(D, { scope, rarity, style }),
        where = `WHERE (?='all' OR f.is_base=1) AND (?='' OR o.rarity=?) AND (?='' OR o.style=?)`,
        args = [scope, rarity, rarity, style, style];
      assert.equal(
        r.totals.outfits,
        count(
          `SELECT COUNT(*) n FROM outfits f JOIN objects o ON o.object_id=f.outfit_id ${where}`,
          args,
        ),
      );
      for (const group of r.rarity)
        assert.equal(
          group.count,
          count(
            `SELECT COUNT(*) n FROM outfits f JOIN objects o ON o.object_id=f.outfit_id ${where} AND o.rarity=?`,
            [...args, group.key],
          ),
        );
      for (const group of r.style)
        assert.equal(
          group.count,
          count(
            `SELECT COUNT(*) n FROM outfits f JOIN objects o ON o.object_id=f.outfit_id ${where} AND o.style=?`,
            [...args, group.key],
          ),
        );
      const clothWhere = `WHERE (?='all' OR c.is_variant=0) AND (?='' OR o.rarity=?) AND (?='' OR o.style=?)`;
      assert.equal(
        r.totals.clothing,
        count(
          `SELECT COUNT(*) n FROM clothing c JOIN objects o ON o.object_id=c.clothing_id ${clothWhere}`,
          args,
        ),
      );
      for (const cell of r.heat)
        assert.equal(
          cell.count,
          count(
            `SELECT COUNT(*) n FROM clothing c JOIN objects o ON o.object_id=c.clothing_id ${clothWhere} AND o.category=? AND o.style=?`,
            [...args, cell.category, cell.style],
          ),
        );
      assert.equal(
        r.rarity.reduce((s, g) => s + g.count, 0),
        r.totals.outfits,
      );
      assert.equal(
        r.style.reduce((s, g) => s + g.count, 0),
        r.totals.outfits,
      );
      assert.equal(
        r.category.reduce((s, g) => s + g.count, 0),
        r.totals.clothing,
      );
      assert.equal(
        r.heat.reduce((s, g) => s + g.count, 0),
        r.totals.clothing,
      );
      assert.equal(
        r.versions.reduce((s, g) => s + g.count + g.pending, 0),
        r.totals.outfits,
      );
      const expected = count(
        `SELECT COUNT(*) n FROM outfits f JOIN objects o ON o.object_id=f.outfit_id JOIN object_releases l ON l.object_id=f.outfit_id JOIN releases d ON d.release_id=l.release_id JOIN versions v ON v.version_id=l.version_id ${where} AND d.context='public_release' AND d.release_date IS NOT NULL AND v.label NOT IN ('无图鉴','未知','待补充')`,
        args,
      );
      assert.equal(r.totals.dated, expected);
      assert.equal(r.totals.pending, r.totals.outfits - expected);
    }
for (const scope of ["base", "all"])
  for (const method of M.methods) {
    const r = M.analyze(D, { scope, method }),
      row = r.acquisition.find((v) => v.method === method);
    assert.equal(row.count, r.totals.outfits);
    assert.equal(r.associated, true);
    const ids = r.outfits.map((v) => v.id);
    assert.equal(
      r.totals.clothing,
      ids.length
        ? count(
            `SELECT COUNT(DISTINCT c.clothing_id) n FROM clothing c JOIN outfit_clothing x ON x.clothing_id=c.clothing_id WHERE (?='all' OR c.is_variant=0) AND x.outfit_id IN (${ids.map(() => "?")})`,
            [scope, ...ids],
          )
        : 0,
    );
    for (const o of r.outfits) {
      if (method === "craft") assert.ok(o.recipe_ids.length);
      else if (method !== "other")
        assert.ok(o.method_evidence.some((e) => e.method === method));
    }
  }
// Independent source assertion + relationship SQL checks for acquisition, no model-derived member IDs.
for (const [method, values] of Object.entries(D.method_rules)) {
  const expected = count(
    `SELECT COUNT(DISTINCT f.outfit_id) n FROM outfits f JOIN source_assertions a ON a.object_id=f.base_outfit_id WHERE f.is_base=1 AND a.field='obtain_text' AND a.value IN (${values.map(() => "?")})`,
    values,
  );
  assert.equal(M.analyze(D, { method }).totals.outfits, expected);
}
assert.equal(
  M.analyze(D, { method: "craft" }).totals.outfits,
  count(
    `SELECT COUNT(DISTINCT f.outfit_id) n FROM outfits f JOIN outfit_clothing x ON x.outfit_id=f.base_outfit_id JOIN recipes r ON r.target_id=x.clothing_id WHERE f.is_base=1`,
  ),
);
const base = M.analyze(D);
assert.equal(
  base.totals.outfits,
  count("SELECT COUNT(*) n FROM outfits WHERE is_base=1"),
);
assert.equal(
  base.totals.families,
  count("SELECT COUNT(*) n FROM outfit_families"),
);
assert.equal(
  base.totals.clothing,
  count("SELECT COUNT(*) n FROM clothing WHERE is_variant=0"),
);
assert.equal(base.totals.dated + base.totals.pending, base.totals.outfits);
const anchor = (r) =>
  r.versions
    .filter((v) => v.version_id)
    .map((v) => [v.version_id, v.anchor_date, v.anchor_source_urls]);
assert.deepEqual(
  anchor(base),
  anchor(M.analyze(D, { rarity: "5", style: "清新", method: "event" })),
);
assert.ok(
  base.acquisition.reduce((s, r) => s + r.count, 0) > base.totals.outfits,
);
for (const v of base.versions)
  assert.ok(!v.anchor_date || v.anchor_source_urls.length);
for (const combo of base.combinations) {
  assert.ok(combo.count > 0);
  assert.equal(combo.count, combo.ids.length);
  for (const id of combo.ids) {
    const o = D.outfits.find((v) => v.id === id);
    assert.equal(o.style, combo.style);
    assert.deepEqual([...o.tags].sort(), combo.tags);
  }
}
// Missing / test dates remain pending even when a collection date is available.
const small = {
  ...D,
  outfits: D.outfits
    .slice(0, 2)
    .map((o, i) => ({
      ...o,
      is_base: 1,
      release_date: i ? "2000-01-01" : null,
      release_context: i ? "test_release" : null,
    })),
};
const sr = M.analyze(small);
assert.equal(sr.totals.dated, 0);
assert.equal(sr.totals.pending, 2);
const empty = M.analyze(D, { rarity: "999", clothingScope: "linked" });
assert.equal(empty.totals.outfits, 0);
assert.equal(empty.totals.clothing, 0);
assert.ok(empty.style.every((v) => v.percent === null));
assert.equal(
  M.exportRows(D, empty, "combinations")[0].status,
  "no_matching_records",
);
const csv = M.toCSV([{ name: "=1+1", note: '引号"，逗号,\n换行', n: 0 }]);
assert.ok(csv.startsWith("\uFEFF"));
assert.ok(csv.includes('"\'=1+1"'));
assert.ok(csv.includes('引号""，逗号,\n换行'));
assert.ok(!csv.includes("undefined"));
for (const row of M.exportRows(D, base, "all")) {
  assert.equal(row.snapshot_id, D.snapshot_id);
  assert.equal(row.scope, "base");
  assert.ok(row.source_tables);
}
assert.equal(
  fs.readFileSync(
    path.join(root, "../../data/dataset/analytics/base-charts.csv"),
    "utf8",
  ),
  M.toCSV(M.exportRows(D, base, "all")),
);
db.close();
console.log(
  "PASS: 48 SQL filter comparisons; rarity/style/heat/category reconciliation; acquisition evidence; deduplication; date exclusions and stable anchors; empty states; CSV provenance and escaping.",
);
