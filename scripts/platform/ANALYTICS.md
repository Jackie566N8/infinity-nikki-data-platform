> Module implementation notes from earlier development. Historical counts/examples are retained. Use the [current Step 8 report](../../docs/reports/STEP8_FINAL_REPORT.md) for current scope, coverage and verified gaps; use the root README for current run commands.

> 终审当前：来源目录2.10.1；775形态、310原色家族、8213部件；58制作与191焕新，249形态可计算；30核心表。下文的阶段数量属于当时资料范围；当前统计以根README、docs/DATA_SCOPE.md及实时生成质量报告为准。冻结搜索报告保持原样本与原分数，不随新增目录反改。

# 图鉴与版本分析中心

此模块把规范数据表转换成可复现的统计结果。网页离线使用同一份分析数据与计算模型；每个图表数字都能展开对应的对象 ID，再进入图鉴详情或来源页面。默认统计仅代表当前资料快照，不能外推为官方完整目录。

## 复现与交付

需要 Node.js 24 或更新版本（含 `node:sqlite`），无需数据库服务、外部库或 API 密钥。在此目录运行：

```sh
node build.mjs
node build-analytics.mjs
node test-analytics.mjs
```

网站源码根目录运行 `node update-quality.mjs` 会更新质量报告、分析输入及浏览器计算模型。修改归类规则后也需要重新运行。

| 文件 | 用途 |
| --- | --- |
| `dataset/miraland.sqlite` | 27 张规范数据表，是分析的事实来源 |
| `build-analytics.mjs` | 从 SQLite 读取数据，关联来源、家族、部件、设计图与发布日期 |
| `analytics-model.cjs` | 共享纯计算模块；网站 `analytics-model.js` 是其发布副本 |
| `dataset/analytics/input.json` | 分析用明细，带原对象 ID、来源 URL、日期原文、渠道证据 |
| `dataset/analytics/base-summary.json` | 默认原色口径汇总，带分母与成员 ID |
| `dataset/analytics/all-summary.json` | 全形态口径汇总 |
| `dataset/analytics/base-charts.csv`、`all-charts.csv` | 默认两种口径的图表及明细导出 |
| `analytics-queries.sql` | 可在 SQLite 直接执行的独立核对查询 |
| `test-analytics.mjs` | SQL 交叉验证、关联去重、日期边界、CSV 导出的回归检查 |

调用示例：

```js
const fs = require('node:fs');
const model = require('./analytics-model.cjs');
const data = JSON.parse(fs.readFileSync('./dataset/analytics/input.json', 'utf8'));
const result = model.analyze(data, {
  scope: 'base', rarity: '5', style: '典雅', method: 'gacha', clothingScope: 'linked'
});
fs.writeFileSync('filtered.csv', model.toCSV(model.exportRows(data, result, 'all')));
```

## 统计口径

### 套装与部件

- **独立套装**：`outfits.is_base = 1`，每个家族的原色计一次。默认当前快照为 305 套。
- **全部形态**：每个 `outfit_id` 计一次，包含 305 原色、262 进化、185 焕新及 3 条阶段未明变体，共 755 条。不能称为 755 套独立套装。
- **家族数**：筛选结果中不同 `family_id` 的数量。选择全形态时用于避免把进化误认为新套装。
- **部件**：默认原色口径排除 `clothing.is_variant = 1`；全形态口径保留。数量分别为 3,667 / 7,979。同一 `clothing_id` 只计一次。
- **部件范围**默认整个服装目录，包含散件；选“关联部件”或任何获取方式时，限定为匹配套装的 `outfit_clothing` 成员。
- 品质和风格筛选对套装、部件分别使用**自身属性**。因此，关联部件数量不是套装部件数的直接求和；即使套装结果为空，整个服装目录仍可能存在符合条件的散件。

### 占比与组合

- 品质、套装主风格的分母为当前筛选的套装记录数。
- 类别占比的分母为当前部件记录数；热力图按部件自身主风格 × 类别交叉计数。
- 数据目前只有一个主风格字段；不推断“双主风格”。“少见组合”指主风格 + **完整标签集合**，按出现次数升序排列；页面显示前 10 组，CSV 保留所有组合。
- 0 表示本次筛选范围内无记录，不证明游戏中从未出现；空分母用 `null` / “—”，不计算假比例。占比显示最多两位小数，四舍五入可能导致总和略偏离 100%。

### 获取方式

获取渠道是**可重叠标签**，不做互斥饼图。每个标签的分母都是当前套装数，总占比可能超过 100%。稀有度堆叠条各片段宽度也使用当前套装总数作分母。

来源说明通过 `source_assertions` 的 `obtain_text` 精确匹配，匹配值、断言 ID、来源 URL 均存入 `method_evidence`；具体词表见分析输入中的 `method_rules`。没有命中任何规则、也没有设计图线索的记录才归为 `other`。

- 抽卡 / 共鸣：限定共鸣、遥远之海。
- 商城入口：美鸭梨商城精品、商城、商城（限时上架）。**不能直接推断为充值或真实付费**，当前没有可靠价格 / 货币类型字段。
- 活动：来源明确写“限时活动”。不根据套装名称猜测是否活动获取。
- 制作线索：原色套装至少一个关联部件出现在 `recipes.target_id`；`recipe_ids` 指向这些原色部件的设计图。当前 `design_only` 不等于完整材料配方，也不表示全套都能制作。
- 任务、探索 / 收集、搭配挑战、家园采用代码内明确词表。
- 附加形态继承原色家族渠道。继承渠道不表示可以跳过进化 / 焕新条件。

资料中的获取方式存在来源描述差异，规则只记录已收录线索，不代表当前活动开放状态。质量页面可查看来源差异。

## 版本与日期

关联链为：`outfits → object_releases → versions / releases → sources`。

1. 用来源的季节 / 版本标签分组，不把本站采集快照当作游戏版本。
2. 趋势数只包含有 `release_date`、`context = public_release` 且版本有效的记录。来源中混有首测 / 二测说明的条目暂按测试语境排除，保留原文供核对。
3. **日期未收录、测试 / 混合说明、版本未确认**的记录仍参与品质、风格等图鉴统计，但在趋势中归为“待补充”。原色默认 278 条有日期，27 条待补充；全形态 706 / 49。
4. 横轴日期取该版本所有已收录正式实装标记的最早值，且不随筛选改变。它只是排序锚点，**不是已核实的版本上线日期**。`anchor_source_urls` 是该最早日期对应的来源；`source_urls` 是当前筛选实际计数记录的日期来源。明细保留每条原文和来源。
5. 有效版本当前 22 个。每个版本均显示“当前计数”和“待补充”，两列跨版本求和等于当前套装总数；未知版本另列待补充。
6. 一个版本的已知日期计数可能是 0，同时有待补充记录；这不代表官方该版本没有新增。未出现的历史版本不虚构数据点、不填零；缺少完整版本日历使历史覆盖率暂不可计算。
7. `source_date` 是原资料整理日期，`generated_at` 是本次分析生成时间，二者都**不参与游戏版本日期计算**。`change_log` 的建档 / 修改日期也不参与。

## CSV 与追溯

网页单图表或全部导出使用当前筛选结果，CSV 含 UTF-8 BOM，可直接用 Excel 打开；对象与 ID 列表以 JSON 单元格保存，标准 CSV 解析器可读取逗号、引号和换行。

- `scope`、品质 / 风格 / 渠道筛选、实际 `clothing_scope`：本次统计范围。
- `snapshot_id`、`source_date`、`source_tables`：快照与来源表。
- `count`、`denominator`、`percent`、`ids`：聚合数、分母、占比、完整成员 ID。
- 版本额外包含 `pending_ids`、最早日期和对应来源 URL。对象明细保留 `release_label`、`release_context`、`date_source_url`。
- 空结果导出 `status=no_matching_records`，保留筛选和来源；不伪造明细。
- 文本若以电子表格公式触发字符开头，导出加单引号以防自动执行；原始 JSON 保留原值。

## 已验证

测试以 SQLite 独立查询对照两种口径、4 种品质选择、6 种风格选择，共 48 组；覆盖品质、风格、类别、热力图、日期数、各获取方式证据、关联部件去重、固定日期锚点、空结果及 CSV。网页另外检查源码版和单文件版离线运行、真实下载、五种语言、五种屏幕宽度、明细跳转及原有数据质量和昵称检索。
