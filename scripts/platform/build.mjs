import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { schema, validateTables, createDDL } from "./schema.mjs";
import { applyPlanningInput } from "./planning-input.mjs";
import { applyOfficialInput } from "./official-input.mjs";
import { applyEvolutionInput } from "./evolution-input.mjs";
import { buildPlanningStatuses, planningCoverage } from "./planning-status.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)),
  args = process.argv.slice(2);
const option = (key, fallback) =>
  args.includes(key) ? path.resolve(args[args.indexOf(key) + 1]) : fallback;
const input = option("--input", path.join(here, "../../data/input")),
  out = option("--out", path.join(here, "../../data/dataset"));
const read = (name) =>
  JSON.parse(fs.readFileSync(path.join(input, name), "utf8"));
const digest = (x) =>
  crypto
    .createHash("sha256")
    .update(typeof x === "string" || Buffer.isBuffer(x) ? x : JSON.stringify(x))
    .digest("hex");
const id = (prefix, ...parts) => prefix + ":" + digest(parts).slice(0, 24);
const nullable = (s) => (s === undefined || s === null || s === "" ? null : s);
const now = new Date().toISOString(),
  data = read("catalog.json"),
  display = read("display-locales.json"),
  names = read("source-names.json"),
  manifest = read("catalog-manifest.json"),
  sketches = read("sketches.json");
const tables = Object.fromEntries(Object.keys(schema).map((k) => [k, []])),
  issues = [];
const issue = (severity, rule, table, key, message) =>
  issues.push({ severity, rule, table, key, message });
const records = data.records,
  byId = new Map(records.map((r) => [r.id, r])),
  sources = new Map();
function source(url) {
  url = url || "local:website-catalog";
  if (!sources.has(url)) {
    let publisher = "网站整理资料";
    try {
      publisher = new URL(url).hostname || publisher;
    } catch {}
    const row = {
      source_id: id("src", url),
      url,
      publisher,
      retrieved_date: data.date || null,
      source_kind: url.startsWith("http") ? "web" : "local",
    };
    sources.set(url, row);
    tables.sources.push(row);
  }
  return sources.get(url).source_id;
}
const snapshotSource = source("local:website-catalog"),
  nameSource = source("https://gongeo.us/"),
  bwikiCatalogSource = source("https://wiki.biligame.com/wxnn/套装图鉴");
const rawDuplicateIds = records.length - new Set(records.map((r) => r.id)).size;
if (rawDuplicateIds)
  issue(
    "error",
    "input_unique",
    "objects",
    "*",
    `原始对象 ID 重复 ${rawDuplicateIds} 次`,
  );
const allInputLinks = records.flatMap((r) =>
  [...(r.related || []), ...(r.group || [])].map((target) => ({
    from: r.id,
    target,
  })),
);
for (const link of allInputLinks)
  if (!byId.has(link.target))
    issue(
      "error",
      "input_foreign_key",
      "objects",
      link.from,
      "原始关联不存在：" + link.target,
    );
const bwiki = new Map();
for (const [file, kind] of [
  ["bwiki-outfits.json", "outfits"],
  ["bwiki-clothing.json", "clothing"],
])
  for (const row of Object.values(read(file))) {
    const name = row.printouts?.名称?.[0];
    if (name) {
      const key = kind + "|" + name;
      const values = bwiki.get(key) || [];
      values.push(row);
      bwiki.set(key, values);
    }
  }
const websiteNameCounts = new Map();
for (const r of records) {
  const key = r.kind + "|" + r.name;
  websiteNameCounts.set(key, (websiteNameCounts.get(key) || 0) + 1);
}
const normalizedName = (s) =>
    String(s)
      .normalize("NFKC")
      .replace(/[\s·・]/gu, ""),
  normalizedBW = new Map(),
  normalizedWebsiteCounts = new Map();
for (const [key, rows] of bwiki) {
  const separator = key.indexOf("|"),
    k = key.slice(0, separator + 1) + normalizedName(key.slice(separator + 1));
  normalizedBW.set(k, [...(normalizedBW.get(k) || []), ...rows]);
}
for (const r of records) {
  const key = r.kind + "|" + normalizedName(r.name);
  normalizedWebsiteCounts.set(key, (normalizedWebsiteCounts.get(key) || 0) + 1);
}
function matchBW(r) {
  const key = r.kind + "|" + r.name,
    rows = bwiki.get(key) || [];
  if (rows.length === 1 && websiteNameCounts.get(key) === 1) return rows[0];
  const normalizedKey = r.kind + "|" + normalizedName(r.name),
    candidates = normalizedBW.get(normalizedKey) || [];
  return candidates.length === 1 &&
    normalizedWebsiteCounts.get(normalizedKey) === 1
    ? candidates[0]
    : null;
}
const placeholder = (s) =>
  !s ||
  /^(详见资料来源|查看来源中的幻境与获取说明|暂未收录|未知|待补充)$/.test(s);
const candidateTypes = new Set([
  "Collection",
  "Fishing",
  "Animal-Grooming",
  "Bug-Catching",
]);
const familyRows = new Map(),
  versions = new Map(),
  releases = new Map(),
  relations = new Map();
for (const r of records) {
  const src = source(r.source),
    knownObtain = !placeholder(r.obtain);
  if (r.record_source_date)
    tables.sources.find((s) => s.source_id === src).retrieved_date =
      r.record_source_date;
  const obtainSrc = knownObtain ? source(r.obtainSource || r.source) : null;
  tables.objects.push({
    object_id: r.id,
    game_id: r.gameId ?? null,
    kind: r.kind,
    display_name: r.name,
    rarity: r.star || null,
    style: nullable(r.style),
    category: nullable(r.type),
    obtain_text: knownObtain ? r.obtain : null,
    obtain_status: knownObtain ? "known" : "uncollected",
    image_ref: nullable(r.image),
    source_id: src,
    obtain_source_id: obtainSrc,
    snapshot_source_date: r.record_source_date || data.date,
  });
  for (const tag of new Set(r.tags || []))
    tables.object_tags.push({ object_id: r.id, tag });
  if (r.kind === "outfits") {
    const group = r.group?.length ? r.group : [r.id],
      bases = group
        .map((k) => byId.get(k))
        .filter((v) => v?.kind === "outfits" && v.variant === false);
    const base = bases.length === 1 ? bases[0] : null;
    if (!base)
      issue(
        "error",
        "family_base",
        "outfits",
        r.id,
        "来源分组不能确定唯一原色",
      );
    const family = base ? "family:" + base.id : null;
    tables.outfits.push({
      outfit_id: r.id,
      family_id: family,
      base_outfit_id: base?.id ?? null,
      form_type: !r.variant
        ? "base"
        : r.variation === "焕新"
          ? "renewal"
          : ["一进", "二进", "满进"].includes(r.variation)
            ? "evolution"
            : "variant_unknown",
      is_base: r.variant ? 0 : 1,
      evolution_stage: { 一进: 1, 二进: 2 }[r.variation] ?? null,
      variation_label: nullable(r.variation),
      source_group_order: group.indexOf(r.id),
    });
    if (family && !familyRows.has(family))
      familyRows.set(family, {
        family_id: family,
        base_outfit_id: base.id,
        form_count: 0,
      });
    if (family) familyRows.get(family).form_count++;
    for (const target of r.related || [])
      relations.set(r.id + "|" + target, {
        outfit_id: r.id,
        clothing_id: target,
        source_id: src,
      });
  } else if (r.kind === "clothing") {
    const bases = (r.group || [])
      .map((k) => byId.get(k))
      .filter((v) => v?.kind === "clothing" && v.variant === false);
    tables.clothing.push({
      clothing_id: r.id,
      base_clothing_id: bases.length === 1 ? bases[0].id : null,
      is_variant: r.variant ? 1 : 0,
      variation_label: nullable(r.variation),
    });
    for (const target of r.related || []) {
      if (!relations.has(target + "|" + r.id))
        relations.set(target + "|" + r.id, {
          outfit_id: target,
          clothing_id: r.id,
          source_id: src,
        });
    }
  } else if (r.kind === "materials") {
    tables.materials.push({
      material_id: r.id,
      original_category: nullable(r.originalType),
      gathering_scope: candidateTypes.has(r.originalType)
        ? "candidate"
        : "unassessed",
    });
    for (const region of new Set(r.regions || []))
      tables.gathering_areas.push({
        area_record_id: id("area", r.id, region),
        material_id: r.id,
        region,
        condition_text: knownObtain ? r.obtain : null,
        source_id: source(r.mapSource || r.source),
        source_published_date: r.regionDate || null,
      });
    for (const target of new Set(r.related || []))
      tables.material_usage_mentions.push({
        material_id: r.id,
        outfit_id: target,
        source_id: source(r.mapSource || r.source),
      });
  } else if (r.kind === "makeups") tables.makeups.push({ makeup_id: r.id });
  else if (r.kind === "eurekas") tables.eurekas.push({ eureka_id: r.id });
  const bw = matchBW(r),
    detailSource = bw ? source(bw.fullurl) : snapshotSource;
  let versionId = null,
    releaseId = null;
  if (r.season) {
    versionId = id("version", r.season);
    if (!versions.has(versionId))
      versions.set(versionId, {
        version_id: versionId,
        label: r.season,
        version_number: null,
        source_id: bwikiCatalogSource,
      });
  }
  if (r.release) {
    releaseId = id("release", r.release);
    if (!releases.has(releaseId)) {
      const m = r.release.match(/^(\d{4})\.(\d{2})\.(\d{2})/),
        date = m ? `${m[1]}-${m[2]}-${m[3]}` : null;
      releases.set(releaseId, {
        release_id: releaseId,
        label: r.release,
        release_date: date,
        context: /首测|二测|测试/.test(r.release)
          ? "test_release"
          : "public_release",
        source_id: bwikiCatalogSource,
      });
    }
  }
  if (versionId || releaseId)
    tables.object_releases.push({
      object_id: r.id,
      version_id: versionId,
      release_id: releaseId,
      source_id: detailSource,
    });
  for (const [locale, key] of [
    ["zh-CN", "zh"],
    ["en", "en"],
    ["ja", "ja"],
    ["ko", "ko"],
    ["zh-TW", "tw"],
  ]) {
    const prefix = {
      outfits: "outfit",
      clothing: "item",
      makeups: "makeup",
      eurekas: "eureka",
    }[r.kind];
    const raw = prefix
      ? names[key]?.[prefix + "." + r.gameId + ".name"] ||
        (r.kind === "makeups"
          ? names[key]?.["item." + r.gameId + ".name"]
          : null)
      : null;
    let name = raw || null,
      status = raw ? "source" : "missing",
      nameSrc = raw ? nameSource : null;
    if (r.kind === "materials") {
      if (locale === "en" && r.en) {
        name = r.en;
        status = "source";
        nameSrc = src;
      } else if (locale === "zh-CN" && r.localized) {
        name = r.name;
        status = "curated";
        nameSrc = source(r.mapSource || "local:material-name-curation");
      } else if (locale === "zh-TW" && r.localized) {
        name = display.locales[locale]?.names[r.id] || null;
        status = name ? "curated" : "missing";
        nameSrc = name ? snapshotSource : null;
      }
    }
    tables.object_names.push({
      name_id: id("name", r.id, locale, "standard"),
      object_id: r.id,
      locale,
      name_type: "standard",
      name,
      display_fallback:
        locale === "zh-CN"
          ? r.name
          : display.locales[locale]?.names[r.id] || r.en || r.name,
      translation_status: status,
      source_id: nameSrc,
    });
  }
  const assertField = (field, value, sourceId, method) => {
    if (value == null || value === "") return null;
    const a = {
      assertion_id: id("assert", r.id, field, sourceId, String(value)),
      object_id: r.id,
      field,
      value: String(value),
      raw_value: String(value),
      source_id: sourceId,
      match_method: method,
    };
    tables.source_assertions.push(a);
    return a;
  };
  for (const [field, original, bwKey] of [
    ["rarity", r.star || null, "品质"],
    ["style", r.style, "风格"],
    ["obtain_text", knownObtain ? r.obtain : null, "获取途径"],
  ]) {
    const a = assertField(
        field,
        original,
        field === "obtain_text" ? obtainSrc || src : src,
        "existing_id",
      ),
      v = bw?.printouts[bwKey]?.join("、");
    if (!v) continue;
    const canonical =
      field === "rarity" && /^([1-6])(?:星|★)$/.test(v.trim())
        ? v.trim().match(/^([1-6])/)[1]
        : v;
    const b = assertField(field, canonical, detailSource, "unique_name");
    if (b) b.raw_value = v;
    if (
      a &&
      b &&
      a.value.normalize("NFKC").trim() !== b.value.normalize("NFKC").trim()
    )
      tables.source_conflicts.push({
        conflict_id: id(
          "conflict",
          r.id,
          field,
          a.assertion_id,
          b.assertion_id,
        ),
        object_id: r.id,
        field,
        left_assertion_id: a.assertion_id,
        right_assertion_id: b.assertion_id,
        status: "needs_review",
      });
  }
  let imageStatus = r.image ? "remote_unchecked" : "missing",
    method = "not_checked";
  if (r.image && !/^https?:\/\//.test(r.image)) {
    const root = path.resolve(input, "local-images"),
      f = path.resolve(root, r.image);
    if (!f.startsWith(root + path.sep)) throw Error("图片路径越界");
    try {
      const b = fs.readFileSync(f);
      imageStatus =
        b.length > 24 &&
        b
          .subarray(0, 8)
          .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) &&
        b.readUInt32BE(16) > 0 &&
        b.readUInt32BE(20) > 0
          ? "local_verified"
          : "local_invalid";
    } catch {
      imageStatus = "local_invalid";
    }
    method = "png_signature_dimensions";
  }
  tables.image_checks.push({
    object_id: r.id,
    image_ref: nullable(r.image),
    status: imageStatus,
    checked_at: method === "not_checked" ? null : now,
    check_method: method,
    source_id: source(r.imageSource || r.source),
  });
}
tables.outfit_families = [...familyRows.values()];
tables.outfit_clothing = [...relations.values()];
tables.versions = [...versions.values()];
tables.releases = [...releases.values()];
for (const e of data.outfitAliases?.entries || [])
  for (const alias of new Set(e.aliases)) {
    const nid = id("name", e.outfitId, "zh-CN", "nickname", alias);
    tables.object_names.push({
      name_id: nid,
      object_id: e.outfitId,
      locale: "zh-CN",
      name_type: "nickname",
      name: alias,
      display_fallback: alias,
      translation_status: "community",
      source_id: null,
    });
    for (const s of e.sources || [])
      if (!s.aliases?.length || s.aliases.includes(alias))
        tables.name_sources.push({
          name_id: nid,
          source_id: source(s.url),
          checked_date: data.outfitAliases.verifiedAt || null,
        });
  }
const sketchSource = source("https://gongeo.us" + manifest.files.sketches.path);
let missingSketchTargets = 0;
for (const [gameId, s] of Object.entries(sketches.items || {})) {
  const target = "c" + gameId;
  if (!byId.has(target)) {
    missingSketchTargets++;
    continue;
  }
  tables.recipes.push({
    recipe_id: "design:" + s.designId,
    target_id: target,
    design_id: s.designId,
    scope: "clothing",
    checked_at: null,
    source_published_date: null,
    access_method: null,
    note: null,
    output_quantity: null,
    status: "design_only",
    source_id: sketchSource,
  });
}
if (missingSketchTargets)
  issue(
    "warning",
    "sketch_scope",
    "recipes",
    "*",
    `${missingSketchTargets} 个设计图目标不在现有服装目录，未生成悬空配方，原始资料保留`,
  );

if (fs.existsSync(path.join(input, "material-planning.json")))
  applyPlanningInput(read("material-planning.json"), tables, source, id);
if (fs.existsSync(path.join(input, "evolution-research.json")))
  applyEvolutionInput(
    read("evolution-research.json"),
    read("evolution-requirements.json"),
    tables,
    source,
  );
if (fs.existsSync(path.join(input, "official-events.json")))
  applyOfficialInput(read("official-events.json"), tables, source, id);

// Canonical sort gives deterministic exports independent of source row order.
tables.outfit_recipe_status = buildPlanningStatuses(tables, {
  ...read("material-planning.json"),
  baseline_ids: read("planning-baseline-audit.json").outfits.map((o) => o.id),
});
for (const [name, rows] of Object.entries(tables)) {
  const s = schema[name];
  rows.sort((a, b) =>
    JSON.stringify(s.pk.map((k) => a[k])).localeCompare(
      JSON.stringify(s.pk.map((k) => b[k])),
      "en",
    ),
  );
}
function canonicalRow(table, row) {
  const clone = { ...row };
  if (table === "image_checks") delete clone.checked_at;
  return clone;
}
const coreTables = Object.keys(schema).filter(
  (k) => !["snapshots", "change_log"].includes(k),
);
const normalized = Object.fromEntries(
  coreTables.map((k) => [k, tables[k].map((r) => canonicalRow(k, r))]),
);
const inputManifest = [];
function fingerprint(dir, relative = "") {
  for (const ent of fs
    .readdirSync(dir, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))) {
    const rel = relative ? relative + "/" + ent.name : ent.name,
      f = path.join(dir, ent.name);
    if (ent.isDirectory()) fingerprint(f, rel);
    else {
      // Decorative asset revisions and audit timestamps are tracked separately from game data.
      if(['region-banners.json','region-banner-checks.json'].includes(rel))continue;
      const b = fs.readFileSync(f);
      inputManifest.push({ file: rel, sha256: digest(b), bytes: b.length });
    }
  }
}
fingerprint(input);
const snapshotId =
  "snapshot:" + digest({ schema, normalized, inputManifest }).slice(0, 24);
fs.mkdirSync(out, { recursive: true });
const historyDir = path.join(out, "history");
fs.mkdirSync(historyDir, { recursive: true });
const historyFile = path.join(historyDir, "index.json"),
  history = fs.existsSync(historyFile)
    ? JSON.parse(fs.readFileSync(historyFile, "utf8"))
    : { snapshots: [], changes: [], current: null };
const previous = history.current
  ? history.snapshots.find((s) => s.snapshot_id === history.current)
  : null;
let current = history.snapshots.find((s) => s.snapshot_id === snapshotId),
  isNew = !current;
if (!current) {
  current = {
    snapshot_id: snapshotId,
    previous_snapshot_id: previous?.snapshot_id || null,
    created_at: now,
    source_date: data.date || null,
    catalog_version: data.version || null,
    catalog_generated_at: data.catalogDate || null,
    object_count: records.length,
    is_baseline: previous ? 0 : 1,
    input_manifest_json: JSON.stringify(inputManifest),
  };
}
const changes = [];
if (isNew) {
  const pushChange = (table, key, type, before, after) =>
    changes.push({
      change_id: id("change", snapshotId, table, key, type),
      snapshot_id: snapshotId,
      table_name: table,
      row_key: key,
      change_type: type,
      before_json: before ? JSON.stringify(before) : null,
      after_json: after ? JSON.stringify(after) : null,
    });
  if (!previous) pushChange("*", "*", "baseline", null, null);
  else {
    const prior = JSON.parse(
      fs.readFileSync(
        path.join(historyDir, previous.snapshot_id.replace(":", "-") + ".json"),
        "utf8",
      ),
    );
    for (const table of coreTables) {
      const key = (r) => JSON.stringify(schema[table].pk.map((k) => r[k])),
        oldMap = new Map((prior[table] || []).map((r) => [key(r), r])),
        newMap = new Map(normalized[table].map((r) => [key(r), r]));
      for (const [k, row] of newMap) {
        const old = oldMap.get(k);
        if (!old) pushChange(table, k, "added", null, row);
        else if (JSON.stringify(row) !== JSON.stringify(old))
          pushChange(table, k, "modified", old, row);
      }
      for (const [k, row] of oldMap)
        if (!newMap.has(k)) pushChange(table, k, "deleted", row, null);
    }
  }
}
tables.snapshots = isNew ? [...history.snapshots, current] : history.snapshots;
tables.change_log = isNew ? [...history.changes, ...changes] : history.changes;
if (fs.existsSync(path.join(input, "remote-image-checks.json"))) {
  for (const f of read("remote-image-checks.json").facts) {
    const row = tables.image_checks.find((r) => r.object_id === f.object_id);
    if (row?.image_ref === f.image_ref)
      Object.assign(row, {
        status: f.status,
        checked_at: f.checked_at,
        check_method: f.check_method,
        http_status: f.http_status || null,
        content_type: f.content_type || null,
      });
  }
}
issues.push(...validateTables(tables));
const errors = issues.filter((i) => i.severity === "error");
if (errors.length) {
  fs.writeFileSync(
    path.join(out, "validation-failed.json"),
    JSON.stringify({ checked_at: now, issues }, null, 2),
  );
  console.error("Validation failed:", errors.slice(0, 10));
  process.exitCode = 1;
} else {
  const objs = tables.objects,
    materialScope = tables.materials.filter(
      (r) => r.gathering_scope === "candidate",
    ),
    scopeIds = new Set(materialScope.map((r) => r.material_id));
  const metric = (key, label, numerator, denominator, definition) => ({
    key,
    label,
    numerator,
    denominator,
    percent: denominator
      ? Math.round((numerator / denominator) * 10000) / 100
      : null,
    definition,
  });
  const images = tables.image_checks,
    checked = images.filter((r) =>
      [
        "local_verified",
        "local_invalid",
        "remote_verified",
        "remote_failed",
      ].includes(r.status),
    );
  const humanPath=path.resolve(input,'../review/step12/review.json'),candidatePath=path.resolve(input,'../dataset/search/queries.candidates.json');
  const candidateQueries=fs.existsSync(candidatePath)?JSON.parse(fs.readFileSync(candidatePath)):[],candidateQueryIds=new Set(candidateQueries.map(q=>q.query_id));
  const humanReview=fs.existsSync(humanPath)?JSON.parse(fs.readFileSync(humanPath)):null;
  const humanApproved=humanReview?.snapshot_id===snapshotId?new Set(humanReview.rows.filter(q=>q.status==='approved'&&candidateQueryIds.has(q.query_id)&&Array.isArray(q.expected_ids)&&q.expected_ids.every(id=>byId.has(id))&&q.answerable===(q.expected_ids.length>0)&&q.reviewer&&q.reviewed_on).map(q=>q.query_id)).size:0;
  const metrics = [
    ...(fs.existsSync(path.join(input,'region-banner-checks.json'))?(()=>{const b=read('region-banner-checks.json');return [metric('region_banners','区域背景图可用率',b.primary_available,b.total,'本地资源大小写/魔数检查；含SVG占位。当前会话实际解码另列，不能据此声称全为官方实景。'),metric('region_official','官方区域背景素材覆盖率',b.official_images,b.total,'官方风景/活动/宣传及合并地区图片 / 全部区域；非具体子区域的合并图在清单单独标注。')];})():[]),
    metric('human_gold','搜索样本人审覆盖率',humanApproved,candidateQueries.length,'用户回传已确认标签 / 原候选查询；预测可见、单审核人，不是独立盲审或配方实测。'),
    metric('recipe_source_confidence','完整配方置信度标注率',tables.recipes.filter(r=>r.status==='complete'&&r.source_confidence).length,tables.recipes.filter(r=>r.status==='complete').length,'只标有明确评级的清单；高/中是来源依据强度，不表示游戏内已实测。'),
    metric(
      "evolution_cost",
      "进化步骤资源覆盖率",
      tables.recipes.filter(
        (r) => r.scope === "evolution" && r.status === "complete",
      ).length,
      tables.outfits.filter((o) => o.form_type === "evolution").length,
      "有来源的单次进化材料与货币消耗 / 全部进化形态；拥有副本前置另表，不包括自动重制原色。",
    ),
    metric(
      "evolution_attributes",
      "同等级进化属性核对率",
      tables.evolution_observations.filter(
        (o) => o.attribute_status === "verified",
      ).length,
      tables.outfits.filter((o) => o.form_type === "evolution").length,
      "等级上下文与前后数字均核实才记完整；公开端点的未定等级分数不作差值。",
    ),
    metric(
      "outfit_recipe",
      "套装形态配方覆盖率",
      planningCoverage(tables).all.complete,
      tables.outfits.length,
      "完整消耗清单 / 全部形态；原色、进化、焕新分别建档；直接获取条目也在目录分母内。",
    ),
    metric(
      "craft_recipe",
      "可制作原色配方覆盖率",
      planningCoverage(tables).craftable_base.complete,
      planningCoverage(tables).craftable_base.total,
      "完整制作清单 / 已有设计图或制作线索的原色；不含直接获取及进化/焕新。",
    ),
    metric(
      "image_reference",
      "图片地址覆盖率",
      objs.filter((r) => r.image_ref).length,
      objs.length,
      "所有对象中具有图片地址的比例；不等同于图片可用率。",
    ),
    metric(
      "image_available_checked",
      "已检查图片可用率",
      images.filter((r) =>
        ["local_verified", "remote_verified"].includes(r.status),
      ).length,
      checked.length,
      "本地PNG签名/尺寸与已抽查外链HTTP/图片签名；只对实际已查范围统计，非全站可用率。",
    ),
    metric(
      "image_check_coverage",
      "图片检查覆盖率",
      checked.length,
      objs.length,
      "已检查的对象主图 / 全部对象。",
    ),
    metric(
      "obtain",
      "具体获取说明覆盖率",
      objs.filter((r) => r.obtain_status === "known").length,
      objs.length,
      "排除“详见资料来源”等占位文本；具体途径不代表当前开放。",
    ),
    metric(
      "recipe",
      "完整配方覆盖率",
      tables.recipes.filter((r) => r.status === "complete").length,
      tables.recipes.length,
      "分母为已收录配方记录（单部件设计图与整套汇总）；须原料数量与产出完整。不同粒度不作套装覆盖率。",
    ),
    metric(
      "coordinates",
      "精确坐标覆盖率",
      new Set(
        tables.gathering_points
          .filter((r) => scopeIds.has(r.material_id))
          .map((r) => r.material_id),
      ).size,
      scopeIds.size,
      "分母为来源类别 Collection/Fishing/Animal-Grooming/Bug-Catching 的候选采集物；区域说明不算坐标。",
    ),
    metric(
      "regions",
      "采集区域覆盖率",
      new Set(
        tables.gathering_areas
          .filter((r) => scopeIds.has(r.material_id))
          .map((r) => r.material_id),
      ).size,
      scopeIds.size,
      "相同候选采集物范围中有区域说明的对象比例。",
    ),
    metric(
      "release",
      "套装实装标记覆盖率",
      tables.object_releases.filter(
        (r) => r.object_id.startsWith("o") && r.release_id,
      ).length,
      tables.outfits.length,
      "按套装形态计；这是来源实装标记，不是活动时间范围。",
    ),
    metric(
      "event_dates",
      "活动起止日期完整率",
      tables.events.filter((r) => r.start_date && r.end_date).length,
      tables.events.length,
      "活动尚未采集时分母为 0，显示未评估，不能显示 100%。",
    ),
  ];
  const membership = fs.existsSync(path.join(input, "membership-audit.json"))
      ? read("membership-audit.json")
      : null,
    plannedMaterials = new Set(
      tables.recipe_ingredients
        .filter((i) =>
          tables.outfit_recipe_status.some(
            (s) => s.status === "complete" && s.recipe_id === i.recipe_id,
          ),
        )
        .map((i) => i.material_id),
    );
  metrics.push(
    metric(
      "material_obtain",
      "材料与道具获取说明",
      tables.materials.filter(
        (m) =>
          tables.objects.find((o) => o.object_id === m.material_id)
            .obtain_status === "known",
      ).length,
      tables.materials.length,
      "全部materials对象，包括货币、摆饰等；具体获取指引关联来源，不代表所有内容均为采集物。",
    ),
    metric(
      "planning_guidance",
      "可计算计划用料获取指引",
      tables.material_guidance.filter((g) =>
        plannedMaterials.has(g.material_id),
      ).length,
      plannedMaterials.size,
      "仅可计算整套/进化/焕新清单的去重用料；不等于全部材料覆盖。",
    ),
    metric(
      "official_versions",
      "版本标签的官方日历覆盖",
      tables.version_calendar.length,
      tables.versions.length,
      "已核对官方推出日期与时区的版本标签/全部已收录标签；未收录历史版本无法作为完整分母。",
    ),
  );
  if (membership)
    metrics.push(
      metric(
        "member_count_agreement",
        "部件数量来源一致率",
        membership.counts.filter((r) => r.status === "match").length,
        membership.counts.length,
        "目录成员数与唯一匹配BWIKI部件数量一致；数量一致不等于逐件独立实测。",
      ),
    );
  const translations = ["zh-CN", "en", "ja", "ko", "zh-TW"].map((locale) => {
    const rows = tables.object_names.filter(
      (r) => r.name_type === "standard" && r.locale === locale,
    );
    return {
      ...metric(
        locale,
        locale,
        rows.filter((r) => r.name).length,
        objs.length,
        "实有来源名称或本站整理译名；备用语言不计覆盖。",
      ),
      source: rows.filter((r) => r.translation_status === "source").length,
      curated: rows.filter((r) => r.translation_status === "curated").length,
      missing: rows.filter((r) => !r.name).length,
    };
  });
  const byKind = [...new Set(objs.map((r) => r.kind))].map((kind) => {
    const ids = new Set(
      objs.filter((r) => r.kind === kind).map((r) => r.object_id),
    );
    return {
      kind,
      total: ids.size,
      obtain: objs.filter(
        (r) => ids.has(r.object_id) && r.obtain_status === "known",
      ).length,
      translations: Object.fromEntries(
        translations.map((l) => [
          l.key,
          tables.object_names.filter(
            (r) =>
              ids.has(r.object_id) &&
              r.locale === l.key &&
              r.name_type === "standard" &&
              r.name,
          ).length,
        ]),
      ),
    };
  });
  const currentChanges = tables.change_log.filter(
      (r) => r.snapshot_id === snapshotId,
    ),
    comparable = new Set(
      tables.source_assertions
        .filter((r) => r.match_method === "unique_name")
        .map((r) => r.object_id),
    );
  const dict = Object.fromEntries(
    Object.entries(schema).map(([k, s]) => [
      k,
      { ...s, row_count: tables[k].length },
    ]),
  );
  const report = {
    schema_version: 1,
    audited_at: now,
    snapshot: current,
    source_date: data.date,
    catalog_version: data.version,
    snapshot_history: tables.snapshots.map((s) => ({
      snapshot_id: s.snapshot_id,
      created_at: s.created_at,
      is_baseline: s.is_baseline,
      object_count: s.object_count,
    })),
    totals: {
      objects: objs.length,
      outfit_forms: tables.outfits.length,
      independent_outfits: tables.outfit_families.length,
      base_forms: tables.outfits.filter((r) => r.is_base).length,
      evolution_forms: tables.outfits.filter((r) => r.form_type === "evolution")
        .length,
      renewal_forms: tables.outfits.filter((r) => r.form_type === "renewal")
        .length,
      unknown_variant_forms: tables.outfits.filter(
        (r) => r.form_type === "variant_unknown",
      ).length,
      clothing: tables.clothing.length,
      materials: tables.materials.length,
      recipes: tables.recipes.length,
      coordinates: tables.gathering_points.length,
    },
    metrics,
    translations,
    by_kind: byKind,
    coverage_notes: {
      catalog_version: data.version,
      membership_mismatches:
        membership?.counts.filter((r) => r.status !== "match") || [],
      official_calendar: tables.version_calendar,
      events: tables.events.length,
      remote_image_sampling: fs.existsSync(
        path.join(input, "remote-image-checks.json"),
      )
        ? read("remote-image-checks.json").sample_method
        : null,
      human_search_approvals: humanApproved,
      region_banners:fs.existsSync(path.join(input,'region-banner-checks.json'))?read('region-banner-checks.json'):null,
      human_search_scope: humanReview?{cohort:'step12-human-50',reviewer:humanReview.reviewer,reviewed_on:humanReview.reviewed_on,time_zone:humanReview.review_timezone,evidence_status:'user_supplied_assertions_not_independently_inspected'}:null,
    },
    image_status: Object.fromEntries(
      [
        "local_verified",
        "local_invalid",
        "missing",
        "remote_unchecked",
        "remote_verified",
        "remote_failed",
      ].map((s) => [s, images.filter((r) => r.status === s).length]),
    ),
    validation: {
      status: "passed",
      error_count: 0,
      warning_count: issues.filter((i) => i.severity === "warning").length,
      duplicate_ids: rawDuplicateIds,
      unresolved_source_links: missingSketchTargets,
      missing_links: allInputLinks.filter((l) => !byId.has(l.target)).length,
      checks: [
        "unique",
        "required",
        "type",
        "accepted_values",
        "range",
        "foreign_key",
        "date_format",
        "object_kind",
        "family_integrity",
        "semantic_form_claim",
        "recipe_complete",
        "recipe_scope",
        "recipe_unit",
        "status_evidence",
        "status_recipe",
        "recipe_cycle",
      "recipe_inference_guard",
      ],
      issues,
    },
    conflicts: {
      count: tables.source_conflicts.length,
      compared_objects: comparable.size,
      fields: ["rarity", "style", "obtain_text"],
      scope:
        "仅对同类别唯一名称匹配的 BWIKI 与网站字段比较；未覆盖对象不作无冲突保证，差异不自动裁定。",
      by_field: Object.fromEntries(
        ["rarity", "style", "obtain_text"].map((f) => [
          f,
          tables.source_conflicts.filter((r) => r.field === f).length,
        ]),
      ),
      rows: tables.source_conflicts.map((c) => {
        const a = tables.source_assertions.find(
            (r) => r.assertion_id === c.left_assertion_id,
          ),
          b = tables.source_assertions.find(
            (r) => r.assertion_id === c.right_assertion_id,
          );
        return {
          ...c,
          name: byId.get(c.object_id)?.name,
          left: a.value,
          right: b.value,
          left_url: tables.sources.find((r) => r.source_id === a.source_id).url,
          right_url: tables.sources.find((r) => r.source_id === b.source_id)
            .url,
        };
      }),
    },
    changes: {
      is_baseline: Boolean(current.is_baseline),
      counts: Object.fromEntries(
        ["baseline", "added", "modified", "deleted"].map((k) => [
          k,
          currentChanges.filter((r) => r.change_type === k).length,
        ]),
      ),
      rows: currentChanges.slice(0, 100),
      total: currentChanges.length,
    },
    tables: Object.entries(dict).map(([name, s]) => ({
      name,
      description: s.description,
      rows: s.row_count,
    })),
    limitations: [
      "本次整理现有本地资料，没有重新抓取全部外部来源。",
      "已核对部分原色制作与焕新步骤清单；其他配方、进化、活动时间范围和精确材料点位待补充。",
      "区域攻略可能早于目录版本；保留原攻略日期。",
      "首次建档不代表当天新增游戏内容。",
    ],
  };
  const ddl = createDDL(),
    dbFile = path.join(out, "miraland.sqlite"),
    tmpDb = path.join(out, "miraland.building.sqlite");
  if (fs.existsSync(tmpDb)) fs.unlinkSync(tmpDb);
  const db = new DatabaseSync(tmpDb);
  db.exec(ddl);
  db.exec("BEGIN");
  for (const [name, s] of Object.entries(schema)) {
    const keys = Object.keys(s.columns),
      stmt = db.prepare(
        `INSERT INTO "${name}" (${keys.map((k) => '"' + k + '"').join(",")}) VALUES (${keys.map(() => "?").join(",")})`,
      );
    for (const row of tables[name])
      stmt.run(...keys.map((k) => row[k] ?? null));
  }
  db.exec("COMMIT");
  const views = `CREATE VIEW v_independent_outfits AS SELECT o.*, f.family_id FROM objects o JOIN outfit_families f ON f.base_outfit_id=o.object_id;
 CREATE VIEW v_outfit_release_counts AS SELECT r.release_id,r.label,r.release_date,r.context,COUNT(*) AS form_count,SUM(o.is_base) AS new_independent_outfit_count,SUM(1-o.is_base) AS additional_form_count FROM outfits o JOIN object_releases x ON x.object_id=o.outfit_id JOIN releases r ON r.release_id=x.release_id GROUP BY r.release_id;
 CREATE VIEW v_complete_recipes AS SELECT * FROM recipes WHERE status='complete';`;
  db.exec(views);
  const fk = db.prepare("PRAGMA foreign_key_check").all(),
    integrity = db.prepare("PRAGMA integrity_check").get();
  if (fk.length || integrity.integrity_check !== "ok")
    throw Error("SQLite 完整性检查失败");
  db.close();
  fs.copyFileSync(tmpDb, dbFile);
  fs.unlinkSync(tmpDb);
  fs.writeFileSync(path.join(out, "schema.sql"), ddl + "\n\n" + views);
  if (fs.existsSync(path.join(out, "validation-failed.json")))
    fs.unlinkSync(path.join(out, "validation-failed.json"));
  fs.writeFileSync(
    path.join(out, "data-dictionary.json"),
    JSON.stringify(dict, null, 2),
  );
  const csvCell = (v) =>
    v == null ? "" : '"' + String(v).replaceAll('"', '""') + '"';
  for (const format of ["json", "csv"])
    fs.mkdirSync(path.join(out, format), { recursive: true });
  for (const [name, s] of Object.entries(schema)) {
    const columns = Object.keys(s.columns);
    fs.writeFileSync(
      path.join(out, "json", name + ".json"),
      JSON.stringify(tables[name], null, 2),
    );
    fs.writeFileSync(
      path.join(out, "csv", name + ".csv"),
      columns.join(",") +
        "\r\n" +
        tables[name]
          .map((r) => columns.map((k) => csvCell(r[k])).join(","))
          .join("\r\n") +
        (tables[name].length ? "\r\n" : ""),
    );
  }
  fs.writeFileSync(
    path.join(out, "quality-report.json"),
    JSON.stringify(report, null, 2),
  );
  fs.writeFileSync(
    path.join(out, "quality-data.js"),
    "window.NIKKI_QUALITY=" + JSON.stringify(report) + ";\n",
  );
  let documentation =
    "# 数据字典\n\nSQL 中 NULL、JSON 中 null、CSV 空单元格均表示未收录；不代表 0、不适用或不存在。\n\n";
  for (const [name, s] of Object.entries(dict)) {
    documentation +=
      `## ${name}（${s.row_count} 行）\n\n${s.description}\n\n主键：${s.pk.join(" + ")}\n\n| 字段 | 类型 | 必填 | 关联/取值 | 说明 |\n|---|---|---|---|---|\n` +
      Object.entries(s.columns)
        .map(
          ([k, c]) =>
            `| ${k} | ${c.type} | ${c.required || s.pk.includes(k) ? "是" : "否"} | ${c.ref || c.enum?.join(" / ") || ""} | ${c.description} |`,
        )
        .join("\n") +
      "\n\n";
  }
  fs.writeFileSync(path.join(out, "数据字典.md"), documentation);
  fs.writeFileSync(
    path.join(out, "manifest.json"),
    JSON.stringify(
      {
        snapshot_id: snapshotId,
        generated_at: now,
        source_date: data.date,
        files: fs
          .readdirSync(out)
          .filter((n) =>
            [
              "miraland.sqlite",
              "schema.sql",
              "data-dictionary.json",
              "quality-report.json",
            ].includes(n),
          )
          .map((n) => ({
            file: n,
            sha256: digest(fs.readFileSync(path.join(out, n))),
          })),
        input_files: inputManifest,
      },
      null,
      2,
    ),
  );
  if (isNew) {
    fs.writeFileSync(
      path.join(historyDir, snapshotId.replace(":", "-") + ".json"),
      JSON.stringify(normalized),
    );
    history.snapshots = tables.snapshots;
    history.changes = tables.change_log;
  }
  history.current = snapshotId;
  fs.writeFileSync(historyFile, JSON.stringify(history, null, 2));
  console.log(
    JSON.stringify(
      {
        snapshot: snapshotId,
        is_new: isNew,
        totals: report.totals,
        validation: report.validation,
        conflicts: {
          count: report.conflicts.count,
          compared: report.conflicts.compared_objects,
        },
        tables: Object.keys(schema).length,
      },
      null,
      2,
    ),
  );
}
