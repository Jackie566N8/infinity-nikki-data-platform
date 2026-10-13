import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
const dir = path.dirname(fileURLToPath(import.meta.url)),
  platform = path.resolve(dir, ".."),
  out = path.join(platform, "../../data/dataset/advanced"),
  read = (f) => JSON.parse(fs.readFileSync(path.join(platform, f), "utf8")),
  require = createRequire(import.meta.url),
  M = require("./advanced-model.cjs"),
  convert = require("../search-improved/vendor/opencc-js.cjs").Converter({
    from: "tw",
    to: "cn",
  });
fs.mkdirSync(out, { recursive: true });
const A = read("../../data/dataset/analytics/input.json"),
  features = read("../../data/dataset/search-improved/features.json"),
  catalog = read("../../data/input/catalog.json"),
  aliases = catalog.outfitAliases,
  P = read("../../data/dataset/planning/input.json"),
  F = new Map(features.map((r) => [r.id, r]));
const docs = A.outfits
  .filter((r) => r.is_base)
  .map((r) => ({
    ...r,
    colors: F.get(r.id)?.colors || [],
    elements: F.get(r.id)?.verified_elements || [],
    difficulty: null,
    visual_evidence: F.get(r.id)?.evidence || [],
  }));
const model = M.createModel(docs),
  recommendations = Object.fromEntries(
    docs.map((d) => [d.id, model.recommend(d.id)]),
  ),
  study = M.aliasStudy(
    aliases.entries.map((e) => ({ ...e, checked_at: aliases.verifiedAt })),
    convert,
  ),
  allWeight = Object.values(M.WEIGHTS).reduce((s, n) => s + n, 0);
const coverage = Object.entries(M.WEIGHTS).map(([field, weight]) => ({
  field,
  weight,
  denominator: docs.length,
  numerator: docs.filter((d) =>
    field === "style"
      ? d.style
      : field === "tags"
        ? d.tags.length
        : field === "rarity"
          ? d.rarity
          : field === "methods"
            ? d.methods.some((m) => m !== "other")
            : field === "difficulty"
              ? d.difficulty?.verified
              : field === "colors"
                ? d.colors.length
                : d.elements.length,
  ).length,
}));
const sourcePlatforms = {};
for (const row of study.rows)
  for (const s of row.sources) {
    if (!sourcePlatforms[s.platform]) sourcePlatforms[s.platform] = new Set();
    sourcePlatforms[s.platform].add(s.url);
  }
const hash = (f) =>
  createHash("sha256").update(fs.readFileSync(f)).digest("hex");
const provenance = {
  snapshot_id: A.snapshot_id,
  source_date: A.source_date,
  alias_checked_at: aliases.verifiedAt,
  generated_at: new Date().toISOString(),
  method_version: M.VERSION,
  model_sha256: hash(path.join(dir, "advanced-model.cjs")),
  inputs: {
    analytics_sha256: hash(
      path.join(platform, "../../data/dataset/analytics/input.json"),
    ),
    aliases_sha256: createHash("sha256")
      .update(JSON.stringify(aliases))
      .digest("hex"),
    features_sha256: hash(
      path.join(platform, "../../data/dataset/search-improved/features.json"),
    ),
  },
  source_tables: [
    "objects",
    "outfits",
    "object_tags",
    "object_names",
    "sources",
    "source_assertions",
    "gathering_areas",
    "gathering_points",
  ],
  scope:
    "independent_base_outfits; exclude same family; no inferred visual features or measured difficulty",
  weights: M.WEIGHTS,
  total_possible_weight: allWeight,
};
const researchId =
  "advanced:" +
  createHash("sha256")
    .update(
      JSON.stringify({
        documents: docs,
        aliases,
        core_snapshot_id: A.snapshot_id,
        features_sha256: provenance.inputs.features_sha256,
        model: provenance.model_sha256,
      }),
    )
    .digest("hex")
    .slice(0, 24);
provenance.research_snapshot_id = researchId;
const result = {
  schema_version: 1,
  provenance,
  documents: docs,
  form_to_base: Object.fromEntries(A.outfits.map((r) => [r.id, r.base_id])),
  coverage,
  recommendations,
  nickname_study: {
    ...study,
    platforms: Object.entries(sourcePlatforms).map(([platform, urls]) => ({
      platform,
      source_count: urls.size,
      urls: [...urls],
    })),
    source_count: new Set(
      study.rows.flatMap((r) => r.sources.map((s) => s.url)),
    ).size,
    denominator_base_outfits: docs.length,
    official_origin_confirmed: 0,
    translation_origin_confirmed: 0,
    creation_origin_unknown: study.rows.length,
  },
  route: {
    verified_points: P.points.length,
    verified_teleports: 0,
    mode: "region_preparation_only",
  },
  telemetry: {
    enabled: false,
    implementation: "design_only",
    collected_events: 0,
  },
};
fs.writeFileSync(path.join(out, "input.json"), JSON.stringify(result, null, 2));
fs.writeFileSync(
  path.join(out, "advanced-data.js"),
  "window.NIKKI_ADVANCED_DATA=" + JSON.stringify(result) + ";",
);
const historyFile = path.join(out, "history.json"),
  history = fs.existsSync(historyFile)
    ? JSON.parse(fs.readFileSync(historyFile))
    : [];
if (!history.some((h) => h.research_snapshot_id === researchId)) {
  fs.mkdirSync(path.join(out, "snapshots"), { recursive: true });
  fs.writeFileSync(
    path.join(out, "snapshots", researchId.replace(":", "-") + ".json"),
    JSON.stringify(result),
  );
  history.push({
    research_snapshot_id: researchId,
    core_snapshot_id: A.snapshot_id,
    created_at: provenance.generated_at,
    base_outfits: docs.length,
    actual_aliases: study.alias_count,
    inputs: provenance.inputs,
    model_sha256: provenance.model_sha256,
  });
  fs.writeFileSync(historyFile, JSON.stringify(history, null, 2));
}
const csv = (rows) =>
  "\uFEFF" +
  [Object.keys(rows[0] || {}), ...rows.map(Object.values)]
    .map((r) =>
      r.map((v) => '"' + String(v ?? "").replaceAll('"', '""') + '"').join(","),
    )
    .join("\r\n");
const edges = Object.entries(recommendations).flatMap(([id, rows]) =>
  rows.map((r, i) => ({
    source_id: id,
    target_id: r.id,
    rank: i + 1,
    score: r.score,
    coverage: r.coverage,
    blocks: JSON.stringify(r.blocks),
    snapshot_id: A.snapshot_id,
    method_version: M.VERSION,
  })),
);
fs.writeFileSync(path.join(out, "recommendations.csv"), csv(edges));
fs.writeFileSync(
  path.join(out, "nickname-observations.csv"),
  csv(study.rows.map((r) => ({ ...r, sources: JSON.stringify(r.sources) }))),
);
// Separate database: no change to the core 29 tables or the frozen search benchmark.
const db = new DatabaseSync(path.join(out, "advanced.sqlite"));
db.exec(
  "BEGIN; DROP TABLE IF EXISTS recommendation_edges; DROP TABLE IF EXISTS nickname_observations; DROP TABLE IF EXISTS feature_coverage; CREATE TABLE recommendation_edges(source_id TEXT,target_id TEXT,rank INTEGER,score REAL,coverage REAL,blocks TEXT,snapshot_id TEXT,method_version TEXT,PRIMARY KEY(source_id,target_id)); CREATE TABLE nickname_observations(outfit_id TEXT,name TEXT,alias TEXT,normalized_alias TEXT,name_similarity REAL,origin TEXT,creation_mechanism TEXT,observed_at TEXT,checked_at TEXT,sources TEXT,PRIMARY KEY(outfit_id,alias)); CREATE TABLE feature_coverage(field TEXT PRIMARY KEY,weight REAL,denominator INTEGER,numerator INTEGER);",
);
for (const [table, rows] of [
  ["recommendation_edges", edges],
  [
    "nickname_observations",
    study.rows.map((r) => ({ ...r, sources: JSON.stringify(r.sources) })),
  ],
  ["feature_coverage", coverage],
])
  if (rows.length) {
    const stmt = db.prepare(
      "INSERT INTO " +
        table +
        " VALUES (" +
        Object.keys(rows[0])
          .map(() => "?")
          .join(",") +
        ")",
    );
    for (const row of rows) stmt.run(...Object.values(row));
  }
db.exec("COMMIT");
db.close();
const report = `# 社区昵称研究与高级模块报告\n\n生成时间：${provenance.generated_at}。目录快照：${A.snapshot_id}。昵称证据核对时间：${aliases.verifiedAt}，不是昵称诞生时间；本次未重新抓取社交媒体。\n\n## 样本与来源\n\n研究包含 ${study.object_count}/${docs.length} 个独立原色套装（${((100 * study.object_count) / docs.length).toFixed(2)}%覆盖），${study.alias_count} 条实际记录的昵称，规范化后 ${study.normalized_alias_count} 个昵称词。出处 ${result.nickname_study.source_count} 个页面；各平台来源页计数可重叠，不是玩家人数。\n\n${result.nickname_study.platforms.map((p) => "- " + p.platform + "：" + p.source_count + " 个页面").join("\n")}\n\n本样本来自站内有出处的别称库，含社区 Wiki 与玩家公开帖，偏向有昵称的套装。不是随机玩家调查，不能代表全体玩家偏好，也不能用出现页面数当人气。逐条 URL、原文备注、观测名及核对日期见 nickname-observations.csv/input.json。来源网页支持“社区已使用此称呼”，不一定证明首创者；${study.alias_count} 条称呼的创造机制均待考证。已确认官方创造和翻译形成各 0 条，不意味着这些来源不存在。\n\n## 两个不同指标\n\n- 多昵称对象率：${study.multiple_nickname_objects.length}/${study.object_count} = ${(100 * study.multiplicity_rate).toFixed(2)}%。指同一对象有多个规范化昵称，不能称作歧义。\n- 昵称歧义率：${study.ambiguous.length}/${study.normalized_alias_count} = ${(100 * study.ambiguity_rate).toFixed(2)}%。指同一规范化昵称指向多个独立对象，仅适用于本样本。未收录称呼的碰撞未知。\n- 繁简、空白与“套/套装”后缀统一；生成的“神女/神女套装”等检索别名不作为新的真实观察；进化继承别称不计独立观察。\n\n## 正式名距离\n\n相似度 = 1 - Levenshtein(规范化昵称词干, 简体正式名) / 两者最大字符长度。只衡量字面，不衡量语义或流行程度。平均 ${study.mean_similarity.toFixed(4)}。\n\n|区间|实际昵称条数|\n|---|---:|\n${study.bins.map((b, i) => "|[" + b.min.toFixed(1) + ", " + b.max.toFixed(1) + (i === 4 ? "]" : ")") + "|" + b.count + "|").join("\n")}\n\n字面相似度低的称呼需要显式昵称词典；不能据此推断创造原因或断言搜索效果提升。昵称证据库与搜索测试有重叠，本研究不是独立泛化实验。\n\n## 相似套装推荐\n\n候选 ${docs.length} 个原色，详情中的附加形态映射回原色进行推荐，排除同家族；没有用原色标签代替附加形态颜色。采用声明权重的多字段余弦：style=.40，tags=.30，rarity=.10，methods=.15，colors=.10，elements=.10，difficulty=.05。标签使用 IDF=log((N+1)/(df+1))+1；其他字段 one-hot/multi-hot。仅在两侧字段都已知时纳入分母；每块贡献=weight×cosine/已知权重和。\n\n${coverage.map((c) => "- " + c.field + "：" + c.numerator + "/" + c.denominator).join("\n")}\n\n颜色、元素未从部件推断到套装。获取渠道不是难度，现无实测难度，所以该块排除。没有风格、标签或已核实视觉的共同依据就不推荐；最小得分 .35；最多 6 个，稳定 ID 处理并列。得分是特征相似度，不是用户喜欢的概率。覆盖率低会使得分虚高，因此并列展示有效特征覆盖，不能横向当作准确率。权重没有拟合个人反馈，也没有在 Step 5/6 测试集调参；未开展真实用户推荐效果评估。\n\n## 区域准备顺序\n\n当前精确点位 ${P.points.length} 条，传送点 0 条，无通行图。使用贪心区域覆盖：每步选择覆盖最多尚未安排材料的候选区域，同数优先共同材料，再按区域名稳定排序。仅提供区域准备顺序，不计算距离、最短路径、实际用时、采集产量。可能存在上下级或别名区域重叠，未做未经核实的合并。缺口是总需求，不代表该区可采够。采集条件显示来源原文，未检查玩家解锁、时间、天气、能力；非采集材料另列。地图以列表编号标注区域步骤，没有伪造坐标标记或连线。\n\n## 搜索日志\n\n只交付字段字典、同意/撤回/保留期方案、DDL 与指标 SQL，没有接入监听或实际收集；现有搜索和衣橱仍只本地运行。见 search-usage-design.md。\n`;
fs.writeFileSync(path.join(out, "高级模块与昵称研究报告.md"), report);
console.log(
  JSON.stringify({
    base_outfits: docs.length,
    edges: edges.length,
    coverage,
    aliases: study.alias_count,
    alias_objects: study.object_count,
    sources: result.nickname_study.platforms.map((p) => ({
      platform: p.platform,
      pages: p.source_count,
    })),
    points: P.points.length,
    research_snapshot_id: researchId,
  }),
);
