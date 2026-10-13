"""Replay frozen models, then independently recompute human-review metrics.

Node performs actual retrieval with the same frontend models. Python calculates
metrics from full rankings, without trusting stored per-query score fields.
No tuning or annotation changes. Historical machine timings are retained.
"""
from __future__ import annotations

import argparse
import json
import math
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def summarize(rows, labels):
    positive = []
    negative = []
    for row in rows:
        gold = labels[row["query_id"]]
        assert row["correct_ids"] == gold["expected_ids"]
        assert row["answerable"] == gold["answerable"]
        ranking = [item["id"] for item in row["ranked"]]
        if gold["answerable"]:
            relevant = set(gold["expected_ids"])
            rank = next((index for index, item in enumerate(ranking, 1) if item in relevant), None)
            positive.append((int(rank == 1), int(rank is not None and rank <= 5), 1 / rank if rank else 0))
        else:
            negative.append(int(not ranking))
    mean = lambda values: sum(values) / len(values) if values else None
    return {
        "reviewed": len(rows), "answerable": len(positive), "no_answer": len(negative),
        "hit_at_1": mean([x[0] for x in positive]),
        "hit_at_5": mean([x[1] for x in positive]),
        "mrr": mean([x[2] for x in positive]),
        "no_answer_identification": mean(negative),
        "mean_response_ms": mean([row["response_ms"] for row in rows]),
    }


def evaluate(replay=True):
    if replay:
        subprocess.run(["node", "scripts/evaluate-step12.mjs"], cwd=ROOT, check=True)
    load = lambda path: json.loads((ROOT / path).read_text(encoding="utf-8-sig"))
    frozen = load("data/dataset/search-human/step12-comparison.json")
    gold = load("data/review/step12/review.json")
    labels = {row["query_id"]: row for row in gold["rows"]}
    assert len(labels) == 50 and sum(row["answerable"] for row in labels.values()) == 44
    group_split = {}
    for row in labels.values():
        assert group_split.setdefault(row["group_id"], row["split"]) == row["split"]
    methods = {}
    for method, predictions in frozen["predictions"].items():
        assert len(predictions) == 50 and {row["query_id"] for row in predictions} == set(labels)
        splits = {}
        for split in ("all", "dev", "test"):
            rows = [row for row in predictions if split == "all" or row["split"] == split]
            output = {"overall": summarize(rows, labels), "by_type": {}}
            for query_type in sorted({row["type"] for row in predictions}):
                output["by_type"][query_type] = summarize([row for row in rows if row["type"] == query_type], labels)
            for key, actual in [("overall", output["overall"]), *output["by_type"].items()]:
                expected = frozen["methods"][method][split]["overall" if key == "overall" else "by_type"]
                if key != "overall":
                    expected = expected[key]
                for metric, value in actual.items():
                    if value is None:
                        assert expected[metric] is None
                    else:
                        assert math.isclose(value, expected[metric], abs_tol=1e-10), (method, split, key, metric)
            splits[split] = output
        methods[method] = splits
    assert methods["F"]["all"]["overall"]["hit_at_1"] == 43 / 44
    assert methods["F_v2"]["all"]["overall"]["hit_at_1"] == 1
    report = {
        "snapshot_id": frozen["snapshot_id"], "sample": frozen["sample"],
        "reviewer": gold["reviewer"], "reviewed_on": gold["reviewed_on"],
        "review_independence": gold["review_independence"],
        "retrieval_replayed": replay, "methods": methods,
        "timing_scope": "Retained first-run warm model latency; current Node replay validates rankings, not identical wall-clock times",
        "limitations": frozen["limitations"],
    }
    destination = ROOT / "analysis/results/search_evaluation.json"
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("PASS independent Python metrics: 8 methods, 50 queries, 144 aggregate rows; F=43/44, F_v2=44/44; no-answer=6/6")
    return report


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--metrics-only", action="store_true", help="Skip actual model replay; recompute saved rankings only")
    evaluate(not parser.parse_args().metrics_only)
