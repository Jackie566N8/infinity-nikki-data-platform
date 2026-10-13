// Reviewed publisher facts. Never use crawl time as a release or event date.
export function applyOfficialInput(input, tables, source, id) {
  if (input.schema_version !== 1)
    throw Error("Unsupported official fact input");
  const versions = new Map(tables.versions.map((v) => [v.label, v])),
    objects = new Set(tables.objects.map((o) => o.object_id));
  const src = (url) => {
    if (!/^https:\/\//.test(url)) throw Error("Official source URL invalid");
    const sid = source(url);
    tables.sources.find((s) => s.source_id === sid).retrieved_date =
      input.checked_at.slice(0, 10);
    return sid;
  };
  for (const v of input.versions) {
    const row = versions.get(v.label);
    if (!row)
      throw Error("Official mapping has no source version label: " + v.label);
    const sid = src(v.source_url);
    row.version_number = v.version_number;
    row.number_source_id = sid;
    tables.version_calendar.push({
      version_id: row.version_id,
      version_number: v.version_number,
      launch_date: v.launch_date,
      time_zone: v.time_zone,
      date_basis: "publisher_announced_update_day",
      source_id: sid,
      source_published_date: v.published_date,
      checked_at: input.checked_at,
    });
  }
  for (const e of input.events) {
    const version = versions.get(e.version_label);
    if (!version) throw Error("Unknown event version");
    const event_id = id("event", e.key),
      source_id = src(e.source_url);
    tables.events.push({
      event_id,
      name: e.name,
      version_id: version.version_id,
      start_date: e.start_date,
      end_date: e.end_date,
      source_id,
      start_datetime: null,
      end_datetime: e.end_datetime,
      time_zone: e.time_zone,
      start_condition: e.start_condition,
      date_basis: "publisher_announced_schedule",
      checked_at: input.checked_at,
    });
    for (const oid of e.outfit_ids) {
      if (!objects.has(oid))
        throw Error("Unknown official event object " + oid);
      tables.event_objects.push({
        event_id,
        object_id: oid,
        obtain_condition: e.obtain_condition,
        source_id,
      });
    }
  }
}
