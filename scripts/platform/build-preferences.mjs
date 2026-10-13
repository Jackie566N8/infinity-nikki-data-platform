import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import schema from "./preferences-schema.cjs";
const root = path.dirname(fileURLToPath(import.meta.url)),
  args = process.argv.slice(2),
  arg = (k, f) =>
    args.includes(k) ? path.resolve(args[args.indexOf(k) + 1]) : f;
const input = arg(
    "--input",
    path.join(root, "../../data/input/preferences.json"),
  ),
  out = arg("--out", path.join(root, "../../data/dataset/preferences")),
  catalogPath = arg(
    "--catalog",
    path.join(root, "../../data/dataset/analytics/input.json"),
  );
const raw = JSON.parse(fs.readFileSync(input, "utf8")),
  catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8")),
  errors = schema.validate(raw, catalog);
if (errors.length)
  throw Error("Public data validation failed:\n" + errors.join("\n"));
const digest = createHash("sha256")
    .update(JSON.stringify({ raw, catalog_snapshot: catalog.snapshot_id }))
    .digest("hex"),
  id = "preferences:" + digest.slice(0, 24),
  historyDir = path.join(out, "history");
fs.mkdirSync(historyDir, { recursive: true });
const manifestPath = path.join(historyDir, "index.json"),
  history = fs.existsSync(manifestPath)
    ? JSON.parse(fs.readFileSync(manifestPath, "utf8"))
    : [],
  activeFile = path.join(historyDir, "current.json"),
  active = fs.existsSync(activeFile)
    ? JSON.parse(fs.readFileSync(activeFile, "utf8")).snapshot_id
    : null,
  previous = history.find((s) => s.snapshot_id === active) || history.at(-1),
  same = previous?.snapshot_id === id;
let snapshot,
  archiveRecord = null,
  catalogReuse = null;
const known = history.find((s) => s.snapshot_id === id);
if (same) snapshot = previous;
else if (known && previous) {
  const older = JSON.parse(
    fs.readFileSync(path.join(historyDir, known.file), "utf8"),
  ).data;
  const before = JSON.parse(
    fs.readFileSync(path.join(historyDir, previous.file), "utf8"),
  ).data;
  if (
    JSON.stringify(older) !== JSON.stringify(raw) ||
    JSON.stringify(before) !== JSON.stringify(raw)
  )
    throw Error(
      "Existing historical content cannot be overwritten; record a new update note for a revert.",
    );
  snapshot = known;
  catalogReuse = {
    at: new Date().toISOString(),
    from: previous.snapshot_id,
    to: known.snapshot_id,
    reason:
      "Catalog-only rebuild: public source observations unchanged; reuse original immutable snapshot without rewriting archives",
  };
} else {
  const prev = previous
      ? JSON.parse(
          fs.readFileSync(path.join(historyDir, previous.file), "utf8"),
        ).data
      : { sources: [], studies: [] },
    changes = [];
  for (const table of ["sources", "studies"]) {
    const key = table === "sources" ? "source_id" : "study_id",
      before = new Map(prev[table].map((r) => [r[key], r])),
      after = new Map(raw[table].map((r) => [r[key], r]));
    for (const [key, value] of after)
      if (
        !before.has(key) ||
        JSON.stringify(value) !== JSON.stringify(before.get(key))
      )
        changes.push({
          table,
          id: key,
          change: before.has(key) ? "modified" : "added",
          before: before.get(key) || null,
          after: value,
        });
    for (const [key, value] of before)
      if (!after.has(key))
        changes.push({
          table,
          id: key,
          change: "deleted",
          before: value,
          after: null,
        });
  }
  snapshot = {
    snapshot_id: id,
    created_at: new Date().toISOString(),
    catalog_snapshot: catalog.snapshot_id,
    parent_id: previous?.snapshot_id || null,
    input_sha256: digest,
    note: raw.update_note,
    file: digest.slice(0, 24) + ".json",
    change_count: changes.length,
    changes: changes.map(({ table, id, change }) => ({ table, id, change })),
    source_urls: raw.sources.map((s) => s.url),
  };
  const archive = path.join(historyDir, snapshot.file);
  if (fs.existsSync(archive))
    throw Error(
      "Existing historical content cannot be overwritten; record a new update note for a revert.",
    );
  archiveRecord = {
    path: archive,
    text: JSON.stringify({ snapshot, data: raw, changes }, null, 2),
  };
  history.push(snapshot);
}
const dbPath = path.join(out, "community.sqlite"),
  temp = dbPath + ".building";
if (fs.existsSync(temp)) fs.unlinkSync(temp);
const db = new DatabaseSync(temp);
db.exec(`PRAGMA foreign_keys=ON;
CREATE TABLE public_sources(source_id TEXT PRIMARY KEY,platform TEXT NOT NULL,url TEXT NOT NULL,collected_at TEXT NOT NULL,sample_size INTEGER,sample_scope TEXT NOT NULL,data_type TEXT NOT NULL,status TEXT NOT NULL,payload_json TEXT NOT NULL);
CREATE TABLE studies(study_id TEXT PRIMARY KEY,source_id TEXT NOT NULL REFERENCES public_sources(source_id),metric TEXT NOT NULL,form_scope TEXT NOT NULL,sample_size INTEGER,status TEXT NOT NULL,period_start TEXT,period_end TEXT,period_version_id TEXT,payload_json TEXT NOT NULL);
CREATE TABLE poll_options(option_id TEXT PRIMARY KEY,study_id TEXT NOT NULL REFERENCES studies(study_id),label TEXT NOT NULL,percent REAL,vote_count INTEGER);
CREATE TABLE option_outfits(option_id TEXT REFERENCES poll_options(option_id),outfit_id TEXT NOT NULL,PRIMARY KEY(option_id,outfit_id));
CREATE TABLE observations(study_id TEXT REFERENCES studies(study_id),outfit_id TEXT NOT NULL,value REAL NOT NULL,definition TEXT NOT NULL,PRIMARY KEY(study_id,outfit_id));
CREATE TABLE candidates(study_id TEXT REFERENCES studies(study_id),outfit_id TEXT NOT NULL,PRIMARY KEY(study_id,outfit_id));
CREATE TABLE public_snapshots(snapshot_id TEXT PRIMARY KEY,created_at TEXT NOT NULL,parent_id TEXT,note TEXT NOT NULL,payload_json TEXT NOT NULL);
CREATE TABLE search_log(platform TEXT,query TEXT,result TEXT,searched_at TEXT);
BEGIN;`);
for (const s of raw.sources)
  db.prepare("INSERT INTO public_sources VALUES(?,?,?,?,?,?,?,?,?)").run(
    s.source_id,
    s.platform,
    s.url,
    s.collected_at,
    s.sample_size,
    s.sample_scope,
    s.data_type,
    s.status,
    JSON.stringify(s),
  );
for (const s of raw.studies) {
  db.prepare("INSERT INTO studies VALUES(?,?,?,?,?,?,?,?,?,?)").run(
    s.study_id,
    s.source_id,
    s.metric,
    s.form_scope,
    s.sample_size,
    s.status,
    s.period_start,
    s.period_end,
    s.period_version_id,
    JSON.stringify(s),
  );
  for (const id of s.candidate_ids)
    db.prepare("INSERT INTO candidates VALUES(?,?)").run(s.study_id, id);
  for (const o of s.options) {
    db.prepare("INSERT INTO poll_options VALUES(?,?,?,?,?)").run(
      o.option_id,
      s.study_id,
      o.label,
      o.percent,
      o.vote_count,
    );
    for (const id of o.outfit_ids)
      db.prepare("INSERT INTO option_outfits VALUES(?,?)").run(o.option_id, id);
  }
  for (const o of s.observations)
    db.prepare("INSERT INTO observations VALUES(?,?,?,?)").run(
      s.study_id,
      o.outfit_id,
      o.value,
      o.definition,
    );
}
for (const s of history)
  db.prepare("INSERT INTO public_snapshots VALUES(?,?,?,?,?)").run(
    s.snapshot_id,
    s.created_at,
    s.parent_id,
    s.note,
    JSON.stringify(s),
  );
for (const s of raw.search_log || [])
  db.prepare("INSERT INTO search_log VALUES(?,?,?,?)").run(
    s.platform,
    s.query,
    s.result,
    s.searched_at,
  );
db.exec("COMMIT;");
if (db.prepare("PRAGMA foreign_key_check").all().length)
  throw Error("Broken public data links");
db.close();
fs.renameSync(temp, dbPath);
if (archiveRecord) {
  fs.writeFileSync(archiveRecord.path, archiveRecord.text, { flag: "wx" });
  fs.writeFileSync(manifestPath, JSON.stringify(history, null, 2));
}
fs.writeFileSync(
  activeFile,
  JSON.stringify({ snapshot_id: snapshot.snapshot_id }, null, 2),
);
if (catalogReuse) {
  const f = path.join(historyDir, "catalog-relink-events.json");
  const events = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : [];
  events.push(catalogReuse);
  fs.writeFileSync(f, JSON.stringify(events, null, 2));
}
const payload = {
  ...raw,
  snapshot,
  history,
  entry_template: JSON.parse(
    fs.readFileSync(path.join(root, "preferences-template.json"), "utf8"),
  ),
};
fs.writeFileSync(
  path.join(out, "input.json"),
  JSON.stringify(payload, null, 2),
);
fs.writeFileSync(
  path.join(out, "preferences-data.js"),
  "window.NIKKI_PREFERENCES_DATA=" + JSON.stringify(payload) + ";",
);
console.log(
  "Public dataset:",
  raw.sources.length,
  "sources,",
  raw.studies.filter((s) => s.status === "ready").length,
  "usable studies;",
  same ? "unchanged snapshot" : id,
);
