// Status is derived afresh at every build; lack of search results is never evidence of non-public data.
export const statusLabels = {
  complete: "可计算",
  missing_entry: "数据缺失待录入",
  unpublished: "数据未公开",
  not_crafting: "直接获取，不计制作",
  evolution_pending: "进化消耗待补充",
  renewal_pending: "焕新消耗待补充",
  variant_pending: "形态阶段待核实",
  conflict: "配方来源或单位待核实",
};
export function buildPlanningStatuses(tables, extra = {}) {
  const objects = new Map(tables.objects.map((o) => [o.object_id, o])),
    sketchTargets = new Set(
      tables.recipes
        .filter((r) => r.scope === "clothing")
        .map((r) => r.target_id),
    );
  const parts = new Map();
  for (const r of tables.outfit_clothing) {
    if (!parts.has(r.outfit_id)) parts.set(r.outfit_id, []);
    parts.get(r.outfit_id).push(r.clothing_id);
  }
  const recipes = new Map();
  for (const r of tables.recipes.filter((r) =>
    ["whole_outfit", "evolution", "renewal"].includes(r.scope),
  )) {
    if (!recipes.has(r.target_id)) recipes.set(r.target_id, []);
    recipes.get(r.target_id).push(r);
  }
  const overrides = new Map(
    (extra.outfit_status_overrides || []).map((r) => [r.outfit_id, r]),
  );
  const baseline = extra.baseline_ids ? new Set(extra.baseline_ids) : null;
  return tables.outfits.map((o) => {
    const obj = objects.get(o.outfit_id),
      rs = recipes.get(o.outfit_id) || [],
      complete = rs.filter((r) => r.status === "complete"),
      craft = (parts.get(o.outfit_id) || []).some((id) =>
        sketchTargets.has(id),
      );
    let status =
      complete.length === 1
        ? "complete"
        : complete.length > 1
          ? "conflict"
          : o.form_type === "evolution"
            ? "evolution_pending"
            : o.form_type === "renewal"
              ? "renewal_pending"
              : !o.is_base
                ? "variant_pending"
                : craft
                  ? "missing_entry"
                  : obj.obtain_status === "known"
                    ? "not_crafting"
                    : "missing_entry";
    if (
      baseline &&
      !baseline.has(o.outfit_id) &&
      o.is_base &&
      !complete.length &&
      !/共鸣|商城/.test(obj.obtain_text || "")
    )
      status = "missing_entry";
    const override = overrides.get(o.outfit_id);
    if (override) {
      if (
        !["missing_entry", "unpublished", "conflict", "not_crafting"].includes(
          override.status,
        ) ||
        !override.reason ||
        !/^https:\/\//.test(override.source_url) ||
        !override.checked_at
      )
        throw Error(
          "Status override requires explicit evidence: " + o.outfit_id,
        );
      if (!complete.length) status = override.status;
    }
    return {
      outfit_id: o.outfit_id,
      status,
      needs_recipe: status === "not_crafting" ? 0 : 1,
      recipe_id: complete.length === 1 ? complete[0].recipe_id : null,
      reason: override?.reason || (status==='evolution_pending'&&rs.some(r=>r.status==='partial') ? rs.find(r=>r.status==='partial').note : statusLabels[status]),
      source_id: obj.source_id,
      checked_at: override?.checked_at || rs[0]?.checked_at || null,
      evidence_url: override?.source_url || null,
    };
  });
}
export function planningCoverage(tables) {
  const all = tables.outfit_recipe_status,
    ids = new Map(tables.outfits.map((o) => [o.outfit_id, o]));
  const group = (rows) => ({
    total: rows.length,
    complete: rows.filter((r) => r.status === "complete").length,
    pending: rows.filter((r) => r.needs_recipe && r.status !== "complete")
      .length,
    not_crafting: rows.filter((r) => r.status === "not_crafting").length,
  });
  return {
    all: group(all),
    base: group(all.filter((r) => ids.get(r.outfit_id).is_base)),
    craftable_base: group(
      all.filter((r) => ids.get(r.outfit_id).is_base && r.needs_recipe),
    ),
    by_form: Object.fromEntries(
      ["base", "evolution", "renewal", "variant_unknown"].map((form) => [
        form,
        group(all.filter((r) => ids.get(r.outfit_id).form_type === form)),
      ]),
    ),
  };
}
