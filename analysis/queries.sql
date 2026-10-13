-- Run against generated research.duckdb. Original source IDs remain joinable.
SELECT o.rarity,o.style,COUNT(*) AS base_outfits
FROM outfits f JOIN objects o ON o.object_id=f.outfit_id
WHERE f.is_base=1 GROUP BY o.rarity,o.style ORDER BY o.rarity,o.style;

SELECT m.cluster,o.style,COUNT(*) AS outfits
FROM cluster_membership m JOIN objects o ON o.object_id=m.outfit_id
GROUP BY m.cluster,o.style ORDER BY m.cluster,o.style;

SELECT r.scope,COUNT(*) AS complete_recipes FROM recipes r
WHERE r.status='complete' GROUP BY r.scope;

SELECT v.version_number,c.launch_date,c.time_zone,c.source_published_date,s.url
FROM version_calendar c JOIN versions v USING(version_id) JOIN sources s USING(source_id)
ORDER BY c.launch_date;
