import fs from "node:fs";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import M from "./improved-model.cjs";
import Base from "../search/search-model.cjs";
const read = (p) => JSON.parse(fs.readFileSync(new URL(p, import.meta.url))),
  sha = (v) =>
    crypto
      .createHash("sha256")
      .update(typeof v === "string" ? v : JSON.stringify(v))
      .digest("hex"),
  f = read("../../../data/dataset/search-improved/features.json"),
  a = read("../../../data/dataset/search/aliases.json"),
  lock = read("../../../data/dataset/search-improved/release-lock.json"),
  r = read("../../../data/dataset/search-improved/comparison.json"),
  dev = read("../../../data/dataset/search/dev.json"),
  e = M.createEngine(f, a);
assert.equal(
  sha(
    fs.readFileSync(new URL("./improved-model.cjs", import.meta.url), "utf8"),
  ),
  lock.inputs.model_sha256,
);
assert.equal(sha(f), lock.inputs.feature_sha256);
assert.equal(sha(a), lock.inputs.aliases_sha256);
assert.equal(r.release_sha256, sha(lock));
assert.equal(r.annotation_status, "provisional_not_human_reviewed");
assert.equal(lock.selected_before_test, true);
assert.ok(
  lock.read_files.every(
    (p) => !p.includes("test.json") && !p.includes("queries.candidates"),
  ),
);
for (const dep of read("./vendor/manifest.json"))
  assert.equal(
    sha(
      fs.readFileSync(
        new URL("./vendor/" + dep.name + ".cjs", import.meta.url),
        "utf8",
      ),
    ),
    dep.sha256,
  );
assert.equal(M.levenshtein("kitten", "sitting"), 3);
assert.equal(M.compact(" 萬相 渡 浮生 "), "万相渡浮生");
assert.equal(
  e.search("shennvtao", "F", {}, lock.configuration)[0].id,
  "o10349",
);
assert.equal(e.search("生于无暇", "F", {}, lock.configuration)[0].id, "o10349");
assert.equal(e.search("生于", "F", {}, lock.configuration)[0].id, "o10349");
assert.equal(
  e.search("1星生于无瑕原色套装", "F", {}, lock.configuration).length,
  0,
);
assert.equal(
  e.search("神女套", "F", { rarity: 3 }, lock.configuration).length,
  0,
);
assert.equal(e.search("月球宇航喵套", "F", {}, lock.configuration).length, 0);
for (const row of e.search("粉色甜美裙子", "F", {}, lock.configuration)) {
  const d = f.find((f) => f.id === row.id);
  assert.equal(d.type, "连衣裙");
  assert.equal(d.style, "甜美");
  assert.ok(d.colors.includes("Pink"));
}
assert.equal(
  e.search("粉色甜美有蝴蝶元素的裙子", "F", {}, lock.configuration).length,
  0,
);
const cranes = e.search("纸鹤裙子", "F", {}, lock.configuration);
assert.ok(cranes.length);
assert.ok(
  cranes.every((r) =>
    f.find((f) => f.id === r.id).verified_elements.includes("纸鹤"),
  ),
);
assert.ok(f.every((row) => row.kind !== "outfits" || row.colors.length === 0));
const uncertain = f.find((row) => row.description_mentions.length);
assert.ok(uncertain && !uncertain.verified_elements.includes("蝴蝶"));
assert.ok(
  f
    .filter((row) => row.colors.length)
    .every((row) => row.evidence.some((e) => e.field === "colors")),
);
for (const m of ["D", "E", "F"]) {
  const rows = dev.map((q) => ({
      ...Base.scoreCase(q, e.search(q.query, m, {}, lock.configuration)),
      response_ms: 0,
    })),
    s = Base.summarize(rows),
    expected = r.metrics.dev[m].overall;
  for (const key of ["n", "hit1", "hit5", "mrr", "no_answer_accuracy"])
    assert.equal(s[key], expected[key]);
}
console.log(
  "PASS: frozen inputs/vendor hashes; dev-only selection; pinyin, homophones and prefixes; contradictory filters; real no-answer rejection; sourced visual constraints; no inferred or inherited colors; uncertain mentions excluded; independently recalculated dev metrics.",
);
