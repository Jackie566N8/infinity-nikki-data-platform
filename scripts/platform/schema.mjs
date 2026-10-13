// Each table declares its grain, primary key, columns and foreign keys.
const c = (type, description, options = {}) => ({
  type,
  description,
  ...options,
});
const text = (d, o) => c("TEXT", d, o),
  integer = (d, o) => c("INTEGER", d, o),
  real = (d, o) => c("REAL", d, o);
const ref = (table, d, required = true) => text(d, { ref: table, required });
export const schema = {
  sources: {
    description: "每个不同资料地址一行；来源地址不等于本次重新抓取。",
    pk: ["source_id"],
    columns: {
      source_id: text("URL 或本地资料标识的 SHA-256 稳定键"),
      url: text("原始地址或 local: 标识", { required: true }),
      publisher: text("来源机构/资料库", { required: true }),
      retrieved_date: text("现有快照记录的采集日期；没有具体时刻"),
      source_kind: text("来源类别", { enum: ["web", "local"], required: true }),
    },
  },
  objects: {
    description:
      "每个现有图鉴对象/形态一行，包括套装、部件、材料及其他道具、妆容、祝福闪光。",
    pk: ["object_id"],
    columns: {
      object_id: text("沿用网站 ID，例如 o10349、c1020100349、msol-fruit"),
      game_id: integer("来源游戏 ID；材料等无 ID 时为 NULL"),
      kind: text("对象类别", {
        required: true,
        enum: ["outfits", "clothing", "materials", "makeups", "eurekas"],
      }),
      display_name: text("原网站展示名称，不代表已译成中文", {
        required: true,
      }),
      rarity: integer("品质；原值 0 转为 NULL", { min: 1, max: 6 }),
      style: text("主风格", { enum: ["甜美", "性感", "清新", "帅气", "典雅"] }),
      category: text("原网站类别"),
      obtain_text: text("实际获取说明；泛指“查看来源”的占位说明转为 NULL"),
      obtain_status: text("known 有具体说明；uncollected 未采集", {
        required: true,
        enum: ["known", "uncollected"],
      }),
      image_ref: text("图片地址；有地址不等于可用"),
      source_id: ref("sources", "主要资料来源"),
      snapshot_source_date: text("原图鉴整理日期", { required: true }),
    },
  },
  outfit_families: {
    description: "每个独立套装家族一行；各进化、焕新与原色共用一个家族。",
    pk: ["family_id"],
    columns: {
      family_id: text("family: + 原色套装 ID"),
      base_outfit_id: ref("outfits", "唯一原色套装 ID"),
      form_count: integer("本快照已收录形态数", { required: true, min: 1 }),
    },
  },
  outfits: {
    description:
      "每个套装形态一行。新增独立套装按家族原色计算，不能直接计本表行数。",
    pk: ["outfit_id"],
    columns: {
      outfit_id: ref("objects", "稳定套装形态 ID"),
      family_id: ref("outfit_families", "独立套装家族", false),
      base_outfit_id: ref("outfits", "原色 ID，原色自身指向自身", false),
      form_type: text(
        "base 原色/单形态；evolution 明确进化；renewal 焕新；variant_unknown 阶段未明",
        {
          required: true,
          enum: ["base", "evolution", "renewal", "variant_unknown"],
        },
      ),
      is_base: integer("是否家族原色；1 或 0", {
        required: true,
        enum: [0, 1],
      }),
      evolution_stage: integer(
        "仅一进/二进能明确转为 1/2；满进和泛称不猜数值",
        { min: 1 },
      ),
      variation_label: text("保留来源形态名称，例如不可进化、满进"),
      source_group_order: integer("来源分组中的顺序，不表示进化等级", {
        min: 0,
      }),
    },
  },
  clothing: {
    description:
      "每个服装部件形态一行；类别、风格、获取方式通过 objects 关联。",
    pk: ["clothing_id"],
    columns: {
      clothing_id: ref("objects", "部件 ID"),
      base_clothing_id: ref("clothing", "来源分组中唯一原色部件", false),
      is_variant: integer("来源是否标记变体", { required: true, enum: [0, 1] }),
      variation_label: text("来源变体标签"),
    },
  },
  outfit_clothing: {
    description: "套装形态和其部件的多对多关系；双向列举只保留一行。",
    pk: ["outfit_id", "clothing_id"],
    columns: {
      outfit_id: ref("outfits", "套装形态 ID"),
      clothing_id: ref("clothing", "部件 ID"),
      source_id: ref("sources", "关系来源"),
    },
  },
  materials: {
    description: "原网站 materials 类包含材料、货币、摆饰等，不全是采集材料。",
    pk: ["material_id"],
    columns: {
      material_id: ref("objects", "材料/道具稳定 ID"),
      original_category: text("来源英文类别"),
      gathering_scope: text(
        "candidate：Collection/Fishing/Animal-Grooming/Bug-Catching；其他暂未判定",
        { required: true, enum: ["candidate", "unassessed"] },
      ),
    },
  },
  makeups: {
    description: "每个妆容对象一行。",
    pk: ["makeup_id"],
    columns: { makeup_id: ref("objects", "妆容 ID") },
  },
  eurekas: {
    description:
      "每个祝福闪光部位一行；scores 缺少明确等级语境，留在原始快照不混入服装属性。",
    pk: ["eureka_id"],
    columns: { eureka_id: ref("objects", "祝福闪光 ID") },
  },
  object_tags: {
    description: "每个对象的一个标签一行。",
    pk: ["object_id", "tag"],
    columns: {
      object_id: ref("objects", "对象 ID"),
      tag: text("来源标签", { required: true }),
    },
  },
  object_names: {
    description:
      "每对象/语言一行标准名称记录，以及每个实际收录昵称一行。备用英文不计作目标语言翻译；未收录 name=NULL。",
    pk: ["name_id"],
    columns: {
      name_id: text("对象、语言、名称类型和昵称文本构成的稳定键"),
      object_id: ref("objects", "名称对应对象"),
      locale: text("语言", {
        required: true,
        enum: ["zh-CN", "en", "ja", "ko", "zh-TW"],
      }),
      name_type: text("standard 标准名称；nickname 人工收录昵称", {
        required: true,
        enum: ["standard", "nickname"],
      }),
      name: text("目标语言实有名称；未收录 NULL"),
      display_fallback: text("网页目前展示的备用名称；不计翻译覆盖"),
      translation_status: text("来源提供/本站整理/缺失/社区昵称", {
        required: true,
        enum: ["source", "curated", "missing", "community"],
      }),
      source_id: ref(
        "sources",
        "标准名称来源；昵称多来源另见 name_sources",
        false,
      ),
    },
  },
  name_sources: {
    description:
      "昵称与查证来源多对多关系，不把程序生成的“套/套装”搜索形式当作新昵称。",
    pk: ["name_id", "source_id"],
    columns: {
      name_id: ref("object_names", "昵称记录 ID"),
      source_id: ref("sources", "查证页面"),
      checked_date: text("原昵称库核对日期"),
    },
  },
  recipes: {
    description:
      "设计图或核验制作清单；scope 区分单部件与整套总量，不相互累加。",
    pk: ["recipe_id"],
    columns: {
      recipe_id: text("design: + 来源设计图 ID"),
      target_id: ref("objects", "制作目标"),
      design_id: integer("原始设计图 ID；整套汇总无设计图编号时为 NULL", {
        min: 1,
      }),
      scope: text("clothing 单部件；whole_outfit 原色整套总量", {
        required: true,
        enum: ["clothing", "whole_outfit"],
      }),
      checked_at: text("配方数量核对时间，非游戏推出日期"),
      source_published_date: text("来源页面更新日期"),
      access_method: text("读取方式", {
        enum: ["indexed_page", "direct_page", "manual"],
      }),
      note: text("适用口径及排除消耗"),
      output_quantity: integer("产出数量；未知保留 NULL", { min: 1 }),
      status: text("design_only 尚无原料；partial 不完整；complete 完整", {
        required: true,
        enum: ["design_only", "partial", "complete"],
      }),
      source_id: ref("sources", "设计图来源"),
    },
  },
  recipe_ingredients: {
    description:
      "配方的一项原料及数量；缺失不表示不消耗。整套汇总仅挂整套目标，不推测部件分摊。",
    pk: ["recipe_id", "material_id"],
    columns: {
      recipe_id: ref("recipes", "配方 ID"),
      material_id: ref("materials", "原料 ID"),
      quantity: real("所需数量，必须大于 0", {
        required: true,
        minExclusive: 0,
      }),
      source_id: ref("sources", "数量查证来源"),
    },
  },
  material_usage_mentions: {
    description: "材料资料提及某套装的关系，没有数量，也不代表整套共用配方。",
    pk: ["material_id", "outfit_id"],
    columns: {
      material_id: ref("materials", "材料 ID"),
      outfit_id: ref("outfits", "被提及套装"),
      source_id: ref("sources", "使用说明来源"),
    },
  },
  versions: {
    description:
      "来源的图鉴版本/季节名称；不从名称猜测版本号。当前目录版本 2.9.2 只记于快照。",
    pk: ["version_id"],
    columns: {
      version_id: text("来源季节名称的稳定键"),
      label: text("版本/季节标签", { required: true }),
      version_number: text("明确版本号；当前未采集"),
      source_id: ref("sources", "标签来源"),
    },
  },
  releases: {
    description:
      "一个来源实装标记一行；首日期仅为来源标记日期，保留测试版本和注释，不能解释为活动起止时间。",
    pk: ["release_id"],
    columns: {
      release_id: text("完整原文标签的稳定键"),
      label: text("原文实装标签", { required: true }),
      release_date: text("原文起始 YYYY.MM.DD 解析日期；缺失 NULL"),
      context: text("public_release/test_release；包含测试文字的条目单独标记", {
        required: true,
        enum: ["public_release", "test_release"],
      }),
      source_id: ref("sources", "实装标签来源"),
    },
  },
  object_releases: {
    description: "对象与来源季节、实装标记的关联。只记录实际已有字段。",
    pk: ["object_id"],
    columns: {
      object_id: ref("objects", "对象 ID"),
      version_id: ref("versions", "版本/季节标签", false),
      release_id: ref("releases", "实装标记", false),
      source_id: ref("sources", "该对象实装说明页面"),
    },
  },
  events: {
    description:
      "正式活动表；活动时间范围尚未采集，保留空表，不将版本发布日期当活动起止。",
    pk: ["event_id"],
    columns: {
      event_id: text("后续使用来源活动 ID 或稳定来源键"),
      name: text("活动名称", { required: true }),
      version_id: ref("versions", "关联版本", false),
      start_date: text("活动开始日期"),
      end_date: text("活动结束日期"),
      source_id: ref("sources", "活动资料来源"),
    },
  },
  event_objects: {
    description: "活动和对象的关联及获取条件，尚未采集。",
    pk: ["event_id", "object_id"],
    columns: {
      event_id: ref("events", "活动 ID"),
      object_id: ref("objects", "对象 ID"),
      obtain_condition: text("该活动内的获取条件"),
      source_id: ref("sources", "关联来源"),
    },
  },
  gathering_areas: {
    description: "材料的区域级说明，不是精确采集点。",
    pk: ["area_record_id"],
    columns: {
      area_record_id: text("材料 ID + 区域名称的稳定键"),
      material_id: ref("materials", "材料 ID"),
      region: text("区域名称", { required: true }),
      condition_text: text("已收录采集说明"),
      source_id: ref("sources", "区域攻略来源"),
      source_published_date: text("原攻略日期，不是本次核对时间"),
    },
  },
  gathering_points: {
    description:
      "精确采集点；目前无已核实坐标，空表。设计图宝箱坐标不混入材料点位。",
    pk: ["point_id"],
    columns: {
      point_id: text("地图来源原始点位 ID 的稳定映射"),
      material_id: ref("materials", "材料 ID"),
      region: text("区域", { required: true }),
      x: real("游戏地图 X 坐标", { required: true }),
      y: real("游戏地图 Y 坐标", { required: true }),
      coordinate_system: text("地图坐标系，不能当作地理经纬度", {
        required: true,
      }),
      condition_text: text("采集条件"),
      source_id: ref("sources", "点位来源"),
    },
  },
  source_assertions: {
    description:
      "现有网站与 BWIKI 对同一对象、字段的断言；BWIKI 仅用同类别唯一名称匹配。",
    pk: ["assertion_id"],
    columns: {
      assertion_id: text("对象+字段+来源+值的稳定键"),
      object_id: ref("objects", "对象 ID"),
      field: text("对比字段", {
        required: true,
        enum: ["rarity", "style", "obtain_text"],
      }),
      value: text("来源原值", { required: true }),
      source_id: ref("sources", "断言来源"),
      match_method: text("existing_id、unique_name 或 reviewed_guidance", {
        required: true,
        enum: ["existing_id", "unique_name", "reviewed_guidance"],
      }),
    },
  },
  source_conflicts: {
    description:
      "可比字段的来源差异候选；文字差异不直接认定谁错，也不自动覆盖。",
    pk: ["conflict_id"],
    columns: {
      conflict_id: text("对象+字段+断言对的稳定键"),
      object_id: ref("objects", "对象 ID"),
      field: text("差异字段", { required: true }),
      left_assertion_id: ref("source_assertions", "网站断言"),
      right_assertion_id: ref("source_assertions", "对照断言"),
      status: text("待人工复核", { required: true, enum: ["needs_review"] }),
    },
  },
  image_checks: {
    description:
      "每个对象的主图一行。只检查本地 PNG 文件，外链保持未检查，不把 URL 存在当作成功。",
    pk: ["object_id"],
    columns: {
      object_id: ref("objects", "对象 ID"),
      image_ref: text("主图路径/地址"),
      status: text("本地可读、损坏、缺失、外链未检查", {
        required: true,
        enum: [
          "local_verified",
          "local_invalid",
          "missing",
          "remote_unchecked",
          "remote_verified",
          "remote_failed",
        ],
      }),
      checked_at: text("实际本地检查时间；未检查为 NULL"),
      check_method: text("png_signature_dimensions 或 not_checked", {
        required: true,
      }),
      source_id: ref("sources", "图片资料来源"),
    },
  },
  snapshots: {
    description: "内容寻址快照；输入相同重复运行不会产生新数据快照。",
    pk: ["snapshot_id"],
    columns: {
      snapshot_id: text("输入、规范化表和模式内容散列生成的稳定键"),
      previous_snapshot_id: ref("snapshots", "前一快照", false),
      created_at: text("首次生成此快照的 UTC 时间", { required: true }),
      source_date: text("原目录整理日期"),
      catalog_version: text("资料来源目录版本，不代表所有对象推出版本"),
      catalog_generated_at: text("目录来源生成时刻"),
      object_count: integer("本快照对象数", { required: true, min: 0 }),
      is_baseline: integer("首次建档 1；后续 0", {
        required: true,
        enum: [0, 1],
      }),
      input_manifest_json: text("输入文件的 SHA-256 与字节数，JSON", {
        required: true,
      }),
    },
  },
  change_log: {
    description:
      "首快照记录 baseline；后续按表主键比较新增/修改/删除。网页更新不等于新增游戏内容。",
    pk: ["change_id"],
    columns: {
      change_id: text("快照+表+主键+操作的稳定键"),
      snapshot_id: ref("snapshots", "发生变动的快照"),
      table_name: text("发生变化的规范表名", { required: true }),
      row_key: text("表主键的 JSON；baseline 为 *", { required: true }),
      change_type: text("baseline/added/modified/deleted", {
        required: true,
        enum: ["baseline", "added", "modified", "deleted"],
      }),
      before_json: text("变更前行，首建档/新增为 NULL"),
      after_json: text("变更后行，首建档/删除为 NULL"),
    },
  },
};

// Extra planning fields retain the original tables and stable IDs.
schema.recipes.columns.scope.enum = [
  "clothing",
  "whole_outfit",
  "evolution",
  "renewal",
  "material",
];
schema.recipes.columns.scope.description =
  "部件、原色整套、独立进化步骤、焕新步骤或合成材料；不同粒度不累加";
schema.recipes.columns.source_type = text("数量来源类型", {
  enum: [
    "game_measured",
    "official_wiki",
    "community_wiki",
    "community_post",
    "guide_site",
    "catalog",
  ],
});
schema.recipes.columns.checked_precision = text("采集时刻精度", {
  enum: ["date", "timestamp"],
});
schema.recipes.columns.prerequisite =
  text("进化/焕新前置状态；不计入本步骤消耗");
schema.recipe_ingredients.columns.unit = text("数量单位：件或千克", {
  enum: ["count", "kg"],
});
schema.outfit_recipe_status = {
  description: "每个套装形态一行，构建自动生成；无检索结果不能标成未公开。",
  pk: ["outfit_id"],
  columns: {
    outfit_id: ref("outfits", "套装形态"),
    status: text("配方就绪、待录入、明确未公开、直接获取或形态消耗待补", {
      required: true,
      enum: [
        "complete",
        "missing_entry",
        "unpublished",
        "not_crafting",
        "evolution_pending",
        "renewal_pending",
        "variant_pending",
        "conflict",
      ],
    }),
    needs_recipe: integer("是否纳入待核对制作/形态消耗范围", {
      required: true,
      enum: [0, 1],
    }),
    recipe_id: ref("recipes", "可计算配方", false),
    reason: text("状态原因", { required: true }),
    source_id: ref("sources", "目录来源"),
    checked_at: text("数量或显式状态核对日期；自动目录分类保持 NULL"),
    evidence_url: text("显式状态断言证据；未公开必须有证据"),
  },
};
schema.material_guidance = {
  description: "每个已有获取指引的材料一行；未知区域不推测坐标。",
  pk: ["material_id"],
  columns: {
    material_id: ref("materials", "材料 ID"),
    kind: text("野外或非野外获取", {
      required: true,
      enum: ["gathering", "non_gathering"],
    }),
    text: text("已核对获取说明", { required: true }),
    source_id: ref("sources", "来源"),
    checked_at: text("核对时刻", { required: true }),
  },
};

export function validateTables(tables) {
  const issues = [],
    indexes = {};
  const add = (rule, table, key, message) =>
    issues.push({ severity: "error", rule, table, key, message });
  for (const [name, s] of Object.entries(schema)) {
    const seen = new Set();
    indexes[name] = new Set();
    for (const r of tables[name] || []) {
      const key = JSON.stringify(s.pk.map((k) => r[k]));
      if (seen.has(key)) add("unique", name, key, "重复主键");
      seen.add(key);
      if (s.pk.length === 1) indexes[name].add(r[s.pk[0]]);
      for (const [k, col] of Object.entries(s.columns)) {
        const v = r[k];
        if (
          (col.required || s.pk.includes(k)) &&
          (v === null || v === undefined || v === "")
        )
          add("required", name, key, k + " 必填");
        if (v == null) continue;
        if (
          (col.type === "INTEGER" && !Number.isInteger(v)) ||
          (col.type === "REAL" &&
            (typeof v !== "number" || !Number.isFinite(v))) ||
          (col.type === "TEXT" && typeof v !== "string")
        )
          add("type", name, key, k + " 类型非法");
        if (col.enum && !col.enum.includes(v))
          add("accepted_values", name, key, k + " 非法取值: " + v);
        if (
          (col.min !== undefined && v < col.min) ||
          (col.max !== undefined && v > col.max) ||
          (col.minExclusive !== undefined && v <= col.minExclusive)
        )
          add("range", name, key, k + " 超出范围");
        if (
          (k.endsWith("_date") || k === "release_date") &&
          typeof v === "string"
        ) {
          const date = new Date(v + "T00:00:00Z");
          if (
            !/^\d{4}-\d{2}-\d{2}$/.test(v) ||
            !Number.isFinite(date.getTime()) ||
            date.toISOString().slice(0, 10) !== v
          )
            add("date_format", name, key, k + " 不是有效 ISO 日期");
        }
      }
    }
  }
  for (const [name, s] of Object.entries(schema))
    for (const r of tables[name] || [])
      for (const [k, col] of Object.entries(s.columns))
        if (col.ref && r[k] != null && !indexes[col.ref]?.has(r[k]))
          add(
            "foreign_key",
            name,
            JSON.stringify(s.pk.map((p) => r[p])),
            k + " 缺少关联对象: " + r[k],
          );
  const outfits = new Map((tables.outfits || []).map((r) => [r.outfit_id, r]));
  for (const r of tables.recipes||[]) if(r.status==='complete'&&r.source_confidence==='low') add('recipe_inference_guard','recipes',r.recipe_id,'低置信推断不得进入完整可计算配方');
  const objects = new Map((tables.objects || []).map((r) => [r.object_id, r]));
  for (const [table, key, kind] of [
    ["outfits", "outfit_id", "outfits"],
    ["clothing", "clothing_id", "clothing"],
    ["materials", "material_id", "materials"],
    ["makeups", "makeup_id", "makeups"],
    ["eurekas", "eureka_id", "eurekas"],
  ])
    for (const row of tables[table] || [])
      if (objects.get(row[key])?.kind !== kind)
        add("object_kind", table, row[key], "对象类别与子表不一致");
  for (const f of tables.outfit_families || []) {
    const rows = (tables.outfits || []).filter(
        (r) => r.family_id === f.family_id,
      ),
      bases = rows.filter((r) => r.is_base === 1);
    if (
      bases.length !== 1 ||
      bases[0]?.outfit_id !== f.base_outfit_id ||
      rows.length !== f.form_count
    )
      add(
        "family_integrity",
        "outfit_families",
        f.family_id,
        "必须有一个原色，形态数与成员一致",
      );
  }
  for (const r of tables.outfits || [])
    if (
      (r.is_base === 1) !== (r.form_type === "base") ||
      !r.family_id ||
      !outfits.get(r.base_outfit_id)?.is_base ||
      outfits.get(r.base_outfit_id)?.family_id !== r.family_id
    )
      add(
        "family_integrity",
        "outfits",
        r.outfit_id,
        "套装原色/家族映射不一致",
      );
  for (const r of tables.recipes || [])
    if (
      r.status === "complete" &&
      (!(tables.recipe_ingredients || []).some(
        (i) => i.recipe_id === r.recipe_id,
      ) ||
        r.output_quantity == null)
    )
      add(
        "recipe_complete",
        "recipes",
        r.recipe_id,
        "完整配方需要原料行及产出数量",
      );
  for (const r of tables.recipes || []) {
    const target = objects.get(r.target_id);
    if (
      r.scope === "whole_outfit" &&
      (!outfits.get(r.target_id)?.is_base || r.output_quantity !== 1)
    )
      add("recipe_scope", "recipes", r.recipe_id, "整套汇总仅支持一套原色");
    if (r.scope === "clothing" && target?.kind !== "clothing")
      add("recipe_scope", "recipes", r.recipe_id, "部件配方必须关联服装部件");
    if (
      r.status === "complete" &&
      (!r.checked_at ||
        !Number.isFinite(Date.parse(r.checked_at)) ||
        !r.note ||
        !r.access_method)
    )
      add(
        "recipe_provenance",
        "recipes",
        r.recipe_id,
        "完整配方需核对时间、读取方式及口径",
      );
  }
  for (const r of tables.recipes || []) {
    if (
      r.scope === "material" &&
      objects.get(r.target_id)?.kind !== "materials"
    )
      add("recipe_scope", "recipes", r.recipe_id, "合成目标必须为材料");
    if (
      ["evolution", "renewal"].includes(r.scope) &&
      (!outfits.has(r.target_id) ||
        outfits.get(r.target_id).form_type !== r.scope ||
        !r.prerequisite)
    )
      add(
        "recipe_scope",
        "recipes",
        r.recipe_id,
        "形态消耗必须有对应形态及前置状态",
      );
  }
  const units = new Map();
  for (const i of tables.recipe_ingredients || []) {
    const r = (tables.recipes || []).find((r) => r.recipe_id === i.recipe_id);
    if (r?.status !== "complete") continue;
    const u = i.unit || "count";
    if (units.has(i.material_id) && units.get(i.material_id) !== u)
      add(
        "recipe_unit",
        "recipe_ingredients",
        i.material_id,
        "可计算材料单位冲突",
      );
    units.set(i.material_id, u);
    if (u === "count" && !Number.isInteger(i.quantity))
      add("recipe_unit", "recipe_ingredients", i.material_id, "件数必须为整数");
  }
  for (const r of tables.outfit_recipe_status || []) {
    if (r.status === "unpublished" && !r.evidence_url)
      add(
        "status_evidence",
        "outfit_recipe_status",
        r.outfit_id,
        "未公开状态必须有明确来源",
      );
    if (
      r.status === "complete" &&
      !(tables.recipes || []).some(
        (x) =>
          x.recipe_id === r.recipe_id &&
          x.target_id === r.outfit_id &&
          x.status === "complete",
      )
    )
      add(
        "status_recipe",
        "outfit_recipe_status",
        r.outfit_id,
        "完整状态必须关联完整配方",
      );
  }
  const edges = new Map();
  for (const r of tables.recipes || [])
    if (r.scope === "material" && r.status === "complete") {
      if (edges.has(r.target_id))
        add(
          "recipe_conflict",
          "recipes",
          r.target_id,
          "合成目标有多个有效配方",
        );
      edges.set(
        r.target_id,
        (tables.recipe_ingredients || [])
          .filter((i) => i.recipe_id === r.recipe_id)
          .map((i) => i.material_id),
      );
    }
  const visiting = new Set(),
    done = new Set();
  function visit(id) {
    if (visiting.has(id)) {
      add("recipe_cycle", "recipes", id, "材料树有循环");
      return;
    }
    if (done.has(id)) return;
    visiting.add(id);
    for (const child of edges.get(id) || []) visit(child);
    visiting.delete(id);
    done.add(id);
  }
  for (const id of edges.keys()) visit(id);
  for (const o of tables.outfits || [])
    if (
      o.is_base === 1 &&
      ["焕新", "一进", "二进", "满进"].includes(o.variation_label)
    )
      issues.push({
        severity: "error",
        rule: "semantic_form_claim",
        table: "outfits",
        key: o.outfit_id,
        message: "原色标记与来源明确附加形态说明冲突；不能仅凭单独分组判为原色",
      });
  return issues;
}

schema.objects.columns.obtain_source_id = ref(
  "sources",
  "获取途径的逐字段来源；独立材料指引保留其真实来源",
  false,
);
schema.source_assertions.columns.raw_value =
  text("原始断言；规范化品质比较仍保留原文");

schema.versions.columns.number_source_id = ref(
  "sources",
  "明确版本号的独立核对来源",
  false,
);
Object.assign(schema.events.columns, {
  start_datetime: text("精确开始时间；仅有更新后开放条件时保留NULL"),
  end_datetime: text("带时区的公告结束时间"),
  time_zone: text("来源公告时区，不与网站本地时区混淆"),
  start_condition: text(
    "如after_version_update；不以计划维护结束时刻冒充实际开启",
  ),
  date_basis: text("publisher_announced_schedule 公告排期，非实时开放状态"),
  checked_at: text("核对时间"),
});
schema.version_calendar = {
  description:
    "有官方公告依据的版本日历；只覆盖已核对的版本，不拿网站采集时间补齐。",
  pk: ["version_id"],
  columns: {
    version_id: ref("versions", "对应来源版本标签"),
    version_number: text("公告版本号", { required: true }),
    launch_date: text("公告推出日期；使用来源时区日期", { required: true }),
    time_zone: text("公告时区", { required: true }),
    date_basis: text("日期性质", {
      required: true,
      enum: ["publisher_announced_update_day"],
    }),
    source_id: ref("sources", "官方公告"),
    source_published_date: text("公告发布日期，与推出日期分开"),
    checked_at: text("核对日期时间"),
  },
};

schema.image_checks.columns.http_status = integer(
  "外链实测HTTP状态，未测时NULL",
  { min: 100, max: 599 },
);
schema.image_checks.columns.content_type = text(
  "响应Content-Type，不能只凭URL判断",
);

schema.evolution_requirements = {
  description: "进化所需的对象副本前置；不能把所需拥有数直接解释为实际消耗数。",
  pk: ["outfit_id", "required_object_id"],
  columns: {
    outfit_id: ref("outfits", "目标进化形态"),
    required_object_id: ref("objects", "所需原色或部件"),
    required_quantity: integer("前置拥有数", { required: true, min: 1 }),
    requirement_type: text("前置类型", {
      required: true,
      enum: ["owned_copies"],
    }),
    consumed_quantity: integer("实扣数量；未知NULL", { min: 0 }),
    source_id: ref("sources", "明确数量来源"),
    checked_at: text("来源核对时间", { required: true }),
  },
};
schema.evolution_observations = {
  description:
    "逐形态公开资料查询记录。分开记录材料、资源及属性上下文缺口；检索不到不证明未公开。",
  pk: ["outfit_id"],
  columns: {
    outfit_id: ref("outfits", "进化形态"),
    base_id: ref("outfits", "家族原色"),
    cost_status: text("步骤消耗完整性", {
      required: true,
      enum: ["complete", "pending_not_recorded", "explicit_unpublished"],
    }),
    attribute_status: text("同等级属性变化核对状态", {
      required: true,
      enum: ["partial_level_unverified", "pending", "verified"],
    }),
    before_scores: text("来源数字JSON；等级未核实不得相减"),
    after_scores: text("来源数字JSON；等级未核实不得相减"),
    before_source_id: ref("sources", "原色属性来源", false),
    after_source_id: ref("sources", "进化属性来源", false),
    checked_at: text("采集时间", { required: true }),
    note: text("上下文和局限", { required: true }),
  },
};

schema.recipes.columns.source_confidence = text('来源置信度；不是概率',{enum:['high','medium','low']});
schema.recipes.columns.source_title = text('具体页面/帖子标题');
schema.recipes.columns.current_game_measured = integer('是否当前版本游戏内真人实测；未知NULL',{enum:[0,1]});
schema.evolution_requirements.columns.requirement_type.enum.push('listed_input_copies');
schema.evolution_observations.columns.cost_status.enum.push('partial_confirmed');
export function createDDL() {
  const q = (s) => '"' + s + '"';
  return (
    "PRAGMA foreign_keys=ON;\n" +
    Object.entries(schema)
      .map(([name, s]) => {
        const cols = Object.entries(s.columns).map(([k, col]) => {
          let line =
            q(k) +
            " " +
            col.type +
            (col.required || s.pk.includes(k) ? " NOT NULL" : "");
          if (col.enum)
            line +=
              " CHECK (" +
              q(k) +
              " IN (" +
              col.enum
                .map((v) =>
                  typeof v === "number"
                    ? v
                    : "'" + v.replaceAll("'", "''") + "'",
                )
                .join(",") +
              "))";
          if (col.min !== undefined)
            line += " CHECK (" + q(k) + ">=" + col.min + ")";
          if (col.max !== undefined)
            line += " CHECK (" + q(k) + "<=" + col.max + ")";
          if (col.minExclusive !== undefined)
            line += " CHECK (" + q(k) + ">" + col.minExclusive + ")";
          if (col.ref)
            line +=
              " REFERENCES " +
              q(col.ref) +
              "(" +
              q(schema[col.ref].pk[0]) +
              ") DEFERRABLE INITIALLY DEFERRED";
          return line;
        });
        cols.push("PRIMARY KEY (" + s.pk.map(q).join(",") + ")");
        return (
          "CREATE TABLE " +
          q(name) +
          " (\n " +
          cols.join(",\n ") +
          "\n) STRICT;"
        );
      })
      .join("\n\n")
  );
}
