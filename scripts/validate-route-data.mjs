import fs from "node:fs";
import assert from "node:assert/strict";
const file = process.argv[2];
if (!file)
  throw Error("Usage: node scripts/validate-route-data.mjs route-data.json");
const d = JSON.parse(fs.readFileSync(file)),
  nodes = new Map();
assert.ok(Array.isArray(d.nodes) && Array.isArray(d.edges));
for (const n of d.nodes) {
  assert.ok(n.node_id && !nodes.has(n.node_id));
  nodes.set(n.node_id, n);
  assert.ok(Number.isFinite(n.x) && Number.isFinite(n.y));
  assert.ok(n.coordinate_system && n.coordinate_unit && n.map_version);
  assert.ok(
    n.review_status === "approved" &&
      n.reviewer &&
      Number.isFinite(Date.parse(n.reviewed_at)),
  );
  assert.ok(/^https:\/\//.test(n.source_url));
}
const seen = new Set();
for (const e of d.edges) {
  assert.ok(e.edge_id && !seen.has(e.edge_id));
  seen.add(e.edge_id);
  assert.ok(nodes.has(e.from_node_id) && nodes.has(e.to_node_id));
  const a = nodes.get(e.from_node_id),
    b = nodes.get(e.to_node_id);
  assert.equal(a.coordinate_system, b.coordinate_system);
  assert.equal(a.coordinate_unit, b.coordinate_unit);
  assert.equal(a.map_version, b.map_version);
  assert.ok(typeof e.directed === "boolean");
  assert.ok(Number.isFinite(e.time_seconds) && e.time_seconds >= 0);
  assert.ok(
    e.travel_mode &&
      e.review_status === "approved" &&
      e.reviewer &&
      Number.isFinite(Date.parse(e.reviewed_at)),
  );
  assert.ok(/^https:\/\//.test(e.source_url));
  if (e.travel_mode !== "teleport")
    assert.ok(
      Array.isArray(e.polyline) && e.polyline.length >= 2,
      "A measured traversable edge requires its path, not just an endpoint straight line",
    );
}
assert.ok(
  nodes.size && d.edges.length,
  "Empty data cannot establish an exact route",
);
console.log(
  "Validated recorded route graph:",
  nodes.size,
  "nodes,",
  d.edges.length,
  "edges. Does not certify global optimality or enable a production route automatically.",
);
