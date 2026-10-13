> Module implementation notes from earlier development. Historical counts/examples are retained. Use the [current Step 8 report](../../docs/reports/STEP8_FINAL_REPORT.md) for current scope, coverage and verified gaps; use the root README for current run commands.

# 公开偏好数据 · 来源审查与限制

检索范围：TapTap、哔哩哔哩、NGA、贴吧、小红书、微博、Reddit、暖暖共鸣录、TierMaker、官方公告与公开问卷入口。每项具体来源的读取时间、平台、样本范围、类型、状态保存在 `input/preferences.json`；页面可展开“来源审查目录”和“检索记录”。没有查到可核验结果，不等于该平台绝不存在资料。

## 已纳入：四份独立投票

1. [龙猫偏好投票，N=62](https://www.taptap.cn/moment/700147148997528787)。首选默认样本；原选项为单选，双方偏好也单列选项。通过索引正文读取；原页直连失败。
2. [龙猫抽取意向，N=231](https://www.taptap.cn/moment/699902022945605493)。与上一份调查的问题、参与人群不同，分开选择，不合并。来源只显示月日，年份待核实。
3. [三生因缘外观评价，N=118](https://www.taptap.cn/moment/698970646377400845)。仅一套服装的评价，不是全目录人气榜，也不是免费活动的实际领取率。通过索引正文读取；直连失败。
4. [扇妖与鹿套抽取选择，N=253](https://www.taptap.cn/moment/766621634256701289)。来源讨论进化选择，但选项不提供逐形态数据，按套装家族映射；不推断原色与进化各自占比。

原比例、公示人数与选项保留在数据文件。本站只整理公开聚合数据，不采集参与者 UID、账户、用户名列表或个人发言档案，也不在原页面代替用户投票。

## 待补充或排除的来源

| 来源 | 当前能确认的内容 | 未进入相应分析的原因 |
| --- | --- | --- |
| [TapTap 集齐情况提问](https://www.taptap.cn/moment/731863866601898534) | N=74，公开是/否比例 | 文本未明确套装与形态，不能将 36.5% 映射到某套装完成率 |
| [TapTap 七张穿搭图投票](https://www.taptap.cn/moment/704349798681020221) | N=75，七个图片选项 | 可能为混搭，不能仅凭图片序号猜整套 ID |
| [暖暖共鸣录社区数据](https://gongeo.us/zh/global) | 公开社区统计入口 | 本次只读取到导航，没有完整当前样本与指标表 |
| [Reddit 社区共鸣讨论](https://www.reddit.com/r/InfinityNikki/comments/1kjhrxf/individual_pieces_droprate_from_700_players_pull/) | 帖子自述基于700+玩家上传记录 | 首个部件掉率不等于偏好、收入或持有率；自愿上传样本不代表全体玩家 |
| [TierMaker 社区分级](https://tiermaker.com/categories/online-games/infinity-nikki-all-outfits-evolutions-glow-ups-110-1211609) | 页面称81份分级表、更新2026-08-21 | 81份列表不一定是81位去重玩家；未读取到可映射的逐套分级结果 |
| [哔哩哔哩商城测评](https://www.bilibili.com/video/BV1YcPUzDEuS/) | 单个作者的服装测评 | 作者推荐度不是群体调查；播放、点赞不能当人数或支持票 |
| [官方2.2公告](https://infinitynikki.nuanpaper.com/news/738) | 版本及奖励信息 | 没有逐套收入或玩家完成率 |
| [官方2.7活动规则](https://infinitynikki.infoldgames.com/zh-TW/news/122) | 舞台美术投票规则 | 对象不是服装套装，不能转用于套装偏好 |
| [官方微博周年线索](https://www.weibo.com/7801655101/Qh0YZpuC2) | 索引中的周年回顾文字 | 未核验图片统计、分母、逐套对应关系 |
| [营销研究问卷入口](https://www.wjx.cn/vm/O4hZNH1.aspx) | 公开问卷题目 | 没有公开答卷汇总，不能当作已有调查结果 |

## 不可越过的统计边界

- **不把平台热度当全体玩家偏好**。所有结果注明平台、N、候选范围、获取时间与自愿参与偏差；不把多个投票人数相加后声称样本去重。
- **不混合评价含义**。喜爱、抽取意愿、实际拥有、部件完成度、收入与宣传曝光是不同变量。
- **不伪造精度**。整数票数未公布就保存 NULL；样本量不明就写未知；没有可靠对象映射的投票不进入排行。
- **不造历史曲线**。当前四份调查不能直接比较风格涨跌；收录时间不等于作答期，版本中的套装发布日也不是投票观测日。
- **不隐藏不完整**。来源清单中的待补充与排除项对用户可见。未收录不是零热度，不在问卷候选中的套装不应被标作冷门。
- **不把规则推荐叫预测准确率**。目前没有训练或评估人群偏好预测模型，推荐只是明确可解释的筛选规则。
