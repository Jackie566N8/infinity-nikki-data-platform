export function applyEvolutionInput(research, requirements, tables, source) {
  const evidenceSource = (url, at) => {
    const sid = source(url);
    tables.sources.find((s) => s.source_id === sid).retrieved_date = at.slice(
      0,
      10,
    );
    return sid;
  };
  const existing = new Map(tables.outfits.map((o) => [o.outfit_id, o]));
  const complete = new Set(
    tables.recipes
      .filter((r) => r.scope === "evolution" && r.status === "complete")
      .map((r) => r.target_id),
  );
  for (const r of requirements.rows) {
    if (existing.get(r.outfit_id)?.form_type !== "evolution")
      throw Error("Invalid evolution requirement " + r.outfit_id);
    const { source_url, ...row } = r;
    tables.evolution_requirements.push({
      ...row,
      source_id: evidenceSource(source_url, r.checked_at),
    });
  }
  for (const r of research.rows) {
    if (
      existing.get(r.outfit_id)?.form_type !== "evolution" ||
      existing.get(r.outfit_id).base_outfit_id !== r.base_id
    )
      throw Error("Evolution family mismatch " + r.outfit_id);
    tables.evolution_observations.push({
      outfit_id: r.outfit_id,
      base_id: r.base_id,
      cost_status: complete.has(r.outfit_id)
        ? "complete"
        : tables.recipes.some(x=>x.target_id===r.outfit_id&&x.scope==='evolution'&&x.status==='partial') ? 'partial_confirmed' : 'pending_not_recorded',
      attribute_status: r.attribute_status,
      before_scores: r.before?.scores ? JSON.stringify(r.before.scores) : null,
      after_scores: r.after?.scores ? JSON.stringify(r.after.scores) : null,
      before_source_id: r.before?.url
        ? evidenceSource(
            r.before.url,
            r.before.checked_at || research.checked_at,
          )
        : null,
      after_source_id: r.after?.url
        ? evidenceSource(r.after.url, r.after.checked_at || research.checked_at)
        : null,
      checked_at: research.checked_at,
      note: r.note,
    });
  }
}
