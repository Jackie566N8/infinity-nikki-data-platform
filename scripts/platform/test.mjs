// Fault injection checks the safeguards, not only the current clean fixture.
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { schema, validateTables } from "./schema.mjs";
const here = path.dirname(fileURLToPath(import.meta.url));
const tables = Object.fromEntries(
  Object.keys(schema).map((k) => [
    k,
    JSON.parse(
      fs.readFileSync(
        path.join(here, "../../data/dataset/json", k + ".json"),
        "utf8",
      ),
    ),
  ]),
);
const faulty = (fn, rule) => {
  const t = structuredClone(tables);
  fn(t);
  assert.ok(
    validateTables(t).some((i) => i.rule === rule),
    "Expected failure: " + rule,
  );
};
faulty((t) => t.objects.push({ ...t.objects[0] }), "unique");
faulty((t) => (t.objects[0].display_name = null), "required");
faulty((t) => (t.objects[0].kind = "invented_kind"), "accepted_values");
faulty((t) => (t.objects[0].rarity = 7), "range");
faulty(
  (t) => (t.outfit_clothing[0].clothing_id = "missing_object"),
  "foreign_key",
);
faulty(
  (t) => (t.objects[0].snapshot_source_date = "2026-02-31"),
  "date_format",
);
faulty(
  (t) =>
    (t.outfits[0].base_outfit_id = t.outfits.find(
      (r) => r.is_base && r.family_id !== t.outfits[0].family_id,
    ).outfit_id),
  "family_integrity",
);
faulty((t) => (t.recipes[0].status = "complete"), "recipe_complete");
const temporary = fs.mkdtempSync(
    path.join(os.tmpdir(), "miraland-foundation-"),
  ),
  input = path.join(temporary, "input"),
  out = path.join(temporary, "dataset");
fs.cpSync(path.join(here, "../../data/input"), input, { recursive: true });
const build = () =>
  execFileSync(
    process.execPath,
    [path.join(here, "build.mjs"), "--input", input, "--out", out],
    { stdio: "pipe" },
  );
const report = () =>
  JSON.parse(fs.readFileSync(path.join(out, "quality-report.json"), "utf8"));
build();
const first = report();
assert.equal(first.changes.is_baseline, true);
assert.equal(first.changes.counts.baseline, 1);
build();
assert.equal(report().snapshot.snapshot_id, first.snapshot.snapshot_id);
assert.equal(
  JSON.parse(fs.readFileSync(path.join(out, "json/snapshots.json"), "utf8"))
    .length,
  1,
);
const file = path.join(input, "catalog.json"),
  catalog = JSON.parse(fs.readFileSync(file, "utf8"));
const example = catalog.records.find(
    (r) =>
      r.kind === "materials" && r.related.length === 0 && !r.regions?.length,
  ),
  added = {
    ...example,
    id: "mtest-only-fixture",
    name: "Fixture only",
    en: "Fixture only",
  };
catalog.records.push(added);
fs.writeFileSync(file, JSON.stringify(catalog));
build();
assert.ok(report().changes.counts.added > 0);
// Material display names can be overridden by reviewed multilingual inputs. Edit a
// clothing field that is owned by this input, then verify that exact stable row.
catalog.records = catalog.records.filter((r) => r.id !== added.id);
const editable = catalog.records.find((r) => r.kind === "clothing");
editable.name += " [fixture edit]";
fs.writeFileSync(file, JSON.stringify(catalog));
build();
const diff = JSON.parse(
  fs.readFileSync(path.join(out, "json/change_log.json"), "utf8"),
).filter((r) => r.snapshot_id === report().snapshot.snapshot_id);
assert.ok(
  diff.some((r) => r.table_name === "objects" && r.change_type === "deleted"),
);
assert.ok(
  diff.some(
    (r) =>
      r.table_name === "objects" &&
      r.change_type === "modified" &&
      r.row_key === JSON.stringify([editable.id]),
  ),
);
const protectedReport = fs.readFileSync(
  path.join(out, "quality-report.json"),
  "utf8",
);
catalog.records.push({ ...catalog.records[0] });
fs.writeFileSync(file, JSON.stringify(catalog));
const failed = spawnSync(
  process.execPath,
  [path.join(here, "build.mjs"), "--input", input, "--out", out],
  { encoding: "utf8" },
);
assert.equal(failed.status, 1);
assert.equal(
  fs.readFileSync(path.join(out, "quality-report.json"), "utf8"),
  protectedReport,
);
console.log(
  "PASS: injected bad IDs/required/enums/ranges/dates/relations/families/recipes; repeatable snapshots; additions/edits/deletions; invalid input cannot replace the last valid report.",
);
console.log("Isolated test artifacts:", temporary);
