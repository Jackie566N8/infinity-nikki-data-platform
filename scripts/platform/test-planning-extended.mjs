import fs from "node:fs";
import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { DatabaseSync } from "node:sqlite";
import M from "./planning-model.cjs";
import { buildPlanningStatuses } from "./planning-status.mjs";
const D = JSON.parse(
    fs.readFileSync(
      new URL("../../data/dataset/planning/input.json", import.meta.url),
    ),
  ),
  db = new DatabaseSync(
    new URL(
      "../../data/dataset/miraland.sqlite",
      import.meta.url,
    ).pathname.replace(/^\/(\w:)/, "$1"),
    { readOnly: true },
  );
const ids = D.outfits.map((o) => o.id),
  r = M.analyze(D, ids),
  ready = r.status.filter((s) => s.ready);
const count = (sql) => db.prepare(sql).get().n;
assert.equal(r.status.length, count("SELECT COUNT(*) n FROM outfits"));
assert.equal(
  ready.filter((s) => s.outfit.is_base).length,
  count(
    "SELECT COUNT(*) n FROM outfit_recipe_status s JOIN outfits o ON o.outfit_id=s.outfit_id WHERE s.status='complete' AND o.is_base=1",
  ),
);
assert.equal(
  ready.filter((s) => s.outfit.form_type === "renewal").length,
  count(
    "SELECT COUNT(*) n FROM outfit_recipe_status s JOIN outfits o ON o.outfit_id=s.outfit_id WHERE s.status='complete' AND o.form_type='renewal'",
  ),
);
assert.equal(
  r.status.filter((s) => s.reason === "not_crafting").length,
  count(
    "SELECT COUNT(*) n FROM outfit_recipe_status WHERE status='not_crafting'",
  ),
);
assert.equal(
  r.status.filter((s) => s.outfit.form_type === "evolution" && s.ready).length,
  count(
    "SELECT COUNT(*) n FROM outfits o JOIN outfit_recipe_status s ON s.outfit_id=o.outfit_id WHERE o.form_type='evolution' AND s.status='complete'",
  ),
);
const sql = db
  .prepare(
    `SELECT i.material_id,SUM(i.quantity) total,COALESCE(i.unit,'count') unit FROM recipes r JOIN recipe_ingredients i USING(recipe_id) WHERE r.status='complete' AND r.scope IN ('whole_outfit','renewal','evolution') GROUP BY i.material_id,unit`,
  )
  .all();
for (const x of sql) {
  const a = r.rows.find((a) => a.id === x.material_id);
  assert.equal(a.total, x.total);
  assert.equal(a.unit, x.unit);
}
assert.equal(r.rows.length, sql.length);
const renewal = ready.find((s) => s.outfit.form_type === "renewal"),
  tr = M.analyze(D, [renewal.id]);
assert.equal(tr.rows.length, 3);
assert.ok(tr.status[0].recipe.prerequisite.includes("10"));
const full = M.analyze(D, [renewal.id, renewal.outfit.base_id]);
assert.ok(
  full.rows.find((x) => x.id === "mthread-of-purity").total >=
    tr.rows.find((x) => x.id === "mthread-of-purity").total,
);
const weight = r.rows.find((x) => x.unit === "kg");
assert.ok(weight);
assert.equal(
  M.analyze(D, ids, { [weight.id]: 1.25 }).rows.find((x) => x.id === weight.id)
    .gap,
  weight.total - 1.25,
);
assert.throws(() => M.inventoryValue("1.25"));
assert.equal(M.inventoryValue("1.25", "kg"), 1.25);
const csvRows = M.exportRows(r, "en", (m) => m.names.en);
assert.equal(csvRows[0].row_type, "plan_header");
assert.ok(csvRows[0].skipped_outfits.includes("o10001:"));
assert.ok(csvRows[0].prerequisites.includes("10"));
assert.equal(
  csvRows.filter((x) => x.row_type === "pending_target").length,
  count("SELECT COUNT(*) n FROM outfit_recipe_status WHERE status<>'complete'"),
);
// Synthesized fixture verifies stock allocation across a diamond-shaped dependency graph.
const synthetic = {
  snapshot_id: "test",
  outfits: [
    { id: "a", is_base: 1 },
    { id: "b", is_base: 1 },
  ],
  materials: ["p", "q", "raw"].map((id) => ({ id, name: id })),
  recipes: [
    {
      recipe_id: "a",
      target_id: "a",
      scope: "whole_outfit",
      status: "complete",
      output_quantity: 1,
    },
    {
      recipe_id: "b",
      target_id: "b",
      scope: "whole_outfit",
      status: "complete",
      output_quantity: 1,
    },
    {
      recipe_id: "p",
      target_id: "p",
      scope: "material",
      status: "complete",
      output_quantity: 2,
    },
    {
      recipe_id: "q",
      target_id: "q",
      scope: "material",
      status: "complete",
      output_quantity: 1,
    },
  ],
  ingredients: [
    { recipe_id: "a", material_id: "p", quantity: 3 },
    { recipe_id: "b", material_id: "p", quantity: 2 },
    { recipe_id: "b", material_id: "q", quantity: 1 },
    { recipe_id: "p", material_id: "raw", quantity: 3 },
    { recipe_id: "q", material_id: "raw", quantity: 4 },
  ],
  areas: [{ material_id: "raw", region: "A" }],
  points: [],
};
const sr = M.analyze(synthetic, ["a", "b"], { p: 1, raw: 2 });
assert.equal(sr.rows.find((x) => x.id === "p").batches, 2);
assert.equal(sr.rows.find((x) => x.id === "raw").total, 10);
assert.equal(sr.rows.find((x) => x.id === "raw").gap, 8);
assert.equal(sr.regions[0].rows.length, 1);
assert.ok(
  sr.rows.find((x) => x.id === "raw").items.every((i) => i.path.length === 3),
);
assert.equal(
  M.analyze(synthetic, ["a", "b"], { p: 5, q: 1 }).rows.some(
    (x) => x.id === "raw",
  ),
  false,
);
const cycle = structuredClone(synthetic);
cycle.recipes.push({
  recipe_id: "raw",
  target_id: "raw",
  scope: "material",
  status: "complete",
  output_quantity: 1,
});
cycle.ingredients.push({ recipe_id: "raw", material_id: "p", quantity: 1 });
assert.throws(() => M.analyze(cycle, ["a"]), /cycle/);
const tables = {
  objects: [{ object_id: "new", obtain_status: "uncollected", source_id: "s" }],
  outfits: [{ outfit_id: "new", is_base: 1, form_type: "base" }],
  outfit_clothing: [],
  recipes: [],
};
assert.equal(buildPlanningStatuses(tables)[0].status, "missing_entry");
assert.throws(() =>
  buildPlanningStatuses(tables, {
    outfit_status_overrides: [
      { outfit_id: "new", status: "unpublished", reason: "unknown" },
    ],
  }),
);
const newActivity = structuredClone(tables);
newActivity.objects[0].obtain_status = "known";
newActivity.objects[0].obtain_text = "新活动获取";
assert.equal(
  buildPlanningStatuses(newActivity, { baseline_ids: [] })[0].status,
  "missing_entry",
);
const before = performance.now();
for (let i = 0; i < 100; i++) M.analyze(D, ids);
const average = (performance.now() - before) / 100;
assert.ok(average < 100, "full catalog calculation too slow: " + average);
db.close();
console.log(
  "PASS: all " +
    ids.length +
    " forms vs SQL; base/renewal separation; decimal kg; export exclusions; nested synthesis, stock conservation and cycle rejection; new-item backfill; full-catalog average " +
    average.toFixed(2) +
    "ms.",
);
