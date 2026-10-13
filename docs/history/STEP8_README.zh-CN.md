# 无限暖暖数据分析与智能检索平台 · 奇迹旅册

**把可追溯游戏资料转化为可复现分析、材料规划和可量化智能检索的作品集项目。**

[English](README.md) · [最终数据与缺口报告](docs/reports/STEP8_FINAL_REPORT.md) · [8分钟演示脚本](docs/DEMO_SCRIPT.md) · [数据字典](docs/DATA_DICTIONARY.md)

## 为什么做

玩家经常用昵称找套装，跨语言查资料，还需要根据个人衣橱和材料库存做规划。本项目把这些问题变成数据建模、数据质量控制、多表分析、特征检索、基准比较和不确定性分析案例。目标不是把空缺画成完整数据，而是让每个结论都能追溯来源与口径。

## 核心能力

32张关系表与稳定ID；原色、进化、焕新分开；品质/风格/类别/版本分析；本地衣橱和材料库存；五语检索、昵称/拼音/模糊匹配及拒答；可解释推荐；Python/DuckDB聚类、关联与分组统计检验。个人数据不上传，搜索日志不采集。

当前775形态、310原色、8,213部件、1,771材料及道具；可制作原色60/71（84.51%），进化资源17/274（6.20%），可计算268形态。剩余11原色、257进化资源待补；同等级进化属性核对0/274；精确坐标与通行边0。数据范围是当前目录，不能声称完整覆盖最新游戏。

## 运行

双击 `src/index.html`，或交付包的 `outputs/奇迹旅册.html`。逻辑和数据本地运行，外链图片/字体需联网。也可在根目录运行 `python -m http.server 8000 --directory src`。源码使用原生HTML/CSS/JS，无前端安装依赖。

复现需要Node24+、Python3.12+：

```text
python -m pip install -r requirements.txt
node scripts/build.mjs
node scripts/analyze.mjs
node scripts/check.mjs
node scripts/test.mjs
node scripts/python.mjs analysis/test_research.py
node scripts/reproduce-search.mjs
node scripts/release-docs.mjs
node scripts/standalone.mjs
```

## 展示与结论

![研究实验室](docs/screenshots/research-desktop.png)

![材料规划](docs/screenshots/materials-desktop.png)

<!-- 此处预留你自行录制的 docs/screenshots/demo.gif -->

GIF和线上演示由你后续补充；目前没有部署链接。技术选型、详细功能、数据来源和目录结构见英文README。Python做可复现数值分析，DuckDB用于与SQLite核对的本地研究数据库；Node内置SQLite做关系校验和构建。

F在开发集选择，冻结候选测试Hit@1=100%，C=50%，无答案6/6；本轮600组前五预测一致。样本100条、70:30按家族/意图划分，真人通过0，仅4个测试正例家族，不能称为人审Gold或声称广泛泛化。分组比较p=0.125；风格与品质关联较弱，聚类主要复现已有风格。所有计时只覆盖内存模型。

## 来源、维护与局限

官方Infold/Steam公告用于部分版本日历；Gongeo目录、社区BWIKI、TH.GL、Fandom公开索引和注明来源的攻略用于字段核对。来源日期、游戏实装日期和采集日期分开；找不到不等于未公开。游戏当前实耗、原色副本扣除和同等级属性仍需真人核对。偏好数据注明平台/样本，不能代表全体玩家；图片可用率只针对检查样本。

[更新流程](CONTRIBUTING.md) · [真人审核模板说明](docs/HUMAN_REVIEW.md) · [路线录入模板说明](docs/ROUTE_DATA_ENTRY.md)。后续顺序：真人Gold → 新的独立测试集 → 可靠视觉标签 → 配方/进化面板 → 实测路线 → 自行录制与部署。源码采用MIT，游戏素材与第三方资料保留原权利，见[权利说明](THIRD_PARTY_NOTICES.md)。
