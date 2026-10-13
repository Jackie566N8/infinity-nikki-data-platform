import fs from "node:fs";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import M from "./wardrobe-model.cjs";
import { schema, validateTables } from "./schema.mjs";
const root = path.dirname(fileURLToPath(import.meta.url)),
  read = (p) => JSON.parse(fs.readFileSync(path.join(root, p))),
  D = read("../../data/dataset/analytics/input.json"),
  Q = read("../../data/dataset/quality-report.json"),
  C = read("../../data/input/catalog.json"),
  db = new DatabaseSync(path.join(root, "../../data/dataset/miraland.sqlite"), {
    readOnly: true,
  });
for (const id of ["o1024501", "o1039001"]) {
  const o = D.outfits.find((o) => o.id === id);
  assert.equal(o.form_type, "renewal");
  assert.equal(o.is_base, 0);
  assert.notEqual(o.id, o.base_id);
  assert.ok(D.outfits.some((p) => p.id === o.base_id && p.is_base));
}
for (const id of ["o1024902", "o1025004", "o1030702"])
  assert.equal(D.outfits.find((o) => o.id === id).form_type, "evolution");
const unresolved = D.outfits.find((o) => o.member_count_status === "mismatch");
assert.ok(unresolved);
const notes = { owned: unresolved.part_ids };
assert.equal(
  M.personal(D, notes, { scope: "all" }).outfits.find(
    (o) => o.id === unresolved.id,
  ).complete,
  false,
);
assert.equal(
  M.personal(D, { owned: [unresolved.id] }, { scope: "all" }).outfits.find(
    (o) => o.id === unresolved.id,
  ).completion_basis,
  "explicit_user_whole_outfit",
);
for (const change of read("../../data/input/image-url-corrections.json")
  .changes)
  assert.equal(C.records.find((r) => r.id === change.id).image, change.after);
const events = db.prepare("SELECT * FROM events").all();
assert.equal(events.length, 5);
for (const e of events) {
  assert.equal(e.start_datetime, null);
  assert.equal(e.start_condition, "after_version_update");
  assert.equal(e.time_zone, "UTC-07:00");
  assert.ok(e.end_datetime.endsWith("-07:00"));
  assert.ok(e.start_date < e.end_date);
}
const imageChecks = db
  .prepare(
    "SELECT * FROM image_checks WHERE status IN ('local_verified','local_invalid','remote_verified','remote_failed')",
  )
  .all();
assert.equal(
  Q.metrics.find((m) => m.key === "image_check_coverage").numerator,
  imageChecks.length,
);
assert.equal(
  Q.metrics.find((m) => m.key === "image_available_checked").denominator,
  imageChecks.length,
);
for (const row of db
  .prepare(
    "SELECT o.object_id,o.obtain_source_id,o.obtain_text,g.source_id,g.text FROM objects o JOIN material_guidance g ON g.material_id=o.object_id",
  )
  .all()) {
  assert.ok(row.obtain_source_id);
  assert.ok(
    db
      .prepare(
        "SELECT COUNT(*) n FROM source_assertions WHERE object_id=? AND source_id=? AND field='obtain_text' AND value=?",
      )
      .get(row.object_id, row.obtain_source_id, row.obtain_text).n > 0,
  );
  assert.equal(
    db
      .prepare(
        "SELECT COUNT(*) n FROM source_assertions WHERE object_id=? AND source_id=? AND match_method='reviewed_guidance'",
      )
      .get(row.object_id, row.source_id).n,
    1,
  );
}
assert.equal(db.prepare("PRAGMA foreign_key_check").all().length, 0);
db.close();
console.log(
  "PASS semantic form corrections, uncertain member completion, exact makeup path corrections, source time zones, material field provenance and real image denominators.",
);

const tables = Object.fromEntries(
  Object.keys(schema).map((k) => [
    k,
    read("../../data/dataset/json/" + k + ".json"),
  ]),
);
const fault = structuredClone(tables);
fault.outfits.find((o) => o.is_base).variation_label = "焕新";
assert.ok(validateTables(fault).some((e) => e.rule === "semantic_form_claim"));
