# 数据字典

SQL 中 NULL、JSON 中 null、CSV 空单元格均表示未收录；不代表 0、不适用或不存在。

## sources（15910 行）

每个不同资料地址一行；来源地址不等于本次重新抓取。

主键：source_id

| 字段 | 类型 | 必填 | 关联/取值 | 说明 |
|---|---|---|---|---|
| source_id | TEXT | 是 |  | URL 或本地资料标识的 SHA-256 稳定键 |
| url | TEXT | 是 |  | 原始地址或 local: 标识 |
| publisher | TEXT | 是 |  | 来源机构/资料库 |
| retrieved_date | TEXT | 否 |  | 现有快照记录的采集日期；没有具体时刻 |
| source_kind | TEXT | 是 | web / local | 来源类别 |

## objects（11469 行）

每个现有图鉴对象/形态一行，包括套装、部件、材料及其他道具、妆容、祝福闪光。

主键：object_id

| 字段 | 类型 | 必填 | 关联/取值 | 说明 |
|---|---|---|---|---|
| object_id | TEXT | 是 |  | 沿用网站 ID，例如 o10349、c1020100349、msol-fruit |
| game_id | INTEGER | 否 |  | 来源游戏 ID；材料等无 ID 时为 NULL |
| kind | TEXT | 是 | outfits / clothing / materials / makeups / eurekas | 对象类别 |
| display_name | TEXT | 是 |  | 原网站展示名称，不代表已译成中文 |
| rarity | INTEGER | 否 |  | 品质；原值 0 转为 NULL |
| style | TEXT | 否 | 甜美 / 性感 / 清新 / 帅气 / 典雅 | 主风格 |
| category | TEXT | 否 |  | 原网站类别 |
| obtain_text | TEXT | 否 |  | 实际获取说明；泛指“查看来源”的占位说明转为 NULL |
| obtain_status | TEXT | 是 | known / uncollected | known 有具体说明；uncollected 未采集 |
| image_ref | TEXT | 否 |  | 图片地址；有地址不等于可用 |
| source_id | TEXT | 是 | sources | 主要资料来源 |
| snapshot_source_date | TEXT | 是 |  | 原图鉴整理日期 |
| obtain_source_id | TEXT | 否 | sources | 获取途径的逐字段来源；独立材料指引保留其真实来源 |

## outfit_families（310 行）

每个独立套装家族一行；各进化、焕新与原色共用一个家族。

主键：family_id

| 字段 | 类型 | 必填 | 关联/取值 | 说明 |
|---|---|---|---|---|
| family_id | TEXT | 是 |  | family: + 原色套装 ID |
| base_outfit_id | TEXT | 是 | outfits | 唯一原色套装 ID |
| form_count | INTEGER | 是 |  | 本快照已收录形态数 |

## outfits（775 行）

每个套装形态一行。新增独立套装按家族原色计算，不能直接计本表行数。

主键：outfit_id

| 字段 | 类型 | 必填 | 关联/取值 | 说明 |
|---|---|---|---|---|
| outfit_id | TEXT | 是 | objects | 稳定套装形态 ID |
| family_id | TEXT | 否 | outfit_families | 独立套装家族 |
| base_outfit_id | TEXT | 否 | outfits | 原色 ID，原色自身指向自身 |
| form_type | TEXT | 是 | base / evolution / renewal / variant_unknown | base 原色/单形态；evolution 明确进化；renewal 焕新；variant_unknown 阶段未明 |
| is_base | INTEGER | 是 | 0 / 1 | 是否家族原色；1 或 0 |
| evolution_stage | INTEGER | 否 |  | 仅一进/二进能明确转为 1/2；满进和泛称不猜数值 |
| variation_label | TEXT | 否 |  | 保留来源形态名称，例如不可进化、满进 |
| source_group_order | INTEGER | 否 |  | 来源分组中的顺序，不表示进化等级 |

## clothing（8213 行）

每个服装部件形态一行；类别、风格、获取方式通过 objects 关联。

主键：clothing_id

| 字段 | 类型 | 必填 | 关联/取值 | 说明 |
|---|---|---|---|---|
| clothing_id | TEXT | 是 | objects | 部件 ID |
| base_clothing_id | TEXT | 否 | clothing | 来源分组中唯一原色部件 |
| is_variant | INTEGER | 是 | 0 / 1 | 来源是否标记变体 |
| variation_label | TEXT | 否 |  | 来源变体标签 |

## outfit_clothing（6766 行）

套装形态和其部件的多对多关系；双向列举只保留一行。

主键：outfit_id + clothing_id

| 字段 | 类型 | 必填 | 关联/取值 | 说明 |
|---|---|---|---|---|
| outfit_id | TEXT | 是 | outfits | 套装形态 ID |
| clothing_id | TEXT | 是 | clothing | 部件 ID |
| source_id | TEXT | 是 | sources | 关系来源 |

## materials（1781 行）

原网站 materials 类包含材料、货币、摆饰等，不全是采集材料。

主键：material_id

| 字段 | 类型 | 必填 | 关联/取值 | 说明 |
|---|---|---|---|---|
| material_id | TEXT | 是 | objects | 材料/道具稳定 ID |
| original_category | TEXT | 否 |  | 来源英文类别 |
| gathering_scope | TEXT | 是 | candidate / unassessed | candidate：Collection/Fishing/Animal-Grooming/Bug-Catching；其他暂未判定 |

## makeups（586 行）

每个妆容对象一行。

主键：makeup_id

| 字段 | 类型 | 必填 | 关联/取值 | 说明 |
|---|---|---|---|---|
| makeup_id | TEXT | 是 | objects | 妆容 ID |

## eurekas（114 行）

每个祝福闪光部位一行；scores 缺少明确等级语境，留在原始快照不混入服装属性。

主键：eureka_id

| 字段 | 类型 | 必填 | 关联/取值 | 说明 |
|---|---|---|---|---|
| eureka_id | TEXT | 是 | objects | 祝福闪光 ID |

## object_tags（14531 行）

每个对象的一个标签一行。

主键：object_id + tag

| 字段 | 类型 | 必填 | 关联/取值 | 说明 |
|---|---|---|---|---|
| object_id | TEXT | 是 | objects | 对象 ID |
| tag | TEXT | 是 |  | 来源标签 |

## object_names（57382 行）

每对象/语言一行标准名称记录，以及每个实际收录昵称一行。备用英文不计作目标语言翻译；未收录 name=NULL。

主键：name_id

| 字段 | 类型 | 必填 | 关联/取值 | 说明 |
|---|---|---|---|---|
| name_id | TEXT | 是 |  | 对象、语言、名称类型和昵称文本构成的稳定键 |
| object_id | TEXT | 是 | objects | 名称对应对象 |
| locale | TEXT | 是 | zh-CN / en / ja / ko / zh-TW | 语言 |
| name_type | TEXT | 是 | standard / nickname | standard 标准名称；nickname 人工收录昵称 |
| name | TEXT | 否 |  | 目标语言实有名称；未收录 NULL |
| display_fallback | TEXT | 否 |  | 网页目前展示的备用名称；不计翻译覆盖 |
| translation_status | TEXT | 是 | source / curated / missing / community | 来源提供/本站整理/缺失/社区昵称 |
| source_id | TEXT | 否 | sources | 标准名称来源；昵称多来源另见 name_sources |

## name_sources（39 行）

昵称与查证来源多对多关系，不把程序生成的“套/套装”搜索形式当作新昵称。

主键：name_id + source_id

| 字段 | 类型 | 必填 | 关联/取值 | 说明 |
|---|---|---|---|---|
| name_id | TEXT | 是 | object_names | 昵称记录 ID |
| source_id | TEXT | 是 | sources | 查证页面 |
| checked_date | TEXT | 否 |  | 原昵称库核对日期 |

## recipes（1363 行）

设计图或核验制作清单；scope 区分单部件与整套总量，不相互累加。

主键：recipe_id

| 字段 | 类型 | 必填 | 关联/取值 | 说明 |
|---|---|---|---|---|
| recipe_id | TEXT | 是 |  | design: + 来源设计图 ID |
| target_id | TEXT | 是 | objects | 制作目标 |
| design_id | INTEGER | 否 |  | 原始设计图 ID；整套汇总无设计图编号时为 NULL |
| scope | TEXT | 是 | clothing / whole_outfit / evolution / renewal / material | 部件、原色整套、独立进化步骤、焕新步骤或合成材料；不同粒度不累加 |
| checked_at | TEXT | 否 |  | 配方数量核对时间，非游戏推出日期 |
| source_published_date | TEXT | 否 |  | 来源页面更新日期 |
| access_method | TEXT | 否 | indexed_page / direct_page / manual | 读取方式 |
| note | TEXT | 否 |  | 适用口径及排除消耗 |
| output_quantity | INTEGER | 否 |  | 产出数量；未知保留 NULL |
| status | TEXT | 是 | design_only / partial / complete | design_only 尚无原料；partial 不完整；complete 完整 |
| source_id | TEXT | 是 | sources | 设计图来源 |
| source_type | TEXT | 否 | game_measured / official_wiki / community_wiki / community_post / guide_site / catalog | 数量来源类型 |
| checked_precision | TEXT | 否 | date / timestamp | 采集时刻精度 |
| prerequisite | TEXT | 否 |  | 进化/焕新前置状态；不计入本步骤消耗 |
| source_confidence | TEXT | 否 | high / medium / low | 来源置信度；不是概率 |
| source_title | TEXT | 否 |  | 具体页面/帖子标题 |
| current_game_measured | INTEGER | 否 | 0 / 1 | 是否当前版本游戏内真人实测；未知NULL |

## recipe_ingredients（2021 行）

配方的一项原料及数量；缺失不表示不消耗。整套汇总仅挂整套目标，不推测部件分摊。

主键：recipe_id + material_id

| 字段 | 类型 | 必填 | 关联/取值 | 说明 |
|---|---|---|---|---|
| recipe_id | TEXT | 是 | recipes | 配方 ID |
| material_id | TEXT | 是 | materials | 原料 ID |
| quantity | REAL | 是 |  | 所需数量，必须大于 0 |
| source_id | TEXT | 是 | sources | 数量查证来源 |
| unit | TEXT | 否 | count / kg | 数量单位：件或千克 |

## material_usage_mentions（49 行）

材料资料提及某套装的关系，没有数量，也不代表整套共用配方。

主键：material_id + outfit_id

| 字段 | 类型 | 必填 | 关联/取值 | 说明 |
|---|---|---|---|---|
| material_id | TEXT | 是 | materials | 材料 ID |
| outfit_id | TEXT | 是 | outfits | 被提及套装 |
| source_id | TEXT | 是 | sources | 使用说明来源 |

## versions（24 行）

来源的图鉴版本/季节名称；不从名称猜测版本号。当前目录版本 2.9.2 只记于快照。

主键：version_id

| 字段 | 类型 | 必填 | 关联/取值 | 说明 |
|---|---|---|---|---|
| version_id | TEXT | 是 |  | 来源季节名称的稳定键 |
| label | TEXT | 是 |  | 版本/季节标签 |
| version_number | TEXT | 否 |  | 明确版本号；当前未采集 |
| source_id | TEXT | 是 | sources | 标签来源 |
| number_source_id | TEXT | 否 | sources | 明确版本号的独立核对来源 |

## releases（52 行）

一个来源实装标记一行；首日期仅为来源标记日期，保留测试版本和注释，不能解释为活动起止时间。

主键：release_id

| 字段 | 类型 | 必填 | 关联/取值 | 说明 |
|---|---|---|---|---|
| release_id | TEXT | 是 |  | 完整原文标签的稳定键 |
| label | TEXT | 是 |  | 原文实装标签 |
| release_date | TEXT | 否 |  | 原文起始 YYYY.MM.DD 解析日期；缺失 NULL |
| context | TEXT | 是 | public_release / test_release | public_release/test_release；包含测试文字的条目单独标记 |
| source_id | TEXT | 是 | sources | 实装标签来源 |

## object_releases（2276 行）

对象与来源季节、实装标记的关联。只记录实际已有字段。

主键：object_id

| 字段 | 类型 | 必填 | 关联/取值 | 说明 |
|---|---|---|---|---|
| object_id | TEXT | 是 | objects | 对象 ID |
| version_id | TEXT | 否 | versions | 版本/季节标签 |
| release_id | TEXT | 否 | releases | 实装标记 |
| source_id | TEXT | 是 | sources | 该对象实装说明页面 |

## events（5 行）

正式活动表；活动时间范围尚未采集，保留空表，不将版本发布日期当活动起止。

主键：event_id

| 字段 | 类型 | 必填 | 关联/取值 | 说明 |
|---|---|---|---|---|
| event_id | TEXT | 是 |  | 后续使用来源活动 ID 或稳定来源键 |
| name | TEXT | 是 |  | 活动名称 |
| version_id | TEXT | 否 | versions | 关联版本 |
| start_date | TEXT | 否 |  | 活动开始日期 |
| end_date | TEXT | 否 |  | 活动结束日期 |
| source_id | TEXT | 是 | sources | 活动资料来源 |
| start_datetime | TEXT | 否 |  | 精确开始时间；仅有更新后开放条件时保留NULL |
| end_datetime | TEXT | 否 |  | 带时区的公告结束时间 |
| time_zone | TEXT | 否 |  | 来源公告时区，不与网站本地时区混淆 |
| start_condition | TEXT | 否 |  | 如after_version_update；不以计划维护结束时刻冒充实际开启 |
| date_basis | TEXT | 否 |  | publisher_announced_schedule 公告排期，非实时开放状态 |
| checked_at | TEXT | 否 |  | 核对时间 |

## event_objects（8 行）

活动和对象的关联及获取条件，尚未采集。

主键：event_id + object_id

| 字段 | 类型 | 必填 | 关联/取值 | 说明 |
|---|---|---|---|---|
| event_id | TEXT | 是 | events | 活动 ID |
| object_id | TEXT | 是 | objects | 对象 ID |
| obtain_condition | TEXT | 否 |  | 该活动内的获取条件 |
| source_id | TEXT | 是 | sources | 关联来源 |

## gathering_areas（394 行）

材料的区域级说明，不是精确采集点。

主键：area_record_id

| 字段 | 类型 | 必填 | 关联/取值 | 说明 |
|---|---|---|---|---|
| area_record_id | TEXT | 是 |  | 材料 ID + 区域名称的稳定键 |
| material_id | TEXT | 是 | materials | 材料 ID |
| region | TEXT | 是 |  | 区域名称 |
| condition_text | TEXT | 否 |  | 已收录采集说明 |
| source_id | TEXT | 是 | sources | 区域攻略来源 |
| source_published_date | TEXT | 否 |  | 原攻略日期，不是本次核对时间 |

## gathering_points（0 行）

精确采集点；目前无已核实坐标，空表。设计图宝箱坐标不混入材料点位。

主键：point_id

| 字段 | 类型 | 必填 | 关联/取值 | 说明 |
|---|---|---|---|---|
| point_id | TEXT | 是 |  | 地图来源原始点位 ID 的稳定映射 |
| material_id | TEXT | 是 | materials | 材料 ID |
| region | TEXT | 是 |  | 区域 |
| x | REAL | 是 |  | 游戏地图 X 坐标 |
| y | REAL | 是 |  | 游戏地图 Y 坐标 |
| coordinate_system | TEXT | 是 |  | 地图坐标系，不能当作地理经纬度 |
| condition_text | TEXT | 否 |  | 采集条件 |
| source_id | TEXT | 是 | sources | 点位来源 |

## source_assertions（37628 行）

现有网站与 BWIKI 对同一对象、字段的断言；BWIKI 仅用同类别唯一名称匹配。

主键：assertion_id

| 字段 | 类型 | 必填 | 关联/取值 | 说明 |
|---|---|---|---|---|
| assertion_id | TEXT | 是 |  | 对象+字段+来源+值的稳定键 |
| object_id | TEXT | 是 | objects | 对象 ID |
| field | TEXT | 是 | rarity / style / obtain_text | 对比字段 |
| value | TEXT | 是 |  | 来源原值 |
| source_id | TEXT | 是 | sources | 断言来源 |
| match_method | TEXT | 是 | existing_id / unique_name / reviewed_guidance | existing_id、unique_name 或 reviewed_guidance |
| raw_value | TEXT | 否 |  | 原始断言；规范化品质比较仍保留原文 |

## source_conflicts（1897 行）

可比字段的来源差异候选；文字差异不直接认定谁错，也不自动覆盖。

主键：conflict_id

| 字段 | 类型 | 必填 | 关联/取值 | 说明 |
|---|---|---|---|---|
| conflict_id | TEXT | 是 |  | 对象+字段+断言对的稳定键 |
| object_id | TEXT | 是 | objects | 对象 ID |
| field | TEXT | 是 |  | 差异字段 |
| left_assertion_id | TEXT | 是 | source_assertions | 网站断言 |
| right_assertion_id | TEXT | 是 | source_assertions | 对照断言 |
| status | TEXT | 是 | needs_review | 待人工复核 |

## image_checks（11469 行）

每个对象的主图一行。只检查本地 PNG 文件，外链保持未检查，不把 URL 存在当作成功。

主键：object_id

| 字段 | 类型 | 必填 | 关联/取值 | 说明 |
|---|---|---|---|---|
| object_id | TEXT | 是 | objects | 对象 ID |
| image_ref | TEXT | 否 |  | 主图路径/地址 |
| status | TEXT | 是 | local_verified / local_invalid / missing / remote_unchecked / remote_verified / remote_failed | 本地可读、损坏、缺失、外链未检查 |
| checked_at | TEXT | 否 |  | 实际本地检查时间；未检查为 NULL |
| check_method | TEXT | 是 |  | png_signature_dimensions 或 not_checked |
| source_id | TEXT | 是 | sources | 图片资料来源 |
| http_status | INTEGER | 否 |  | 外链实测HTTP状态，未测时NULL |
| content_type | TEXT | 否 |  | 响应Content-Type，不能只凭URL判断 |

## snapshots（1 行）

内容寻址快照；输入相同重复运行不会产生新数据快照。

主键：snapshot_id

| 字段 | 类型 | 必填 | 关联/取值 | 说明 |
|---|---|---|---|---|
| snapshot_id | TEXT | 是 |  | 输入、规范化表和模式内容散列生成的稳定键 |
| previous_snapshot_id | TEXT | 否 | snapshots | 前一快照 |
| created_at | TEXT | 是 |  | 首次生成此快照的 UTC 时间 |
| source_date | TEXT | 否 |  | 原目录整理日期 |
| catalog_version | TEXT | 否 |  | 资料来源目录版本，不代表所有对象推出版本 |
| catalog_generated_at | TEXT | 否 |  | 目录来源生成时刻 |
| object_count | INTEGER | 是 |  | 本快照对象数 |
| is_baseline | INTEGER | 是 | 0 / 1 | 首次建档 1；后续 0 |
| input_manifest_json | TEXT | 是 |  | 输入文件的 SHA-256 与字节数，JSON |

## change_log（1 行）

首快照记录 baseline；后续按表主键比较新增/修改/删除。网页更新不等于新增游戏内容。

主键：change_id

| 字段 | 类型 | 必填 | 关联/取值 | 说明 |
|---|---|---|---|---|
| change_id | TEXT | 是 |  | 快照+表+主键+操作的稳定键 |
| snapshot_id | TEXT | 是 | snapshots | 发生变动的快照 |
| table_name | TEXT | 是 |  | 发生变化的规范表名 |
| row_key | TEXT | 是 |  | 表主键的 JSON；baseline 为 * |
| change_type | TEXT | 是 | baseline / added / modified / deleted | baseline/added/modified/deleted |
| before_json | TEXT | 否 |  | 变更前行，首建档/新增为 NULL |
| after_json | TEXT | 否 |  | 变更后行，首建档/删除为 NULL |

## outfit_recipe_status（775 行）

每个套装形态一行，构建自动生成；无检索结果不能标成未公开。

主键：outfit_id

| 字段 | 类型 | 必填 | 关联/取值 | 说明 |
|---|---|---|---|---|
| outfit_id | TEXT | 是 | outfits | 套装形态 |
| status | TEXT | 是 | complete / missing_entry / unpublished / not_crafting / evolution_pending / renewal_pending / variant_pending / conflict | 配方就绪、待录入、明确未公开、直接获取或形态消耗待补 |
| needs_recipe | INTEGER | 是 | 0 / 1 | 是否纳入待核对制作/形态消耗范围 |
| recipe_id | TEXT | 否 | recipes | 可计算配方 |
| reason | TEXT | 是 |  | 状态原因 |
| source_id | TEXT | 是 | sources | 目录来源 |
| checked_at | TEXT | 否 |  | 数量或显式状态核对日期；自动目录分类保持 NULL |
| evidence_url | TEXT | 否 |  | 显式状态断言证据；未公开必须有证据 |

## material_guidance（356 行）

每个已有获取指引的材料一行；未知区域不推测坐标。

主键：material_id

| 字段 | 类型 | 必填 | 关联/取值 | 说明 |
|---|---|---|---|---|
| material_id | TEXT | 是 | materials | 材料 ID |
| kind | TEXT | 是 | gathering / non_gathering | 野外或非野外获取 |
| text | TEXT | 是 |  | 已核对获取说明 |
| source_id | TEXT | 是 | sources | 来源 |
| checked_at | TEXT | 是 |  | 核对时刻 |

## version_calendar（3 行）

有官方公告依据的版本日历；只覆盖已核对的版本，不拿网站采集时间补齐。

主键：version_id

| 字段 | 类型 | 必填 | 关联/取值 | 说明 |
|---|---|---|---|---|
| version_id | TEXT | 是 | versions | 对应来源版本标签 |
| version_number | TEXT | 是 |  | 公告版本号 |
| launch_date | TEXT | 是 |  | 公告推出日期；使用来源时区日期 |
| time_zone | TEXT | 是 |  | 公告时区 |
| date_basis | TEXT | 是 | publisher_announced_update_day | 日期性质 |
| source_id | TEXT | 是 | sources | 官方公告 |
| source_published_date | TEXT | 否 |  | 公告发布日期，与推出日期分开 |
| checked_at | TEXT | 否 |  | 核对日期时间 |

## evolution_requirements（99 行）

进化所需的对象副本前置；不能把所需拥有数直接解释为实际消耗数。

主键：outfit_id + required_object_id

| 字段 | 类型 | 必填 | 关联/取值 | 说明 |
|---|---|---|---|---|
| outfit_id | TEXT | 是 | outfits | 目标进化形态 |
| required_object_id | TEXT | 是 | objects | 所需原色或部件 |
| required_quantity | INTEGER | 是 |  | 前置拥有数 |
| requirement_type | TEXT | 是 | owned_copies / listed_input_copies | 前置类型 |
| consumed_quantity | INTEGER | 否 |  | 实扣数量；未知NULL |
| source_id | TEXT | 是 | sources | 明确数量来源 |
| checked_at | TEXT | 是 |  | 来源核对时间 |

## evolution_observations（274 行）

逐形态公开资料查询记录。分开记录材料、资源及属性上下文缺口；检索不到不证明未公开。

主键：outfit_id

| 字段 | 类型 | 必填 | 关联/取值 | 说明 |
|---|---|---|---|---|
| outfit_id | TEXT | 是 | outfits | 进化形态 |
| base_id | TEXT | 是 | outfits | 家族原色 |
| cost_status | TEXT | 是 | complete / pending_not_recorded / explicit_unpublished / partial_confirmed | 步骤消耗完整性 |
| attribute_status | TEXT | 是 | partial_level_unverified / pending / verified | 同等级属性变化核对状态 |
| before_scores | TEXT | 否 |  | 来源数字JSON；等级未核实不得相减 |
| after_scores | TEXT | 否 |  | 来源数字JSON；等级未核实不得相减 |
| before_source_id | TEXT | 否 | sources | 原色属性来源 |
| after_source_id | TEXT | 否 | sources | 进化属性来源 |
| checked_at | TEXT | 是 |  | 采集时间 |
| note | TEXT | 是 |  | 上下文和局限 |



## 区域背景图资产（不属于地理点位）

资产配置：`data/input/region-banners.json`；检测结果：`data/input/region-banner-checks.json`；目录：`src/assets/region-banners/`。

| 字段 | 含义 |
|---|---|
| id / slug / region | 稳定区域资产ID、ASCII文件名、区域名 |
| primary_path / fallback_path | 相对src入口的主资源/独立SVG兜底资源 |
| image_kind | official_scenery / official_promo / official_event / official_overview / user_screenshot_restored / placeholder |
| region_specific | 来源是否明确指向该具体区域；Stonewoods合并图为false |
| source_page / source_image / retrieved_at | 来源页、原资源地址、实际下载时间；占位为空 |
| rights_owner / source_status | 原有权利与来源状态；占位不算官方照片 |
| original_file / original_sha256 / processing | 用户截图原件位置、哈希、修复方式与处理后哈希 |
| dimensions / object_position / palette | 原图尺寸、CSS视窗构图、独立主题颜色 |
| checks.primary / checks.fallback | 大小写、文件魔数、字节数与SHA256；非代替浏览器解码 |

[逐区域状态清单](../docs/REGION_BANNER_STATUS.md)。背景可用率包括占位，官方图片覆盖率单列；会话实际成功率与构建检测分开，不将9/9可显示说成9/9官方实景。


## Readable joined exports

These UTF-8 BOM CSV views are derived by `node scripts/export-final-data.mjs`; no IDs, quantities or evidence are invented. Empty cells mean unknown/not applicable, not zero. The 32 normalized tables in `dataset/csv/` are authoritative.

### outfits.csv

One row per outfit form; base, evolution and glow-up have different IDs. Rows: 775.

Fields: `outfit_id`, `family_id`, `base_outfit_id`, `form_type`, `is_base`, `evolution_stage`, `variation_label`, `source_group_order`, `display_name`, `name_zh-CN`, `name_en`, `name_ja`, `name_ko`, `name_zh-TW`, `rarity`, `style`, `category`, `obtain_text`, `obtain_status`, `image_ref`, `source_id`, `source_url`, `source_date`, `recipe_status`, `needs_recipe`, `recipe_id`, `recipe_gap_reason`.

Inherited fields retain the types, nullability and source definitions of the tables above. `name_*` and `*_name` are TEXT joins from object_names/objects. `source_url` and `*_source_url` are TEXT joins from sources. `recipe_status`, `needs_recipe`, `recipe_gap_reason` come from outfit_recipe_status. `additional_source_ids` and `additional_source_urls` are JSON arrays of secondary name_sources evidence; no evidence means `[]`.

### clothing.csv

One row per clothing object/variant; outfit membership remains in outfit_clothing. Rows: 8213.

Fields: `clothing_id`, `base_clothing_id`, `is_variant`, `variation_label`, `display_name`, `name_zh-CN`, `name_en`, `name_ja`, `name_ko`, `name_zh-TW`, `rarity`, `style`, `category`, `obtain_text`, `obtain_status`, `image_ref`, `source_id`, `source_url`, `source_date`.

Inherited fields retain the types, nullability and source definitions of the tables above. `name_*` and `*_name` are TEXT joins from object_names/objects. `source_url` and `*_source_url` are TEXT joins from sources. `recipe_status`, `needs_recipe`, `recipe_gap_reason` come from outfit_recipe_status. `additional_source_ids` and `additional_source_urls` are JSON arrays of secondary name_sources evidence; no evidence means `[]`.

### materials.csv

Materials and other inventory objects; not all rows are gatherable. Rows: 1781.

Fields: `material_id`, `original_category`, `gathering_scope`, `display_name`, `name_zh-CN`, `name_en`, `name_ja`, `name_ko`, `name_zh-TW`, `rarity`, `style`, `category`, `obtain_text`, `obtain_status`, `image_ref`, `source_id`, `source_url`, `source_date`.

Inherited fields retain the types, nullability and source definitions of the tables above. `name_*` and `*_name` are TEXT joins from object_names/objects. `source_url` and `*_source_url` are TEXT joins from sources. `recipe_status`, `needs_recipe`, `recipe_gap_reason` come from outfit_recipe_status. `additional_source_ids` and `additional_source_urls` are JSON arrays of secondary name_sources evidence; no evidence means `[]`.

### recipes.csv

One row per recipe ingredient; incomplete/design-only recipes retained with blank ingredients. Filter status=complete and scope before computing. Rows: 2933.

Fields: `recipe_id`, `target_id`, `design_id`, `scope`, `checked_at`, `source_published_date`, `access_method`, `note`, `output_quantity`, `status`, `source_id`, `target_name`, `recipe_source_url`, `material_id`, `material_name`, `quantity`, `unit`, `ingredient_source_id`, `ingredient_source_url`, `source_confidence`, `source_title`, `current_game_measured`, `source_type`, `checked_precision`, `prerequisite`.

Inherited fields retain the types, nullability and source definitions of the tables above. `name_*` and `*_name` are TEXT joins from object_names/objects. `source_url` and `*_source_url` are TEXT joins from sources. `recipe_status`, `needs_recipe`, `recipe_gap_reason` come from outfit_recipe_status. `additional_source_ids` and `additional_source_urls` are JSON arrays of secondary name_sources evidence; no evidence means `[]`.

### aliases.csv

Formal multilingual names and sourced aliases together; use name_type to distinguish. Rows: 57382.

Fields: `name_id`, `object_id`, `locale`, `name_type`, `name`, `display_fallback`, `translation_status`, `source_id`, `object_kind`, `object_display_name`, `source_url`, `additional_source_ids`, `additional_source_urls`.

Inherited fields retain the types, nullability and source definitions of the tables above. `name_*` and `*_name` are TEXT joins from object_names/objects. `source_url` and `*_source_url` are TEXT joins from sources. `recipe_status`, `needs_recipe`, `recipe_gap_reason` come from outfit_recipe_status. `additional_source_ids` and `additional_source_urls` are JSON arrays of secondary name_sources evidence; no evidence means `[]`.
