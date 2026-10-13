import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { schema, validateTables } from "./schema.mjs";
const here = path.dirname(fileURLToPath(import.meta.url)),
  args = process.argv.slice(2),
  dir = args.includes("--dataset")
    ? path.resolve(args[args.indexOf("--dataset") + 1])
    : path.join(here, "../../data/dataset");
const tables = Object.fromEntries(
  Object.keys(schema).map((k) => [
    k,
    JSON.parse(fs.readFileSync(path.join(dir, "json", k + ".json"), "utf8")),
  ]),
);
const issues = validateTables(tables);
assert.deepEqual(issues, [], "Normalized table validation failed");
const db = new DatabaseSync(path.join(dir, "miraland.sqlite"), {
  readOnly: true,
});
assert.deepEqual(db.prepare("PRAGMA foreign_key_check").all(), []);
assert.equal(db.prepare("PRAGMA integrity_check").get().integrity_check, "ok");
for (const name of Object.keys(schema))
  assert.equal(
    db.prepare(`SELECT COUNT(*) AS n FROM "${name}"`).get().n,
    tables[name].length,
    name + " export / database mismatch",
  );
assert.equal(
  db.prepare("SELECT COUNT(*) AS n FROM v_independent_outfits").get().n,
  tables.outfit_families.length,
);
assert.equal(
  tables.outfits.filter((r) => r.is_base).length,
  tables.outfit_families.length,
);
const report = JSON.parse(
  fs.readFileSync(path.join(dir, "quality-report.json"), "utf8"),
);
assert.equal(report.totals.objects, tables.objects.length);
assert.equal(report.conflicts.count, tables.source_conflicts.length);
for (const m of report.metrics)
  assert.equal(
    m.percent,
    m.denominator
      ? Math.round((10000 * m.numerator) / m.denominator) / 100
      : null,
    m.key + " denominator",
  );
for (const lang of report.translations)
  assert.equal(
    lang.numerator,
    tables.object_names.filter(
      (r) =>
        r.locale === lang.key && r.name_type === "standard" && r.name !== null,
    ).length,
    "fallback names must not inflate coverage",
  );
assert.equal(
  new Set(tables.snapshots.map((r) => r.snapshot_id)).size,
  tables.snapshots.length,
);
db.close();
console.log(
  `PASS: ${Object.keys(schema).length} tables; IDs, required fields, enums, ranges, dates, foreign keys, family integrity, SQLite and report/export consistency.`,
);
