import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const platform = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
  ),
  dir = path.join(platform, "../../data/dataset/search"),
  read = (p) => JSON.parse(fs.readFileSync(path.join(dir, p))),
  report = read("provisional/report.json");
const data = {
  schema_version: 1,
  manifest: read("manifest.json"),
  report,
  queries: read("queries.candidates.json"),
  aliases: read("aliases.json"),
  corpus: read("corpus.json").map(
    ({ id, kind, is_base, variant, family_id, names, live_text }) => ({
      id,
      kind,
      is_base,
      variant,
      family_id,
      names,
      live_text,
    }),
  ),
  query_type_labels: {
    formal: "正式名称",
    nickname: "昵称",
    typo_pinyin: "错字 / 拼音",
    partial: "不完整名称",
    description: "描述性",
    multilingual: "多语言",
  },
};
fs.writeFileSync(
  path.join(dir, "search-eval-data.js"),
  "window.NIKKI_SEARCH_EVAL_DATA=" + JSON.stringify(data) + ";",
);
console.log(
  "Search evaluation page data:",
  (JSON.stringify(data).length / 1024 / 1024).toFixed(2) +
    " MB; fixed benchmark, not a live search upgrade.",
);
