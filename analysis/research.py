"""Offline exploratory analysis; no network, telemetry or search retuning.

SQLite/JSON remain the normalized source. DuckDB is a small local research mart.
Clustering uses catalog features, not player behavior or visual inference.
"""
from __future__ import annotations

import hashlib
import itertools
import json
import math
import platform
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
# Local optional dependencies are excluded from all handoff/Git artifacts.
sys.path.insert(0, str(ROOT / ".python-packages"))
import duckdb
import numpy as np
import pandas as pd

SEED = 20261010
PERMUTATIONS = 4999
K_VALUES = range(2, 9)
STARTS = 5
MAX_ITERATIONS = 30
BLOCK_WEIGHTS = {"style": 0.4, "tags": 0.3, "rarity": 0.1, "methods": 0.15}


def load(path):
    return json.loads((ROOT / path).read_text(encoding="utf-8-sig"))


def wilson(successes, n, z=1.959963984540054):
    if not n:
        return None
    p = successes / n
    den = 1 + z * z / n
    centre = (p + z * z / (2 * n)) / den
    radius = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / den
    return [max(0.0, centre - radius), min(1.0, centre + radius)]


def block_distance(docs, weights=BLOCK_WEIGHTS):
    n = len(docs)
    weighted, known = np.zeros((n, n)), np.zeros((n, n))
    for field, weight in weights.items():
        values = []
        for d in docs:
            if field == "tags":
                v = sorted(set(d.get(field, [])))
            elif field == "methods":
                v = sorted(set(d.get(field, [])) - {"other"})
            else:
                v = [str(d[field])] if d.get(field) else []
            values.append(v)
        vocabulary = sorted({v for row in values for v in row})
        lookup = {v: i for i, v in enumerate(vocabulary)}
        vectors = np.zeros((n, len(vocabulary)))
        for i, row in enumerate(values):
            for v in row:
                vectors[i, lookup[v]] = 1
        if field == "tags":
            vectors *= np.log((n + 1) / ((vectors > 0).sum(axis=0) + 1)) + 1
        norms = np.linalg.norm(vectors, axis=1)
        normalized = np.divide(vectors, norms[:, None], out=np.zeros_like(vectors), where=norms[:, None] > 0)
        pair_known = (norms > 0)[:, None] & (norms > 0)[None, :]
        weighted += weight * (normalized @ normalized.T) * pair_known
        known += weight * pair_known
    similarity = np.divide(weighted, known, out=np.zeros_like(weighted), where=known > 0)
    distance = np.clip(1 - similarity, 0, 1)
    np.fill_diagonal(distance, 0)
    return distance


def silhouette(distance, labels):
    groups = [np.flatnonzero(labels == g) for g in np.unique(labels)]
    scores = np.zeros(len(labels))
    for group in groups:
        if len(group) <= 1:
            continue
        a = distance[np.ix_(group, group)].sum(axis=1) / (len(group) - 1)
        others = [distance[np.ix_(group, other)].mean(axis=1) for other in groups if not np.array_equal(group, other)]
        if not others:
            continue
        b = np.min(others, axis=0)
        scores[group] = np.divide(b - a, np.maximum(a, b), out=np.zeros_like(a), where=np.maximum(a, b) > 0)
    return float(scores.mean())


def fit_medoids(distance, k, seed):
    rng = np.random.default_rng(seed)
    medoids = [int(rng.integers(len(distance)))]
    for _ in range(1, k):
        nearest = distance[:, medoids].min(axis=1)
        nearest[medoids] = -1
        candidates = np.flatnonzero(np.isclose(nearest, nearest.max()))
        medoids.append(int(rng.choice(candidates)))
    converged = False
    for iteration in range(MAX_ITERATIONS):
        labels = distance[:, medoids].argmin(axis=1)
        updated = []
        for c in range(k):
            members = np.flatnonzero(labels == c)
            if not len(members):
                updated.append(medoids[c])
                continue
            costs = distance[np.ix_(members, members)].sum(axis=1)
            updated.append(int(members[int(costs.argmin())]))
        if updated == medoids:
            converged = True
            break
        medoids = updated
    labels = distance[:, medoids].argmin(axis=1)
    return {"k": k, "medoids": medoids, "labels": labels, "silhouette": silhouette(distance, labels),
            "objective": float(distance[np.arange(len(distance)), np.array(medoids)[labels]].sum()),
            "iterations": iteration + 1, "converged": converged}


def adjusted_rand(a, b):
    table = pd.crosstab(pd.Series(a), pd.Series(b)).to_numpy()
    choose2 = lambda x: np.sum(x * (x - 1) / 2)
    n_pairs = len(a) * (len(a) - 1) / 2
    observed = choose2(table)
    row, col = choose2(table.sum(axis=1)), choose2(table.sum(axis=0))
    expected = row * col / n_pairs
    maximum = (row + col) / 2
    return 1.0 if maximum == expected else float((observed - expected) / (maximum - expected))


def association(docs):
    rarities = sorted({d["rarity"] for d in docs})
    styles = sorted({d["style"] for d in docs})
    a = np.array([rarities.index(d["rarity"]) for d in docs])
    b = np.array([styles.index(d["style"]) for d in docs])
    cells = len(rarities) * len(styles)
    observed = np.bincount(a * len(styles) + b, minlength=cells).reshape(len(rarities), len(styles))
    expected = observed.sum(axis=1)[:, None] * observed.sum(axis=0)[None, :] / len(docs)
    chi2 = float(((observed - expected) ** 2 / expected).sum())
    rng = np.random.default_rng(SEED)
    exceed = 0
    for _ in range(PERMUTATIONS):
        shuffled = np.bincount(a * len(styles) + rng.permutation(b), minlength=cells).reshape(observed.shape)
        value = float(((shuffled - expected) ** 2 / expected).sum())
        exceed += value >= chi2 - 1e-12
    return {"n": len(docs), "rarities": rarities, "styles": styles, "counts": observed.tolist(),
            "expected_min": float(expected.min()), "chi_square": chi2,
            "cramers_v": math.sqrt(chi2 / (len(docs) * min(len(rarities) - 1, len(styles) - 1))),
            "permutation_p": (1 + exceed) / (PERMUTATIONS + 1), "permutations": PERMUTATIONS,
            "seed": SEED, "scope": "catalog_base_outfits; exploratory label-exchangeability test, not random-player inference"}


def search_uncertainty(comparison):
    summary = {}
    for method in ["A", "B", "C", "D", "E", "F", "L"]:
        rows = [r for r in comparison["predictions"][method] if r["split"] == "test"]
        overall = comparison["metrics"]["test"][method]["overall"]
        n, negatives = overall["answerable_n"], overall["no_answer_n"]
        summary[method] = {"hit1": overall["hit1"], "positive_n": n, "negative_n": negatives, "no_answer_rate": overall["no_answer_accuracy"],
                           "hit1_wilson_query_iid_only": wilson(round(overall["hit1"] * n), n),
                           "no_answer_wilson_query_iid_only": wilson(round(overall["no_answer_accuracy"] * negatives), negatives),
                           "latency_ms_saved_warm_model": overall["mean_response_ms"]}
    # Paired signs are flipped at the family group, not the paraphrase query.
    pairs = {}
    f = {r["query_id"]: r for r in comparison["predictions"]["F"] if r["split"] == "test"}
    positive_ids = {q["query_id"] for q in load("data/dataset/search/queries.candidates.json") if q["split"] == "test" and q["expected_ids"]}
    for method in ["C", "D", "E", "L"]:
        differences = {}
        for r in comparison["predictions"][method]:
            if r["split"] != "test" or r.get("no_answer", False):
                continue
            # scoreCase serializes answerability separately; infer positives by
            # exact query IDs from the saved case set, not by whether F succeeds.
            if r["query_id"] not in positive_ids:
                continue
            differences.setdefault(r["group_id"], []).append(float(f[r["query_id"]]["hit1"]) - float(r["hit1"]))
        group_diff = [float(np.mean(v)) for _, v in sorted(differences.items())]
        observed = abs(float(np.mean(group_diff)))
        signed = [abs(float(np.mean(np.array(group_diff) * signs))) for signs in itertools.product([-1, 1], repeat=len(group_diff))]
        pairs[method] = {"families": len(group_diff), "group_differences": group_diff,
                         "mean_hit1_improvement": float(np.mean(group_diff)),
                         "exact_two_sided_group_signflip_p": sum(v >= observed - 1e-12 for v in signed) / len(signed)}
    return {"annotation_status": comparison["annotation_status"], "human_approved": 0,
            "methods": summary, "paired_group_tests": pairs,
            "limitations": ["Wilson intervals assume query independence, which paraphrase families violate: diagnostic only.",
                            "Only four positive test families; group comparisons are exploratory, not proof of generalization.",
                            "Candidate AI labels are not external human Gold; no old test was used for new tuning."]}


def run():
    advanced = load("data/dataset/advanced/input.json")
    docs = sorted(advanced["documents"], key=lambda d: d["id"])
    distance = block_distance(docs)
    choices = []
    for k in K_VALUES:
        fits = [fit_medoids(distance, k, SEED + start) for start in range(STARTS)]
        choices.append(max(fits, key=lambda f: (f["silhouette"], -f["objective"])))
    best = max(choices, key=lambda f: (f["silhouette"], -f["k"]))
    clusters, membership = [], []
    for cluster in sorted(set(best["labels"].tolist())):
        members = np.flatnonzero(best["labels"] == cluster)
        rows = [docs[i] for i in members]
        counts = lambda field: pd.Series([d[field] for d in rows]).value_counts().to_dict()
        tags = pd.Series([tag for d in rows for tag in d["tags"]]).value_counts().to_dict()
        clusters.append({"cluster": cluster + 1, "n": len(rows), "medoid_id": docs[best["medoids"][cluster]]["id"],
                         "styles": counts("style"), "rarities": counts("rarity"), "top_tags": list(tags.items())[:5],
                         "ids": [d["id"] for d in rows]})
        membership.extend({"outfit_id": d["id"], "cluster": cluster + 1, "style": d["style"], "rarity": d["rarity"],
                           "distance_to_medoid": float(distance[i, best["medoids"][cluster]])} for i, d in zip(members, rows))
    sensitivity = {}
    for removed in ["methods", "tags"]:
        d = block_distance(docs, {k: w for k, w in BLOCK_WEIGHTS.items() if k != removed})
        fits = [fit_medoids(d, best["k"], SEED + i) for i in range(STARTS)]
        selected = max(fits, key=lambda f: (f["silhouette"], -f["objective"]))
        sensitivity["without_" + removed] = {"ari_vs_main": adjusted_rand(best["labels"], selected["labels"]), "silhouette": selected["silhouette"]}
    result = {"schema_version": 1, "snapshot_id": advanced["provenance"]["snapshot_id"],
              "method": "declared-block-cosine + alternating-k-medoids", "seed": SEED,
              "python_version": platform.python_version(), "libraries": {"numpy": np.__version__, "pandas": pd.__version__, "duckdb": duckdb.__version__},
              "n": len(docs), "weights": BLOCK_WEIGHTS, "visual_fields_used": False,
              "selected_k": best["k"], "silhouette": best["silhouette"], "converged": best["converged"],
              "selection": [{k: fit[k] for k in ["k", "silhouette", "objective", "iterations", "converged"]} for fit in choices],
              "clusters": clusters, "sensitivity": sensitivity, "association": association(docs),
              "search_uncertainty": search_uncertainty(load("data/dataset/search-improved/comparison.json")),
              "limitations": ["Exploratory catalog grouping; not player segmentation, preference prediction or visual recognition.",
                              "Same-data silhouette selects k; no external cluster labels or predictive validation.",
                              "Distances depend on declared heuristic weights and sparse categorical tags; inspect sensitivity.",
                              "Incomplete official history does not justify a version-content forecast."]}
    out = ROOT / "data/dataset/research"
    out.mkdir(parents=True, exist_ok=True)
    (out / "report.json").write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    pd.DataFrame(membership).to_csv(out / "cluster-membership.csv", index=False, encoding="utf-8-sig")
    db = duckdb.connect(str(out / "research.duckdb"))
    for table in ["objects", "outfits", "clothing", "outfit_clothing", "recipes", "recipe_ingredients", "versions", "version_calendar", "events", "sources", "object_tags"]:
        frame = pd.DataFrame(load(f"data/dataset/json/{table}.json"))
        db.register("source_frame", frame)
        db.execute(f'CREATE OR REPLACE TABLE "{table}" AS SELECT * FROM source_frame')
        db.unregister("source_frame")
    db.register("members", pd.DataFrame(membership))
    db.execute("CREATE OR REPLACE TABLE cluster_membership AS SELECT * FROM members")
    check = db.execute("SELECT COUNT(*) FROM outfits WHERE is_base=1").fetchone()[0]
    assert check == len(docs)
    db.close()
    site = "window.NIKKI_RESEARCH_DATA=" + json.dumps(result, ensure_ascii=False, separators=(",", ":")) + ";"
    (ROOT / "src/research-data.js").write_text(site, encoding="utf-8")
    print(json.dumps({"n": len(docs), "selected_k": best["k"], "silhouette": best["silhouette"], "cramers_v": result["association"]["cramers_v"], "permutation_p": result["association"]["permutation_p"], "sensitivity": sensitivity, "paired_search": result["search_uncertainty"]["paired_group_tests"]}, ensure_ascii=False))
    return result


if __name__ == "__main__":
    run()
