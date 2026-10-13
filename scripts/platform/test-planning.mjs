import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import M from "./planning-model.cjs";
import { schema, validateTables } from "./schema.mjs";
const here = path.dirname(fileURLToPath(import.meta.url)),
  D = JSON.parse(
    fs.readFileSync(path.join(here, "../../data/dataset/planning/input.json")),
  ),
  db = new DatabaseSync(path.join(here, "../../data/dataset/miraland.sqlite"), {
    readOnly: true,
  });
const ids = ["o10045", "o10048", "o10060", "o10029"];
let r = M.analyze(D, ids, {});
assert.equal(r.complete, true);
assert.equal(r.totals.shared, 2);
assert.equal(r.totals.materials, 7);
assert.equal(r.rows.find((m) => m.id === "mthread-of-purity").total, 106);
assert.equal(r.rows.find((m) => m.id === "mdaisy").total, 8);
// Compare aggregation independently against normalized SQL for every subset and stock scenario.
for (let mask = 0; mask < 16; mask++) {
  const selected = ids.filter((_, i) => mask & (1 << i));
  for (const inventory of [
    {},
    { mdaisy: 3, "mthread-of-purity": 90 },
    { mdaisy: 9999, "mthread-of-purity": 1000 },
  ]) {
    const actual = M.analyze(D, selected, inventory),
      sql = db
        .prepare(
          `SELECT i.material_id,SUM(i.quantity) AS total,COUNT(DISTINCT r.target_id) AS targets FROM recipes r JOIN recipe_ingredients i USING(recipe_id) JOIN outfits o ON o.outfit_id=r.target_id WHERE r.status='complete' AND r.scope='whole_outfit' AND o.is_base=1 AND r.target_id IN (SELECT value FROM json_each(?)) GROUP BY i.material_id`,
        )
        .all(JSON.stringify(selected));
    assert.equal(actual.rows.length, sql.length);
    for (const q of sql) {
      const a = actual.rows.find((x) => x.id === q.material_id);
      assert.equal(a.total, q.total);
      assert.equal(
        a.gap,
        Math.max(0, q.total - (inventory[q.material_id] || 0)),
      );
      assert.equal(a.outfit_ids.length, q.targets);
    }
    for (const area of actual.regions) {
      assert.equal(area.count, new Set(area.rows.map((x) => x.id)).size);
      assert.ok(area.rows.every((x) => x.gap > 0));
    }
  }
}
r = M.analyze(D, ["o10045", "o10045", "o10060"], { mdaisy: 3 });
assert.equal(r.rows.find((x) => x.id === "mdaisy").gap, 3);
assert.equal(r.rows.find((x) => x.id === "mthread-of-purity").total, 50);
const evolution = D.outfits.find((o) => o.form_type === "evolution" && o.availability.status !== "complete");
assert.equal(M.analyze(D, [evolution.id]).rows.length, 0);
assert.equal(
  M.analyze(D, [evolution.id]).status[0].reason,
  "evolution_pending",
);
r = M.analyze(D, ["o10045", "o10001"], {});
assert.equal(r.complete, false);
assert.equal(r.totals.pending, 1);
assert.equal(
  M.exportRows(r, "en", (m) => m.name).filter(
    (x) => x.row_type === "pending_target",
  ).length,
  1,
);
for (const bad of [-1, 1.2, Infinity, NaN, "-1", "abc", "1e3", 1000000001])
  assert.throws(() => M.inventoryValue(bad));
for (const ok of [0, 1000000000, "12"])
  assert.equal(M.inventoryValue(ok), Number(ok));
assert.equal(M.inventoryValue(""), null);
const stock = Object.fromEntries(
  M.analyze(D, ids).rows.map((x) => [x.id, 99999]),
);
r = M.analyze(D, ids, stock);
assert.equal(r.totals.missing, 0);
assert.equal(r.regions.length, 0);
assert.equal(r.nonGathering.length, 0);
r = M.analyze(D, ids);
assert.equal(r.regions[0].region, "花愿镇");
assert.equal(r.regions[0].count, 6);
assert.equal(r.nonGathering[0].id, "mthread-of-purity");
assert.ok(
  !r.regions.some((a) => a.rows.some((x) => x.id === "mthread-of-purity")),
);
const unknown = structuredClone(D);
unknown.areas = unknown.areas.filter((a) => a.material_id !== "mlampchili");
assert.ok(
  M.analyze(unknown, ["o10048"]).unknownRegions.some(
    (x) => x.id === "mlampchili",
  ),
);
const duplicated = structuredClone(D);
duplicated.areas.push({ ...duplicated.areas[0] });
assert.deepEqual(
  M.analyze(duplicated, ids).regions.map((a) => [a.region, a.count]),
  r.regions.map((a) => [a.region, a.count]),
);
const partial = structuredClone(D);
partial.recipes.find((x) => x.target_id === "o10045").status = "partial";
assert.equal(M.analyze(partial, ["o10045"]).rows.length, 0);
const conflict = structuredClone(D);
conflict.recipes.push({ ...conflict.recipes[0], recipe_id: "duplicate" });
assert.equal(
  M.analyze(conflict, [conflict.recipes[0].target_id]).status[0].reason,
  "conflict",
);
const saved = {
  schema_version: 1,
  targets: ["o10045", "o10045", "no"],
  inventory: { mdaisy: 3, no: 4 },
};
assert.deepEqual(M.restore(D, saved), {
  schema_version: 1,
  targets: ["o10045"],
  inventory: { mdaisy: 3 },
});
assert.throws(() => M.restore(D, { ...saved, inventory: { mdaisy: -1 } }));
const csv = M.csv(M.exportRows(M.analyze(D, ids), "ja", (m) => m.names.ja));
assert.ok(csv.startsWith("\uFEFF"));
assert.ok(csv.includes("モコギク"));
assert.ok(csv.includes("recipe_checked_at"));
assert.ok(M.csv([{ test: "=cmd()", multi: "a,b\nc" }]).includes("'=cmd()"));
for (const id of new Set(D.ingredients.map((i) => i.material_id)))
  for (const locale of ["zh-CN", "en", "ja", "ko", "zh-TW"])
    assert.ok(D.materials.find((m) => m.id === id).names[locale]);
const tables = Object.fromEntries(
  Object.keys(schema).map((k) => [
    k,
    JSON.parse(
      fs.readFileSync(
        path.join(here, "../../data/dataset/json/" + k + ".json"),
      ),
    ),
  ]),
);
assert.deepEqual(validateTables(tables), []);
const bad = structuredClone(tables);
bad.recipes.find((x) => x.scope === "whole_outfit").target_id = "o1004502";
assert.ok(validateTables(bad).some((e) => e.rule === "recipe_scope"));
bad.recipe_ingredients[0].quantity = -1;
assert.ok(validateTables(bad).some((e) => e.table === "recipe_ingredients"));
db.close();
console.log(
  "PASS: 48 independent SQL comparisons; duplicate targets; one-time stock deduction; evolution/unknown/partial/conflicting recipes; area alternatives; stock validation; CSV provenance; five-language material names; schema guards.",
);
