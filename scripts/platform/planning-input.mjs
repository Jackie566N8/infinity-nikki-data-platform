// Merge reviewed facts into the existing normalized tables. No inferred per-piece amounts.
export function applyPlanningInput(input, tables, source, id) {
  if (input.schema_version !== 1)
    throw Error("Unsupported material planning schema");
  const objects = new Map(tables.objects.map((r) => [r.object_id, r])),
    materials = new Set(tables.materials.map((r) => r.material_id));
  const checkURL = (u) => {
    if (typeof u !== "string" || !/^https:\/\/[^\s]+$/.test(u))
      throw Error("Invalid planning source URL");
  };
  const checked = (s) => {
    if (!/^\d{4}-\d\d-\d\dT/.test(s) || !Number.isFinite(Date.parse(s)))
      throw Error("Invalid collection timestamp");
  };
  const evidenceSource = (url, at) => {
    const sid = source(url);
    tables.sources.find((s) => s.source_id === sid).retrieved_date = at.slice(
      0,
      10,
    );
    return sid;
  };
  for (const r of input.recipes) {
    checkURL(r.source_url);
    checked(r.checked_at);
    for (const u of r.corroborating_urls) checkURL(u);
    if (
      ![
        "whole_outfit",
        "clothing",
        "evolution",
        "renewal",
        "material",
      ].includes(r.scope) ||
      !Array.isArray(r.ingredients)
    )
      throw Error("Invalid recipe scope or ingredients");
    const source_id = evidenceSource(r.source_url, r.checked_at);
    tables.recipes.push({
      recipe_id: r.recipe_id,
      target_id: r.target_id,
      design_id: null,
      scope: r.scope,
      output_quantity: r.output_quantity,
      status: r.status,
      source_id,
      checked_at: r.checked_at,
      source_published_date: r.source_published_date,
      access_method: r.access_method,
      note: r.note,
    });
    Object.assign(tables.recipes.at(-1), {
      source_confidence: r.source_confidence || null,
      source_title: r.source_title || null,
      current_game_measured: r.current_game_measured === undefined ? null : Number(r.current_game_measured),
      source_type: r.source_type || "community_wiki",
      checked_precision: r.checked_precision || "timestamp",
      prerequisite: r.prerequisite || null,
    });
    for (const i of r.ingredients)
      tables.recipe_ingredients.push({
        recipe_id: r.recipe_id,
        material_id: i.material_id,
        quantity: i.quantity,
        unit: i.unit || "count",
        source_id,
      });
  }
  for (const m of input.material_names) {
    if (!materials.has(m.material_id)) throw Error("Unknown material name ID");
    checkURL(m.source_url);
    checked(m.checked_at);
    objects.get(m.material_id).display_name = m.names["zh-CN"];
    for (const [locale, name] of Object.entries(m.names)) {
      if (
        !["zh-CN", "en", "ja", "ko", "zh-TW"].includes(locale) ||
        typeof name !== "string" ||
        !name.trim()
      )
        throw Error("Invalid translated name");
      const row = tables.object_names.find(
        (n) =>
          n.object_id === m.material_id &&
          n.locale === locale &&
          n.name_type === "standard",
      );
      if (!row) throw Error("Missing name row");
      Object.assign(row, {
        name,
        display_fallback: name,
        translation_status: "source",
        source_id: evidenceSource(m.source_url, m.checked_at),
      });
    }
  }
  for (const a of input.gathering_areas) {
    checkURL(a.source_url);
    checked(a.checked_at);
    tables.gathering_areas.push({
      area_record_id: id("area", a.material_id, a.region, a.source_url),
      material_id: a.material_id,
      region: a.region,
      condition_text: a.condition_text,
      source_id: evidenceSource(a.source_url, a.checked_at),
      source_published_date: a.source_published_date,
    });
  }
  for (const g of input.material_guidance) {
    if (
      !materials.has(g.material_id) ||
      !["non_gathering", "gathering"].includes(g.kind) ||
      !g.text
    )
      throw Error("Invalid material guidance");
    checkURL(g.source_url);
    checked(g.checked_at);
    tables.material_guidance.push({
      material_id: g.material_id,
      kind: g.kind,
      text: g.text,
      source_id: evidenceSource(g.source_url, g.checked_at),
      checked_at: g.checked_at,
    });
    const obj = objects.get(g.material_id),
      sid = evidenceSource(g.source_url, g.checked_at);
    if (obj.obtain_status === "uncollected") {
      obj.obtain_text = g.text;
      obj.obtain_status = "known";
      obj.obtain_source_id = sid;
    }
    const aid = id("assert", g.material_id, "obtain_text", sid, g.text),
      assertion = {
        assertion_id: aid,
        object_id: g.material_id,
        field: "obtain_text",
        value: g.text,
        raw_value: g.text,
        source_id: sid,
        match_method: "reviewed_guidance",
      },
      prior = tables.source_assertions.find((a) => a.assertion_id === aid);
    if (prior) Object.assign(prior, assertion);
    else tables.source_assertions.push(assertion);
  }
}
