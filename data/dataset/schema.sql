PRAGMA foreign_keys=ON;
CREATE TABLE "sources" (
 "source_id" TEXT NOT NULL,
 "url" TEXT NOT NULL,
 "publisher" TEXT NOT NULL,
 "retrieved_date" TEXT,
 "source_kind" TEXT NOT NULL CHECK ("source_kind" IN ('web','local')),
 PRIMARY KEY ("source_id")
) STRICT;

CREATE TABLE "objects" (
 "object_id" TEXT NOT NULL,
 "game_id" INTEGER,
 "kind" TEXT NOT NULL CHECK ("kind" IN ('outfits','clothing','materials','makeups','eurekas')),
 "display_name" TEXT NOT NULL,
 "rarity" INTEGER CHECK ("rarity">=1) CHECK ("rarity"<=6),
 "style" TEXT CHECK ("style" IN ('甜美','性感','清新','帅气','典雅')),
 "category" TEXT,
 "obtain_text" TEXT,
 "obtain_status" TEXT NOT NULL CHECK ("obtain_status" IN ('known','uncollected')),
 "image_ref" TEXT,
 "source_id" TEXT NOT NULL REFERENCES "sources"("source_id") DEFERRABLE INITIALLY DEFERRED,
 "snapshot_source_date" TEXT NOT NULL,
 "obtain_source_id" TEXT REFERENCES "sources"("source_id") DEFERRABLE INITIALLY DEFERRED,
 PRIMARY KEY ("object_id")
) STRICT;

CREATE TABLE "outfit_families" (
 "family_id" TEXT NOT NULL,
 "base_outfit_id" TEXT NOT NULL REFERENCES "outfits"("outfit_id") DEFERRABLE INITIALLY DEFERRED,
 "form_count" INTEGER NOT NULL CHECK ("form_count">=1),
 PRIMARY KEY ("family_id")
) STRICT;

CREATE TABLE "outfits" (
 "outfit_id" TEXT NOT NULL REFERENCES "objects"("object_id") DEFERRABLE INITIALLY DEFERRED,
 "family_id" TEXT REFERENCES "outfit_families"("family_id") DEFERRABLE INITIALLY DEFERRED,
 "base_outfit_id" TEXT REFERENCES "outfits"("outfit_id") DEFERRABLE INITIALLY DEFERRED,
 "form_type" TEXT NOT NULL CHECK ("form_type" IN ('base','evolution','renewal','variant_unknown')),
 "is_base" INTEGER NOT NULL CHECK ("is_base" IN (0,1)),
 "evolution_stage" INTEGER CHECK ("evolution_stage">=1),
 "variation_label" TEXT,
 "source_group_order" INTEGER CHECK ("source_group_order">=0),
 PRIMARY KEY ("outfit_id")
) STRICT;

CREATE TABLE "clothing" (
 "clothing_id" TEXT NOT NULL REFERENCES "objects"("object_id") DEFERRABLE INITIALLY DEFERRED,
 "base_clothing_id" TEXT REFERENCES "clothing"("clothing_id") DEFERRABLE INITIALLY DEFERRED,
 "is_variant" INTEGER NOT NULL CHECK ("is_variant" IN (0,1)),
 "variation_label" TEXT,
 PRIMARY KEY ("clothing_id")
) STRICT;

CREATE TABLE "outfit_clothing" (
 "outfit_id" TEXT NOT NULL REFERENCES "outfits"("outfit_id") DEFERRABLE INITIALLY DEFERRED,
 "clothing_id" TEXT NOT NULL REFERENCES "clothing"("clothing_id") DEFERRABLE INITIALLY DEFERRED,
 "source_id" TEXT NOT NULL REFERENCES "sources"("source_id") DEFERRABLE INITIALLY DEFERRED,
 PRIMARY KEY ("outfit_id","clothing_id")
) STRICT;

CREATE TABLE "materials" (
 "material_id" TEXT NOT NULL REFERENCES "objects"("object_id") DEFERRABLE INITIALLY DEFERRED,
 "original_category" TEXT,
 "gathering_scope" TEXT NOT NULL CHECK ("gathering_scope" IN ('candidate','unassessed')),
 PRIMARY KEY ("material_id")
) STRICT;

CREATE TABLE "makeups" (
 "makeup_id" TEXT NOT NULL REFERENCES "objects"("object_id") DEFERRABLE INITIALLY DEFERRED,
 PRIMARY KEY ("makeup_id")
) STRICT;

CREATE TABLE "eurekas" (
 "eureka_id" TEXT NOT NULL REFERENCES "objects"("object_id") DEFERRABLE INITIALLY DEFERRED,
 PRIMARY KEY ("eureka_id")
) STRICT;

CREATE TABLE "object_tags" (
 "object_id" TEXT NOT NULL REFERENCES "objects"("object_id") DEFERRABLE INITIALLY DEFERRED,
 "tag" TEXT NOT NULL,
 PRIMARY KEY ("object_id","tag")
) STRICT;

CREATE TABLE "object_names" (
 "name_id" TEXT NOT NULL,
 "object_id" TEXT NOT NULL REFERENCES "objects"("object_id") DEFERRABLE INITIALLY DEFERRED,
 "locale" TEXT NOT NULL CHECK ("locale" IN ('zh-CN','en','ja','ko','zh-TW')),
 "name_type" TEXT NOT NULL CHECK ("name_type" IN ('standard','nickname')),
 "name" TEXT,
 "display_fallback" TEXT,
 "translation_status" TEXT NOT NULL CHECK ("translation_status" IN ('source','curated','missing','community')),
 "source_id" TEXT REFERENCES "sources"("source_id") DEFERRABLE INITIALLY DEFERRED,
 PRIMARY KEY ("name_id")
) STRICT;

CREATE TABLE "name_sources" (
 "name_id" TEXT NOT NULL REFERENCES "object_names"("name_id") DEFERRABLE INITIALLY DEFERRED,
 "source_id" TEXT NOT NULL REFERENCES "sources"("source_id") DEFERRABLE INITIALLY DEFERRED,
 "checked_date" TEXT,
 PRIMARY KEY ("name_id","source_id")
) STRICT;

CREATE TABLE "recipes" (
 "recipe_id" TEXT NOT NULL,
 "target_id" TEXT NOT NULL REFERENCES "objects"("object_id") DEFERRABLE INITIALLY DEFERRED,
 "design_id" INTEGER CHECK ("design_id">=1),
 "scope" TEXT NOT NULL CHECK ("scope" IN ('clothing','whole_outfit','evolution','renewal','material')),
 "checked_at" TEXT,
 "source_published_date" TEXT,
 "access_method" TEXT CHECK ("access_method" IN ('indexed_page','direct_page','manual')),
 "note" TEXT,
 "output_quantity" INTEGER CHECK ("output_quantity">=1),
 "status" TEXT NOT NULL CHECK ("status" IN ('design_only','partial','complete')),
 "source_id" TEXT NOT NULL REFERENCES "sources"("source_id") DEFERRABLE INITIALLY DEFERRED,
 "source_type" TEXT CHECK ("source_type" IN ('game_measured','official_wiki','community_wiki','community_post','guide_site','catalog')),
 "checked_precision" TEXT CHECK ("checked_precision" IN ('date','timestamp')),
 "prerequisite" TEXT,
 "source_confidence" TEXT CHECK ("source_confidence" IN ('high','medium','low')),
 "source_title" TEXT,
 "current_game_measured" INTEGER CHECK ("current_game_measured" IN (0,1)),
 PRIMARY KEY ("recipe_id")
) STRICT;

CREATE TABLE "recipe_ingredients" (
 "recipe_id" TEXT NOT NULL REFERENCES "recipes"("recipe_id") DEFERRABLE INITIALLY DEFERRED,
 "material_id" TEXT NOT NULL REFERENCES "materials"("material_id") DEFERRABLE INITIALLY DEFERRED,
 "quantity" REAL NOT NULL CHECK ("quantity">0),
 "source_id" TEXT NOT NULL REFERENCES "sources"("source_id") DEFERRABLE INITIALLY DEFERRED,
 "unit" TEXT CHECK ("unit" IN ('count','kg')),
 PRIMARY KEY ("recipe_id","material_id")
) STRICT;

CREATE TABLE "material_usage_mentions" (
 "material_id" TEXT NOT NULL REFERENCES "materials"("material_id") DEFERRABLE INITIALLY DEFERRED,
 "outfit_id" TEXT NOT NULL REFERENCES "outfits"("outfit_id") DEFERRABLE INITIALLY DEFERRED,
 "source_id" TEXT NOT NULL REFERENCES "sources"("source_id") DEFERRABLE INITIALLY DEFERRED,
 PRIMARY KEY ("material_id","outfit_id")
) STRICT;

CREATE TABLE "versions" (
 "version_id" TEXT NOT NULL,
 "label" TEXT NOT NULL,
 "version_number" TEXT,
 "source_id" TEXT NOT NULL REFERENCES "sources"("source_id") DEFERRABLE INITIALLY DEFERRED,
 "number_source_id" TEXT REFERENCES "sources"("source_id") DEFERRABLE INITIALLY DEFERRED,
 PRIMARY KEY ("version_id")
) STRICT;

CREATE TABLE "releases" (
 "release_id" TEXT NOT NULL,
 "label" TEXT NOT NULL,
 "release_date" TEXT,
 "context" TEXT NOT NULL CHECK ("context" IN ('public_release','test_release')),
 "source_id" TEXT NOT NULL REFERENCES "sources"("source_id") DEFERRABLE INITIALLY DEFERRED,
 PRIMARY KEY ("release_id")
) STRICT;

CREATE TABLE "object_releases" (
 "object_id" TEXT NOT NULL REFERENCES "objects"("object_id") DEFERRABLE INITIALLY DEFERRED,
 "version_id" TEXT REFERENCES "versions"("version_id") DEFERRABLE INITIALLY DEFERRED,
 "release_id" TEXT REFERENCES "releases"("release_id") DEFERRABLE INITIALLY DEFERRED,
 "source_id" TEXT NOT NULL REFERENCES "sources"("source_id") DEFERRABLE INITIALLY DEFERRED,
 PRIMARY KEY ("object_id")
) STRICT;

CREATE TABLE "events" (
 "event_id" TEXT NOT NULL,
 "name" TEXT NOT NULL,
 "version_id" TEXT REFERENCES "versions"("version_id") DEFERRABLE INITIALLY DEFERRED,
 "start_date" TEXT,
 "end_date" TEXT,
 "source_id" TEXT NOT NULL REFERENCES "sources"("source_id") DEFERRABLE INITIALLY DEFERRED,
 "start_datetime" TEXT,
 "end_datetime" TEXT,
 "time_zone" TEXT,
 "start_condition" TEXT,
 "date_basis" TEXT,
 "checked_at" TEXT,
 PRIMARY KEY ("event_id")
) STRICT;

CREATE TABLE "event_objects" (
 "event_id" TEXT NOT NULL REFERENCES "events"("event_id") DEFERRABLE INITIALLY DEFERRED,
 "object_id" TEXT NOT NULL REFERENCES "objects"("object_id") DEFERRABLE INITIALLY DEFERRED,
 "obtain_condition" TEXT,
 "source_id" TEXT NOT NULL REFERENCES "sources"("source_id") DEFERRABLE INITIALLY DEFERRED,
 PRIMARY KEY ("event_id","object_id")
) STRICT;

CREATE TABLE "gathering_areas" (
 "area_record_id" TEXT NOT NULL,
 "material_id" TEXT NOT NULL REFERENCES "materials"("material_id") DEFERRABLE INITIALLY DEFERRED,
 "region" TEXT NOT NULL,
 "condition_text" TEXT,
 "source_id" TEXT NOT NULL REFERENCES "sources"("source_id") DEFERRABLE INITIALLY DEFERRED,
 "source_published_date" TEXT,
 PRIMARY KEY ("area_record_id")
) STRICT;

CREATE TABLE "gathering_points" (
 "point_id" TEXT NOT NULL,
 "material_id" TEXT NOT NULL REFERENCES "materials"("material_id") DEFERRABLE INITIALLY DEFERRED,
 "region" TEXT NOT NULL,
 "x" REAL NOT NULL,
 "y" REAL NOT NULL,
 "coordinate_system" TEXT NOT NULL,
 "condition_text" TEXT,
 "source_id" TEXT NOT NULL REFERENCES "sources"("source_id") DEFERRABLE INITIALLY DEFERRED,
 PRIMARY KEY ("point_id")
) STRICT;

CREATE TABLE "source_assertions" (
 "assertion_id" TEXT NOT NULL,
 "object_id" TEXT NOT NULL REFERENCES "objects"("object_id") DEFERRABLE INITIALLY DEFERRED,
 "field" TEXT NOT NULL CHECK ("field" IN ('rarity','style','obtain_text')),
 "value" TEXT NOT NULL,
 "source_id" TEXT NOT NULL REFERENCES "sources"("source_id") DEFERRABLE INITIALLY DEFERRED,
 "match_method" TEXT NOT NULL CHECK ("match_method" IN ('existing_id','unique_name','reviewed_guidance')),
 "raw_value" TEXT,
 PRIMARY KEY ("assertion_id")
) STRICT;

CREATE TABLE "source_conflicts" (
 "conflict_id" TEXT NOT NULL,
 "object_id" TEXT NOT NULL REFERENCES "objects"("object_id") DEFERRABLE INITIALLY DEFERRED,
 "field" TEXT NOT NULL,
 "left_assertion_id" TEXT NOT NULL REFERENCES "source_assertions"("assertion_id") DEFERRABLE INITIALLY DEFERRED,
 "right_assertion_id" TEXT NOT NULL REFERENCES "source_assertions"("assertion_id") DEFERRABLE INITIALLY DEFERRED,
 "status" TEXT NOT NULL CHECK ("status" IN ('needs_review')),
 PRIMARY KEY ("conflict_id")
) STRICT;

CREATE TABLE "image_checks" (
 "object_id" TEXT NOT NULL REFERENCES "objects"("object_id") DEFERRABLE INITIALLY DEFERRED,
 "image_ref" TEXT,
 "status" TEXT NOT NULL CHECK ("status" IN ('local_verified','local_invalid','missing','remote_unchecked','remote_verified','remote_failed')),
 "checked_at" TEXT,
 "check_method" TEXT NOT NULL,
 "source_id" TEXT NOT NULL REFERENCES "sources"("source_id") DEFERRABLE INITIALLY DEFERRED,
 "http_status" INTEGER CHECK ("http_status">=100) CHECK ("http_status"<=599),
 "content_type" TEXT,
 PRIMARY KEY ("object_id")
) STRICT;

CREATE TABLE "snapshots" (
 "snapshot_id" TEXT NOT NULL,
 "previous_snapshot_id" TEXT REFERENCES "snapshots"("snapshot_id") DEFERRABLE INITIALLY DEFERRED,
 "created_at" TEXT NOT NULL,
 "source_date" TEXT,
 "catalog_version" TEXT,
 "catalog_generated_at" TEXT,
 "object_count" INTEGER NOT NULL CHECK ("object_count">=0),
 "is_baseline" INTEGER NOT NULL CHECK ("is_baseline" IN (0,1)),
 "input_manifest_json" TEXT NOT NULL,
 PRIMARY KEY ("snapshot_id")
) STRICT;

CREATE TABLE "change_log" (
 "change_id" TEXT NOT NULL,
 "snapshot_id" TEXT NOT NULL REFERENCES "snapshots"("snapshot_id") DEFERRABLE INITIALLY DEFERRED,
 "table_name" TEXT NOT NULL,
 "row_key" TEXT NOT NULL,
 "change_type" TEXT NOT NULL CHECK ("change_type" IN ('baseline','added','modified','deleted')),
 "before_json" TEXT,
 "after_json" TEXT,
 PRIMARY KEY ("change_id")
) STRICT;

CREATE TABLE "outfit_recipe_status" (
 "outfit_id" TEXT NOT NULL REFERENCES "outfits"("outfit_id") DEFERRABLE INITIALLY DEFERRED,
 "status" TEXT NOT NULL CHECK ("status" IN ('complete','missing_entry','unpublished','not_crafting','evolution_pending','renewal_pending','variant_pending','conflict')),
 "needs_recipe" INTEGER NOT NULL CHECK ("needs_recipe" IN (0,1)),
 "recipe_id" TEXT REFERENCES "recipes"("recipe_id") DEFERRABLE INITIALLY DEFERRED,
 "reason" TEXT NOT NULL,
 "source_id" TEXT NOT NULL REFERENCES "sources"("source_id") DEFERRABLE INITIALLY DEFERRED,
 "checked_at" TEXT,
 "evidence_url" TEXT,
 PRIMARY KEY ("outfit_id")
) STRICT;

CREATE TABLE "material_guidance" (
 "material_id" TEXT NOT NULL REFERENCES "materials"("material_id") DEFERRABLE INITIALLY DEFERRED,
 "kind" TEXT NOT NULL CHECK ("kind" IN ('gathering','non_gathering')),
 "text" TEXT NOT NULL,
 "source_id" TEXT NOT NULL REFERENCES "sources"("source_id") DEFERRABLE INITIALLY DEFERRED,
 "checked_at" TEXT NOT NULL,
 PRIMARY KEY ("material_id")
) STRICT;

CREATE TABLE "version_calendar" (
 "version_id" TEXT NOT NULL REFERENCES "versions"("version_id") DEFERRABLE INITIALLY DEFERRED,
 "version_number" TEXT NOT NULL,
 "launch_date" TEXT NOT NULL,
 "time_zone" TEXT NOT NULL,
 "date_basis" TEXT NOT NULL CHECK ("date_basis" IN ('publisher_announced_update_day')),
 "source_id" TEXT NOT NULL REFERENCES "sources"("source_id") DEFERRABLE INITIALLY DEFERRED,
 "source_published_date" TEXT,
 "checked_at" TEXT,
 PRIMARY KEY ("version_id")
) STRICT;

CREATE TABLE "evolution_requirements" (
 "outfit_id" TEXT NOT NULL REFERENCES "outfits"("outfit_id") DEFERRABLE INITIALLY DEFERRED,
 "required_object_id" TEXT NOT NULL REFERENCES "objects"("object_id") DEFERRABLE INITIALLY DEFERRED,
 "required_quantity" INTEGER NOT NULL CHECK ("required_quantity">=1),
 "requirement_type" TEXT NOT NULL CHECK ("requirement_type" IN ('owned_copies','listed_input_copies')),
 "consumed_quantity" INTEGER CHECK ("consumed_quantity">=0),
 "source_id" TEXT NOT NULL REFERENCES "sources"("source_id") DEFERRABLE INITIALLY DEFERRED,
 "checked_at" TEXT NOT NULL,
 PRIMARY KEY ("outfit_id","required_object_id")
) STRICT;

CREATE TABLE "evolution_observations" (
 "outfit_id" TEXT NOT NULL REFERENCES "outfits"("outfit_id") DEFERRABLE INITIALLY DEFERRED,
 "base_id" TEXT NOT NULL REFERENCES "outfits"("outfit_id") DEFERRABLE INITIALLY DEFERRED,
 "cost_status" TEXT NOT NULL CHECK ("cost_status" IN ('complete','pending_not_recorded','explicit_unpublished','partial_confirmed')),
 "attribute_status" TEXT NOT NULL CHECK ("attribute_status" IN ('partial_level_unverified','pending','verified')),
 "before_scores" TEXT,
 "after_scores" TEXT,
 "before_source_id" TEXT REFERENCES "sources"("source_id") DEFERRABLE INITIALLY DEFERRED,
 "after_source_id" TEXT REFERENCES "sources"("source_id") DEFERRABLE INITIALLY DEFERRED,
 "checked_at" TEXT NOT NULL,
 "note" TEXT NOT NULL,
 PRIMARY KEY ("outfit_id")
) STRICT;

CREATE VIEW v_independent_outfits AS SELECT o.*, f.family_id FROM objects o JOIN outfit_families f ON f.base_outfit_id=o.object_id;
 CREATE VIEW v_outfit_release_counts AS SELECT r.release_id,r.label,r.release_date,r.context,COUNT(*) AS form_count,SUM(o.is_base) AS new_independent_outfit_count,SUM(1-o.is_base) AS additional_form_count FROM outfits o JOIN object_releases x ON x.object_id=o.outfit_id JOIN releases r ON r.release_id=x.release_id GROUP BY r.release_id;
 CREATE VIEW v_complete_recipes AS SELECT * FROM recipes WHERE status='complete';