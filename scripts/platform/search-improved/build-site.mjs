import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
const here = path.dirname(fileURLToPath(import.meta.url)),
  root = path.resolve(here, ".."),
  read = (p) => JSON.parse(fs.readFileSync(path.join(root, p))),
  py = createRequire(import.meta.url)("./vendor/pinyin-pro.cjs"),
  comparison = read("../../data/dataset/search-improved/comparison.json"),
  features = read("../../data/dataset/search-improved/features.json"),
  catalog = read("../../data/input/catalog.json").records,
  names = new Map(
    read("../../data/input/material-planning.json").material_names.map((n) => [
      n.material_id,
      n.names["zh-CN"],
    ]),
  ),
  supplement = Object.fromEntries(
    features.map(
      ({
        id,
        pinyins,
        colors,
        verified_elements,
        description_mentions,
        evidence,
      }) => [
        id,
        { pinyins, colors, verified_elements, description_mentions, evidence },
      ],
    ),
  );
const digest = (v) =>
  crypto
    .createHash("sha256")
    .update(typeof v === "string" ? v : JSON.stringify(v))
    .digest("hex");
if (
  digest(fs.readFileSync(path.join(here, "improved-model.cjs"), "utf8")) !==
    comparison.release.inputs.model_sha256 ||
  digest(features) !== comparison.release.inputs.feature_sha256
)
  throw Error("Untested smart search code or features; publication blocked");
for (const r of catalog)
  if (!supplement[r.id]) {
    const name = names.get(r.id) || r.name;
    supplement[r.id] = {
      pinyins: /[\u3400-\u9fff]/.test(name)
        ? [
            py
              .pinyin(name, { toneType: "none", type: "array", v: true })
              .join(""),
          ]
        : [],
      colors: [],
      verified_elements: [],
      description_mentions: [],
      evidence: [],
    };
  }
const payload = {
  version: comparison.release.version,
  configuration: comparison.release.configuration,
  selected_method: comparison.release.selected_for_deployment,
  supplement,
  comparison: {
    metrics: comparison.metrics,
    release: comparison.release,
    feature_audit: comparison.feature_audit,
    environment: comparison.environment,
    annotation_status: comparison.annotation_status,
    cases_sha256: comparison.cases_sha256,
    limitations: comparison.limitations,
  },
};
fs.writeFileSync(
  path.join(root, "../../data/dataset/search-improved/smart-search-data.js"),
  "window.NIKKI_SMART_SEARCH_DATA=" + JSON.stringify(payload) + ";",
);
console.log(
  "Smart search assets:",
  Object.keys(supplement).length,
  "objects;",
  payload.selected_method,
  "selected on dev; pending human review.",
);
