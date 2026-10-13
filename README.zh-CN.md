# Infinity Nikki Data Analytics & Intelligent Search Platform

[English README](README.md)

**将分散的《无限暖暖》资料转化为可追溯的数据分析、材料规划和可评估的五语智能检索。**

## 项目简介

玩家使用正式名、昵称和不同语言查找服装，还需要追踪缺件、合并制作需求。来源冲突、原色与进化混计及配方缺失会产生误导。本独立作品集遵循 **来源采集 → 关联建模 → 质量控制 → 分析应用 → 搜索建模 → 真人审核评估**，展示 Data Analytics 与 Data Science 的完整流程。

### 核心亮点

- **数据工程：**32张关联表，稳定ID，原色/进化/焕新独立建档，保留来源、冲突及快照。
- **可执行分析：**版本/品质/风格图表、衣橱缺件、多目标材料需求及库存扣除；支持CSV。
- **可解释检索：**五语正式名、社区昵称、错字/拼音与属性关键词，匹配依据、分页、硬筛选与拒答。
- **量化评估：**A–F六种方法，50条用户回传真人Gold；原F Hit@1 **97.73%（43/44）**，拒答 **100%（6/6）**；修复回归另存。
- **科学边界：**Python/DuckDB关联分析、聚类敏感性和分组不确定性；缺失不填零，有限样本不冒充全体玩家。

## 在线演示

🔗 [在线演示](https://jackie566n8.github.io/infinity-nikki-data-platform/)

**预填地址：https://jackie566n8.github.io/infinity-nikki-data-platform/**。仓库已由作者上传；还需在仓库 Settings → Pages 开启发布并等待部署成功。此处尚未验证线上部署。

## 功能展示

| 功能 | 问题与亮点 | 边界 |
|---|---|---|
| 图鉴浏览与多语言检索 | 正式名、“神女套”、拼音等查找；简中/英/日/韩/繁中 | 昵称来源可追溯，资料范围有限 |
| 数据分析中心 | 品质、风格、部件类型、获取方式和版本趋势；筛选与CSV | 缺版本日期显示待补充，不用采集时间冒充实装 |
| 个人衣橱分析 | 完成率、风格/部位覆盖、近完成套装、目标缺件 | 拥有与收藏分开；本地计算，不上传 |
| 材料需求规划 | 多目标合并、库存缺口、共同材料、区域汇总 | 仅完整清单计算；件/kg不混算；非精确路线 |
| 智能搜索 | A–F比较、50条真人审核、匹配依据与暖暖精灵复用 | 属性关键词语义，不冒充云端大模型 |
| 数据质量监控 | 字段完整率、ID/外键/枚举检查、来源冲突、快照 | 明确分母；图片地址不等于可用率 |
| 扩展研究 | 已实现可解释相似推荐、社区样本分析、昵称研究 | 不把有限社区样本当全部玩家 |

紫色系界面与Noto Serif SC标题；顶部切换大喵光标，暖暖精灵固定右下角。九区域背景图已修复，主图失败回退不同区域SVG和CSS主题。

## 技术栈与选型理由

| 技术 | 为什么选择 |
|---|---|
| HTML/CSS/JavaScript | 预构建静态应用，无后端，双击可运行；个人数据留浏览器 |
| Node.js24 / 内置SQLite | 离线构建、关系约束、共享搜索模型及哈希回归；无运行期npm依赖 |
| Python3.12 / Pandas / NumPy | 数据关联、清洗、独立指标复算、置换检验及聚类敏感性 |
| DuckDB | 轻量嵌入式分析SQL，直接接CSV/JSON/Python，适合本地研究与低运维 |
| 精确/模糊/语义/混合搜索 | 可复现、可解释；开发集调参与分组评估 |
| GitHub Pages | 静态展示无需服务器/API密钥，直接上传预构建资源 |

E采用有来源的属性关键词加权，没有密集向量或大模型嵌入。研究使用自实现medoid聚类，不依赖scikit-learn。Python实际依赖精确版本见 [requirements.txt](requirements.txt)，Notebook编辑器可选。

## 数据科学亮点与结果

| 项目 | 当前值 | 统计口径 |
|---|---:|---|
| 套装形态 | 775 | 310原色+274进化+191焕新；不是775套独立套装 |
| 部件 | 8,213 | 含已收录变体，关系另表 |
| 检索对象 | 11,469 | 含套装/部件/妆容/祝福闪光/材料及其他道具 |
| 原色制作配方 | **66/71 = 92.96%** | 制作候选原色；239直接获取原色不在分母 |
| 进化资源清单 | **93/274 = 33.94%** | 单次消耗，拥有副本前置另表 |
| 可计算形态 | 350 | 66原色+93进化+191焕新 |
| 真人审核 | 50/100 | 用户回传、单审核人、预测可见 |
| 原F Hit@1 / Hit@5 / MRR | **97.73% / 97.73% / 0.9773** | 44正例，43首位命中 |
| 原F无答案识别率 | **100%（6/6）** | 仅6负例分母 |
| F_v2修复回归 | 44/44，拒答6/6 | 增加1条开发命中；测试仍12/12，增幅0 |
| 结构校验 | 0错误 / 1警告 | 80个目录外设计图目标不建立悬空关联 |
| 区域背景 | 9/9本地主图可用 | 8官方素材+1用户截图修复版 |

审核人 **human_reviewer_A**；审核日 **2026-10-12（UTC+1，日精度）**。50条为44正例/6负例，35开发/15测试，沿用家族/意图分组。预测可见、单人审核、未提供逐项截图或网址，不称独立盲审。完整A–F及D_v2/F_v2对比、144行分组指标见 [真人评估报告](docs/search_evaluation_report.md)。

原F→F_v2整体提高 **2.27个百分点**，来自已知开发同音漏检，不是新未见测试提升。旧AI候选测试仅4个正例家族，F比C高50个百分点但分组检验p=0.125；不同语料/审核集不能直接比较成绩。品质×风格关联较弱（Cramér’s V=0.114，置换p=0.4254）；聚类多恢复既有风格，不宣称发现新玩家群体。见 [研究报告](docs/reports/EXPLORATORY_RESEARCH.md)。

## 快速开始

### 方式1：零依赖查看

完整解压后双击根 **index.html**。入口相对跳转到 `./src/index.html`，保留参数与锚点；**不要只复制入口文件**。核心数据已预构建在本地JS，无启动JSON请求或服务端推理。外部游戏图片、字体及社区地图需要网络，失败显示回退。

### 方式2：本地服务器

在项目根目录运行：

```sh
python -m http.server 8000
```

打开 http://localhost:8000/ 。文件、localhost、Pages的浏览器存储互相独立，库存/衣橱不自动跨地址同步。

### 方式3：GitHub Pages

1. 在已创建的 **Jackie566N8/infinity-nikki-data-platform** 仓库确认根目录有 `index.html`、`.nojekyll` 和 `src/`。
2. **Settings → Pages → Build and deployment → Source → Deploy from a branch**。
3. 选择 **main / (root)**，点击 **Save**。`/docs`是文档目录，不是本项目分支部署入口。
4. 等待实际Pages/Actions显示部署成功，再访问预填地址。

依据 [GitHub官方发布源说明](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)。更多说明见 [DEPLOYMENT](docs/DEPLOYMENT.md)。

### 研究与评估复现

查看网站不需安装依赖。重新构建与研究需要Node24、Python3.12：

```sh
python -m pip install -r requirements.txt
node scripts/build.mjs
python analysis/data_quality_check.py
python analysis/search_evaluation.py
node scripts/analyze.mjs
node scripts/check.mjs
node scripts/test.mjs
node scripts/test-step12.mjs
node scripts/python.mjs analysis/test_research.py
node scripts/reproduce-search.mjs
```

Python搜索入口先重跑共享模型，再独立计算完整排名指标。重跑核对400组人审方法/查询排序，保留首次计时；旧600组候选Top5单独复现。延迟是暖模型耗时，不含网络、索引构建与网页渲染，微小差异不构成速度优势证据。

更新入口 `python scripts/update_data.py`；质量入口 `python scripts/quality_check.py`。更新不抓取网络、不调参、不部署。可选单文件 `node scripts/standalone.mjs` 输出 `outputs/奇迹旅册.html`，约86MB；五语图鉴、分析与本地图嵌入导致体积大，因此GitHub采用轻量入口与分离资源。格式化可选 `npm ci` 安装工具。

## 数据来源与更新

- 原有游戏图鉴整理快照、gongeo.us多语言资料、社区BWIKI。第三方/社区Wiki不冒充官方Wiki。
- 官方公告、官网场景/活动图用于已核对版本日期与区域展示。
- 社区配方/攻略及公开研究样本，记录URL、核对日期、置信度、样本范围和冲突。
- 用户回传50条审核与纪念山地截图单独标识来源类型。

基础资料日 **2026-09-16**，补录日期按条目保留，本次交付 **2026-10-13**。页面版本标记不证明后续所有内容已收齐；重建时间不是游戏推出日期。见 [数据字典](data/data_dictionary.md)、[质量报告](docs/data_quality_report.md)、[维护指南](docs/maintenance_guide.md)。

## 已知局限

- **原色配方66/71（92.96%）**：梦隙灵语、霓光游星、一帘烟雨、无拘绿野、海风的召唤缺完整确认值；不能一概认定为活动限定或官方未公开。
- **进化93/274（33.94%）**，余181条含部分确认/待录入；相同等级前后属性仍待核。
- **真人审核50/100**，单人、预测可见，偏向已收录昵称及属性模板；需独立自然查询与多审核者。
- **精确路线待补充**：没有实测坐标、传送与通行图，目前只做区域建议及录入模板。
- 描述检索/推荐依赖真实标签，颜色/视觉元素覆盖不足，不从名字猜标签。
- 群体偏好为有限平台样本，不能代表全部玩家；官方版本日历覆盖有限，不做可靠时间序列预测。
- 外链图片只抽样检查，可能失效；地址覆盖、本地背景与外链可用率是不同指标。

## 项目结构

```text
infinity-nikki-data-platform/
├── index.html / .nojekyll       # 根入口与Pages配置
├── README.md / LICENSE         # 项目说明与MIT源码许可
├── .gitignore / requirements.txt / package.json
├── src/                        # HTML、CSS、JS、assets/
├── data/
│   ├── outfits.csv / clothing.csv / materials.csv
│   ├── recipes.csv / aliases.csv / data_dictionary.md
│   ├── input/                  # 维护的来源快照与补录
│   ├── dataset/                # 权威32表CSV/JSON、分析集、冻结报告
│   ├── review/                 # 冻结语料、真人标签及回传
│   └── routes/                 # 区域索引与实测模板
├── analysis/
│   ├── search_evaluation.py / data_quality_check.py
│   ├── research.py / queries.sql
│   ├── notebooks/ / results/
├── docs/                       # 报告、说明、截图、审核模板
├── scripts/                    # 构建、模型、回归及更新入口
│   ├── update_data.py / quality_check.py
│   └── platform/
└── .github/workflows/           # CI与手动Pages工作流
```

`src/`保留已有平铺CSS/JS，避免重排破坏相对路径与动态加载；`assets/`统一管理本地图片。根CSV是关联视图，32张规范化表保持权威；源码包不含大型数据库副本、缓存、个人库存或浏览器档案。逐文件用途见 [文件清单](docs/FILE_INVENTORY.md)。

## 后续路线图

- 核实剩余5套制作资格/配方及181进化，补充字段级来源与当前游戏实测。
- 人审补至100条；新建未见自然查询、遮蔽预测审核及审核者一致性研究。
- 改进已实现的相似推荐：真实颜色/元素标签、离线推荐评估及冷启动。
- 实测坐标、传送与通行条件后开展可执行路线优化。
- 扩展版本日历与社区样本，有足够时间序列后再研究预测。

## License

源码为 [MIT License](LICENSE)。按作者要求，版权年份和作者栏留空，上传前由作者填写。**游戏素材、第三方数据和依赖保留原权利，不转为MIT**，见 [THIRD_PARTY_NOTICES](THIRD_PARTY_NOTICES.md)。独立作品集，非官方服务。

## 项目截图

以下四个位置可替换为自己的展示截图；已有区域修复验证图见 [screenshots](docs/screenshots/)。

- **截图位置：图鉴浏览与五语智能检索页面**
- **截图位置：品质/风格/版本数据分析中心**
- **截图位置：个人衣橱与多目标材料规划页面**
- **截图位置：真人搜索评估与数据质量页面**

[100字项目介绍](docs/ELEVATOR_PITCH.md) · [三分钟演示](docs/DEMO_SCRIPT.md) · [最终状态](docs/FINAL_STATUS.md)
