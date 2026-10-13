import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";
import os from "node:os";
import { performance } from "node:perf_hooks";
import M from "./search-model.cjs";
import { validateBenchmark } from "./validate.mjs";
const dir = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../../data/dataset/search",
  ),
  read = (p) => JSON.parse(fs.readFileSync(path.join(dir, p), "utf8")),
  args = process.argv.slice(2),
  mode = args.includes("--mode")
    ? args[args.indexOf("--mode") + 1]
    : "official",
  reviewFile = args.includes("--reviews")
    ? path.resolve(args[args.indexOf("--reviews") + 1])
    : null,
  sha = (v) =>
    crypto
      .createHash("sha256")
      .update(typeof v === "string" ? v : JSON.stringify(v))
      .digest("hex");
if (!["official", "provisional"].includes(mode))
  throw Error("mode must be official or provisional");
const manifest = read("manifest.json"),
  lock = read("baseline-lock.json"),
  corpus = read("corpus.json"),
  aliases = read("aliases.json"),
  cases = read("queries.candidates.json");
if (sha(manifest) !== lock.manifest_sha256)
  throw Error("Frozen manifest does not match the baseline lock");
if (
  sha(corpus) !== manifest.corpus_sha256 ||
  sha(aliases) !== manifest.aliases_sha256 ||
  sha(cases) !== manifest.cases_sha256
)
  throw Error(
    "Dataset hash mismatch; create a new version instead of silently changing test data",
  );
if (
  sha(
    fs.readFileSync(new URL("./search-model.cjs", import.meta.url), "utf8"),
  ) !== lock.model_sha256
)
  throw Error(
    "Baseline implementation differs from frozen version; explicitly version and freeze the new method before a new test run",
  );
if (
  JSON.stringify(read("dev.json")) !==
    JSON.stringify(cases.filter((q) => q.split === "dev")) ||
  JSON.stringify(read("test.json")) !==
    JSON.stringify(cases.filter((q) => q.split === "test"))
)
  throw Error("Derived split files differ from the frozen query split");
if (reviewFile) {
  const reviews = JSON.parse(fs.readFileSync(reviewFile));
  if (reviews.cases_sha256 !== manifest.cases_sha256)
    throw Error("Human review belongs to a different dataset");
  if (!Array.isArray(reviews.annotations)) throw Error("Invalid reviews");
  const ids = new Set();
  for (const a of reviews.annotations) {
    if (ids.has(a.query_id)) throw Error("Duplicate review");
    ids.add(a.query_id);
    const q = cases.find((q) => q.query_id === a.query_id);
    if (!q) throw Error("Unknown reviewed query");
    if (
      !["approved", "rejected"].includes(a.status) ||
      !a.reviewer?.trim() ||
      !Number.isFinite(Date.parse(a.reviewed_at))
    )
      throw Error("Invalid human review metadata");
    if (a.expected_ids !== undefined) {
      q.expected_ids = a.expected_ids;
      q.answerable = a.expected_ids.length > 0;
    }
    q.human_review = {
      status: a.status,
      reviewer: a.reviewer,
      reviewed_at: a.reviewed_at,
      comment: a.comment || "",
    };
  }
}
const checks = validateBenchmark(corpus, aliases, cases);
if (mode === "official")
  validateBenchmark(corpus, aliases, cases, { requireHuman: true });
const buildAt = performance.now(),
  engine = M.createEngine(corpus, aliases),
  build_ms = performance.now() - buildAt,
  methods = ["A", "B", "C", "L"],
  types = [
    "formal",
    "nickname",
    "typo_pinyin",
    "partial",
    "description",
    "multilingual",
  ];
for (let n = 0; n < 5; n++)
  for (const m of methods) for (const q of cases) engine.search(q.query, m);
const measurements = new Map(
  cases.map((q) => [
    q.query_id,
    Object.fromEntries(methods.map((m) => [m, []])),
  ]),
);
for (let round = 0; round < 30; round++) {
  const order = cases
    .slice()
    .sort((a, b) =>
      sha(round + "|" + a.query_id).localeCompare(
        sha(round + "|" + b.query_id),
      ),
    );
  for (const q of order)
    for (const m of [
      ...methods.slice(round % 4),
      ...methods.slice(0, round % 4),
    ]) {
      const at = performance.now();
      engine.search(q.query, m);
      measurements.get(q.query_id)[m].push(performance.now() - at);
    }
}
const results = Object.fromEntries(
  methods.map((m) => [
    m,
    cases.map((q) => {
      const found = engine.search(q.query, m),
        durations = measurements.get(q.query_id)[m];
      return {
        query_id: q.query_id,
        type: q.type,
        split: q.split,
        group_id: q.group_id,
        ...M.scoreCase(q, found),
        response_ms: durations.reduce((a, b) => a + b, 0) / durations.length,
        predictions: found.map((r) => r.id),
        match_types: found.slice(0, 5).map((r) => r.match_type),
      };
    }),
  ]),
);
const report = {
  schema_version: 1,
  mode,
  annotation_status:
    mode === "official"
      ? "human_reviewed_gold"
      : "provisional_not_human_reviewed",
  generated_at: new Date().toISOString(),
  manifest,
  checks,
  baseline_lock: lock,
  review_file_sha256: reviewFile
    ? sha(fs.readFileSync(reviewFile, "utf8"))
    : null,
  environment: {
    node: process.version,
    os: os.platform(),
    cpu: os.cpus()[0]?.model,
    index_build_ms: build_ms,
    warmup_rounds: 5,
    timing_rounds: 30,
    timing_scope:
      "warm in-memory retrieval, including result materialization and ranking; excludes index construction, file loading, network and DOM rendering",
  },
  denominators: {
    hit1_hit5_mrr:
      "answerable queries only; no answer returned is a zero on positives",
    no_answer_accuracy: "unanswerable queries only; zero results is correct",
    response_ms:
      "all queries, arithmetic mean of 30 repeated warmed-up measurements per query",
  },
  splits: {},
};
for (const split of ["dev", "test", "all"])
  report.splits[split] = Object.fromEntries(
    methods.map((m) => {
      const rows = results[m].filter(
        (r) => split === "all" || r.split === split,
      );
      return [
        m,
        {
          overall: M.summarize(rows),
          by_type: Object.fromEntries(
            types.map((t) => [
              t,
              M.summarize(rows.filter((r) => r.type === t)),
            ]),
          ),
        },
      ];
    }),
  );
const dirOut = path.join(dir, mode);
fs.mkdirSync(dirOut, { recursive: true });
if (mode === "official") {
  fs.writeFileSync(
    path.join(dirOut, "queries.gold.json"),
    JSON.stringify(cases, null, 2),
  );
  fs.copyFileSync(reviewFile, path.join(dirOut, "human-reviews.json"));
  for (const split of ["dev", "test"])
    fs.writeFileSync(
      path.join(dirOut, "gold-" + split + ".json"),
      JSON.stringify(
        cases.filter((q) => q.split === split),
        null,
        2,
      ),
    );
}
fs.writeFileSync(
  path.join(dirOut, "report.json"),
  JSON.stringify(report, null, 2),
);
for (const [m, rows] of Object.entries(results))
  fs.writeFileSync(
    path.join(dirOut, "predictions-" + m + ".json"),
    JSON.stringify(rows, null, 2),
  );
const tableRows = [];
for (const [split, methodsOut] of Object.entries(report.splits))
  for (const [method, s] of Object.entries(methodsOut))
    for (const [type, row] of [
      ["overall", s.overall],
      ...Object.entries(s.by_type),
    ])
      tableRows.push({ mode, split, method, type, ...row });
const csvCell = (v) => '"' + String(v ?? "").replaceAll('"', '""') + '"',
  keys = Object.keys(tableRows[0]);
fs.writeFileSync(
  path.join(dirOut, "metrics.csv"),
  "\uFEFF" +
    [
      keys.join(","),
      ...tableRows.map((r) => keys.map((k) => csvCell(r[k])).join(",")),
    ].join("\r\n"),
);
const answerCounts = {
  total: cases.filter((q) => q.answerable).length,
  dev: cases.filter((q) => q.split === "dev" && q.answerable).length,
  test: cases.filter((q) => q.split === "test" && q.answerable).length,
};
const names = {
    formal: "正式名称",
    nickname: "昵称",
    typo_pinyin: "错字 / 拼音",
    partial: "不完整名称",
    description: "描述性",
    multilingual: "多语言",
  },
  percent = (n) => (n === null ? "未评估" : (n * 100).toFixed(2) + "%"),
  number = (n) => (n === null ? "未评估" : n.toFixed(4));
let md =
  "# 智能搜索基准评估报告\n\n" +
  (mode === "official"
    ? "经人工审核的 Gold Standard。"
    : "**本报告为待人工确认的候选标注结果，不能声称为人工审定 Gold Standard。**") +
  "\n\n样本：" +
  cases.length +
  " 条策划查询，" +
  answerCounts.total +
  " 条有答案、" +
  (cases.length - answerCounts.total) +
  " 条无答案。不是用户日志，不代表实际查询频率。覆盖六类查询，主要围绕昵称库中的 15 个套装家族，存在选择偏差。\n\n开发集 70 条，测试集 30 条；15 个正例家族组每组 6 条，5 个无答案意图组每组 2 条。按家族 / 意图整体划分：开发集 11 个正例家族与 2 个无答案组（实际标签 " +
  answerCounts.dev +
  "+" +
  (checks.dev - answerCounts.dev) +
  "），测试集 4 个原始正例家族与 3 个边界组（实际标签 " +
  answerCounts.test +
  "+" +
  (checks.test - answerCounts.test) +
  "）。同名、昵称、改写、跨语言和家族关联部件不跨集合；校验同时检查相关答案家族交集、归一化查询重复。固定种子：" +
  manifest.seed +
  "。测试集没有用于改变昵称库、排序或其他参数。\n\n";
md +=
  "## 基准定义与当前网页逻辑\n\nA：五语正式名称归一化后完全匹配。B：既有中文昵称库完全匹配，沿用已有“套 / 套装 / 套裝”及繁体形式。C：A 与 B 去重并集，正式名优先，随后原色优先、套装优先、稳定 ID 同分排序。统一检索 8734 条套装与部件形态；原色、进化与焕新为不同 ID。\n\n实际网页还支持子串及翻译标签，并按资料原始顺序排同分，因此 A 不等于现有网页的完整行为。L 是同一候选范围内的现有逻辑补充对照，不冒充 A/B/C。浏览器另检查 L 与当前网页过滤后的结果一致。\n\n";
md +=
  "## 指标与计时\n\nHit@1、Hit@5、MRR 的分母为有答案查询。MRR 取第一个相关结果倒数，排名使用完整返回列表；若完全未命中取 0。无答案识别率只在无答案查询上计算；对应类型没有负例显示未评估。延迟为每查询预热后 30 次内存检索耗时的均值，再对查询等权平均；索引构建、网络和网页渲染不计入。没有通过测量低延迟来推断真实用户端到端耗时。\n\n";
const header =
    "| 方法 | 有答案 N | 无答案 N | Hit@1 | Hit@5 | MRR | 无答案识别率 | 平均 ms |\n|---|---:|---:|---:|---:|---:|---:|---:|\n",
  line = (m, s) =>
    `| ${m} | ${s.answerable_n} | ${s.no_answer_n} | ${percent(s.hit1)} | ${percent(s.hit5)} | ${number(s.mrr)} | ${percent(s.no_answer_accuracy)} | ${number(s.mean_response_ms)} |`;
for (const split of ["dev", "test", "all"]) {
  md +=
    "## " +
    { dev: "开发集", test: "独立测试集", all: "全样本参考" }[split] +
    "\n\n" +
    header +
    methods.map((m) => line(m, report.splits[split][m].overall)).join("\n") +
    "\n\n";
  for (const type of types)
    md +=
      "### " +
      names[type] +
      "\n\n" +
      header +
      methods
        .map((m) => line(m, report.splits[split][m].by_type[type]))
        .join("\n") +
      "\n\n";
}
md +=
  "## 结果解释与后续方向\n\n严格 A 只能处理完整正式名，B 只能处理已收录昵称；C 提高两种精确入口的联合覆盖，但未提供错字、拼音、残缺名或语义描述能力。不得把拒绝所有复杂查询所得的高无答案识别率当作语义理解优秀；同时查看正例拒答率及 Hit/MRR。描述性答案来自有来源字段的约束，尚不能覆盖“粉色、蝴蝶元素”等未结构化视觉属性。\n\n下一步依次在开发集研究拼音与编辑距离候选、名称前缀与切词、属性条件检索和语义候选；必须先冻结新方法，再运行测试集。15 个家族、测试集仅 4 个正例家族，指标变化可能由少量样本引起，不做总体玩家偏好或显著性结论。扩大来源、部件、歧义昵称与难负例后，应重新版本化采样及家族划分，不能按旧测试错误专门补词再声称泛化改善。\n\n## 人工审核与复现\n\n逐条检查 queries.candidates.json 的 query、expected_ids、理由及来源，填写 human_review 的审核者、时刻与状态。页面可导出本地审核 JSON；不得把 AI 核对改称真人审核。官方模式要求全部 100 条通过实际人审，拒绝未审样本及跨集合答案家族。\n\n运行 `node scripts/platform/search/evaluate.mjs --mode provisional` 重现当前候选结果；真正完成审核后运行 `node scripts/platform/search/evaluate.mjs --mode official --reviews /绝对路径/reviews.json`。预测、逐类型指标 CSV、数据与算法 SHA-256、环境和计时范围全部保留。算法和样本哈希变化会拒绝沿用旧锁。\n\n数据快照：" +
  manifest.catalog_snapshot_id +
  "\n";
fs.writeFileSync(path.join(dirOut, "基准评估报告.md"), md);
fs.writeFileSync(
  path.join(dir, "review-template.json"),
  JSON.stringify(
    {
      schema_version: 1,
      cases_sha256: manifest.cases_sha256,
      annotations: cases.map((q) => ({
        query_id: q.query_id,
        status: "pending",
        reviewer: null,
        reviewed_at: null,
        expected_ids: q.expected_ids,
        comment: "",
      })),
    },
    null,
    2,
  ),
);
console.log(
  JSON.stringify(
    {
      mode,
      checks,
      test: Object.fromEntries(
        methods.map((m) => [m, report.splits.test[m].overall]),
      ),
    },
    null,
    2,
  ),
);
