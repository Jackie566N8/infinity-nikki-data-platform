-- DESIGN ONLY. Not loaded by the website or the data build.
CREATE TABLE proposed_search_events (
 event_id TEXT PRIMARY KEY,
 query_category TEXT NOT NULL CHECK(query_category IN ('formal','alias','pinyin','partial','descriptive','multilingual','other','unknown')),
 query_text_redacted TEXT CHECK(query_text_redacted IS NULL OR LENGTH(query_text_redacted)<=100),
 result_count INTEGER NOT NULL CHECK(result_count>=0),
 clicked_object_id TEXT,
 first_click_rank INTEGER CHECK(first_click_rank IS NULL OR first_click_rank>0),
 timestamp_hour TEXT NOT NULL,
 search_method_version TEXT NOT NULL,
 classifier_version TEXT NOT NULL,
 explicit_feedback TEXT CHECK(explicit_feedback IS NULL OR explicit_feedback IN ('helpful','unhelpful')),
 consent_version TEXT NOT NULL,
 consent_receipt_hash TEXT NOT NULL,
 expires_at TEXT NOT NULL,
 CHECK((clicked_object_id IS NULL AND first_click_rank IS NULL) OR (clicked_object_id IS NOT NULL AND first_click_rank IS NOT NULL AND first_click_rank<=result_count))
);
-- No INSERT statements: this is not a collector or a sample of real traffic.
SELECT search_method_version,query_category,COUNT(*) AS consented_events,
 SUM(CASE WHEN result_count=0 THEN 1 ELSE 0 END)*1.0/NULLIF(COUNT(*),0) AS zero_result_rate,
 SUM(CASE WHEN result_count>0 AND clicked_object_id IS NULL THEN 1 ELSE 0 END)*1.0/NULLIF(SUM(CASE WHEN result_count>0 THEN 1 ELSE 0 END),0) AS no_click_rate,
 SUM(CASE WHEN explicit_feedback='unhelpful' THEN 1 ELSE 0 END)*1.0/NULLIF(SUM(CASE WHEN explicit_feedback IS NOT NULL THEN 1 ELSE 0 END),0) AS explicit_negative_feedback_rate
FROM proposed_search_events GROUP BY search_method_version,query_category;
SELECT query_text_redacted,COUNT(*) AS events FROM proposed_search_events
WHERE query_text_redacted IS NOT NULL GROUP BY query_text_redacted HAVING COUNT(*)>=10 ORDER BY events DESC;
-- Future authorized maintenance only:
-- DELETE FROM proposed_search_events WHERE expires_at < :current_utc;
-- DELETE FROM proposed_search_events WHERE consent_receipt_hash = :verified_receipt_hash;
