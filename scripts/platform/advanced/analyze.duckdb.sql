-- OPTIONAL DuckDB CLI workflow. Run from data-platform/advanced:
-- duckdb ../dataset/advanced/advanced.duckdb < analyze.duckdb.sql
-- Offline CSVs retain stable object IDs, snapshot IDs, method version and sources.
CREATE OR REPLACE TABLE recommendation_edges AS SELECT * FROM read_csv('../dataset/advanced/recommendations.csv',header=true,all_varchar=true);
CREATE OR REPLACE TABLE nickname_observations AS SELECT * FROM read_csv('../dataset/advanced/nickname-observations.csv',header=true,all_varchar=true);
SELECT source_id,COUNT(*) AS recommendations,AVG(CAST(score AS DOUBLE)) AS mean_similarity,
 AVG(CAST(coverage AS DOUBLE)) AS mean_known_feature_weight FROM recommendation_edges GROUP BY source_id;
WITH per_alias AS (SELECT normalized_alias,COUNT(DISTINCT outfit_id) AS objects FROM nickname_observations GROUP BY normalized_alias)
SELECT COUNT(*) AS normalized_aliases,SUM(CASE WHEN objects>1 THEN 1 ELSE 0 END) AS ambiguous_aliases FROM per_alias;
WITH per_object AS (SELECT outfit_id,COUNT(DISTINCT normalized_alias) AS aliases FROM nickname_observations GROUP BY outfit_id)
SELECT COUNT(*) AS sampled_objects,SUM(CASE WHEN aliases>1 THEN 1 ELSE 0 END) AS multiple_alias_objects FROM per_object;
SELECT LEAST(4,FLOOR(CAST(name_similarity AS DOUBLE)*5)) AS similarity_bin,COUNT(*) AS actual_nickname_observations FROM nickname_observations GROUP BY similarity_bin ORDER BY similarity_bin;
