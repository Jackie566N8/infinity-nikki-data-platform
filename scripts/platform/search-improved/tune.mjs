import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";
import Base from "../search/search-model.cjs";
import M from "./improved-model.cjs";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."),
  dir = path.join(root, "../../data/dataset/search-improved"),
  read = (p) => JSON.parse(fs.readFileSync(path.join(root, p))),
  sha = (v) =>
    crypto
      .createHash("sha256")
      .update(typeof v === "string" ? v : JSON.stringify(v))
      .digest("hex"),
  dev = read("../../data/dataset/search/dev.json"),
  features = read("../../data/dataset/search-improved/features.json"),
  aliases = read("../../data/dataset/search/aliases.json");
if (dev.some((q) => q.split !== "dev"))
  throw Error("Tuner received non-dev query");
const code = fs.readFileSync(
    path.join(root, "search-improved/improved-model.cjs"),
    "utf8",
  ),
  inputs = {
    dev_sha256: sha(dev),
    feature_sha256: sha(features),
    aliases_sha256: sha(aliases),
    model_sha256: sha(code),
    vendor_sha256: sha(read("search-improved/vendor/manifest.json")),
  };
const target = path.join(dir, "tuning-lock.json");
if (fs.existsSync(target)) {
  const old = JSON.parse(fs.readFileSync(target));
  if (JSON.stringify(old.inputs) !== JSON.stringify(inputs))
    throw Error(
      "Existing method is frozen. Version a new method before changing code or dev features.",
    );
  console.log("Frozen development selection preserved");
  process.exit(0);
}
const engine = M.createEngine(features, aliases),
  prepared = new Map(dev.map((q) => [q.query_id, engine.signals(q.query)])),
  candidates = [];
const score = (config, method) => {
  const at = performance.now(),
    rows = dev.map((q) => ({
      ...Base.scoreCase(
        q,
        engine.rank(prepared.get(q.query_id), method, config),
      ),
      response_ms: 0,
    })),
    m = Base.summarize(rows);
  return {
    metrics: m,
    objective: m.mrr + 0.25 * m.hit5 + 0.5 * m.no_answer_accuracy,
    ranking_ms: performance.now() - at,
  };
};
for (const name_min of [0.7, 0.78, 0.85])
  for (const name of [0.45, 0.6, 0.75])
    for (const alias of [0.45, 0.6])
      for (const semantic of [0.4, 0.6, 0.8])
        for (const threshold of [0.3, 0.4]) {
          const config = {
              name_min,
              weights: { name, alias, semantic, prior: 0.04 },
              threshold,
              disable: {},
            },
            s = score(config, "F");
          candidates.push({ config, ...s });
        }
const distance = (c) =>
  Math.abs(c.weights.name - 0.6) +
  Math.abs(c.weights.alias - 0.6) +
  Math.abs(c.weights.semantic - 0.6) +
  Math.abs(c.threshold - 0.4) +
  Math.abs(c.name_min - 0.7);
candidates.sort(
  (a, b) =>
    b.objective - a.objective ||
    distance(a.config) - distance(b.config) ||
    JSON.stringify(a.config).localeCompare(JSON.stringify(b.config)),
);
const config = candidates[0].config,
  dev_methods = Object.fromEntries(
    ["D", "E", "F"].map((method) => [method, score(config, method)]),
  );
const choice = ["F", "D", "E"].sort(
  (a, b) =>
    dev_methods[b].objective - dev_methods[a].objective ||
    ["F", "D", "E"].indexOf(a) - ["F", "D", "E"].indexOf(b),
)[0];
const lock = {
  version: "smart-search-v1",
  frozen_at: new Date().toISOString(),
  inputs,
  configuration: config,
  selected_for_deployment: choice,
  selection_basis:
    "development labels only; maximize MRR + .25 Hit@5 + .5 no-answer accuracy; ties prefer weights nearest prespecified default, then deterministic order",
  n_dev: dev.length,
  grid_size: candidates.length,
  dev_methods,
  read_files: [
    "../../data/dataset/search/dev.json",
    "../../data/dataset/search-improved/features.json",
    "../../data/dataset/search/aliases.json",
    "search-improved/improved-model.cjs",
    "search-improved/vendor/manifest.json",
  ],
  test_labels_read: false,
  formula:
    "S = w_name*name_similarity + w_alias*nickname_similarity + w_sem*weighted_keyword_similarity + .04*base/kind_prior; filters are hard constraints; require minimum lexical confidence or full semantic constraints, then S >= threshold",
};
fs.writeFileSync(target, JSON.stringify(lock, null, 2));
fs.writeFileSync(
  path.join(dir, "development-grid.json"),
  JSON.stringify(candidates, null, 2),
);
console.log(
  JSON.stringify(
    { grid: candidates.length, config, choice, dev_methods },
    null,
    2,
  ),
);
