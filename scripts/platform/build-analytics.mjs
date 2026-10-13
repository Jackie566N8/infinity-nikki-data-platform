import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import M from "./analytics-model.cjs";
const root = path.dirname(fileURLToPath(import.meta.url)),
  out = path.join(root, "../../data/dataset"),
  db = new DatabaseSync(path.join(out, "miraland.sqlite"), { readOnly: true });
const rows = (t) => db.prepare("SELECT * FROM " + t).all(),
  objects = new Map(rows("objects").map((r) => [r.object_id, r])),
  sources = new Map(rows("sources").map((r) => [r.source_id, r.url]));
const snapshots = rows("snapshots"),
  report = JSON.parse(
    fs.readFileSync(path.join(out, "quality-report.json"), "utf8"),
  ),
  snapshot = snapshots.find(
    (r) => r.snapshot_id === report.snapshot.snapshot_id,
  );
const releases = new Map(rows("releases").map((r) => [r.release_id, r])),
  links = new Map(rows("object_releases").map((r) => [r.object_id, r])),
  tags = new Map(),
  parts = new Map(),
  designs = new Map(),
  claims = new Map();
for (const r of rows("object_tags")) {
  if (!tags.has(r.object_id)) tags.set(r.object_id, []);
  tags.get(r.object_id).push(r.tag);
}
for (const r of rows("outfit_clothing")) {
  if (!parts.has(r.outfit_id)) parts.set(r.outfit_id, []);
  parts.get(r.outfit_id).push(r.clothing_id);
}
for (const r of rows("recipes")) {
  if (!designs.has(r.target_id)) designs.set(r.target_id, []);
  designs.get(r.target_id).push(r.recipe_id);
}
for (const r of rows("source_assertions").filter(
  (r) => r.field === "obtain_text",
)) {
  if (!claims.has(r.object_id)) claims.set(r.object_id, []);
  claims.get(r.object_id).push({ ...r, url: sources.get(r.source_id) });
}
const methodRules = {
  gacha: ["限定共鸣", "遥远之海"],
  shop: ["美鸭梨商城精品", "商城", "商城（限时上架）"],
  event: ["限时活动"],
  quest: ["任务", "主线留念", "世界逸事", "旅途见闻"],
  explore: ["地图宝箱", "散落各处的宝箱", "唱诗蓝龙", "唱诗蓝龙的赠礼"],
  challenge: ["搭配挑战", "搭配师团的藏品"],
  home: ["家园能力", "经营家园的感悟"],
};
const membershipFile = path.join(
    root,
    "../../data/input/membership-audit.json",
  ),
  membership = new Map(
    (fs.existsSync(membershipFile)
      ? JSON.parse(fs.readFileSync(membershipFile)).counts
      : []
    ).map((r) => [r.id, r]),
  );
const outfits = rows("outfits").map((r) => {
  const o = objects.get(r.outfit_id),
    releaseLink = links.get(o.object_id),
    release = releases.get(releaseLink?.release_id),
    partIds = parts.get(r.outfit_id) || [],
    evidence = [];
  // Channel evidence is attached to the base family; evolution acquisition is a separate form mechanic.
  for (const c of claims.get(r.base_outfit_id) || [])
    for (const [method, values] of Object.entries(methodRules))
      if (values.includes(c.value))
        evidence.push({
          method,
          assertion_id: c.assertion_id,
          source_url: c.url,
          value: c.value,
        });
  const recipeIds = (parts.get(r.base_outfit_id) || []).flatMap(
      (p) => designs.get(p) || [],
    ),
    methods = [...new Set(evidence.map((e) => e.method))];
  if (recipeIds.length) methods.push("craft");
  if (!methods.length) methods.push("other");
  return {
    id: r.outfit_id,
    name: o.display_name,
    family_id: r.family_id,
    base_id: r.base_outfit_id,
    is_base: r.is_base,
    form_type: r.form_type,
    rarity: o.rarity,
    style: o.style,
    tags: tags.get(r.outfit_id) || [],
    obtain_text: o.obtain_text,
    source_url: sources.get(o.source_id),
    methods,
    method_evidence: evidence,
    part_ids: partIds,
    member_count_status: membership.get(r.outfit_id)?.status || "unverified",
    member_count_expected: membership.get(r.outfit_id)?.expected ?? null,
    member_count_source_url: membership.get(r.outfit_id)?.source_url || null,
    recipe_ids: recipeIds,
    version_id: releaseLink?.version_id ?? null,
    release_id: release?.release_id ?? null,
    release_label: release?.label ?? null,
    release_date: release?.release_date ?? null,
    release_context: release?.context ?? null,
    date_source_url: releaseLink ? sources.get(releaseLink.source_id) : null,
  };
});
const clothing = rows("clothing").map((r) => {
  const o = objects.get(r.clothing_id);
  return {
    id: r.clothing_id,
    name: o.display_name,
    category: o.category,
    style: o.style,
    rarity: o.rarity,
    is_variant: r.is_variant,
    source_url: sources.get(o.source_id),
  };
});
const payload = {
  schema_version: 1,
  snapshot_id: snapshot.snapshot_id,
  source_date: snapshot.source_date,
  generated_at: new Date().toISOString(),
  catalog_version: snapshot.catalog_version,
  versions: rows("versions"),
  official_calendar: rows("version_calendar").map((r) => ({
    ...r,
    source_url: sources.get(r.source_id),
  })),
  events: rows("events").map((r) => ({
    ...r,
    source_url: sources.get(r.source_id),
    objects: rows("event_objects").filter((o) => o.event_id === r.event_id),
  })),
  outfits,
  clothing,
  method_rules: methodRules,
  source_tables: [
    "objects",
    "outfits",
    "outfit_families",
    "clothing",
    "outfit_clothing",
    "object_tags",
    "source_assertions",
    "recipes",
    "object_releases",
    "versions",
    "releases",
    "sources",
  ],
};
fs.mkdirSync(path.join(out, "analytics"), { recursive: true });
fs.writeFileSync(
  path.join(out, "analytics/input.json"),
  JSON.stringify(payload),
);
fs.writeFileSync(
  path.join(out, "analytics/analytics-data.js"),
  "window.NIKKI_ANALYTICS_DATA=" + JSON.stringify(payload) + ";",
);
for (const scope of ["base", "all"]) {
  const result = M.analyze(payload, { scope });
  fs.writeFileSync(
    path.join(out, "analytics/" + scope + "-summary.json"),
    JSON.stringify(
      {
        snapshot_id: payload.snapshot_id,
        filters: result.filters,
        totals: result.totals,
        rarity: result.rarity,
        style: result.style,
        category: result.category,
        acquisition: result.acquisition,
        versions: result.versions,
      },
      null,
      2,
    ),
  );
  fs.writeFileSync(
    path.join(out, "analytics/" + scope + "-charts.csv"),
    M.toCSV(M.exportRows(payload, result, "all")),
  );
}
db.close();
console.log(
  "Analytics mart:",
  outfits.length,
  "outfit forms,",
  clothing.length,
  "clothing forms; snapshot",
  snapshot.snapshot_id,
);
