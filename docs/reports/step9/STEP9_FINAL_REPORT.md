# Step9 剩余配方与进化数据全面搜索结果

完成日期：2026-10-12（Asia/Singapore）。来源采集时间另以带时区的UTC时间逐条保留。快照：`snapshot:40476599ebb8f4049129085c`。

## 补全统计

|项目|初始缺口|本轮完整补全|仍缺|
|---|---:|---:|---:|
|原色配方|11|6|5|
|进化资源清单|257|76|181|

完整补全82个对象：高置信度1、中置信度81、低置信度0。另有64个进化对象只确认副本或部分输入，仍在181条缺口中。2个早期“省略徽标可能为1”的推断候选独立存档，后来有实际Wiki数量可替代；推断从未进入配方或覆盖率。置信度是来源证据强度，不是统计概率或当前游戏真人实测。

## 方法与访问边界

原始268个对象逐项提交官方候选域、Fandom、中文社区（NGA/贴吧/小红书/微博/TapTap）、视频/海外（B站/YouTube/Reddit/Game8）和日文目标查询；另查88个部件的Wiki/社区配方，并直接读取BWIKI公开API渲染页。原始模板文本没有配方字段不等于渲染页面没有：本轮52个部件设计图含明确制作花费与材料数量。

这是公开检索索引和实际可读页面的组合；未登录平台、未进入私人Discord、没有宣称完整读取评论。索引结果为空不能证明官方未公开。Game8自身提示1.6后停止维护，旧攻略不冒充当前版本实测。官方公告能确认部分获取/图纸范围，但没有据此推测完整数量。无正规官方Wiki来源时，社区Wiki明确记作社区。

完整初始清单：[11套原色](INITIAL_BASE_GAPS.csv)、[257进化](INITIAL_EVOLUTION_GAPS.csv)。查询计划、逐批执行记录、日文/部件检索、BWIKI修订号与数量事实在 `data/research/step9/`。满进未明确直接前驱时保留待核，不能猜阶段数或用户拥有状态。

## 所有完整补全对象

|ID|对象名称|补全内容|具体来源|置信度|
|---|---|---|---|---|
|o10054|甜酷交锋|原色整套逐部件配方|[BWIKI 甜酷交锋逐部件设计图汇总](https://wiki.biligame.com/wxnn/index.php?title=%E9%83%A8%E4%BB%B6%E9%A3%92%E5%BF%83%E6%8E%A0%E5%BD%B1&oldid=68248)|中|
|o10067|绿韵心弦|原色整套逐部件配方|[BWIKI 绿韵心弦逐部件设计图汇总](https://wiki.biligame.com/wxnn/index.php?title=%E9%83%A8%E4%BB%B6%E5%B9%B4%E8%BD%AE%E8%AE%B0%E5%BF%86&oldid=67198)|中|
|o10082|云隙的针脚|原色整套逐部件配方|[BWIKI 云隙的针脚逐部件设计图汇总](https://wiki.biligame.com/wxnn/index.php?title=%E9%83%A8%E4%BB%B6%E7%BC%B1%E7%BB%BB%E4%BA%91%E4%B8%9D&oldid=68554)|中|
|o10214|启源造律|原色整套逐部件配方|[BWIKI 启源造律逐部件设计图汇总](https://wiki.biligame.com/wxnn/index.php?title=%E9%83%A8%E4%BB%B6%E9%A3%8E%E5%90%AF%E7%BA%AA%E5%85%83&oldid=68257)|中|
|o10304|咏赞黄昏|原色整套逐部件配方|[BWIKI 咏赞黄昏逐部件设计图汇总](https://wiki.biligame.com/wxnn/index.php?title=%E9%83%A8%E4%BB%B6%E4%B8%8D%E8%90%BD%E9%BB%8E%E5%85%89&oldid=68298)|高|
|o10342|星跳记忆|原色整套逐部件配方|[BWIKI 星跳记忆逐部件设计图汇总](https://wiki.biligame.com/wxnn/index.php?title=%E9%83%A8%E4%BB%B6%E7%92%A8%E5%A6%82%E6%B5%81%E6%98%9F&oldid=51412)|中|
|o1000102|绽响黎明前·小夜灯|本阶段进化资源|[Dance Till Dawn: Nightlight | Infinity Nikki Wiki | Fandom](https://infinity-nikki.fandom.com/wiki/Dance_Till_Dawn%3A_Nightlight)|中|
|o1000103|绽响黎明前·小石船|本阶段进化资源|[Dance Till Dawn: Boat | Infinity Nikki Wiki | Fandom](https://infinity-nikki.fandom.com/wiki/Dance_Till_Dawn%3A_Boat)|中|
|o1001102|深林遥梦·暮歌|本阶段进化资源|[Deepwood Dream: Twilight Song | Infinity Nikki Wiki | Fandom](https://infinity-nikki.fandom.com/wiki/Deepwood_Dream%3A_Twilight_Song)|中|
|o1003302|天鹅童话·入梦|本阶段进化资源|[Fairytale Swan: Dream | Infinity Nikki Wiki | Fandom](https://infinity-nikki.fandom.com/wiki/Fairytale_Swan%3A_Dream)|中|
|o1003303|天鹅童话·谜焰|本阶段进化资源|[Fairytale Swan: Mystfire | Infinity Nikki Wiki | Fandom](https://infinity-nikki.fandom.com/wiki/Fairytale_Swan%3A_Mystfire)|中|
|o1006202|心愿金蔷薇·绽放|本阶段进化资源|[Wishful Aurosa: Blooming | Infinity Nikki Wiki | Fandom](https://infinity-nikki.fandom.com/wiki/Wishful_Aurosa%3A_Blooming)|中|
|o1006203|心愿金蔷薇·迟明|本阶段进化资源|[Wishful Aurosa: Daybreak | Infinity Nikki Wiki | Fandom](https://infinity-nikki.fandom.com/wiki/Wishful_Aurosa%3A_Daybreak)|中|
|o1006204|心愿金蔷薇·暗蚀|本阶段进化资源|[Wishful Aurosa: Shadow | Infinity Nikki Wiki | Fandom](https://infinity-nikki.fandom.com/wiki/Wishful_Aurosa%3A_Shadow)|中|
|o1009302|群星绽放时·坠梦|本阶段进化资源|[Blossoming Stars: Dreamfall | Infinity Nikki Wiki | Fandom](https://infinity-nikki.fandom.com/wiki/Blossoming_Stars%3A_Dreamfall)|中|
|o1009303|群星绽放时·星影|本阶段进化资源|[Blossoming Stars: Starlight | Infinity Nikki Wiki | Fandom](https://infinity-nikki.fandom.com/wiki/Blossoming_Stars%3A_Starlight)|中|
|o1009502|心湖涟漪·初虹|本阶段进化资源|[Heartlake Ripples: Rainbow | Infinity Nikki Wiki | Fandom](https://infinity-nikki.fandom.com/wiki/Heartlake_Ripples%3A_Rainbow)|中|
|o1011702|缀夜希光·灼焰|本阶段进化资源|[Stardust Flare: Blaze | Infinity Nikki Wiki | Fandom](https://infinity-nikki.fandom.com/wiki/Stardust_Flare%3A_Blaze)|中|
|o1011703|缀夜希光·迷金|本阶段进化资源|[Stardust Flare: Golden | Infinity Nikki Wiki | Fandom](https://infinity-nikki.fandom.com/wiki/Stardust_Flare%3A_Golden)|中|
|o1012802|咏叹银夜莺·化歌|本阶段进化资源|[Silvergale's Aria: Melody | Infinity Nikki Wiki | Fandom](https://infinity-nikki.fandom.com/wiki/Silvergale%27s_Aria%3A_Melody)|中|
|o1012903|翩翩愿飞去·昔影|本阶段进化资源|[Wings of Wishes: Past | Infinity Nikki Wiki | Fandom](https://infinity-nikki.fandom.com/wiki/Wings_of_Wishes%3A_Past)|中|
|o1014502|谕浪希声·脉语|本阶段进化资源|[Whispers of Waves: Echoes | Infinity Nikki Wiki | Fandom](https://infinity-nikki.fandom.com/wiki/Whispers_of_Waves%3A_Echoes)|中|
|o1014503|谕浪希声·森迹|本阶段进化资源|[Whispers of Waves: Forest | Infinity Nikki Wiki | Fandom](https://infinity-nikki.fandom.com/wiki/Whispers_of_Waves%3A_Forest)|中|
|o1015402|仙踪绮遇·雪旅|本阶段进化资源|[Enchanted Encounter: Snowcrest | Infinity Nikki Wiki | Fandom](https://infinity-nikki.fandom.com/wiki/Enchanted_Encounter%3A_Snowcrest)|中|
|o1015403|仙踪绮遇·明光|本阶段进化资源|[Enchanted Encounter: Gleam | Infinity Nikki Wiki | Fandom](https://infinity-nikki.fandom.com/wiki/Enchanted_Encounter%3A_Gleam)|中|
|o1016102|花漾梦萦·暗潮|本阶段进化资源|[Blooming Dreams: Tides | Infinity Nikki Wiki | Fandom](https://infinity-nikki.fandom.com/wiki/Blooming_Dreams%3A_Tides)|中|
|o1016103|花漾梦萦·萤光|本阶段进化资源|[Blooming Dreams: Glow | Infinity Nikki Wiki | Fandom](https://infinity-nikki.fandom.com/wiki/Blooming_Dreams%3A_Glow)|中|
|o1016202|雪境长歌·危火|本阶段进化资源|[Snowy Ballad: Flame | Infinity Nikki Wiki | Fandom](https://infinity-nikki.fandom.com/wiki/Snowy_Ballad%3A_Flame)|中|
|o1016203|雪境长歌·心誓|本阶段进化资源|[Snowy Ballad: Oath | Infinity Nikki Wiki | Fandom](https://infinity-nikki.fandom.com/wiki/Snowy_Ballad%3A_Oath)|中|
|o1016502|晶莹诗集·寒夜雪|本阶段进化资源|[Crystal Poems: Snow | Infinity Nikki Wiki | Fandom](https://infinity-nikki.fandom.com/wiki/Crystal_Poems%3A_Snow)|中|
|o1016503|晶莹诗集·春日境|本阶段进化资源|[Crystal Poems: Spring | Infinity Nikki Wiki | Fandom](https://infinity-nikki.fandom.com/wiki/Crystal_Poems%3A_Spring)|中|
|o1017802|炽羽不渝·落羽|本阶段进化资源|[Crimson Feather: Ember | Infinity Nikki Wiki | Fandom](https://infinity-nikki.fandom.com/wiki/Crimson_Feather%3A_Ember)|中|
|o1017803|炽羽不渝·焚风|本阶段进化资源|[Crimson Feather: Blaze | Infinity Nikki Wiki | Fandom](https://infinity-nikki.fandom.com/wiki/Crimson_Feather%3A_Blaze)|中|
|o1018302|古典乐章·交响曲|本阶段进化资源|[Timeless Melody: Symphony | Infinity Nikki Wiki | Fandom](https://infinity-nikki.fandom.com/wiki/Timeless_Melody%3A_Symphony)|中|
|o1018303|古典乐章·变奏曲|本阶段进化资源|[Timeless Melody: Variations | Infinity Nikki Wiki | Fandom](https://infinity-nikki.fandom.com/wiki/Timeless_Melody%3A_Variations)|中|
|o1021302|焰光灼灼·奇妙夜|本阶段进化资源|[Fiery Glow: Wonder | Infinity Nikki Wiki | Fandom](https://infinity-nikki.fandom.com/wiki/Fiery_Glow%3A_Wonder)|中|
|o1021502|流光灵契·幻华|本阶段进化资源|[Luster Covenant: Phantasm | Infinity Nikki Wiki | Fandom](https://infinity-nikki.fandom.com/wiki/Luster_Covenant%3A_Phantasm)|中|
|o1022302|绯夜狂想录·妄念|本阶段进化资源|[Crimson Rhapsody: Delusion | Infinity Nikki Wiki | Fandom](https://infinity-nikki.fandom.com/wiki/Crimson_Rhapsody%3A_Delusion)|中|
|o1022303|绯夜狂想录·叶札|本阶段进化资源|[Crimson Rhapsody: Leafy | Infinity Nikki Wiki | Fandom](https://infinity-nikki.fandom.com/wiki/Crimson_Rhapsody%3A_Leafy)|中|
|o1023102|落入泪之潮·挽歌|本阶段进化资源|[Tide of Tears: Lament | Infinity Nikki Wiki | Fandom](https://infinity-nikki.fandom.com/wiki/Tide_of_Tears%3A_Lament)|中|
|o1023103|落入泪之潮·落鳞|本阶段进化资源|[Tide of Tears: Scales | Infinity Nikki Wiki | Fandom](https://infinity-nikki.fandom.com/wiki/Tide_of_Tears%3A_Scales)|中|
|o1023902|咏叙的旧梦·未来声|本阶段进化资源|[Echoed Dreams: Future Tone | Infinity Nikki Wiki | Fandom](https://infinity-nikki.fandom.com/wiki/Echoed_Dreams%3A_Future_Tone)|中|
|o1023903|咏叙的旧梦·偶人歌|本阶段进化资源|[Echoed Dreams: Threaded Melody | Infinity Nikki Wiki | Fandom](https://infinity-nikki.fandom.com/wiki/Echoed_Dreams%3A_Threaded_Melody)|中|
|o1025002|如雨坠，如花开·告别|本阶段进化资源|[Rainfall & Blossoms: Farewell | Infinity Nikki Wiki | Fandom](https://infinity-nikki.fandom.com/wiki/Rainfall_%26_Blossoms%3A_Farewell)|中|
|o1025003|如雨坠，如花开·等候|本阶段进化资源|[Rainfall & Blossoms: Anticipation | Infinity Nikki Wiki | Fandom](https://infinity-nikki.fandom.com/wiki/Rainfall_%26_Blossoms%3A_Anticipation)|中|
|o1026302|谒灵·赤枷|本阶段进化资源|[Providence Immemorial: Shackles | Infinity Nikki Wiki | Fandom](https://infinity-nikki.fandom.com/wiki/Providence_Immemorial%3A_Shackles)|中|
|o1026303|谒灵·溟逝|本阶段进化资源|[Providence Immemorial: Finality | Infinity Nikki Wiki | Fandom](https://infinity-nikki.fandom.com/wiki/Providence_Immemorial%3A_Finality)|中|
|o1026304|谒灵·轮复|本阶段进化资源|[Providence Immemorial: Cycle | Infinity Nikki Wiki | Fandom](https://infinity-nikki.fandom.com/wiki/Providence_Immemorial%3A_Cycle)|中|
|o1026402|花泉奇境·梦呓|本阶段进化资源|[Springbloom Enchantment: Dreamwhisper | Infinity Nikki Wiki | Fandom](https://infinity-nikki.fandom.com/wiki/Springbloom_Enchantment%3A_Dreamwhisper)|中|
|o1026502|眠于花畔·盎然|本阶段进化资源|[Slumber by Blossoms: Flourishing | Infinity Nikki Wiki | Fandom](https://infinity-nikki.fandom.com/wiki/Slumber_by_Blossoms%3A_Flourishing)|中|
|o1026503|眠于花畔·潮音|本阶段进化资源|[Slumber by Blossoms: Tidecall | Infinity Nikki Wiki | Fandom](https://infinity-nikki.fandom.com/wiki/Slumber_by_Blossoms%3A_Tidecall)|中|
|o1026802|她是不驯火·森林|本阶段进化资源|[She Is Wildfire: Forest | Infinity Nikki Wiki | Fandom](https://infinity-nikki.fandom.com/wiki/She_Is_Wildfire%3A_Forest)|中|
|o1026803|她是不驯火·残月|本阶段进化资源|[She Is Wildfire: Waning Moon | Infinity Nikki Wiki | Fandom](https://infinity-nikki.fandom.com/wiki/She_Is_Wildfire%3A_Waning_Moon)|中|
|o1028902|无名亦无我·碧空|本阶段进化资源|[Nameless, Selfless: Azure Sky | Infinity Nikki Wiki | Fandom](https://infinity-nikki.fandom.com/wiki/Nameless%2C_Selfless%3A_Azure_Sky)|中|
|o1028903|无名亦无我·长夜|本阶段进化资源|[Nameless, Selfless: Long Night | Infinity Nikki Wiki | Fandom](https://infinity-nikki.fandom.com/wiki/Nameless%2C_Selfless%3A_Long_Night)|中|
|o1029002|栖骨生花·翡梦|本阶段进化资源|[Floral Rebirth: Emerald Reverie | Infinity Nikki Wiki | Fandom](https://infinity-nikki.fandom.com/wiki/Floral_Rebirth%3A_Emerald_Reverie)|中|
|o1029003|栖骨生花·昼歌|本阶段进化资源|[Floral Rebirth: Awakening Hymn | Infinity Nikki Wiki | Fandom](https://infinity-nikki.fandom.com/wiki/Floral_Rebirth%3A_Awakening_Hymn)|中|
|o1029303|森之涟·游林|本阶段进化资源|[Forest Ripple: Roaming | Infinity Nikki Wiki | Fandom](https://infinity-nikki.fandom.com/wiki/Forest_Ripple%3A_Roaming)|中|
|o1030102|黎明无声·织光|本阶段进化资源|[Soundless Dawn: Woven Light | Infinity Nikki Wiki | Fandom](https://infinity-nikki.fandom.com/wiki/Soundless_Dawn%3A_Woven_Light)|中|
|o1030103|黎明无声·森籁|本阶段进化资源|[Soundless Dawn: Forest Echoes | Infinity Nikki Wiki | Fandom](https://infinity-nikki.fandom.com/wiki/Soundless_Dawn%3A_Forest_Echoes)|中|
|o1032602|星之海·梦谕|本阶段进化资源|[Sea of Stars: Reverie | Infinity Nikki Wiki | Fandom](https://infinity-nikki.fandom.com/wiki/Sea_of_Stars%3A_Reverie)|中|
|o1032603|星之海·极境|本阶段进化资源|[Sea of Stars: Aurora | Infinity Nikki Wiki | Fandom](https://infinity-nikki.fandom.com/wiki/Sea_of_Stars%3A_Aurora)|中|
|o1032604|星之海·无垠|本阶段进化资源|[Sea of Stars: Infinity | Infinity Nikki Wiki | Fandom](https://infinity-nikki.fandom.com/wiki/Sea_of_Stars%3A_Infinity)|中|
|o1033002|龙隐云墨间·缥碧|本阶段进化资源|[Clouded Loong: Misty Celadon | Infinity Nikki Wiki | Fandom](https://infinity-nikki.fandom.com/wiki/Clouded_Loong%3A_Misty_Celadon)|中|
|o1033003|龙隐云墨间·点睛|本阶段进化资源|[Clouded Loong: Eye-Dotting | Infinity Nikki Wiki | Fandom](https://infinity-nikki.fandom.com/wiki/Clouded_Loong%3A_Eye-Dotting)|中|
|o1033102|缘缘长相念·草木间|本阶段进化资源|[Forever Bond: Among Flora | Infinity Nikki Wiki | Fandom](https://infinity-nikki.fandom.com/wiki/Forever_Bond%3A_Among_Flora)|中|
|o1033103|缘缘长相念·人间事|本阶段进化资源|[Forever Bond: Mortal Affairs | Infinity Nikki Wiki | Fandom](https://infinity-nikki.fandom.com/wiki/Forever_Bond%3A_Mortal_Affairs)|中|
|o1034802|暖歌花纪·溯光|本阶段进化资源|[Melody Bloom: Chasing Light | Infinity Nikki Wiki | Fandom](https://infinity-nikki.fandom.com/wiki/Melody_Bloom%3A_Chasing_Light)|中|
|o1034902|生于无瑕·林中歌|本阶段进化资源|[Born Flawless: Forest Song | Infinity Nikki Wiki | Fandom](https://infinity-nikki.fandom.com/wiki/Born_Flawless%3A_Forest_Song)|中|
|o1034903|生于无瑕·烬中火|本阶段进化资源|[Born Flawless: Glowing Embers | Infinity Nikki Wiki | Fandom](https://infinity-nikki.fandom.com/wiki/Born_Flawless%3A_Glowing_Embers)|中|
|o1035002|隐于祷音·月皎|本阶段进化资源|[Behind Prayers: Bright Moon | Infinity Nikki Wiki | Fandom](https://infinity-nikki.fandom.com/wiki/Behind_Prayers%3A_Bright_Moon)|中|
|o1035003|隐于祷音·郁冥|本阶段进化资源|[Behind Prayers: Somber Nights | Infinity Nikki Wiki | Fandom](https://infinity-nikki.fandom.com/wiki/Behind_Prayers%3A_Somber_Nights)|中|
|o1035202|万相渡浮生·妙丹心|本阶段进化资源|[Where Wanxiang Weaves Life: Benevolence | Infinity Nikki Wiki | Fandom](https://infinity-nikki.fandom.com/wiki/Where_Wanxiang_Weaves_Life%3A_Benevolence)|中|
|o1035302|九色亦尘心·焚心|本阶段进化资源|[Chroma's Mortal Heart: Seared | Infinity Nikki Wiki | Fandom](https://infinity-nikki.fandom.com/wiki/Chroma%27s_Mortal_Heart%3A_Seared)|中|
|o1035303|九色亦尘心·长决|本阶段进化资源|[Chroma's Mortal Heart: Parting | Infinity Nikki Wiki | Fandom](https://infinity-nikki.fandom.com/wiki/Chroma%27s_Mortal_Heart%3A_Parting)|中|
|o1036402|渡者无归·挚守|本阶段进化资源|[Guide of No Return: Commitment | Infinity Nikki Wiki | Fandom](https://infinity-nikki.fandom.com/wiki/Guide_of_No_Return%3A_Commitment)|中|
|o1036403|渡者无归·离劫|本阶段进化资源|[Guide of No Return: Valediction | Infinity Nikki Wiki | Fandom](https://infinity-nikki.fandom.com/wiki/Guide_of_No_Return%3A_Valediction)|中|
|o1039002|妖夜鉴影·心照|本阶段进化资源|[Nefarious Shadows: Enlightened | Infinity Nikki Wiki | Fandom](https://infinity-nikki.fandom.com/wiki/Nefarious_Shadows%3A_Enlightened)|中|
|o1040102|寻味烟火间·蜜酿|本阶段进化资源|[Tasting the World: Honey Brew | Infinity Nikki Wiki | Fandom](https://infinity-nikki.fandom.com/wiki/Tasting_the_World%3A_Honey_Brew)|中|
|o1030402|咏赞黄昏·金穹|本阶段进化资源|[DonatovBlog Hymn to Dusk进化图文及游戏截图](https://donatov.blog/post/hymn-to-dusk-infinity-nikki)|中|
|o1030403|咏赞黄昏·神逝|本阶段进化资源|[DonatovBlog Hymn to Dusk进化图文及游戏截图](https://donatov.blog/post/hymn-to-dusk-infinity-nikki)|中|
|o1030404|咏赞黄昏·归尘|本阶段进化资源|[DonatovBlog Hymn to Dusk进化图文及游戏截图](https://donatov.blog/post/hymn-to-dusk-infinity-nikki)|中|

精确材料ID、数量、单位、前置副本和采集日期见 [COMPLETED_DATA.csv](COMPLETED_DATA.csv)。52份单部件清单与整套汇总是不同粒度，不相互重复累计。来源列原色输入数时单独存 `evolution_requirements`；实扣数量未知NULL，不把“列2套”直接当作消耗2套。仅列副本的清单不闭合材料/货币，不作为可计算步骤。Heartshine已通过真实公共物品ID `inv_1110100004` 核对，确有通用心辉，非按品质猜测家族材料。

## 仍未补全的5套原色

|名称|品质|获取线索|需要补什么|
|---|---:|---|---|
|梦隙灵语|4★|唱诗蓝龙的赠礼|Plumeveil Feather Essence：数量未知;Sproutantler Fur：数量未知;Windspin Flower Essence：数量未知;Banner Fish：原始计量单位待核|
|霓光游星|3★|旅途见闻|Ocarina Beetle：数量未知;Windspin Flower Essence：数量未知;Ocarina Beetle Essence：数量未知;Leafantler Fur Essence：数量未知;Sproutantler Fur：数量未知;Pearled Spider Essence：数量未知;Emberpaw Furball：数量未知;Boneflame Bloom：数量未知;Pearled Spider：数量未知|
|一帘烟雨|3★|花雨入画时|7个部件均无可用制作数量；设计图资格需核实|
|无拘绿野|3★|搭配师团的藏品|Leatherbag Beetle Essence：数量未知;Umbrella Fish：原始计量单位待核;Ocarina Beetle：数量未知;Emberpaw Furball Essence：数量未知;Ocarina Beetle Essence：数量未知;Glimmerdrift Essence：数量未知;Leafantler Fur：数量未知;Umbrellabloom：数量未知|
|海风的召唤|3★|搭配师团的藏品|Rainbow Fish：原始计量单位待核;Frostbough Fluff Essence：数量未知;Carver Fish：原始计量单位待核;Helmet Fish Essence：原始计量单位待核;Nightglow Fur Essence：数量未知|

每套的中/英/日名、版本活动线索、全部关键词、具体材料缺口及建议来源见 [REMAINING_BASE_RECIPES.csv](REMAINING_BASE_RECIPES.csv)。优先游戏内逐件设计图截图；一帘烟雨还需核实设计图资格，不能仅凭新活动记录认定有或无制作配方。

## 仍未补全的181进化

[按家族逐条完整名单](REMAINING_EVOLUTIONS_BY_FAMILY.md) / [手动补录CSV](REMAINING_EVOLUTIONS.csv)，共161家族。每条有ID、名称、候选前驱→目标、品质、已查渠道、实际关键词和建议网站。优先截图记录版本、阶段、全部消耗、原色输入与实扣情况；只写副本的旧攻略不能拿未知货币当0。没有结果可能是索引、维护或版本资料不足，原因仅作可能性说明。

## 单位审计与来源冲突

发现TH.GL页面的裸鱼重数值与游戏/Wiki明确kg数值存在十倍显示差。没有只更改单位标签：逐部件对照BWIKI及Fandom的明确kg值，重新计算原色汇总，并修复美好的一天羽毛笔鱼3kg/胡子鲶鱼6kg。仅修正有同一部件交叉证据的项，精粹按件，用户库存不自动转换。详见 `fish-unit-audit-fixes.json`、`existing-fish-audit.json` 与此前配对证据。

咏赞黄昏的桂冠羽：BWIKI设计图与TH.GL均为6，另一攻略文字为5；采用两个结构化来源一致的6，保存该文字冲突和人工复核建议。炽曜金砂12、失序巧匠组件1及炫鳍鱼5kg有游戏截图交叉依据。资料仍不能声称当前版本全部真人实测。

## 最新指标

- 原色制作候选：**66/71 = 92.96%**；原色与进化分开。71范围含新活动制作资格待核实条目。
- 进化资源：**93/274 = 33.94%**，按公开来源列明资源，不代表当前游戏内实测覆盖。
- 可计算形态：**268 → 350**；其中66原色、93进化、191焕新。直接获取239原色不计制作。
- 同等级进化属性仍未普遍核实，精确坐标/路径仍为0；真人Gold通过仍0。
- 结构错误0，来源差异仍可见，不用无来源数字填补。

## 复现与维护

`node scripts/build.mjs` → `node scripts/analyze.mjs` → `node scripts/test.mjs` → `node scripts/reproduce-search.mjs`。Step9原始缺口快照固定；搜索模型/测试标签/首次报告不改、不重新调参。研究候选不是直接入库脚本：`step9-curate.mjs` 是本轮有条件的迁移记录，不应对未来不同版本盲目重复执行。新增低置信度防护阻止将推断标成完整配方。网站仍本地运行，不上传个人库存，未进行GitHub上传或部署。
