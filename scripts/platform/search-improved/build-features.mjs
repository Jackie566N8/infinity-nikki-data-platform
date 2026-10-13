import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
const here = path.dirname(fileURLToPath(import.meta.url)),
  platform = path.resolve(here, ".."),
  read = (p) => JSON.parse(fs.readFileSync(path.join(platform, p), "utf8")),
  require = createRequire(import.meta.url),
  py = require("./vendor/pinyin-pro.cjs"),
  cc = require("./vendor/opencc-js.cjs"),
  simplify = cc.Converter({ from: "tw", to: "cn" }),
  sha = (v) =>
    crypto.createHash("sha256").update(JSON.stringify(v)).digest("hex");
const corpus = read("../../data/dataset/search/corpus.json"),
  catalog = read("../../data/input/catalog.json").records,
  raw = new Map(catalog.map((r) => [r.id, r])),
  aliases = read("../../data/dataset/search/aliases.json"),
  supplement = new Map(),
  unmapped = [];
for (const f of read("search-improved/input/colors-extended.json")) {
  const rows = corpus.filter(
    (r) => r.kind === "clothing" && r.names.en === f.en,
  );
  if (rows.length !== 1) {
    unmapped.push(f.en);
    continue;
  }
  const id = rows[0].id;
  if (!supplement.has(id))
    supplement.set(id, {
      colors: [],
      verified_elements: [],
      description_mentions: [],
      evidence: [],
    });
  const s = supplement.get(id);
  if (!s.colors.includes(f.color)) s.colors.push(f.color);
  s.evidence.push({
    field: "colors",
    value: f.color,
    source_url: f.source_url,
    method: f.method,
    checked_at: "2026-10-10",
    note: "社区 Wiki 颜色分类，不是游戏官方颜色字段；只用于该具体部件形态。",
  });
}
for (const f of read("search-improved/input/element-facts.json")) {
  const rows = corpus.filter(
    (r) => r.kind === "clothing" && r.names.en === f.en,
  );
  if (rows.length !== 1) continue;
  const id = rows[0].id;
  if (!supplement.has(id))
    supplement.set(id, {
      colors: [],
      verified_elements: [],
      description_mentions: [],
      evidence: [],
    });
  supplement.get(id)[f.field].push(f.element);
  supplement.get(id).evidence.push(f);
}
const features = corpus.map((r) => {
  const s = supplement.get(r.id) || {
      colors: [],
      verified_elements: [],
      description_mentions: [],
      evidence: [],
    },
    pinyins = [
      ...new Set(
        [
          r.names["zh-CN"],
          ...aliases
            .filter((a) => a.family_id === r.family_id && r.kind === "outfits")
            .flatMap((a) => a.aliases),
        ]
          .filter(Boolean)
          .map((n) =>
            py
              .pinyin(simplify(n), { toneType: "none", type: "array", v: true })
              .join(""),
          ),
      ),
    ];
  return {
    ...r,
    type: raw.get(r.id).type,
    category_names: [],
    pinyins,
    ...s,
    feature_source_url: r.source_url,
  };
});
const dir = path.join(platform, "../../data/dataset/search-improved");
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, "features.json"), JSON.stringify(features));
fs.writeFileSync(
  path.join(dir, "feature-audit.json"),
  JSON.stringify(
    {
      created_at: new Date().toISOString(),
      source_corpus_sha256: sha(corpus),
      feature_sha256: sha(features),
      document_count: features.length,
      with_colors: features.filter((f) => f.colors.length).length,
      with_verified_elements: features.filter((f) => f.verified_elements.length)
        .length,
      with_description_mentions: features.filter(
        (f) => f.description_mentions.length,
      ).length,
      unmapped_color_names: [...new Set(unmapped)],
      provenance:
        "Build reads corpus, catalog and source facts; never dev/test queries or relevance labels. No name-based visual inference, no part-to-outfit color inheritance.",
      dependencies: read("search-improved/vendor/manifest.json"),
    },
    null,
    2,
  ),
);
const supplemental = features
  .filter((f) => f.evidence.length)
  .map(
    ({
      id,
      names,
      colors,
      verified_elements,
      description_mentions,
      evidence,
    }) => ({
      id,
      name: names["zh-CN"],
      colors,
      verified_elements,
      description_mentions,
      evidence,
    }),
  );
fs.writeFileSync(
  path.join(dir, "visual-features.json"),
  JSON.stringify(supplemental, null, 2),
);
console.log(
  "Independent source features:",
  features.length,
  "colors",
  features.filter((f) => f.colors.length).length,
  "verified elements",
  features.filter((f) => f.verified_elements.length).length,
);
