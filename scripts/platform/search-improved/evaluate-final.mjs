import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";
import Base from "../search/search-model.cjs";
import Smart from "./improved-model.cjs";
import { validateBenchmark } from "../search/validate.mjs";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."),
  out = path.join(root, "../../data/dataset/search-improved"),
  read = (p) => JSON.parse(fs.readFileSync(path.join(root, p))),
  sha = (v) =>
    crypto
      .createHash("sha256")
      .update(typeof v === "string" ? v : JSON.stringify(v))
      .digest("hex"),
  release = read("../../data/dataset/search-improved/release-lock.json"),
  manifest = read("../../data/dataset/search/manifest.json"),
  features = read("../../data/dataset/search-improved/features.json"),
  aliases = read("../../data/dataset/search/aliases.json"),
  baselineCorpus = read("../../data/dataset/search/corpus.json"),
  baseLock = read("../../data/dataset/search/baseline-lock.json");
if (
  release.inputs.model_sha256 !==
    sha(
      fs.readFileSync(
        path.join(root, "search-improved/improved-model.cjs"),
        "utf8",
      ),
    ) ||
  release.inputs.feature_sha256 !== sha(features) ||
  release.inputs.aliases_sha256 !== sha(aliases)
)
  throw Error("Frozen improved method changed");
if (
  baseLock.model_sha256 !==
    sha(fs.readFileSync(path.join(root, "search/search-model.cjs"), "utf8")) ||
  manifest.corpus_sha256 !== sha(baselineCorpus)
)
  throw Error("Baseline changed");
const dependencies = read("search-improved/vendor/manifest.json");
if (sha(dependencies) !== release.inputs.vendor_sha256)
  throw Error("Dependency lock changed");
for (const dep of dependencies)
  if (
    sha(
      fs.readFileSync(
        path.join(root, "search-improved/vendor", dep.name + ".cjs"),
        "utf8",
      ),
    ) !== dep.sha256
  )
    throw Error("Dependency bytes changed: " + dep.name);
const target = path.join(out, "comparison.json");
if (fs.existsSync(target)) {
  const old = JSON.parse(fs.readFileSync(target));
  if (
    old.release_sha256 !== sha(release) ||
    old.manifest_sha256 !== sha(manifest)
  )
    throw Error(
      "Already tested; changed method requires a new independent holdout before claiming generalization",
    );
  console.log("Final comparison already exists; preserving first test run.");
  process.exit(0);
}
// Test labels are first opened only after all methods, weights, rejection rules and ablations have been frozen.
const cases = read("../../data/dataset/search/queries.candidates.json");
if (sha(cases) !== manifest.cases_sha256) throw Error("Query labels changed");
validateBenchmark(baselineCorpus, aliases, cases);
const at = performance.now(),
  engine = Smart.createEngine(features, aliases),
  index_build_ms = performance.now() - at,
  base = Base.createEngine(baselineCorpus, aliases),
  methods = ["A", "B", "C", "D", "E", "F", "L"],
  allMethods = [...methods, ...release.ablation_variants.map((v) => v.name)],
  predictions = {},
  metrics = {};
function search(query, method) {
  if (["A", "B", "C", "L"].includes(method)) return base.search(query, method);
  const ablation = release.ablation_variants.find((v) => v.name === method);
  return engine.search(
    query,
    ablation ? "F" : method,
    {},
    ablation
      ? { ...release.configuration, disable: ablation.disable }
      : release.configuration,
  );
}
for (const method of allMethods) {
  for (let n = 0; n < 3; n++) for (const q of cases) search(q.query, method);
  predictions[method] = cases.map((q) => {
    const found = search(q.query, method),
      times = [];
    for (let n = 0; n < 20; n++) {
      const t = performance.now();
      search(q.query, method);
      times.push(performance.now() - t);
    }
    return {
      query_id: q.query_id,
      split: q.split,
      type: q.type,
      group_id: q.group_id,
      ...Base.scoreCase(q, found),
      response_ms: times.reduce((a, b) => a + b, 0) / times.length,
      top5: found.slice(0, 5).map((r) => r.id),
      match_basis: found
        .slice(0, 1)
        .flatMap((r) => r.reasons || [{ kind: r.match_type }]),
    };
  });
}
for (const split of ["dev", "test", "all"])
  metrics[split] = Object.fromEntries(
    allMethods.map((method) => {
      const rows = predictions[method].filter(
        (q) => split === "all" || q.split === split,
      );
      return [
        method,
        {
          overall: Base.summarize(rows),
          by_type: Object.fromEntries(
            [
              "formal",
              "nickname",
              "typo_pinyin",
              "partial",
              "description",
              "multilingual",
            ].map((type) => [
              type,
              Base.summarize(rows.filter((q) => q.type === type)),
            ]),
          ),
        },
      ];
    }),
  );
const result = {
  version: 1,
  annotation_status: "provisional_not_human_reviewed",
  generated_at: new Date().toISOString(),
  release_sha256: sha(release),
  manifest_sha256: sha(manifest),
  cases_sha256: manifest.cases_sha256,
  corpus_count: features.length,
  query_count: 100,
  split: { dev: 70, test: 30 },
  release,
  feature_audit: read("../../data/dataset/search-improved/feature-audit.json"),
  environment: {
    node: process.version,
    os: os.platform(),
    cpu: os.cpus()[0]?.model,
    index_build_ms,
    query_result_cache: false,
    warmup_rounds: 3,
    timing_repeats: 20,
    timing_scope:
      "uncached warm in-memory parsing, candidate generation, filters and ranking; no loading/network/DOM",
  },
  metrics,
  predictions,
  limitations: [
    "人审数仍为0；同一批候选标签比较，不是正式Gold或随机用户样本。",
    "测试正例仅4个家族，描述查询是同类结构化模板。",
    "视觉颜色标注只覆盖部分部件；描述提及不是已证实图案元素。",
    "推荐在开发集已确定，不按测试分数重新选型或调权。",
  ],
};
fs.writeFileSync(target, JSON.stringify(result, null, 2));
console.log(
  JSON.stringify(
    {
      recommend: release.selected_for_deployment,
      test: Object.fromEntries(
        methods.map((m) => [m, metrics.test[m].overall]),
      ),
      ablations: Object.fromEntries(
        release.ablation_variants.map((v) => [
          v.name,
          metrics.test[v.name].overall.hit1,
        ]),
      ),
      index_build_ms,
    },
    null,
    2,
  ),
);
