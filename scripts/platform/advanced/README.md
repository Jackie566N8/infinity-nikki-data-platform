> Module implementation notes from earlier development. Historical counts/examples are retained. Use the [current Step 8 report](../../../docs/reports/STEP8_FINAL_REPORT.md) for current scope, coverage and verified gaps; use the root README for current run commands.

# Step 7：推荐、区域准备与昵称研究

## 复现

在项目根目录运行 `node scripts/platform/advanced/build.mjs` 与 `node scripts/platform/advanced/test.mjs`，或在网站源码包根目录运行 `node update-quality.mjs`（包含全部数据构建）。Node.js 24 内置 SQLite，无新增依赖、无需网络。前端展示预计算推荐，筛选时最多计算 305 个候选，区域规划只在本地读取材料计划。

交付 `dataset/advanced/input.json`、推荐/昵称 CSV、独立 `advanced.sqlite`（3 张研究表）、报告、输入/算法哈希、历史快照和浏览器展示数据。SQLite 为实际已验证分析库；另提供 `analyze.duckdb.sql` 供安装 DuckDB 后导入，终审已发现可用的 Python 3.12，并实际运行 NumPy/Pandas/DuckDB 研究流程，见仓库 analysis/ 与 dataset/research/；原独立 SQLite 推荐库仍保留。没有为了这一步替换已有数据平台。

## 推荐方法

采用加权分块余弦和 IDF 标签向量。声明权重、缺失字段处理、阈值与解释详见生成报告和源码。只使用独立原色候选，不推断套装整体颜色，不把商城入口当付费或获取难度。附加形态映射到家族原色，页面明确是原色参考画像。颜色、元素、实测难度均待补充。推荐评分不等于偏好概率；缺少用户相关性标注，因此没有推荐准确率数字。

维护新视觉或难度特征前应扩展有出处的特征输入及严格校验，并独立发布新模型。当前来源为现有基础表和 Step 6 冻结的特征快照，不改动搜索算法、权重、冻结样本或评估指标。若要让后续标签改善智能搜索，必须单独启动新的开发/最终评估周期，不能改写旧报告。

## 昵称研究

只分析实际记录的社区观察；检索生成后缀和进化继承不是新的观察。繁简转换复用已带许可证的 OpenCC。分别计算多昵称对象率和多对象昵称歧义率，区间图按实际观察条数计数。每条保留对象 ID、正式名、昵称、规范化词、字面距离、出处与核对日期。创建机制未知，不凭词形推断玩家创造、官方或翻译；核对日期不当作称呼出现时间。

## 路线边界

本地材料计划 → 配方原料 → 库存缺口 → 区域候选 → 贪心覆盖准备顺序。无真实坐标、传送点、通行图，因此没有距离或路径。显示条件原文与外部地图入口，非采集材料另列。地图列表编号表示准备步骤，未画虚构地图点位。区域别名、上下级区域与实际供给未完全统一，不能保证最少区域、采够或最快。

后续点位入库需要：地图 ID/坐标系、区域 ID、点位 ID、材料 ID、坐标、来源、刷新/时间/天气/能力条件、可通行边与传送点解锁状态。路线建议仍应称估计；若只有二维点位可做最近邻/2-opt，但不可把欧氏距离当真实行走路径或混合不同坐标系。

## 搜索日志

设计文件与指标 SQL 不接入运行页面；没有日志采集、上传或新增本地日志。方案需主动同意与撤回流程，默认不记录查询文本，不能把脱敏或凭据摘要当作保证匿名。详见 search-usage-design.md。

## 快照

按输入与方法哈希保存研究快照；相同输入不新增历史版本。核心数据快照与研究快照分别记录。自动构建会刷新推荐与昵称结果，新增原色直接进入分母，视觉缺失保持可见。来源词典更新需先编辑 assets/outfit-aliases.json 并执行 update-aliases.mjs，再执行 update-quality.mjs。
