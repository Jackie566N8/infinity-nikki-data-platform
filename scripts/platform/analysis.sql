-- 1. 独立套装数量：每个家族只计一次。
SELECT COUNT(*) AS independent_outfits FROM outfit_families;

-- 2. 形态数和独立套装数分开报告。
SELECT form_type, COUNT(*) AS forms FROM outfits GROUP BY form_type;

-- 3. 按来源实装标记统计，而非“网站抓取日期”。
-- 测试相关的混合文字条目单独排除，并应查阅原文确认。
SELECT release_date, label, new_independent_outfit_count, additional_form_count, form_count
FROM v_outfit_release_counts WHERE context='public_release' ORDER BY release_date;

-- 4. 季节/版本标签中的原色和附加形态；标签不等于精确活动时间范围。
SELECT v.label, SUM(o.is_base) AS independent_outfits, SUM(1-o.is_base) AS additional_forms
FROM outfits o JOIN object_releases r ON r.object_id=o.outfit_id
JOIN versions v ON v.version_id=r.version_id GROUP BY v.version_id ORDER BY v.label;

-- 5. 只统计实有名称，不把英文 fallback 当作日/韩语。
SELECT locale, COUNT(name) AS named, COUNT(*) AS total,
 ROUND(100.0*COUNT(name)/NULLIF(COUNT(*),0),2) AS coverage_pct
FROM object_names WHERE name_type='standard' GROUP BY locale;

-- 6. 缺失说明不是 0；获取途径不代表活动当前开放。
SELECT kind, COUNT(*) AS total, SUM(obtain_status='known') AS with_acquisition
FROM objects GROUP BY kind;

-- 7. 完整配方；当前预期 0 行，不表示消耗为 0。
SELECT r.recipe_id,o.display_name,i.material_id,i.quantity
FROM recipes r JOIN objects o ON o.object_id=r.target_id
JOIN recipe_ingredients i ON i.recipe_id=r.recipe_id WHERE r.status='complete';

-- 8. 有候选字段差异的对象与双方来源。
SELECT o.object_id,o.display_name,c.field,a.value AS site_value,b.value AS other_value,
 s1.url AS site_source,s2.url AS comparison_source
FROM source_conflicts c JOIN objects o ON o.object_id=c.object_id
JOIN source_assertions a ON a.assertion_id=c.left_assertion_id
JOIN source_assertions b ON b.assertion_id=c.right_assertion_id
JOIN sources s1 ON s1.source_id=a.source_id JOIN sources s2 ON s2.source_id=b.source_id;
