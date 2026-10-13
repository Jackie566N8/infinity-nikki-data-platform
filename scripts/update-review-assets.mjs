import fs from "node:fs";
const read = (p) => JSON.parse(fs.readFileSync("data/dataset/" + p)),
  Q = read("quality-report.json"),
  P = read("planning/input.json"),
  cases = read("search/queries.candidates.json"),
  csv = (rows) => {
    if (!rows.length) return "";
    const keys = Object.keys(rows[0]),
      cell = (v) => '"' + String(v ?? "").replaceAll('"', '""') + '"';
    return (
      "\ufeff" +
      [
        keys.map(cell).join(","),
        ...rows.map((r) => keys.map((k) => cell(r[k])).join(",")),
      ].join("\r\n") +
      "\r\n"
    );
  },
  writeCSV = (file, rows) => fs.writeFileSync(file, csv(rows));
for (const d of [
  "data/review",
  "data/routes",
  "docs/templates",
  "docs/reports",
])
  fs.mkdirSync(d, { recursive: true });
const base = P.outfits.filter(
  (o) =>
    o.is_base &&
    o.availability.needs_recipe &&
    o.availability.status !== "complete",
);
writeCSV(
  "docs/reports/BASE_RECIPE_GAPS.csv",
  base.map((o) => ({
    priority: "high",
    object_id: o.id,
    name: o.name,
    rarity: o.rarity,
    acquisition: o.obtain,
    status: o.availability.status,
    unknown_quantities:
      JSON.parse(fs.readFileSync("data/input/step8-recipe-research.json"))
        .rows.find((r) => r.id === o.id)
        ?.pieces?.flatMap((p) => p.ingredients || [])
        .filter((i) => i.quantity === null).length ?? "",
    reason:
      o.id === "o10395"
        ? "公开目录可见套装；逐部件页面无制作数量，活动图纸需游戏内核对"
        : "逐部件公开页面存在未显示数量；未找到可靠交叉总量，不能默认1",
    source_url: o.source_url,
    suggested_source:
      "游戏内设计图截图；TH.GL逐部件清单；BWIKI/玩家完整材料截图",
    checked_at: Q.audited_at,
  })),
);
const ev = read("json/evolution_observations.json"),
  by = new Map(P.outfits.map((o) => [o.id, o]));
writeCSV(
  "docs/reports/EVOLUTION_FAMILY_BACKLOG.csv",
  ev.map((r) => ({
    priority: r.cost_status === "complete" ? "medium" : "high",
    family_id: r.base_id,
    family_name: by.get(r.base_id)?.name,
    object_id: r.outfit_id,
    name: by.get(r.outfit_id)?.name,
    rarity: by.get(r.outfit_id)?.rarity,
    part_ids: by.get(r.outfit_id)?.part_ids.join(";"),
    cost_status: r.cost_status,
    attribute_status: r.attribute_status,
    reason:
      r.cost_status === "complete"
        ? "单次资源已录入；前置副本实扣与同等级属性待真人核对"
        : "公开端点未返回进化消耗，仍属未录入，不能据此声称未公开",
    source_url:
      "https://infinitynikki.th.gl/db/outfit-sets/suit_" + r.outfit_id.slice(1),
    suggested_source:
      "游戏进化面板：输入副本、材料、金币；同等级原色/进化属性截图",
  })),
);
const gold = cases.map((q) => ({
  priority: q.split === "test" ? "P0" : "P1",
  data_item: q.query_id,
  query: q.query,
  query_type: q.type,
  current_value: JSON.stringify({
    expected_ids: q.expected_ids,
    answerable: q.answerable,
  }),
  suggested_verification_source: (q.evidence?.urls || []).join(";"),
  review_status: "pending",
  approved_ids: "",
  approved_answerable: "",
  reviewer: "",
  reviewed_at: "",
  evidence_url: "",
  notes:
    "AI辅助候选标签，不是人审Gold；审核后保留冻结历史，标签变更须新评估版本",
}));
writeCSV("docs/templates/HUMAN_GOLD_REVIEW.csv", gold);
const manual = [];
const add = (
  priority,
  data_item,
  current_value,
  suggested_verification_source,
) =>
  manual.push({
    priority,
    data_item,
    current_value,
    suggested_verification_source,
    review_status: "pending",
    reviewer: "",
    reviewed_at: "",
    evidence_url: "",
    notes: "",
  });
for (const id of ["o10265", "o20052"])
  add(
    "P0",
    id + "原色配方",
    JSON.stringify(
      P.recipes.find((r) => r.target_id === id && r.scope === "whole_outfit"),
    ),
    "游戏内整套逐件截图；data/input/step8-recipe-backfill.json交叉总量证明",
  );
for (const o of base)
  add(
    "P0",
    o.id + "缺失原色配方",
    o.name + "；" + o.obtain + "；" + o.availability.reason,
    o.source_url + "；游戏内设计图与获取前置",
  );
for (const m of Q.coverage_notes.membership_mismatches || [])
  add(
    "P0",
    "部件总数 " + m.id,
    JSON.stringify(m),
    m.source_url + "；游戏内部件清单",
  );
for (const r of ev)
  add(
    r.cost_status === "complete" ? "P1" : "P0",
    r.outfit_id + "进化步骤",
    JSON.stringify({
      cost: r.cost_status,
      attributes: r.attribute_status,
      before: r.before_scores,
      after: r.after_scores,
    }),
    "游戏内进化面板、同等级属性；data/input/evolution-research.json",
  );
for (const r of Q.conflicts.rows)
  add(
    r.field === "rarity" ? "P0" : r.field === "style" ? "P1" : "P2",
    "来源差异 " + r.conflict_id,
    JSON.stringify({
      id: r.object_id,
      field: r.field,
      left: r.left,
      right: r.right,
    }),
    r.left_url + ";" + r.right_url,
  );
manual.sort((a, b) => a.priority.localeCompare(b.priority));
writeCSV("docs/templates/DATA_REVIEW_CHECKLIST.csv", manual);
fs.writeFileSync(
  "data/review/review-manifest.json",
  JSON.stringify(
    {
      snapshot_id: Q.snapshot.snapshot_id,
      generated_at: Q.audited_at,
      human_approved: Q.coverage_notes.human_search_approvals || 0,
      gold_candidates: gold.length,
      data_review_items: manual.length,
      status: Q.coverage_notes.human_search_approvals
        ? "partially_human_reviewed"
        : "pending_user_review",
    },
    null,
    2,
  ),
);
for (const [file, headers] of Object.entries({
  ROUTE_NODES: [
    "node_id",
    "node_type",
    "material_id",
    "region",
    "x",
    "y",
    "z",
    "coordinate_system",
    "coordinate_unit",
    "map_version",
    "yield_quantity",
    "yield_unit",
    "collection_condition",
    "source_url",
    "review_status",
    "reviewer",
    "reviewed_at",
  ],
  ROUTE_EDGES: [
    "edge_id",
    "from_node_id",
    "to_node_id",
    "directed",
    "travel_mode",
    "distance",
    "distance_unit",
    "time_seconds",
    "polyline_json",
    "terrain_condition",
    "ability_condition",
    "teleport_condition",
    "source_url",
    "review_status",
    "reviewer",
    "reviewed_at",
  ],
  ROUTE_WAYPOINTS: [
    "route_id",
    "sequence",
    "node_id",
    "action",
    "condition",
    "source_url",
    "review_status",
  ],
}))
  fs.writeFileSync(
    "docs/templates/" + file + ".csv",
    "\ufeff" + headers.join(",") + "\r\n",
  );
fs.writeFileSync(
  "data/routes/region-recommendation-input.json",
  JSON.stringify(
    {
      snapshot_id: P.snapshot_id,
      mode: "region_only",
      regions: P.areas,
      points: P.points,
      path_edges: [],
      teleports: [],
      exact_route_available: false,
      limitations:
        "当前0坐标、0传送点、0通行路径。区域材料为备选地点，非区域产量分配。",
    },
    null,
    2,
  ),
);
console.log(
  "Review candidates",
  gold.length,
  "manual items",
  manual.length,
  "remaining bases",
  base.length,
  "evolution costs pending",
  ev.filter((x) => x.cost_status !== "complete").length,
);

writeCSV(
  "docs/reports/RECIPE_BACKLOG.csv",
  P.outfits
    .filter(
      (o) =>
        o.availability.needs_recipe && o.availability.status !== "complete",
    )
    .map((o) => ({
      object_id: o.id,
      name: o.name,
      form: o.form_type,
      rarity: o.rarity,
      status: o.availability.status,
      reason: o.availability.reason,
      source_url: o.source_url,
      priority: "high",
      snapshot_id: Q.snapshot.snapshot_id,
    })),
);
