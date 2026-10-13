import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import M from "./planning-model.cjs";
const root = path.dirname(fileURLToPath(import.meta.url)),
  dir = path.join(root, "../../data/dataset"),
  db = new DatabaseSync(path.join(dir, "miraland.sqlite"), { readOnly: true });
const rows = (t) => db.prepare("SELECT * FROM " + t).all(),
  read = (p) => JSON.parse(fs.readFileSync(path.join(root, p), "utf8"));
const extra = read("../../data/input/material-planning.json"),
  sources = rows("sources"),
  sourceMap = new Map(sources.map((s) => [s.source_id, s])),
  report = read("../../data/dataset/quality-report.json");
const objects = new Map(rows("objects").map((o) => [o.object_id, o])),
  nameMap = new Map(),
  partMap = new Map();
for (const n of rows("object_names").filter(
  (n) => n.name_type === "standard",
)) {
  if (!nameMap.has(n.object_id)) nameMap.set(n.object_id, {});
  nameMap.get(n.object_id)[n.locale] = n.name || n.display_fallback;
}
for (const r of rows("outfit_clothing")) {
  if (!partMap.has(r.outfit_id)) partMap.set(r.outfit_id, []);
  partMap.get(r.outfit_id).push(r.clothing_id);
}
const statuses = new Map(
    rows("outfit_recipe_status").map((s) => [s.outfit_id, s]),
  ),
  guidance = new Map(
    rows("material_guidance").map((g) => [
      g.material_id,
      { ...g, source_url: sourceMap.get(g.source_id).url },
    ]),
  );
const recipes = rows("recipes"),
  ingredients = rows("recipe_ingredients");
const payload = {
  schema_version: 2,
  snapshot_id: report.snapshot.snapshot_id,
  checked_at: extra.checked_at,
  built_at: report.audited_at,
  source_tables: [
    "outfits",
    "outfit_recipe_status",
    "evolution_requirements",
    "outfit_clothing",
    "recipes",
    "recipe_ingredients",
    "materials",
    "material_guidance",
    "object_names",
    "gathering_areas",
    "gathering_points",
    "sources",
  ],
  outfits: rows("outfits").map((o) => {
    const obj = objects.get(o.outfit_id),
      s = statuses.get(o.outfit_id);
    return {
      id: o.outfit_id,
      name: obj.display_name,
      is_base: o.is_base,
      form_type: o.form_type,
      base_id: o.base_outfit_id,
      rarity: obj.rarity,
      style: obj.style,
      obtain: obj.obtain_text,
      source_url: sourceMap.get(obj.source_id).url,
      part_ids: partMap.get(o.outfit_id) || [],
      availability: {
        ...s,
        source_url: s.evidence_url || sourceMap.get(s.source_id).url,
      },
    };
  }),
  materials: rows("materials").map((m) => ({
    id: m.material_id,
    name: objects.get(m.material_id).display_name,
    category: m.original_category,
    names: nameMap.get(m.material_id),
    guidance: guidance.get(m.material_id) || null,
  })),
  evolution_requirements: rows("evolution_requirements"),
  recipes: recipes
    .filter((r) => r.status === "complete")
    .map((r) => ({
      ...r,
      source_url: sourceMap.get(r.source_id).url,
      corroborating_urls:
        extra.recipes.find((x) => x.recipe_id === r.recipe_id)
          ?.corroborating_urls || [],
    })),
  ingredients,
  areas: rows("gathering_areas").map((a) => ({
    ...a,
    source_url: sourceMap.get(a.source_id).url,
  })),
  points: rows("gathering_points"),
  name_sources: extra.material_names,
};
const result = M.analyze(
    payload,
    payload.outfits.map((o) => o.id),
  ),
  ready = new Set(result.status.filter((s) => s.ready).map((s) => s.id));
const auditRows = payload.outfits.map((o) => ({
  outfit_id: o.id,
  name: o.name,
  rarity: o.rarity,
  form_type: o.form_type,
  acquisition: o.obtain || "未收录",
  status: ready.has(o.id) ? "complete" : o.availability.status,
  reason: ready.has(o.id) ? "可计算" : o.availability.reason,
  recipe_id: o.availability.recipe_id,
  source_url: ready.has(o.id)
    ? result.status.find((s) => s.id === o.id).recipe.source_url
    : o.availability.source_url,
}));
const group = (field) =>
  [...new Set(auditRows.map((r) => r[field]))].map((value) => {
    const rs = auditRows.filter((r) => r[field] === value);
    return {
      value,
      total: rs.length,
      complete: rs.filter((r) => r.status === "complete").length,
      pending: rs.filter(
        (r) => !["complete", "not_crafting"].includes(r.status),
      ).length,
      not_crafting: rs.filter((r) => r.status === "not_crafting").length,
    };
  });
const neededMaterials = new Set(result.rows.map((r) => r.id)),
  coveredMaterials = new Set([
    ...payload.areas.map((a) => a.material_id),
    ...payload.materials.filter((m) => m.guidance).map((m) => m.id),
  ]);
payload.audit = {
  total: auditRows.length,
  complete: ready.size,
  by_form: group("form_type"),
  by_rarity: group("rarity"),
  by_acquisition: group("acquisition"),
  status_counts: Object.fromEntries(
    [...new Set(auditRows.map((r) => r.status))].map((s) => [
      s,
      auditRows.filter((r) => r.status === s).length,
    ]),
  ),
  recipe_materials: neededMaterials.size,
  materials_with_guidance: [...neededMaterials].filter((id) =>
    coveredMaterials.has(id),
  ).length,
  verified_material_synthesis: payload.recipes.filter(
    (r) => r.scope === "material",
  ).length,
};
const prior = read("../../data/input/planning-baseline-audit.json"),
  previousIDs = new Set(prior.outfits.map((o) => o.id));
const queue = auditRows
  .filter((r) => !["complete", "not_crafting"].includes(r.status))
  .map((r) => ({ ...r, new_catalog_entry: !previousIDs.has(r.outfit_id) }));
const planning = path.join(dir, "planning");
fs.mkdirSync(planning, { recursive: true });
fs.writeFileSync(path.join(planning, "input.json"), JSON.stringify(payload));
fs.writeFileSync(
  path.join(planning, "planning-data.js"),
  "window.NIKKI_PLANNING_DATA=" + JSON.stringify(payload) + ";",
);
for (const [file, rs] of [
  ["outfit-recipe-audit", auditRows],
  ["recipe-backfill-queue", queue],
]) {
  fs.writeFileSync(
    path.join(planning, file + ".json"),
    JSON.stringify(rs, null, 2),
  );
  fs.writeFileSync(path.join(planning, file + ".csv"), M.csv(rs));
}
fs.writeFileSync(
  path.join(planning, "audit-summary.json"),
  JSON.stringify(
    {
      snapshot_id: payload.snapshot_id,
      baseline_complete: prior.complete_ids,
      updated: payload.audit,
      new_catalog_entries: auditRows.filter(
        (r) => !previousIDs.has(r.outfit_id),
      ),
    },
    null,
    2,
  ),
);
let doc =
  "# 套装配方盘点\n\n目录 " +
  auditRows.length +
  " 条形态记录；原色、进化和焕新独立计数。整套制作清单与单部件设计图不累加。直接获取不作零消耗制作；进化和焕新费用须单独核验。\n\n";
for (const [title, rs] of [
  ["形态统计", payload.audit.by_form],
  ["品质统计", payload.audit.by_rarity],
  ["获取方式统计", payload.audit.by_acquisition],
])
  doc +=
    "## " +
    title +
    "\n\n| 分类 | 总量 | 可计算 | 待补录 / 核实 | 直接获取 |\n|---|---:|---:|---:|---:|\n" +
    rs
      .map(
        (r) =>
          `| ${r.value} | ${r.total} | ${r.complete} | ${r.pending} | ${r.not_crafting} |`,
      )
      .join("\n") +
    "\n\n";
doc +=
  "## 可计算清单\n\n" +
  auditRows
    .filter((r) => r.status === "complete")
    .map((r) => `- ${r.name}（${r.outfit_id}）：[来源](${r.source_url})`)
    .join("\n") +
  "\n\n## 待补录 / 核实清单\n\n完整逐条列表见 recipe-backfill-queue.csv。未公开必须有显式来源证据，搜索不到资料只标待录入。\n\n" +
  queue
    .filter((r) => r.form_type === "base")
    .map((r) => `- ${r.name}（${r.outfit_id}）：${r.reason}`)
    .join("\n") +
  "\n\n生成快照：" +
  payload.snapshot_id +
  "\n";
fs.writeFileSync(path.join(planning, "配方盘点.md"), doc);
db.close();
console.log("Planning mart:", JSON.stringify(payload.audit));
