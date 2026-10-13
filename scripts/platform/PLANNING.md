> Module implementation notes from earlier development. Historical counts/examples are retained. Use the [current Step 8 report](../../docs/reports/STEP8_FINAL_REPORT.md) for current scope, coverage and verified gaps; use the root README for current run commands.

> 终审当前：来源目录2.10.1；775形态、310原色家族、8213部件；58制作与191焕新，249形态可计算；30核心表。下文的阶段数量属于当时资料范围；当前统计以根README、docs/DATA_SCOPE.md及实时生成质量报告为准。冻结搜索报告保持原样本与原分数，不随新增目录反改。

# 全量材料需求分析与规划

页面展示目录全部 755 条套装形态：305 条原色、262 条进化、185 条焕新、3 条阶段未明。当前可计算 52 套原色及 185 条焕新，共 237 条形态。235 套原色为直接获取，排除制作口径；其余 18 套制作原色、262 条进化及 3 条未明形态待补录或核实。

## 使用方式与口径

默认显示全部套装，按品质、风格、形态、获取方式筛选，支持多语言名称和既有昵称。未核实清单置灰，旁边显示原因；“仅显示可计算套装”可缩小范围。批量选择只添加当前筛选中的可计算条目，并记住被跳过的 ID 和原因供 CSV 导出。切换筛选不移除已选目标。

每个不同目标 ID 计算一次。原色整套制作不含设计图解锁、前置任务、升级或进化；整套汇总不叠加部件设计图，也不推测部件数量分摊。原色和焕新独立计算：焕新必须已拥有对应全套 10 级部件，只计算 10→11 级这一步，0→10 级费用未计入。不假定勾选原色便完成焕新前置，也不扣减活动返还或衣橱拥有的服装。

材料按 ID 合并，库存只抵扣一次。计数材料为整数；普通鱼类明确用 kg，库存可填小数。精粹按件计，与普通材料分开。某清单只列鱼数量未明确重量单位时保持 partial，不能按件或千克擅自换算。当前“美好的一天”正因该问题等待核实。

空库存按 0 估算；`inventory_entered` 区分未填与真实零库存。库存和目标仅保存于浏览器 `miraland-material-plan-v1`，不会上传或写入收藏数据。清空目标保留库存。

## 数据表与来源

`outfit_recipe_status` 每形态一行；每次构建自动更新。状态包括 complete、missing_entry、unpublished、not_crafting、evolution_pending、renewal_pending、variant_pending、conflict。搜索失败只归为待录入，unpublished 必须由 `outfit_status_overrides` 提供明确的来源、日期、理由，初始没有依据的未公开记录为零。

`recipes` 的 scope 区分 clothing、whole_outfit、evolution、renewal、material。`recipe_ingredients` 保存材料 ID、精确数量和 count/kg 单位；`source_type` 区分游戏内实测、官方 Wiki、社区 Wiki、社区帖子、攻略站和目录线索。BWIKI 为社区 Wiki，不冒充官方来源。`checked_at` 和读取方式逐条保存；历史记录只知采集日的，`checked_precision=date`，规范化午夜不代表实测时刻。页面发布日期缺失保持 NULL。

原色清单来源为 Infinity Nikki Wiki 的 Crafting Materials 区段及既有 Game8 资料。焕新清单逐页读取相应 BWIKI 页面“焕新所需材料”栏，保留 Wiki 修订号。未使用语义属性中的零值或模板错误值。材料五语名来自 Wiki 多语言表或 TH.GL 公开数据库对应语言页；未收录译名明确沿用备用语言。获取指引来自 Wiki、BWIKI 区域字段和 TH.GL 道具描述，来源逐条关联。

## 材料树与区域建议

合成材料可通过 `scope=material` 建档。计算引擎按依赖顺序汇总父材料，先扣父库存，只对剩余需求按完整批次展开，最后合并下级原料并只扣一次库存。共享分支、产出盈余及循环检测均已验证。当前尚无核对完整数量的合成材料配方，不编造依赖树；精粹来自强化采集，而非自动假设合成产物。新增合成配方必须包含真实原料数量、产出数量和出处。

仅处理实际缺口：区域按覆盖的缺料种类数排序，共同材料种类数作次级排序。区域是备选地点，数量是全计划总缺口，不能把重复列出的材料在每个区域再次采满。来源只有大区域时按大区域展示，未核实区域列“待补充”；副本、商店、兑换与任务材料另列非野外获取。没有可靠路径或产量数据，不给精确路线、最短路、采集时间预测或区域产量。

## 审计、质量与维护

`dataset/planning/outfit-recipe-audit.csv` 包含完整清单和逐条状态。`recipe-backfill-queue.csv` 包含待补录对象及 `new_catalog_entry`，与保存的初始目录基线比较，新增套装会自动进队列。`audit-summary.json` 和“配方盘点.md”按形态、品质和原始获取方式列出缺口。初始四套及基线快照保存在 `input/planning-baseline-audit.json`。

质量页同时展示：完整消耗清单 / 全部形态（237/755），完整制作清单 / 有制作线索原色（52/70）。二者分母不同，不能将直接获取套装或焕新费用解释为新增可制作原色。每次运行更新程序重新生成状态、覆盖率和队列，输入和规范化表参与内容快照，历史数据与逐行变更继续保留。

维护 `input/material-planning.json`：录入前核实目标与材料 ID，明确 scope、数量单位、前置、source_type、URL、核对日期和读取方式。新材料必须先加入材料表，不能为凑数临时造 ID。无法确认完整性先设 partial；显式未公开状态放入 overrides。随后运行源码根目录 `node update-quality.mjs`，或开发工作区中的 `node src/update-quality.mjs`，刷新页面和数据表。发布单文件时重新运行打包程序，避免源码与 HTML 数据快照不一致。

导出的 CSV 首个数据行 `row_type=plan_header` 保留已选、尝试及跳过目标、理由、前置、统计口径和快照。随后列材料用量、库存、缺口、单位、来源及材料路径，最后追加 pending_target 行；缺失数据不作零消耗。CSV 使用 UTF-8 BOM，防止名称乱码，保护单元格免于被当作公式执行。

## 验证

运行 `node validate.mjs`、`node test-planning.mjs`、`node test-planning-extended.mjs`。测试包括与 SQL 独立聚合对比、单位与库存约束、原色/焕新分离、跳过导出、依赖树库存守恒和循环、新增对象待补录以及全 755 条形态批量性能。另在 Chrome 检查本地源码与单文件 HTML 的筛选、五语、库存持久化、CSV、移动端布局和既有页面回归。

资料并非全部齐全。所有清单均以保存的来源版本为准；新版本如有数值变化须再次核验。Wiki 衍生数据保留出处并遵循来源授权，页面不复制攻略全文。
