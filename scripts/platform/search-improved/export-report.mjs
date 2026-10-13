import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."),
  dir = path.join(root, "../../data/dataset/search-improved"),
  r = JSON.parse(fs.readFileSync(path.join(dir, "comparison.json"))),
  pct = (v) => (v === null ? "—" : (v * 100).toFixed(2) + "%"),
  fix = (v) => (v === null ? "—" : v.toFixed(4)),
  names = {
    formal: "正式名",
    nickname: "昵称",
    typo_pinyin: "错字/拼音",
    partial: "不完整名称",
    description: "描述性",
    multilingual: "多语言",
  },
  methods = ["A", "B", "C", "D", "E", "F", "L"],
  header =
    "| 方法 | 正例 N | 负例 N | Hit@1 | Hit@5 | MRR | 无答案识别率 | 平均 ms |\n|---|---:|---:|---:|---:|---:|---:|---:|\n",
  row = (m, s) =>
    `| ${m} | ${s.answerable_n} | ${s.no_answer_n} | ${pct(s.hit1)} | ${pct(s.hit5)} | ${fix(s.mrr)} | ${pct(s.no_answer_accuracy)} | ${fix(s.mean_response_ms)} |`;
let md =
  "# 智能搜索改进与对比评估 · Step 6\n\n**当前为同一批 AI 辅助候选标签的对比，实际人审数为 0；不是正式人工 Gold，也不能推断全部玩家效果。**\n\n100 条样本保留原 70/30 家族与意图分组，测试集 24 正例、6 负例（正例仅4个套装家族）。没有改查询、答案、原 A/B/C 或测试划分。此前测试样本已公开；本轮调参脚本只读取 dev.json，不据测试表现修改方法。所有方法、拒答规则、权重和消融在最终测试前冻结，推荐型号在开发阶段选定。\n\n";
md +=
  "## 方法与公式\n\nA/B/C 沿用原始冻结方法；L 为旧网页子串/标签检索，不是当前已部署方法。D：完整名称/昵称、繁简及大小写/空格归一化、无声调拼音、同音字辅助、前缀和有界 Levenshtein。为避免大量误返，模糊相似度门槛 " +
  r.release.configuration.name_min +
  "；短且非同音的误字仍可能被拒答。E：关键词加权的结构化属性语义检索，支持品质、主风格、部位、标签、版本图鉴、获取方式与有来源颜色/元素，不使用神经向量嵌入。F：D 与 E 多信号融合，品质/风格/类别等约束为硬过滤，不能用高分抵消条件冲突。\n\n`S = 0.75 × 名称相似度 + 0.60 × 昵称相似度 + 0.60 × 属性关键词覆盖分 + 0.04 × 原色/套装先验`\n\n关键词使用字段权重与 IDF；明确条件须全部满足，覆盖分归一化。最低可接受词项置信度或完整属性条件成立后，还须 S ≥ 0.40。不满门槛就返回空结果，绝不固定输出最高分。108 组权重/门槛只在开发集比较，目标为 MRR + 0.25 Hit@5 + 0.5 无答案识别率；并以未缓存开发查询 p95 <50ms 作为上线门槛。\n\n";
md +=
  "## 特征来源与覆盖\n\n8734 个原套装/部件形态在相同候选语料中比较；特征构建只读取语料、原目录与公开来源，没有读取开发或测试答案来造标签。已有风格、品质、类别、标签等沿用原字段。补充 " +
  r.feature_audit.with_colors +
  " 个部件的社区 Wiki 颜色分类（约 " +
  ((r.feature_audit.with_colors / 7979) * 100).toFixed(2) +
  "% 部件覆盖），逐条保存 URL、日期与匹配 ID。不从名称猜颜色，不将某个部件颜色赋给整套，也不把某形态的颜色赋给进化。明确图案元素证据仅 " +
  r.feature_audit.with_verified_elements +
  " 条；叙述中提到蝴蝶单列 description_mentions，不当已验证视觉图案。\n\n“粉色、甜美、有蝴蝶元素的裙子”可能因元素标签不足而无结果；这不表示游戏没有该类衣服。当前冻结测试的描述题只涉及结构化字段，无法证明视觉描述检索的完整能力。\n\n";
md +=
  "## 测试集总体\n\n" +
  header +
  methods.map((m) => row(m, r.metrics.test[m].overall)).join("\n") +
  "\n\n";
const base = r.metrics.test.C.overall,
  final = r.metrics.test.F.overall,
  legacy = r.metrics.test.L.overall;
md +=
  "F 相对 C：Hit@1 +" +
  ((final.hit1 - base.hit1) * 100).toFixed(2) +
  " 个百分点，Hit@5 +" +
  ((final.hit5 - base.hit5) * 100).toFixed(2) +
  " 个百分点，MRR +" +
  (final.mrr - base.mrr).toFixed(4) +
  "；相对旧网页 L：Hit@1 +" +
  ((final.hit1 - legacy.hit1) * 100).toFixed(2) +
  " 个百分点。无答案率 " +
  pct(final.no_answer_accuracy) +
  "，对应 6/6 个固定负例，不意味着对任何未知问题都能完美拒答。\n\n";
md += "## 按查询类型\n\n";
for (const [type, label] of Object.entries(names))
  md +=
    "### " +
    label +
    "\n\n" +
    header +
    methods.map((m) => row(m, r.metrics.test[m].by_type[type])).join("\n") +
    "\n\n";
md +=
  "## 提升与退化\n\n| 类型 | C Hit@1 | D Hit@1 | E Hit@1 | F Hit@1 | F − C（百分点） |\n|---|---:|---:|---:|---:|---:|\n" +
  Object.entries(names)
    .map(([k, n]) => {
      const s = r.metrics.test;
      return `| ${n} | ${pct(s.C.by_type[k].hit1)} | ${pct(s.D.by_type[k].hit1)} | ${pct(s.E.by_type[k].hit1)} | ${pct(s.F.by_type[k].hit1)} | ${((s.F.by_type[k].hit1 - s.C.by_type[k].hit1) * 100).toFixed(2)} |`;
    })
    .join("\n") +
  "\n\nD 的主要贡献是拼音/同音和不完整名称，E 的主要贡献是有来源属性描述；F 将这些入口合并。正式名、昵称和多语言精确入口维持原有命中，当前30条测试未观察到准确率退化。每类型正例仅4条，一个样本就会改变25个百分点，不能做总体或显著性推断。\n\nF 平均 " +
  fix(final.mean_response_ms) +
  "ms，比严格 C 查表 " +
  fix(base.mean_response_ms) +
  "ms 慢约 " +
  (final.mean_response_ms / base.mean_response_ms).toFixed(1) +
  " 倍，绝对增加 " +
  fix(final.mean_response_ms - base.mean_response_ms) +
  "ms；相对旧 L 平均 " +
  fix(legacy.mean_response_ms) +
  "ms 更快。索引构建 " +
  r.environment.index_build_ms.toFixed(1) +
  "ms 单独计量，首次冷启动不等同于预热响应。测试为无查询结果缓存的内存检索，不含加载、网络或网页渲染。不能拿亚毫秒时钟噪声作精细速度优势结论。\n\n";
md +=
  "## 消融与机制解释\n\n| 冻结变体 | 测试 Hit@1 | 相对 F 下降（百分点） |\n|---|---:|---:|\n" +
  r.release.ablation_variants
    .map((v) => {
      const hit = r.metrics.test[v.name].overall.hit1;
      return `| ${v.name} | ${pct(hit)} | ${((final.hit1 - hit) * 100).toFixed(2)} |`;
    })
    .join("\n") +
  "\n\n同一冻结权重下，去掉拼音、前缀或属性匹配各损失4个正例，支持它们解决对应查询类型的机制解释。去掉编辑距离没有额外损失，因此不能声称本批测试已经证明 Levenshtein 有独立增益；它用于其他非同音小错误的候选生成，仍需独立人工案例测试。以上是实现层消融，不是随机化玩家研究，也不证明真实使用中的一般因果效果。\n\n";
md +=
  "## 开发与复现\n\n" +
  header +
  methods.map((m) => row(m, r.metrics.dev[m].overall)).join("\n") +
  "\n\n推荐 F 已在测试前依开发指标和响应门槛决定。部署复用同一代码、配置和特征，搜索栏保留分页/筛选，并把匹配昵称、拼音、名称片段及属性依据显示给用户；暖暖对话使用同一搜索入口，保留原有追问与未收录说明。\n\n锁文件 `release-lock.json` 保存模型/特征/昵称/依赖与开发输入哈希，读入文件清单不含 test.json。模型开发历史只包含开发阶段版本。`comparison.json` 保留本轮完整指标、预测及解释；最终评测已有结果时不覆写，不在看到测试表现后再改权。\n\n复现代码见 `search-improved/README.md`。当前 Gold 人审未完成，需真实审核及更广泛的新独立查询，才能生成可信的正式结论。\n";
fs.writeFileSync(path.join(dir, "改进搜索对比报告.md"), md);
const rows = [];
for (const split of ["dev", "test", "all"])
  for (const method of Object.keys(r.metrics[split]))
    for (const [type, s] of [
      ["overall", r.metrics[split][method].overall],
      ...Object.entries(r.metrics[split][method].by_type),
    ])
      rows.push({
        annotation_status: r.annotation_status,
        split,
        method,
        type,
        ...s,
      });
const keys = Object.keys(rows[0]),
  cell = (v) => '"' + String(v ?? "").replaceAll('"', '""') + '"';
fs.writeFileSync(
  path.join(dir, "comparison-metrics.csv"),
  "\uFEFF" +
    [
      keys.join(","),
      ...rows.map((r) => keys.map((k) => cell(r[k])).join(",")),
    ].join("\r\n"),
);
fs.copyFileSync(
  path.join(dir, "改进搜索对比报告.md"),
  path.resolve(root, "../outputs/智能搜索-改进对比报告.md"),
);
fs.copyFileSync(
  path.join(dir, "comparison-metrics.csv"),
  path.resolve(root, "../outputs/智能搜索-改进指标.csv"),
);
console.log("Improvement report and CSV exported");
