import fs from "node:fs";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { validateTables, schema } from "./schema.mjs";
const read = (f) => JSON.parse(fs.readFileSync("data/dataset/" + f)),
  db = new DatabaseSync("data/dataset/miraland.sqlite", { readOnly: true }),
  P = read("planning/input.json"),
  Q = read("quality-report.json"),
  rows = (table) => db.prepare("SELECT * FROM " + table).all();
const evo = rows("outfits").filter((x) => x.form_type === "evolution"),
  cost = rows("recipes").filter(
    (x) => x.scope === "evolution" && x.status === "complete",
  ),
  observations = rows("evolution_observations"),
  reqs = rows("evolution_requirements");
assert.equal(observations.length, evo.length);
assert.equal(new Set(observations.map((r) => r.outfit_id)).size, evo.length);
for (const r of reqs) {
  assert.equal(r.consumed_quantity, null);
  assert.equal(
    evo.find((x) => x.outfit_id === r.outfit_id).base_outfit_id,
    r.required_object_id,
  );
  if(r.requirement_type==='owned_copies') assert.equal(r.required_quantity,2); else assert.ok(r.requirement_type==='listed_input_copies'&&r.required_quantity>=1);
}
for (const r of cost.filter(r=>reqs.some(q=>q.outfit_id===r.target_id&&q.requirement_type==='owned_copies'))) {
  assert.ok(reqs.some((x) => x.outfit_id === r.target_id));
  assert.ok(r.prerequisite.includes("副本"));
  const ingredients = rows("recipe_ingredients").filter(
    (x) => x.recipe_id === r.recipe_id,
  );
  assert.deepEqual(
    new Set(ingredients.map((i) => i.material_id)),
    new Set(["mcalm-thoughts", "mthread-of-purity", "mbling"]),
  );
  assert.equal(
    ingredients.find((i) => i.material_id === "mbling").quantity,
    30000,
  );
}
assert.equal(
  Q.metrics.find((m) => m.key === "evolution_cost").numerator,
  cost.length,
);
assert.equal(
  Q.metrics.find((m) => m.key === "evolution_cost").denominator,
  evo.length,
);
assert.equal(
  Q.metrics.find((m) => m.key === "evolution_attributes").numerator,
  0,
);
for (const id of ["o10265", "o20052"])
  assert.equal(
    P.outfits.find((o) => o.id === id).availability.status,
    "complete",
  );
const beautiful = rows("recipe_ingredients").filter(
  (x) => x.recipe_id === "outfit-craft:o20052",
);
for (const id of ["mquillfin", "mwhisker-fish"])
  assert.equal(beautiful.find((x) => x.material_id === id).unit, "kg");
assert.equal(
  beautiful.find((x) => x.material_id === "mpony-curls").quantity,
  1,
);
const routes = JSON.parse(
  fs.readFileSync("data/routes/region-recommendation-input.json"),
);
assert.equal(routes.points.length, rows("gathering_points").length);
assert.equal(routes.exact_route_available, false);
assert.equal(routes.path_edges.length, 0);
for (const f of ["HUMAN_GOLD_REVIEW.csv", "DATA_REVIEW_CHECKLIST.csv"])
  assert.ok(
    !fs.readFileSync("docs/templates/" + f, "utf8").includes("undefined"),
  );
const cases = read("search/queries.candidates.json");
assert.equal(
  cases.filter((x) => x.human_review.status === "approved").length,
  0,
);
const tables = Object.fromEntries(Object.keys(schema).map((k) => [k, rows(k)]));
assert.equal(
  validateTables(tables).filter((x) => x.severity === "error").length,
  0,
);
db.close();
console.log(
  "PASS evolution cost/prerequisite separation, observation completeness, kg recipe repair, pending human reviews and regional-only route claims.",
);
