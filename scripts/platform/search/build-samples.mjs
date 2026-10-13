import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";
import M from "./search-model.cjs";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."),
  read = (p) => JSON.parse(fs.readFileSync(path.join(root, p), "utf8")),
  out = path.join(root, "../../data/dataset/search");
fs.mkdirSync(out, { recursive: true });
const hash = (v) =>
  crypto
    .createHash("sha256")
    .update(typeof v === "string" ? v : JSON.stringify(v))
    .digest("hex");
const catalog = read("../../data/input/catalog.json"),
  loc = read("../../data/input/display-locales.json"),
  objects = new Map(
    read("../../data/dataset/json/objects.json").map((o) => [o.object_id, o]),
  ),
  outfits = new Map(
    read("../../data/dataset/json/outfits.json").map((o) => [o.outfit_id, o]),
  ),
  sources = new Map(
    read("../../data/dataset/json/sources.json").map((s) => [s.source_id, s]),
  ),
  familyOf = new Map();
for (const o of outfits.values()) familyOf.set(o.outfit_id, o.family_id);
for (const r of read("../../data/dataset/json/outfit_clothing.json"))
  familyOf.set(r.clothing_id, outfits.get(r.outfit_id).family_id);
const terms = (v) =>
    [v, ...Object.values(loc.locales).map((p) => p.terms[v])].filter(Boolean),
  corpus = catalog.records
    .filter((r) => ["outfits", "clothing"].includes(r.kind))
    .map((r) => ({
      id: r.id,
      kind: r.kind,
      variant: r.variant,
      is_base: outfits.get(r.id)?.is_base || 0,
      family_id:
        familyOf.get(r.id) || "clothing-family:" + (r.group?.[0] || r.id),
      names: {
        "zh-CN": r.name,
        en: r.en,
        ...Object.fromEntries(
          Object.entries(loc.locales).map(([l, p]) => [
            l,
            p.names[r.id] || r.en || r.name,
          ]),
        ),
      },
      style: r.style,
      rarity: r.star,
      tags: r.tags,
      season: r.season,
      type: r.type,
      obtain: r.obtain,
      source_url: r.source,
      live_text: M.normalize(
        [
          r.name,
          r.en,
          ...Object.values(loc.locales).map((p) => p.names[r.id]),
          ...[
            r.type,
            r.style,
            r.obtain,
            r.season,
            r.variation,
            ...r.tags,
            ...(r.regions || []),
          ].flatMap(terms),
        ]
          .filter(Boolean)
          .join(" "),
      ),
    })),
  byId = new Map(corpus.map((r) => [r.id, r]));
const aliasRaw = read("../../src/assets/outfit-aliases.json"),
  aliases = aliasRaw.entries.map((e) => ({
    ...e,
    family_id: byId.get(e.outfitId).family_id,
  }));
// Authored test cases, not real user logs. Names and metadata are checked against the frozen source tables.
const plans = [
  ["o10349", "生于无暇", "typo"],
  ["o10352", "wanxiangdufusheng", "pinyin"],
  ["o10350", "隐于祷因", "typo"],
  ["o10161", "huayangmengying", "pinyin"],
  ["o10033", "天鹅童花", "typo"],
  ["o10062", "xinyuanjinqiangwei", "pinyin"],
  ["o10036", "满电行冬", "typo"],
  ["o10126", "dieyufengxi", "pinyin"],
  ["o10330", "龙隐云默间", "typo"],
  ["o10289", "wumingyiwuwo", "pinyin"],
  ["o10183", "古典乐张", "typo"],
  ["o10331", "yuanyuanchangxiangnian", "pinyin"],
  ["o10117", "缀夜希广", "typo"],
  ["o10178", "chiyubuyu", "pinyin"],
  ["o10173", "一念生方", "typo"],
];
const cases = [];
for (let i = 0; i < plans.length; i++) {
  const [id, mistyped, subtype] = plans[i],
    r = byId.get(id),
    raw = catalog.records.find((o) => o.id === id),
    a = aliases.find((a) => a.outfitId === id),
    formal = i % 3 === 2 ? byId.get(raw.related[0]) : r;
  const descMatches = corpus.filter(
      (x) =>
        x.kind === "outfits" &&
        x.is_base &&
        x.rarity === r.rarity &&
        x.style === r.style &&
        x.season === r.season &&
        x.type === r.type &&
        x.obtain === r.obtain &&
        r.tags.every((tag) => x.tags.includes(tag)),
    ),
    description = `找${r.rarity}星${r.style}风格的原色${r.type}，标签有${r.tags.join("和")}，收录在${r.season}，获取方式是${r.obtain}`;
  const options = [
    [
      "formal",
      formal.names["zh-CN"],
      [formal.id],
      "zh-CN",
      "标准名称与对象 ID 来源字段一致",
    ],
    [
      "nickname",
      a.aliases[0],
      [id],
      "zh-CN",
      "来源昵称库核对；默认期望原色，进化形态不替代原色答案",
    ],
    [
      "typo_pinyin",
      mistyped,
      [id],
      "zh-CN",
      `策划的${subtype === "pinyin" ? "无声调拼音" : "单字错字"}改写；人工需确认读音或歧义`,
    ],
    [
      "partial",
      r.names["zh-CN"].slice(0, Math.max(2, r.names["zh-CN"].length - 2)),
      [id],
      "zh-CN",
      "不完整名称表达该家族；若人审发现其他有效答案须追加",
    ],
    [
      "description",
      description,
      descMatches.map((x) => x.id),
      "zh-CN",
      "所有条件来自目录字段；原色限定，所有满足条件的套装均计相关",
    ],
    [
      "multilingual",
      r.names[["en", "ja", "ko", "zh-TW"][i % 4]],
      [id],
      ["en", "ja", "ko", "zh-TW"][i % 4],
      "对应语种来源名称；不要求查询语言与界面语言一致",
    ],
  ];
  for (const [type, query, expected_ids, language, reason] of options) {
    const target = type === "formal" ? formal : r;
    cases.push({
      query_id: "q" + String(cases.length + 1).padStart(3, "0"),
      group_id: r.family_id,
      type,
      subtype: type === "typo_pinyin" ? subtype : null,
      query,
      language,
      expected_ids,
      answerable: true,
      label_rationale: reason,
      evidence: {
        urls: [
          target.source_url,
          ...(type === "nickname" ? a.sources.map((s) => s.url) : []),
        ],
        object_ids: expected_ids,
        fields:
          type === "description"
            ? {
                rarity: r.rarity,
                style: r.style,
                tags: r.tags,
                season: r.season,
                type: r.type,
                obtain: r.obtain,
              }
            : type === "multilingual"
              ? { locale: language }
              : {},
      },
      annotation_origin: "source_checked_ai_candidate",
      human_review: { status: "pending", reviewer: null, reviewed_at: null },
    });
  }
}
const negatives = [
  [
    "missing-name",
    [
      ["formal", "精灵颂歌"],
      ["typo_pinyin", "jinglingsongge"],
    ],
    "当前固定图鉴名称与昵称索引没有该对象；不能推断游戏永久不存在",
  ],
  [
    "fiction-title",
    [
      ["formal", "月球宇航喵套"],
      ["multilingual", "Moonwalk Momo Astronaut"],
    ],
    "策划的不存在名称；需人工确认资料范围",
  ],
  [
    "fiction-material",
    [
      ["nickname", "量子星河机甲套"],
      ["partial", "量子星河机甲"],
    ],
    "不存在的套装家族，两个改写同组",
  ],
  [
    "impossible-condition",
    [
      ["description", "1星生于无瑕原色套装"],
      ["description", "生于无瑕原色，品质要求必须是1星"],
    ],
    "指定原色实际为5星；矛盾约束不应被忽略",
  ],
  [
    "foreign-fiction",
    [
      ["multilingual", "幻の宇宙ねこ機甲セット"],
      ["multilingual", "가상의 우주 고양이 기갑 세트"],
    ],
    "策划不存在的宇宙猫机甲名称；同一意图的日语和韩语归为一组",
  ],
];
for (const [group, qs, reason] of negatives)
  for (const [type, query] of qs)
    cases.push({
      query_id: "q" + String(cases.length + 1).padStart(3, "0"),
      group_id: "negative:" + group,
      type,
      subtype: null,
      query,
      language:
        type === "multilingual"
          ? /가상/.test(query)
            ? "ko"
            : /幻/.test(query)
              ? "ja"
              : "en"
          : "zh-CN",
      expected_ids: [],
      answerable: false,
      label_rationale: reason,
      evidence: {
        urls: [],
        object_ids: [],
        fields: { negative_scope: "frozen outfit-and-clothing catalog only" },
      },
      annotation_origin: "source_checked_ai_candidate",
      human_review: { status: "pending", reviewer: null, reviewed_at: null },
    });
const seed = "miraland-search-v1-20261009",
  positiveGroups = [
    ...new Set(cases.filter((q) => q.answerable).map((q) => q.group_id)),
  ].sort((a, b) => hash(seed + "|" + a).localeCompare(hash(seed + "|" + b))),
  negativeGroups = [
    ...new Set(cases.filter((q) => !q.answerable).map((q) => q.group_id)),
  ].sort((a, b) => hash(seed + "|" + a).localeCompare(hash(seed + "|" + b))),
  testGroups = new Set([
    ...positiveGroups.slice(0, 4),
    ...negativeGroups.slice(0, 3),
  ]);
const contextNegative = "negative:impossible-condition",
  contextFamily = "family:o10349",
  otherNegatives = negativeGroups.filter((g) => g !== contextNegative);
for (const group of negativeGroups) testGroups.delete(group);
if (testGroups.has(contextFamily)) {
  testGroups.add(contextNegative);
  for (const group of otherNegatives.slice(0, 2)) testGroups.add(group);
} else for (const group of otherNegatives.slice(0, 3)) testGroups.add(group);
for (const q of cases) q.split = testGroups.has(q.group_id) ? "test" : "dev";
const snapshot = read("../../data/dataset/quality-report.json").snapshot
    .snapshot_id,
  manifest = {
    schema_version: 1,
    benchmark_version: "search-v1",
    created_at: new Date().toISOString(),
    catalog_snapshot_id: snapshot,
    seed,
    corpus_scope:
      "all recorded outfit and clothing forms; nickname relevance prefers base",
    corpus_count: corpus.length,
    query_count: cases.length,
    split: {
      dev: 70,
      test: 30,
      unit: "outfit family / negative intent group",
      positive_groups: 15,
      negative_groups: 5,
      test_positive_groups: 4,
      test_negative_groups: 3,
    },
    annotation_status: "pending_human_review",
    source_note:
      "Authored candidate queries, not sampled user logs. AI source verification is not human adjudication.",
    corpus_sha256: hash(corpus),
    aliases_sha256: hash(aliases),
    cases_sha256: hash(cases),
  };
if (fs.existsSync(path.join(out, "manifest.json"))) {
  const existing = JSON.parse(fs.readFileSync(path.join(out, "manifest.json"))),
    lock = JSON.parse(fs.readFileSync(path.join(out, "baseline-lock.json")));
  if (
    existing.corpus_sha256 !== hash(corpus) ||
    existing.aliases_sha256 !== hash(aliases) ||
    existing.cases_sha256 !== hash(cases) ||
    lock.model_sha256 !==
      hash(fs.readFileSync(path.join(root, "search/search-model.cjs"), "utf8"))
  )
    throw Error(
      "Frozen benchmark differs. Preserve this version and create a separately versioned benchmark; do not overwrite held-out labels.",
    );
  console.log(
    "Frozen benchmark unchanged; original manifest, split and lock preserved.",
  );
  process.exit(0);
}
const save = (file, v) =>
  fs.writeFileSync(path.join(out, file), JSON.stringify(v, null, 2));
save("corpus.json", corpus);
save("aliases.json", aliases);
save("queries.candidates.json", cases);
save(
  "dev.json",
  cases.filter((q) => q.split === "dev"),
);
save(
  "test.json",
  cases.filter((q) => q.split === "test"),
);
save("manifest.json", manifest);
// Freeze baseline implementation before evaluation. No test-label-based parameters.
save("baseline-lock.json", {
  locked_at: new Date().toISOString(),
  model_sha256: hash(
    fs.readFileSync(path.join(root, "search/search-model.cjs"), "utf8"),
  ),
  methods: {
    A: "Normalized full official names across five locales only",
    B: "Existing Chinese nickname library and existing suffix/traditional forms only",
    C: "A union B; formal before nickname; base before variants; outfit before clothing; stable ID tie-break",
    L: "Existing website substring + translated metadata + nicknames, same restricted corpus; supplemental comparator",
  },
  parameters: {
    new_nicknames_added: 0,
    fuzzy_matching: false,
    pinyin_matching: false,
    semantic_matching: false,
  },
  manifest_sha256: hash(manifest),
});
console.log(
  "Prepared candidates:",
  cases.length,
  "dev",
  cases.filter((q) => q.split === "dev").length,
  "test",
  cases.filter((q) => q.split === "test").length,
  "corpus",
  corpus.length,
  "human-approved 0",
);
