> 历史实验说明：本文的0人审/旧语料仅指当时冻结的候选基准。当前50条人审、11469对象及F_v2见 [最终评估](../../../docs/search_evaluation_report.md)。

> Module implementation notes from earlier development. Historical counts/examples are retained. Use the [current Step 8 report](../../../docs/reports/STEP8_FINAL_REPORT.md) for current scope, coverage and verified gaps; use the root README for current run commands.

# 改进搜索 · Step 6

当前比较沿用 Step 5 的冻结候选数据：100 条策划查询、70/30 家族与意图划分、24 条测试正例和 6 条测试负例。实际人审仍为 0，报告始终标为 `provisional_not_human_reviewed`。不将 AI 核对改称真人 Gold，不改变样本、答案或基准方法，不据测试表现重新加词或选权。

## D / E / F

D 是名称检索：OpenCC 繁简归一化、NFKC、大小写与空格/标点预处理；保留五语完整名与既有昵称；为所有语料名预生成无声调拼音；中文查询可做同音辅助；再用前缀和有界 Levenshtein 检索。候选来自前缀表和双字倒排，最多比较 1200 个近似词项，不逐条全表计算长距离。相似度门槛 0.78；短非同音错误、多音字上下文变化仍可能失败，例如开发集“古典乐张”。没有以该测试错误专门添加字典。

E 是字段关键词语义，不是神经向量模型。词项来自主风格、品质、类别、标签、图鉴系列、获取方式及补充颜色/元素，提供“裙子→连衣裙”等普通同义词；字段权重和 IDF 形成归一化覆盖分，明确条件全部满足才参与返回。未知语词或缺失视觉条件保守拒答，不假装理解任意长描述。

F 融合名称、昵称、字段信号与原色/套装先验：

```text
S = 0.75 name + 0.60 alias + 0.60 semantic + 0.04 prior
name_min = 0.78
return only if evidence is sufficient and S >= 0.40
```

品质、风格、类别、原色等筛选是硬条件，高分不能补偿违反条件。空结果不等于不存在，只表示本地资料没有满足证据门槛的候选。

## 数据与标签

特征脚本读取冻结语料、原目录和公开来源，**不读取任何查询答案**。原有风格、品质、类别与标签完整沿用，不用名字猜颜色或元素。346 条部件拥有社区 Wiki 颜色分类，约占部件 4.34%；来源、日期、ID 和分类性质逐条保存在 `visual-features.json`。只关联唯一英文名称匹配的具体部件形态，不继承到整套或进化。

明确视觉元素描述当前仅 1 条（裙摆上缝制纸鹤）；另一条蝴蝶仅出现在叙述里，放入 `description_mentions`，不能当已验证图案。颜色缺失是未知，不能填黑色、白色或从名称猜测。“粉色甜美蝴蝶元素裙子”因此可能未匹配，并在页面注明视觉覆盖有限。当前测试描述题不包含完整颜色/图案标注，100% 不能证明视觉语义完备。

来源是 [Wiki 颜色分类](https://infinity-nikki.fandom.com/wiki/Pink_Clothing)、[裙摆纸鹤说明](https://infinity-nikki.fandom.com/wiki/Fluttering_Wishes) 等公开原文。补充数据不是官方颜色字段。依赖 [pinyin-pro](https://github.com/zh-lx/pinyin-pro) 3.29.5 和 [opencc-js](https://github.com/nk2028/opencc-js) 1.4.2 固定到本地，保存原许可、OpenCC 数据 Apache 许可及源码 SHA-256；运行不访问网络或第三方 API。

## 开发、冻结与测试

开发脚本 `tune-v3.mjs` 只打开 `dev.json` 和语料、特征、昵称、依赖文件。108 组候选最大化 MRR + 0.25 Hit@5 + 0.5 无答案识别率，同分靠近预先默认权重再稳定排序。`development-grid-v3.json` 的响应占位 0 只用于缓存候选的排序比较，不当真实端到端延迟；实际开发延迟单列在 release 锁的 `dev_latency`，包括未缓存查询解析、生成、过滤和排序。

开发过程中保存 v1/v2 历史，全部发生在最终测试前；同音辅助是针对开发错误的一般算法，不查测试名或答案造规则。`freeze-release.mjs` 在最终测试前按开发目标及未缓存 p95 <50ms 选择 F；一并冻结无拼音、无编辑距离、无前缀、无属性四个消融。

`evaluate-final.mjs` 在读取测试标签前核对冻结算法、特征和原基准哈希。随后一次生成全方法和消融报告；已有比较文件时保留第一次结果，改参数不允许覆盖旧测试结论。后续算法改进应在新的版本中、用新的独立人工查询验证，不能反复看这份测试结果调参。

报告同时给出 A–F 和旧网页 L，所有指标按原分母计算。MRR 用第一个相关结果；无答案率仅6条测试负例；每类型正例仅4条，差1条就差25个百分点。延迟为未缓存、已预热索引的内存检索，重复20次，不含网络、载入或 DOM。索引构建约443ms另计；冷启动不等同于0.137ms查询。

消融去掉拼音、前缀或属性各丢4个测试正例；去掉编辑距离无额外损失，不能声称已证明其独立增益。消融只支持实现机制解释，不是玩家随机实验。测试既小又模板相近、未人审，不能声称总体统计显著提升。

## 网站与对话

`smart-search.js` 从实际图鉴与补充字段建立同一模型，并使用冻结 F 配置。搜索栏、原有分页、品质/风格/类别筛选与排序继续使用；默认查询排序显示“智能匹配”。结果注明名称、昵称、拼音/同音、片段及属性依据，详情可查补充标签的出处。保留 `searchLegacy` 作为旧版方法的核对入口。

暖暖对话复用同一排名。对话先识别简单问句包装和追问意图，再调用该搜索入口；明确条件仍保留，不会把“1星神女套”强行变成5星答案。原有获取说明、历史活动提示和上下文追问保留。问候和普通互动不进行模糊名称匹配。

原图鉴统计库不被伪造视觉字段填满；补充特征库单独保留来源审计。“搜索评估”页新增 A–F 的总体、逐类型、消融和性能比较，继续显示人审0的限制及原来的人工工作台。

## 离线复现

Node.js 24，无需额外安装；依赖已内置。源码根目录运行：

```text
node scripts/platform/search-improved/test.mjs
node scripts/platform/search-improved/evaluate-final.mjs
node scripts/platform/search-improved/export-report.mjs
node update-quality.mjs
```

`evaluate-final` 已有结果时仅检查并保留首次测试。完整比较、逐查询预测、各类型指标、来源特征、开发网格、算法和依赖锁均在 `dataset/search-improved/`。实际人审完成后应建立有审核元数据的新版本，再在其开发数据上选择方法；不能把旧候选分数追溯改称正式人工结果。

默认重建页面只用已冻结文件，不重新抓资料或重调权。需要新方法/新标签时先版本化保存原样本和算法，再补充人审查询与新的独立测试。
