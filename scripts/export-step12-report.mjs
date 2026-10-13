import fs from "node:fs";
const r = JSON.parse(
  fs.readFileSync("data/dataset/search-human/step12-comparison.json"),
);
const types = {
  formal: "正式名",
  nickname: "昵称",
  typo_pinyin: "错字/拼音",
  description: "描述性",
  multilingual: "多语言",
};
const pct = (v) => (v == null ? "n.a." : (100 * v).toFixed(2) + "%"),
  fix = (v, n = 4) => (v == null ? "n.a." : v.toFixed(n));
const header =
  "| 方法 | 类型 | 正例 N | 无答案 N | Hit@1 | Hit@5 | MRR | 无答案识别率 | 平均 ms |\n|---|---|---:|---:|---:|---:|---:|---:|---:|\n";
const row = (method, type, m) =>
  `| ${method} | ${type} | ${m.answerable} | ${m.no_answer} | ${pct(m.hit_at_1)} | ${pct(m.hit_at_5)} | ${fix(m.mrr)} | ${pct(m.no_answer_identification)} | ${fix(m.mean_response_ms)} |`;
let all =
  "# 各方法 × 查询类型 × 指标完整表\n\n真人回传 50 条；原 F 与修复 D_v2/F_v2 分开。按原划分，q091=dev。正例计算 Hit/MRR，负例计算拒答；空分母 n.a.。时间为 Node 暖模型单次平均，不是网页耗时。\n\n";
for (const split of ["all", "dev", "test"]) {
  all += `## ${split}\n\n${header}`;
  for (const [method, v] of Object.entries(r.methods)) {
    all += row(method, "overall", v[split].overall) + "\n";
    for (const [type, m] of Object.entries(v[split].by_type))
      all += row(method, types[type], m) + "\n";
  }
  all += "\n";
}
fs.mkdirSync("docs/reports/step12", { recursive: true });
fs.writeFileSync("docs/reports/step12/COMPARISON_TABLES.md", all);
const before = r.methods.F.all.overall,
  after = r.methods.F_v2.all.overall;
const report = `# 智能搜索最终评估 · 50 条真人审核 Gold\n\n## 数据与审核来源\n\n本评估基于用户回传的 **50 条真人审核 Gold Standard**，审核人 **human_reviewer_A**，日期 **2026-10-12（UTC+1）**。审核依据按审核人自述为游戏内图鉴、官方Wiki、社区昵称共识；未提供逐项网址或截图，本轮不冒充已独立检查这些证据。日期只有日精度，没有补造具体时刻。预测列可见、单一审核人，不是独立盲审或多审核者一致性研究。\n\n这 50 条是原 **100 条 AI 辅助候选**的子集，不是全部 100 条均已人审。五类各 10 条、不含不完整名称；描述样本主要为属性模板，不代表自由口语、视觉语义或真实查询频率。资料范围固定为快照 \`${r.snapshot_id}\`、**${r.corpus_objects} 对象**。人审原件、结构化标签、输入语料、来源哈希在 \`data/review/step12/\`。\n\n### 两项口径纠正\n\n1. 回传文字写“7 条无答案”，实际 \`answerable=false\` 只有 **6 条**：q091、q095、q092、q097、q094、q099。q063 是有答案的漏检，不算正确拒答。共 **44 正例 + 6 负例**。\n2. q091 回传写 test，但原样本与冻结账本是 **dev**；同意图 q092 也是 dev。保留原划分，记录这一差异，不把已公开开发查询转成测试。仍为 **35 dev / 15 test**，其中 dev 32正/3负，test 12正/3负；不重划集合、不调权重。\n\n## 方法、指标与统计\n\nA：正式名称完全匹配；B：昵称库匹配；C：A+B并集；D：归一化、拼音、前缀及编辑距离；E：来源支持的属性关键词匹配；F：冻结权重混合排序。A–F 使用相同的本轮语料和人审标签，原 F 的全部排序与 Step10 原始账本逐条核验一致。旧 8734 对象首次候选报告不覆盖、不改名成人审结果。\n\nHit@1/Hit@5/MRR 只以正例为分母；MRR 用完整排序中第一条正确答案的倒数，未命中为0。拒答率只以负例为分母；分母0显示 n.a.。单条多个正确 ID 取第一个相关结果。计时为3轮暖身、每查询20次，Node ${r.environment.node}、${r.environment.platform}/${r.environment.arch}、${r.environment.cpu}；平均全部查询的模型响应，排除索引构建、网页、网络和导入耗时，不证明端到端用户体验。\n\n## 整体比较（50 条）\n\n${header}${Object.entries(
  r.methods,
)
  .map(([method, m]) => row(method, "overall", m.all.overall))
  .join(
    "\n",
  )}\n\n原 F：**43/44 = ${pct(before.hit_at_1)} Hit@1、${pct(before.hit_at_5)} Hit@5、MRR=${fix(before.mrr)}**；正确拒答 **6/6**。9 条有答案的错字/拼音仅8条命中（88.89%），其余类型的已审核正例均命中。A/B/C 分别局限于正式名/昵称，D 缺属性描述能力，E 不负责错字/拼音，所以混合 F 覆盖更广。\n\n## 原 F 按查询类型\n\n${header}${Object.entries(
  r.methods.F.all.by_type,
)
  .map(([type, m]) => row("F", types[type], m))
  .join(
    "\n",
  )}\n\n[完整表：A–F 及 D_v2/F_v2 × 五类 × all/dev/test](COMPARISON_TABLES.md)，共144行汇总记录。所有预测与量化结果：[step12-comparison.json](../../../data/dataset/search-human/step12-comparison.json)。\n\n## q063：失败原因与修复\n\n“古典乐张”正确对象 \`o10183\`，原 F 返回空。实际库读音：输入 \`${r.q063.query_pinyin}\`，正式名 \`${r.q063.target_pinyin}\`。错字改变了“乐”的语境读音，原拼音索引不相等。编辑距离1、四字相似度0.75，低于冻结门槛0.78，候选被过滤。空结果是此门槛与读音共同造成的漏检，不是目录缺对象。\n\n修复作为 **F_v2 新版本**：仅在原 D/F 返回空且输入为3–18个汉字时，在真实中文名称索引里寻找仅一字不同且该字读音相同的候选。张/章同音且“古典乐章”确实存在，因此可纠正。没有全局替换姓氏“张”，没有降低0.78门槛；最多20个确定名称候选，原命中优先、E不增加模糊回退、外部品质/风格/类别仍硬过滤。回退给予0.96同音匹配信号（启发式分数，不是正确概率）并使用原排名公式。对非同音错字、多个错字、已有错误结果、超范围输入仍有局限。\n\n修复后 q063 的 Top1 为 **o10183 古典乐章**，分数0.76，依据为“已收录名称单字同音：张→章”。原报告仍保留未命中，不以修复后结果覆盖原 F。\n\n## 改进了多少与为什么\n\n- 原 F → F_v2 整体 Hit@1/Hit@5：**97.73% → 100.00%（+2.27个百分点，增加1条开发正例）**；MRR 0.9773 → 1.0000。\n- 错字/拼音：8/9 → 9/9（+11.11个百分点）；开发正例31/32 → 32/32（+3.125个百分点）。\n- 测试12正例：前后都12/12，**测试增幅0**；负例前后6/6，未把漏检当拒答成功。\n- 暖 F 平均 ${fix(before.mean_response_ms)}ms → ${fix(after.mean_response_ms)}ms，差 ${(after.mean_response_ms - before.mean_response_ms).toFixed(6)}ms；单次机器计时有噪声，微小差异不宣称稳定性能退化或提升，也未计新增索引内存/冷启动。\n\n机制解释由复现的拼音/门槛与受控同音回退支持，**不是泛化因果证明**。q063 原本属于开发集，修复在观察此开发错误后完成；同一已公开测试仅作回归验证，不称新的未见测试。下一步需要自然查询、不同家族、新的独立留出集与多审核者/独立遮蔽预测审核；不能为本轮100%宣称稳定万能搜索。\n\n## 与之前非人审结果比较\n\n旧报告 F 在30条候选测试中的24正例 Hit@1=100%，MRR=1，6负例拒答100%。本轮原 F 的50人审合并为97.73%，而本轮测试子集12正例仍100%，3负例仍全拒答。**不同样本组成、不同语料和审核方式，不能把97.73与旧100的差直接当模型退化，也不能把修复100当独立泛化提升。** 旧候选证据作为历史保存，本报告是当前主要人审证据。\n\n## 结论与交付\n\n推荐使用版本化 **F_v2**，因为保留原名称/昵称/属性能力，并修复来源闭合的开发同音漏检；无需改权重或扩大拒答风险门槛。候选基准、原 F 人审结果、修复回归三层分别标记。审核进度50/100，原色/进化/精确路线的数据覆盖不因搜索标签审核而改变。\n\n复现：\n\n\`node scripts/evaluate-step12.mjs\`\n\`node scripts/export-step12-report.mjs\`\n\`node scripts/test-step12.mjs\`\n\n评估再次运行核对全部400条方法/查询排序并保留首次计时；历史原模型、权重、标签和报告不覆盖。\n`;
fs.writeFileSync("docs/reports/step12/FINAL_SEARCH_EVALUATION.md", report);
fs.copyFileSync(
  "scripts/platform/search-improved/homophone-model.cjs",
  "src/smart-search-homophone-model.js",
);
fs.writeFileSync(
  "src/human-search-data.js",
  "window.NIKKI_HUMAN_SEARCH_EVALUATION=" + JSON.stringify(r) + ";",
);
console.log(
  "Human report, 144-row comparison tables, versioned homophone model and frontend report data exported.",
);
