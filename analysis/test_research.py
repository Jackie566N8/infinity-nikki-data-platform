"""Independent invariants, known fixtures and SQL checks for the research output."""
import json
import math
import sqlite3
import sys
from pathlib import Path
from research import ROOT, block_distance, silhouette, adjusted_rand, wilson, duckdb, np

report = json.loads((ROOT / "data/dataset/research/report.json").read_text(encoding="utf-8"))
advanced = json.loads((ROOT / "data/dataset/advanced/input.json").read_text(encoding="utf-8"))
docs = sorted(advanced["documents"], key=lambda d: d["id"])
distance = block_distance(docs)
assert np.allclose(distance, distance.T) and np.allclose(np.diag(distance), 0)
assert np.all((distance >= 0) & (distance <= 1))
index = {d["id"]: i for i, d in enumerate(docs)}
for source_id, rows in advanced["recommendations"].items():
    for row in rows:
        assert abs((1 - distance[index[source_id], index[row["id"]]]) - row["score"]) < 1e-10
fixture = np.array([[0, .1, .9, .9], [.1, 0, .9, .9], [.9, .9, 0, .1], [.9, .9, .1, 0]])
assert abs(silhouette(fixture, np.array([0, 0, 1, 1])) - 8 / 9) < 1e-12
assert adjusted_rand([0, 0, 1, 1], [1, 1, 0, 0]) == 1
assert abs(adjusted_rand([0, 0, 1, 1], [0, 1, 0, 1]) + .5) < 1e-12
assert wilson(0, 0) is None
assert wilson(24, 24)[0] > .86 and wilson(24, 24)[0] < .87
assert .60 < wilson(6, 6)[0] < .62
sqlite = sqlite3.connect(ROOT / "data/dataset/miraland.sqlite")
db = duckdb.connect(str(ROOT / "data/dataset/research/research.duckdb"), read_only=True)
for table in ["objects", "outfits", "sources", "outfit_clothing", "version_calendar"]:
    assert db.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0] == sqlite.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
assert db.execute("SELECT COUNT(*) FROM cluster_membership").fetchone()[0] == report["n"]
assert db.execute("SELECT COUNT(DISTINCT outfit_id) FROM cluster_membership").fetchone()[0] == report["n"]
assert sum(sum(row) for row in report["association"]["counts"]) == report["n"]
for cluster in report["clusters"]:
    assert cluster["medoid_id"] in cluster["ids"]
    assert cluster["n"] == len(cluster["ids"])
assert sum(c["n"] for c in report["clusters"]) == report["n"]
assert -1 <= report["silhouette"] <= 1
assert report["visual_fields_used"] is False
assert report["search_uncertainty"]["human_approved"] == 0
assert report["search_uncertainty"]["paired_group_tests"]["C"]["exact_two_sided_group_signflip_p"] == .125
db.close()
sqlite.close()
print("PASS cross-language recommendation distances, silhouette/ARI/Wilson fixtures, DuckDB–SQLite row reconciliation, cluster membership and honest grouped search uncertainty.")
