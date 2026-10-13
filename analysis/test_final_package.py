"""Release checks for readable CSV joins, metric edge cases and public README."""
import csv
import json
import math
import re
from pathlib import Path

from search_evaluation import summarize

ROOT = Path(__file__).resolve().parents[1]


def csv_rows(path):
    with (ROOT / path).open(encoding="utf-8-sig", newline="") as stream:
        return list(csv.DictReader(stream))


def check():
    load = lambda path: json.loads((ROOT / path).read_text(encoding="utf-8-sig"))
    objects = {row["object_id"]: row for row in load("data/dataset/json/objects.json")}
    sources = {row["source_id"]: row for row in load("data/dataset/json/sources.json")}
    for name, pk, expected in (("outfits", "outfit_id", 775), ("clothing", "clothing_id", 8213), ("materials", "material_id", 1781)):
        rows = csv_rows(f"data/{name}.csv")
        assert len(rows) == expected and len({row[pk] for row in rows}) == expected
        for row in rows:
            original = objects[row[pk]]
            assert row["display_name"] == original["display_name"]
            assert row["source_url"] == sources[original["source_id"]]["url"]
        if name == "outfits":
            assert sum(row["form_type"] == "base" for row in rows) == 310
            assert sum(row["recipe_status"] == "complete" for row in rows) == 350
    names = load("data/dataset/json/object_names.json")
    aliases = csv_rows("data/aliases.csv")
    assert len(aliases) == len(names)
    assert {row["name_id"]: row["name"] for row in aliases} == {row["name_id"]: row["name"] or "" for row in names}
    ingredients = load("data/dataset/json/recipe_ingredients.json")
    flat = csv_rows("data/recipes.csv")
    actual = {(row["recipe_id"], row["material_id"], float(row["quantity"]), row["unit"]) for row in flat if row["material_id"]}
    expected = {(row["recipe_id"], row["material_id"], row["quantity"], row["unit"]) for row in ingredients}
    assert actual == expected and len([row for row in flat if row["material_id"]]) == len(ingredients)
    assert {row["recipe_id"] for row in flat} == {row["recipe_id"] for row in load("data/dataset/json/recipes.json")}
    # Independent hand-calculated examples: multiple relevant IDs, rank six,
    # empty positive, correct negative and false-positive negative.
    labels = {"p": {"answerable": True, "expected_ids": ["a", "b"]}, "n": {"answerable": False, "expected_ids": []}}
    row = lambda q, ids: {"query_id": q, "ranked": [{"id": value} for value in ids], "correct_ids": labels[q]["expected_ids"], "answerable": labels[q]["answerable"], "response_ms": 2}
    result = summarize([row("p", ["x", "b"]), row("n", [])], labels)
    assert result["hit_at_1"] == 0 and result["hit_at_5"] == 1 and result["mrr"] == 0.5 and result["no_answer_identification"] == 1
    result = summarize([row("p", ["1", "2", "3", "4", "5", "a"])], labels)
    assert result["hit_at_5"] == 0 and math.isclose(result["mrr"], 1/6) and result["no_answer_identification"] is None
    assert summarize([row("p", [])], labels)["mrr"] == 0
    assert summarize([row("n", ["x"])], labels)["no_answer_identification"] == 0
    assert summarize([], labels)["hit_at_1"] is None
    readme = (ROOT / "README.md").read_text(encoding="utf-8")
    assert readme.startswith("# Infinity Nikki Data Analytics & Intelligent Search Platform")
    assert "https://jackie566n8.github.io/infinity-nikki-data-platform/" in readme
    assert "66/71" in readme and "92.96%" in readme and "43/44" in readme and "6/6" in readme
    assert all(value not in readme for value in ("YOUR_USERNAME", "你的用户名", "84.5%"))
    assert not re.search(r"[A-Z]:[\\/]+Users[\\/]", readme)
    assert len(readme.split("截图位置：")) - 1 == 4
    assert (ROOT / "analysis/notebooks/catalog-exploration.ipynb").is_file()
    print("PASS final CSV joins preserve IDs, Unicode names, evidence, ingredient units and incomplete records; independent metric edge cases; README identity/scope")


if __name__ == "__main__":
    check()
