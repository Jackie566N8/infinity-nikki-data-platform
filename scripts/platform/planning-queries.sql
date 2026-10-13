-- Reproducible example: Wind of Purity + Bye-Bye Dust; Daisy stock = 3.
-- Full-catalog coverage. Direct acquisition remains in the catalog denominator.
SELECT o.form_type,COUNT(*) total,
 SUM(CASE WHEN s.status='complete' THEN 1 ELSE 0 END) complete,
 SUM(CASE WHEN s.needs_recipe=1 AND s.status<>'complete' THEN 1 ELSE 0 END) pending,
 SUM(CASE WHEN s.status='not_crafting' THEN 1 ELSE 0 END) direct_acquisition
FROM outfits o JOIN outfit_recipe_status s ON s.outfit_id=o.outfit_id
GROUP BY o.form_type;

-- Craftable base coverage: excludes transitions and direct acquisition.
SELECT SUM(CASE WHEN s.status='complete' THEN 1 ELSE 0 END) complete,
 COUNT(*) craftable_base_denominator
FROM outfits o JOIN outfit_recipe_status s ON s.outfit_id=o.outfit_id
WHERE o.is_base=1 AND s.needs_recipe=1;

-- Base craft and 10-to-11 glow-up are separate scopes with explicit prerequisites.
SELECT r.target_id,r.scope,r.prerequisite,i.material_id,i.quantity,i.unit,
 r.source_type,r.checked_at,s.url FROM recipes r
JOIN recipe_ingredients i USING(recipe_id) JOIN sources s USING(source_id)
WHERE r.status='complete' AND r.scope IN ('whole_outfit','renewal');

-- Recipe scope is whole_outfit, not inferred per-piece recipes.
WITH targets AS (
 SELECT DISTINCT value AS outfit_id FROM json_each('["o10045","o10060"]')
), demand AS (
 SELECT i.material_id, SUM(i.quantity) AS required_quantity,
        COUNT(DISTINCT t.outfit_id) AS target_count
 FROM targets t
 JOIN outfits o ON o.outfit_id=t.outfit_id AND o.is_base=1
 JOIN recipes r ON r.target_id=o.outfit_id AND r.scope='whole_outfit' AND r.status='complete'
 JOIN recipe_ingredients i ON i.recipe_id=r.recipe_id
 GROUP BY i.material_id
), inventory(material_id,quantity) AS (VALUES ('mdaisy',3))
SELECT d.material_id, o.display_name, d.required_quantity,
       COALESCE(s.quantity,0) AS inventory,
       MAX(0,d.required_quantity-COALESCE(s.quantity,0)) AS shortage,
       d.target_count
FROM demand d JOIN objects o ON o.object_id=d.material_id
LEFT JOIN inventory s ON s.material_id=d.material_id;

-- Region support = distinct missing material types, NOT sums of regional output.
WITH targets AS (
 SELECT DISTINCT value AS outfit_id FROM json_each('["o10045","o10048","o10060","o10029"]')
), demand AS (
 SELECT i.material_id, SUM(i.quantity) AS required_quantity,
        COUNT(DISTINCT t.outfit_id) AS targets
 FROM targets t
 JOIN outfits o ON o.outfit_id=t.outfit_id AND o.is_base=1
 JOIN recipes r ON r.target_id=o.outfit_id AND r.scope='whole_outfit' AND r.status='complete'
 JOIN recipe_ingredients i ON i.recipe_id=r.recipe_id
 GROUP BY i.material_id
), inventory(material_id,quantity) AS (VALUES ('mdaisy',3),('mthread-of-purity',90)),
shortages AS (
 SELECT d.*, MAX(0,d.required_quantity-COALESCE(s.quantity,0)) AS shortage
 FROM demand d LEFT JOIN inventory s ON s.material_id=d.material_id
), areas AS (
 SELECT DISTINCT material_id,region FROM gathering_areas
 UNION SELECT DISTINCT material_id,region FROM gathering_points
)
SELECT a.region,COUNT(DISTINCT a.material_id) AS missing_types,
       COUNT(DISTINCT CASE WHEN d.targets>1 THEN a.material_id END) AS shared_types
FROM areas a JOIN shortages d ON d.material_id=a.material_id
WHERE d.shortage>0 AND a.material_id<>'mthread-of-purity'
GROUP BY a.region ORDER BY missing_types DESC,shared_types DESC,a.region;

-- Audit the granularity: part links never imply per-part material quantities.
SELECT o.outfit_id, COUNT(DISTINCT p.clothing_id) AS linked_parts,
       r.recipe_id,r.scope,r.status,r.checked_at,s.url
FROM outfits o
LEFT JOIN outfit_clothing p ON p.outfit_id=o.outfit_id
LEFT JOIN recipes r ON r.target_id=o.outfit_id AND r.scope='whole_outfit'
LEFT JOIN sources s ON s.source_id=r.source_id
WHERE o.outfit_id IN ('o10045','o10048','o10060','o10029')
GROUP BY o.outfit_id,r.recipe_id;
