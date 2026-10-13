> Module implementation notes from earlier development. Historical counts/examples are retained. Use the [current Step 8 report](../../../docs/reports/STEP8_FINAL_REPORT.md) for current scope, coverage and verified gaps; use the root README for current run commands.

# 搜索使用分析：设计方案，未启用

本文件不授权实施采集。网站没有新增搜索/点击监听器、上传请求、遥测存储或同意弹窗。以下内容是未来开发的设计，不是正在运行的功能。当前不存在真实日志，不能展示真实使用指标。

## 同意与数据流

1. 默认关闭。未来启用前，先明确目的、字段、保留时间、接收方、删除入口；用户主动勾选同意，拒绝不影响搜索。
2. 分开同意“参与计数分析”和“提交脱敏查询词”。前者只提交查询类别、结果数、点击 ID；后者另行选择，不能捆绑授权。
3. 浏览器本地检查邮件、手机号、链接、账号等疑似个人内容；检测不能保证完全去标识。无法确认安全时丢弃文本，只保留查询类别。不保存原始查询副本。
4. 未来服务器需禁用应用日志中的 IP、请求体、User-Agent、Referer、URL 查询参数；代理日志也需要独立核查。这些条件未验证前不得称为匿名收集。
5. 不使用登录、设备 ID、Cookie ID、游戏账号或持久会话 ID。随机事件 ID 仅用于去重；某次点击关联自己的搜索事件，不跨查询追踪个人。
6. 撤回凭据本地生成，数据库只保存其摘要用于定位删除；凭据单独存放。摘要依然可关联某批记录，因此整个方案是尽量减少身份信息，并非已证明严格匿名。
7. 建议保留 30 天，按小时 UTC 粒度记录；用户可撤回并删除自己提交的记录。小样本热门词不发布（建议每词至少 10 个事件；事件数不等于独立人数）。搜索词人工审核后才能公开。

## 拟定字段

|字段|类型|目的及限制|
|---|---|---|
|event_id|随机 UUID|一次查询的去重 ID，无跨查询用户标识|
|query_category|枚举|formal/alias/pinyin/partial/descriptive/multilingual/other/unknown；分类器版本必须记录，自动分类不是人工事实|
|query_text_redacted|可空文本|经单独同意、本地脱敏后最多 100 字；默认 NULL，不存原始词|
|result_count|非负整数|该查询返回的结果总数|
|clicked_object_id|可空稳定对象 ID|第一条结果点击，未点击为 NULL；校验对象存在|
|first_click_rank|可空正整数|点击位置，用于排序诊断；不等同相关性标签|
|timestamp_hour|UTC 小时|不记录秒级完整时间|
|search_method_version|字符串|实际线上搜索版本，不混合算法版本比较|
|classifier_version|字符串|类别规则版本|
|explicit_feedback|可空枚举|helpful/unhelpful，用户主动反馈|
|consent_version|字符串|同意文案版本|
|consent_receipt_hash|摘要|仅用于撤回，独立授权表；仍有间接关联风险|
|expires_at|UTC 日期时间|自动清除到期事件|

点击可更新该事件，事件仅保留首次点击，不生成跨页面浏览轨迹。无点击不等于低满意度：用户可能直接从结果读到答案，也可能离开或被打断。

## 指标与分母

- 零结果率：result_count=0 的查询事件 / 全部有效且已同意的查询事件。
- 热门查询：有文本授权且非空的脱敏规范化词，按事件次数统计。不能代表全部用户；排除测试事件、疑似敏感文本、过小桶。
- 无点击率：result_count>0 且 clicked_object_id=NULL / result_count>0。只能作诊断信号，不直接命名为满意度。
- 主动负反馈率：unhelpful / 有反馈的事件，报告反馈覆盖率；样本存在自选择偏差。
- 低满意度候选：高频零结果词、重复反馈为 unhelpful 的词。候选列表需复核，不能由一次无点击判断。
- 逐类别、算法版本报告。没有会话/用户标识，不能估计独立用户数、回访率或每人偏好。

计数仅代表主动参与样本。原色与进化点击 ID 保留实际形态，不悄悄合并；需要按套装家族分析时另行标注口径。

## 验收门槛（未来实施）

拒绝、未选择或撤回后不得生成记录；个人衣橱、材料库存和小精灵对话不进入日志；敏感词被丢弃；后台删除和 30 天过期任务可验证；所有代理日志配置已核查；未获授权不发布个体词条。当前仅有 SQL 设计，未建立采集端或服务器。
