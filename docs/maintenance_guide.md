# 数据与项目维护指南

## 维护原则

`data/input/`是维护的输入，32张`data/dataset/csv/`关联表权威，根`data/*.csv`是生成视图。稳定ID不随翻译/昵称改动，原色/进化/焕新各有ID；来源冲突与空值保留，不手改生成文件。

## 更新流程

1. 输入补录具体URL、来源类别、核对日期/时区、语言、数量、单位和置信度。游戏实测、官方、社区分别标识。
2. 新套装确认家族/形态/制作资格；不确定待核。完整配方必须全部原料数量与产出可确认，推断不得标complete。拥有副本前置与消耗分开。
3. `python scripts/update_data.py` 顺序离线构建、校验、刷新分析集和关联CSV/当前报告、独立Python检查；不抓网络、不调参、不部署。
4. `python scripts/quality_check.py`、`node scripts/test.mjs`；图像或检索变化增加相应专项。检查错误、警告、分母、来源冲突；记录修改日期与内容。
5. 根据真实结果更新README叙事与范围。兼容文档生成入口不再以旧0人审/旧指标覆盖最终README。构建时间不当游戏发布日期。

环境：Node24、Python3.12，`python -m pip install -r requirements.txt`。研究 `node scripts/analyze.mjs`；Notebook在analysis/notebooks/，先生成DuckDB分析集。格式化工具可选npm ci，不改冻结模型/vendor/证据哈希。

## 搜索审核

100候选、50真人标签、原F/F_v2三层证据分开。`python analysis/search_evaluation.py` 重跑真实模型，再独立算Hit@1/5、全排序MRR、拒答和暖延迟。家族/意图分组不跨集合；不能把公开开发查询改为测试。

新增审核含query_id、全部正确ID或明确无答案、审核者别名、日期/时区、状态及证据。不确定不填空答案。使用docs/templates/版本化回传，见 [审核说明](HUMAN_REVIEW_50.md)。只在开发集调参，新算法最终使用新独立留出集；旧配置、预测和语料哈希不改写。

## 图片与发布

区域图统一src/assets/region-banners/，注册data/input/region-banners.json；`node scripts/check-region-assets.mjs` 查大小写/签名/尺寸/哈希。主图→区域SVG→CSS主题回退；8官方+1用户修复截图不混标。外链只按已查样本报可用率。

发布前 `node scripts/check-pages.mjs`、`node scripts/test-step12.mjs`、`node scripts/reproduce-search.mjs`。可选浏览器专项需Chrome/Chromium和环境变量BROWSER_PATH，使用独立档案。缓存、数据库、outputs、个人审核临时文件不入库。

作者上传前填写LICENSE年/作者，第三方素材保留原权利。Pages分支选择main/(root)，实际成功后再改部署状态，见 [部署说明](DEPLOYMENT.md)。
