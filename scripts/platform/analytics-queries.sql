-- 默认独立套装品质分布，分母为全部原色套装数。
SELECT o.rarity, COUNT(*) AS count,
 ROUND(100.0*COUNT(*)/(SELECT COUNT(*) FROM outfits WHERE is_base=1),2) AS percent
FROM outfits f JOIN objects o ON o.object_id=f.outfit_id
WHERE f.is_base=1 GROUP BY o.rarity ORDER BY o.rarity DESC;

-- 默认独立套装主风格。
SELECT o.style, COUNT(*) AS count
FROM outfits f JOIN objects o ON o.object_id=f.outfit_id
WHERE f.is_base=1 GROUP BY o.style;

-- 原色服装的风格 × 类别热力图；网站为缺少组合补筛选范围内的 0。
SELECT o.category, o.style, COUNT(*) AS count
FROM clothing c JOIN objects o ON o.object_id=c.clothing_id
WHERE c.is_variant=0 GROUP BY o.category,o.style ORDER BY o.category,o.style;

-- 完整标签集合 + 主风格，不能理解为“双主风格”。
WITH tag_sets AS (
 SELECT object_id, group_concat(tag, ' × ' ORDER BY tag) AS tags FROM object_tags GROUP BY object_id
)
SELECT o.style,t.tags,COUNT(*) AS count
FROM outfits f JOIN objects o ON o.object_id=f.outfit_id JOIN tag_sets t ON t.object_id=f.outfit_id
WHERE f.is_base=1 GROUP BY o.style,t.tags ORDER BY count,o.style,t.tags;

-- 制作线索：至少一个原色部件有设计图。不代表完整配方。
SELECT COUNT(DISTINCT f.outfit_id) AS outfits_with_sketch
FROM outfits f JOIN outfit_clothing x ON x.outfit_id=f.base_outfit_id
JOIN recipes r ON r.target_id=x.clothing_id WHERE f.is_base=1;

-- 活动标签：精确匹配来源说明；同一套装多条断言要去重。
SELECT COUNT(DISTINCT f.outfit_id) AS event_outfits
FROM outfits f JOIN source_assertions a ON a.object_id=f.base_outfit_id
WHERE f.is_base=1 AND a.field='obtain_text' AND a.value='限时活动';

-- 原色版本趋势：日期来自 releases，绝不引用快照日期。
SELECT v.version_id,v.label,
 SUM(CASE WHEN r.context='public_release' AND r.release_date IS NOT NULL THEN 1 ELSE 0 END) AS dated,
 SUM(CASE WHEN r.context='public_release' AND r.release_date IS NOT NULL THEN 0 ELSE 1 END) AS pending
FROM outfits f
LEFT JOIN object_releases l ON l.object_id=f.outfit_id
LEFT JOIN releases r ON r.release_id=l.release_id
LEFT JOIN versions v ON v.version_id=l.version_id
WHERE f.is_base=1 GROUP BY v.version_id ORDER BY v.label;

-- 固定排序锚点：该季节收录最早实装标记，不是经核实的版本上线日期。
SELECT v.version_id,v.label,MIN(r.release_date) AS earliest_recorded_release
FROM outfits f JOIN object_releases l ON l.object_id=f.outfit_id
JOIN releases r ON r.release_id=l.release_id JOIN versions v ON v.version_id=l.version_id
WHERE r.context='public_release' AND r.release_date IS NOT NULL
 AND v.label NOT IN ('无图鉴','未知','待补充')
GROUP BY v.version_id ORDER BY earliest_recorded_release;

-- 待补充日期逐条溯源。
SELECT f.outfit_id,o.display_name,v.label AS version,r.label AS original_release_note,
 r.context,r.release_date,s.url
FROM outfits f JOIN objects o ON o.object_id=f.outfit_id
LEFT JOIN object_releases l ON l.object_id=f.outfit_id
LEFT JOIN releases r ON r.release_id=l.release_id
LEFT JOIN versions v ON v.version_id=l.version_id
LEFT JOIN sources s ON s.source_id=l.source_id
WHERE f.is_base=1 AND (r.context IS NULL OR r.context<>'public_release' OR r.release_date IS NULL
 OR v.label IS NULL OR v.label IN ('无图鉴','未知','待补充'));
