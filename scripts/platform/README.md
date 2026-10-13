> Module implementation notes from earlier development. Historical counts/examples are retained. Use the [current Step 8 report](../../docs/reports/STEP8_FINAL_REPORT.md) for current scope, coverage and verified gaps; use the root README for current run commands.

> 终审当前：来源目录2.10.1；775形态、310原色家族、8213部件；58制作与191焕新，249形态可计算；30核心表。下文的阶段数量属于当时资料范围；当前统计以根README、docs/DATA_SCOPE.md及实时生成质量报告为准。冻结搜索报告保持原样本与原分数，不随新增目录反改。

# 无限暖暖数据分析与智能检索平台 · 数据底座与分析中心

本阶段将已有网站资料规范化成可分析、可追溯的关系数据集。没有重新抓取全网，也没有补造尚未收录的数据。

## Step 5 · 智能搜索评估

Step 6 已增加模糊/拼音 D、关键词属性 E、混合排序 F，以及冻结开发权重和 A–F/L 同样本对比。F 已复用到搜索栏与暖暖对话，结果有匹配依据，保留分页与筛选。颜色/元素补充单独保留来源与缺失语义，当前比较仍为未真人审核的候选标签。详见 [search-improved/README.md](search-improved/README.md) 和 `dataset/search-improved/改进搜索对比报告.md`。

新增“搜索评估”页面、100 条有来源的候选查询与 70:30 家族/意图划分、严格 A/B/C 基准和现有网页 L 对照。当前人工审核为 0，结果明确为待人审候选标注，不能声称已经建成人工 Gold Standard。页面提供本地逐条核对及审核 JSON 导出，正式评测拒绝未审或泄漏样本。

固定语料、查询、算法锁、分组与各类指标在 `dataset/search/`，完整报告为 `dataset/search/provisional/基准评估报告.md`。方法、复现命令、分母和审核流程见 [search/README.md](search/README.md)。生产搜索不替换为严格基准。

## Step 3 · 我的衣橱与玩家偏好

新增本地衣橱完成率、部件覆盖、近完成套装、目标缺件分析；群体部分按独立公开调查展示支持率、雷达对比、渠道结构与规则推荐。公开数据初始收录 4 份投票、14 项来源审查，不合并为全体玩家结论。暂无可靠跨版本序列、逐套收入和群体完成率，页面明确待录入。

完整说明见 [WARDROBE.md](WARDROBE.md)，来源见 [PREFERENCE-SOURCES.md](PREFERENCE-SOURCES.md)。公开数据位于 `input/preferences.json`；空白模板是 `preferences-template.json`。运行 `node build-preferences.mjs` 生成独立公共统计库、发布数据与不可覆盖历史；运行 `node test-wardrobe.mjs` 验证计算和维护机制。个人收藏不写入这些数据文件。

## Step 2 · 图鉴与版本分析

网站新增“数据分析”页面，支持品质、风格、获取方式筛选，套装原色 / 全形态切换，风格环形图、部件类别分布、风格 × 类别热力图、获取结构和版本趋势，图表明细追溯及 CSV 导出。

完整方法、口径和字段说明见 [ANALYTICS.md](ANALYTICS.md)。运行 `node build-analytics.mjs` 从 SQLite 生成 `dataset/analytics/` 中的分析明细、两种口径汇总与 CSV；运行 `node test-analytics.mjs` 与独立 SQL 查询交叉验证。更新基础数据后先运行 `node build.mjs`，再生成分析，避免使用旧快照。

## 快速使用

- 用 SQLite 数据库工具打开 `dataset/miraland.sqlite`，可直接执行 SQL。
- `dataset/csv/` 与 `dataset/json/`：每张关系表各一个文件。CSV 使用 UTF-8；导入 Excel 时选择 UTF-8 和文本 ID，避免自动类型转换。
- `dataset/数据字典.md`、`data-dictionary.json`：逐字段类型、记录粒度、必填、主键、外键与取值含义。
- `dataset/quality-report.json`：本次实际质量检查及完整来源差异。
- `analysis.sql`：独立套装与形态数、版本/实装统计、缺失数据的 SQL 示例。
- 网站左侧“数据质量”页面提供相同快照的概览、筛选、来源跳转及报告下载。

## 离线重建

需要 Node.js 24 或更新版本（使用内置 `node:sqlite`），不依赖 Python、额外 npm 包或外部数据库服务。在本文件所在目录执行：

```sh
node build.mjs
node validate.mjs
```

需要复核防护逻辑时运行 `node test.mjs`：在独立临时目录注入错误，并检查重复运行、增删改快照及失败保护，不修改正式输入或数据集。

也可以指定输入和输出目录：

```sh
node build.mjs --input ./input --out ./dataset
```

脚本先规范化、验证主键/字段/枚举/关系，再生成数据库与导出。结构错误时退出码为 1，写入 `validation-failed.json`，不会覆盖已有有效数据库和报告。原始来源差异和资料未收录属于可见待复核事项，不会被静默修正。数据库本身也带主键、外键、CHECK 约束，并执行 SQLite 完整性检查。

## 统计口径

1. **对象**：每个独立对象或形态一条，包括服装、妆容、祝福闪光、材料和其他道具。
2. **套装形态**：`outfits` 每个原色、进化、焕新一条，稳定 ID 沿用原网站。
3. **独立套装**：`outfit_families` 每个来源分组一条，ID 为 `family:` 加唯一原色 ID。不可进化的单形态套装仍是一家族。
4. **新增独立套装**：按原色的来源实装标记计数；不计已有套装的新进化/焕新。记录不完整时只能报告当前资料覆盖范围。
5. **进化阶段**：仅来源明确一进/二进时写数字；“满进”“进化形态”不猜等级。来源排列顺序不是等级。
6. **材料范围**：原 `materials` 还含货币、摆饰、任务道具等。采集完整率只以 Collection、Fishing、Animal-Grooming、Bug-Catching 四类 290 个候选采集对象为分母；其他类别未评估。
7. **日期范围**：`releases` 保留来源实装原文和首日期，含测试文字的条目另标记。`versions` 是来源季节/版本标签，不推断数字版本。目录的 `2.9.2` 仅代表采集目录版本。正式活动起止未采集，`events` 为空。

## 缺失信息与不确定性

- SQL `NULL`、JSON `null`、CSV 空单元格表示未收录。不能替换为 0。
- `recipes` 中当前设计图仅确认目标和 design_id；`status=design_only`。原料数量与产出未知，`recipe_ingredients` 为空。空表不表示免费制作。
- `material_usage_mentions` 只是资料提及的材料—套装关系，不能推算完整配方。
- `gathering_areas` 是区域级线索；`gathering_points` 尚无精确材料坐标。原设计图资料中的宝箱坐标不拿来冒充材料点位。
- 标准名称按语言建立一行，即使缺失也保留状态。语言显示用的英文 fallback 不算目标语言翻译；中文本站整理名称与来源提供名称分开统计。
- 图片报告只验证本地主图 PNG 签名与尺寸，不等同于完整解码或外链联网验证。外链是 `remote_unchecked`，有 URL 不等于可用。图鉴颜色变体图片不在“每对象一张主图”的分母中。
- 来源差异来自同类别唯一名称匹配的 BWIKI 对照，比较品质、主风格、获取文本。未匹配对象不等于没有冲突；文字差异、原色与进化获取语义差异均需要人工复核。

## 来源与 ID

`input/catalog.json` 保存原网站对象、稳定 ID、关系与字段。原游戏 ID 缺失的材料继续沿用既有 URL slug ID，名称变化不改 ID。URL slug 若将来变更，维护者必须做人工 ID 映射，不能当成全新对象直接追加。

`input/source-names.json` 为已有 gongeo 多语言原始名称；`display-locales.json` 保存网页显示层（含备用名称），两者不能混用统计。

`bwiki-outfits.json` / `bwiki-clothing.json` 保留本地 BWIKI 断言及来源地址；部件对照仅包含先前采集的 1,500 条记录，并非全部部件。

`sketches.json` 与 `catalog-manifest.json` 保留 gongeo 设计图原始数据、来源文件散列路径、目录时间。`input/local-images/` 包含网站当前主图中实际为本地文件的图片，用于离线重复核验。

所有原始输入 SHA-256 都记录在 manifest 和 snapshots 中。派生 ID 使用带命名空间的 SHA-256 前缀，并受主键唯一检查；不会用数组索引生成 ID。

## 更新与快照

保留 `dataset/history/` 后再次构建：

- 输入和规范数据相同：复用同一 snapshot_id，不追加重复快照；质量检查时间可更新。
- 输入或规范数据变化：生成新快照，并按每张表的主键记录新增/修改/删除的前后值。
- 首次建档仅写 baseline，不把所有存量标记为当天新增游戏内容。
- `source_date` 是原资料整理日期；`created_at` 是此规范快照首次生成时间；`audited_at` 是质量检查时间，三者不可混为抓取日期。
- `history/` 保留过去的规范表，`change_log` 保留具体差异；`snapshots.input_manifest_json` 保留该次输入指纹。发布新数据时应同时归档当次 input，才能从原始输入重建历史版本。

网站工作区内运行 `node work/package.mjs` 会同步网站 catalog/locales、重建数据底座，并将质量报告内嵌进单文件网站。独立数据包重建只更新其 dataset；要更新网页，需在网站工作区重新打包。

完整网站源码包中，可在 `index.html` 所在目录运行 `node update-quality.mjs`，同步该目录的 `data.js`、`locales.js` 和本地主图到 `scripts/platform/input`，重建后刷新 `index.html` 即可查看新报告。原始多语言来源、BWIKI 对照及设计图资料仍须维护者明确更新；显示层变更不会冒充新来源翻译。

## 许可与用途

非官方玩家项目。原数据、游戏名称和图片的权利归原权利人；来源页在 sources、name_sources、source_assertions 中保留。来自 Infinity Nikki DB / Fandom 的衍生数据继续依原来源 CC BY-SA 条款使用。本包整理与脚本不授予游戏美术额外使用权。

## Step 4 · 材料需求分析

“材料规划”已列出全部 755 条形态记录，核验 52 套原色制作和 185 条焕新，共 237 条可计算清单；197 种计划用料均有稳定 ID、五语来源名称和获取说明。支持多目标汇总、件数或 kg 本地库存、共同材料、区域建议和可追溯 CSV。18 套制作原色、262 条进化、3 条阶段未明仍待补录或核实，235 套原色按当前直接获取记录排除制作口径。

主配方表区分 `whole_outfit`、`clothing`、`evolution`、`renewal`、`material`。完整清单数为 237 / 1084，这是配方记录比例；全形态覆盖为 237 / 755，可制作原色覆盖为 52 / 70（74.29%）。焕新只计对应套装已有全套 10 级部件后的 10→11 消耗，未计前置升级。每次构建自动更新 `outfit_recipe_status`、覆盖率和 `dataset/planning/recipe-backfill-queue.csv`；新增无明确直接获取证据的原色进入补录队列。材料树支持有真实数量的合成配方，当前暂无已核对合成配方，精确点位仍待补充。

详见 [材料规划口径、来源与维护](PLANNING.md) 和 `dataset/planning/配方盘点.md`，SQL 案例见 [planning-queries.sql](planning-queries.sql)。运行 `node scripts/platform/test-planning.mjs` 与 `node scripts/platform/test-planning-extended.mjs` 检查计算。来源类型、核对时刻、单位、焕新前置、快照与逐行变更均可追溯。
