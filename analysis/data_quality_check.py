"""Independently validate all exported relational CSVs against the data dictionary.

Uses the Python standard library. Source conflicts are evidence to review, not
automatically resolved. Node's semantic validation remains a separate check.
"""
from __future__ import annotations

import csv
import hashlib
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read_json(path):
    return json.loads((ROOT / path).read_text(encoding="utf-8-sig"))


def read_table(name):
    with (ROOT / "data/dataset/csv" / f"{name}.csv").open(
        encoding="utf-8-sig", newline=""
    ) as stream:
        return list(csv.DictReader(stream))


def audit():
    schema = read_json("data/dataset/data-dictionary.json")
    tables = {name: read_table(name) for name in schema}
    errors = []
    keys = {}
    for name, spec in schema.items():
        columns = list(spec["columns"])
        with (ROOT / "data/dataset/csv" / f"{name}.csv").open(
            encoding="utf-8-sig", newline=""
        ) as stream:
            if next(csv.reader(stream)) != columns:
                errors.append(f"{name}: CSV columns differ from dictionary")
        rows = tables[name]
        if len(rows) != spec["row_count"]:
            errors.append(f"{name}: row count differs from dictionary")
        pk = spec["pk"]
        signatures = [tuple(row[col] for col in pk) for row in rows]
        if any(not all(signature) for signature in signatures):
            errors.append(f"{name}: missing primary key")
        if len(set(signatures)) != len(signatures):
            errors.append(f"{name}: duplicate primary key")
        keys[name] = set(signatures)
    for name, spec in schema.items():
        for index, row in enumerate(tables[name], 1):
            for col, field in spec["columns"].items():
                value = row[col]
                if value == "":
                    if field.get("required"):
                        errors.append(f"{name}:{index}:{col}: required value missing")
                    continue
                numeric = value
                if field["type"] in ("INTEGER", "REAL"):
                    try:
                        numeric = float(value)
                        assert math.isfinite(numeric)
                        if field["type"] == "INTEGER":
                            assert numeric.is_integer()
                        if "min" in field:
                            assert numeric >= field["min"]
                        if "max" in field:
                            assert numeric <= field["max"]
                    except (ValueError, AssertionError):
                        errors.append(f"{name}:{index}:{col}: invalid numeric value")
                if "enum" in field and numeric not in field["enum"]:
                    errors.append(f"{name}:{index}:{col}: invalid enum value")
                if "ref" in field:
                    if (value,) not in keys[field["ref"]]:
                        errors.append(f"{name}:{index}:{col}: missing foreign key")
    objects = {row["object_id"]: row for row in tables["objects"]}
    status = {row["outfit_id"]: row for row in tables["outfit_recipe_status"]}
    bases = [row for row in tables["outfits"] if row["is_base"] == "1"]
    candidates = [row for row in bases if status[row["outfit_id"]]["needs_recipe"] == "1"]
    complete_base = sum(status[row["outfit_id"]]["status"] == "complete" for row in candidates)
    evolutions = [row for row in tables["outfits"] if row["form_type"] == "evolution"]
    complete_evolution = sum(status[row["outfit_id"]]["status"] == "complete" for row in evolutions)
    complete_forms = sum(row["status"] == "complete" for row in status.values())
    quality = read_json("data/dataset/quality-report.json")
    derived = {
        "craft_recipe": (complete_base, len(candidates)),
        "evolution_cost": (complete_evolution, len(evolutions)),
        "outfit_recipe": (complete_forms, len(tables["outfits"])),
    }
    for metric in quality["metrics"]:
        expected = None if not metric["denominator"] else round(
            100 * metric["numerator"] / metric["denominator"], 2
        )
        if metric["percent"] != expected:
            errors.append(f"{metric['key']}: percentage differs from denominator")
        if metric["key"] in derived and derived[metric["key"]] != (
            metric["numerator"], metric["denominator"]
        ):
            errors.append(f"{metric['key']}: metric differs from actual relational CSVs")
    planning = read_json("data/dataset/planning/input.json")
    if planning["snapshot_id"] != quality["snapshot"]["snapshot_id"]:
        errors.append("planning snapshot differs from quality snapshot")
    if any(row["material_id"] not in objects for row in tables["recipe_ingredients"]):
        errors.append("ingredient not present in object catalog")
    report = {
        "snapshot_id": quality["snapshot"]["snapshot_id"],
        "table_count": len(tables),
        "row_counts": {name: len(rows) for name, rows in tables.items()},
        "error_count": len(errors), "errors": errors,
        "derived_coverage": {
            key: {"numerator": n, "denominator": d, "percent": round(n / d * 100, 2) if d else None}
            for key, (n, d) in derived.items()
        },
        "csv_sha256": {
            name: hashlib.sha256((ROOT / "data/dataset/csv" / f"{name}.csv").read_bytes()).hexdigest()
            for name in tables
        },
        "scope": "CSV schema, primary/foreign keys, field types and independent coverage recomputation; not in-game factual verification",
    }
    destination = ROOT / "analysis/results/data_quality_check.json"
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{'FAIL' if errors else 'PASS'} {len(tables)} CSV tables; {len(errors)} errors; base recipes {complete_base}/{len(candidates)}; evolution {complete_evolution}/{len(evolutions)}")
    if errors:
        raise SystemExit("\n".join(errors[:20]))
    return report


if __name__ == "__main__":
    audit()
