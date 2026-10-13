import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import vm from "node:vm";
import { execFileSync } from "node:child_process";
import { inlineAssets } from "./inline-assets.mjs";
const read = (f) => JSON.parse(fs.readFileSync(f)),
  manifest = read("data/input/region-banners.json"),
  checks = read("data/input/region-banner-checks.json"),
  q = read("data/dataset/quality-report.json");
assert.equal(manifest.regions.length, 9);
assert.equal(new Set(manifest.regions.map((r) => r.primary_path)).size, 9);
assert.equal(new Set(checks.rows.map((r) => r.primary.sha256)).size, 9);
assert.ok(
  checks.rows.every((r) => r.primary.available && r.fallback.available),
);
assert.equal(checks.official_images, 8);
assert.equal(checks.placeholders, 0);
assert.equal(checks.user_screenshots, 1);
assert.equal(checks.region_specific_official, 7);
for (const r of manifest.regions) {
  assert.ok(!r.primary_path.includes("\\"));
  assert.ok(
    r.source_page ||
      r.image_kind === "placeholder" ||
      (r.image_kind === "user_screenshot_restored" &&
        fs.existsSync(r.original_file)),
  );
  assert.ok(r.retrieved_at || r.image_kind === "placeholder" || r.provided_on);
}
const text =
  '<script>const a="assets/hero.jpg",b="assets/hero.jpg",c="assets/region-banners/firework-isles.png",d="assets/region-banners/memorial-mountains-fallback.svg",e="assets/region-banners/memorial-mountains.png";</script>';
const embedded = inlineAssets(text, (f) => path.resolve("src", f)),
  scripts = [...embedded.matchAll(/<script>([\s\S]*?)<\/script>/g)];
const context = vm.createContext({ window: {} });
for (const [, code] of scripts) vm.runInContext(code, context);
const assets = context.window.NIKKI_ASSETS;
assert.equal(Object.keys(assets).length, 4);
assert.ok(assets["assets/hero.jpg"].startsWith("data:image/jpeg;base64,"));
for (const [file, uri] of Object.entries(assets))
  assert.ok(
    Buffer.from(uri.split(",")[1], "base64").equals(
      fs.readFileSync("src/" + file),
    ),
    "Exact embedded bytes " + file,
  );
assert.equal(q.metrics.find((m) => m.key === "region_banners").percent, 100);
assert.equal(q.metrics.find((m) => m.key === "region_official").percent, 88.89);
assert.equal(q.coverage_notes.human_search_approvals, 50);
// Returning to an earlier catalog with identical community observations must not rewrite archive data.
const base = "scripts/platform/test-output";
fs.mkdirSync(base, { recursive: true });
const temp = fs.mkdtempSync(path.join(base, "region-catalog-link-"));
const input = path.join(temp, "input.json"),
  catalogFile = path.join(temp, "catalog.json"),
  out = path.join(temp, "out");
const raw = read("data/input/preferences.json"),
  catalog = read("data/dataset/analytics/input.json");
fs.writeFileSync(input, JSON.stringify(raw));
const build = (id) => {
  catalog.snapshot_id = id;
  fs.writeFileSync(catalogFile, JSON.stringify(catalog));
  execFileSync(
    process.execPath,
    [
      "scripts/platform/build-preferences.mjs",
      "--input",
      input,
      "--catalog",
      catalogFile,
      "--out",
      out,
    ],
    { stdio: "pipe", windowsHide: true },
  );
};
build("test:catalog-A");
let original = read(out + "/history/index.json");
const firstArchive = fs.readFileSync(out + "/history/" + original[0].file);
build("test:catalog-B");
build("test:catalog-A");
assert.equal(read(out + "/history/index.json").length, 2);
assert.equal(
  read(out + "/input.json").snapshot.catalog_snapshot,
  "test:catalog-A",
);
assert.ok(
  fs.readFileSync(out + "/history/" + original[0].file).equals(firstArchive),
);
assert.equal(read(out + "/history/catalog-relink-events.json").length, 1);
build("test:catalog-A");
assert.equal(read(out + "/history/catalog-relink-events.json").length, 1);
console.log(
  "PASS 9 distinct regions, exact-case paths, truthful official/placeholder scope, JPG/PNG/SVG shared byte embedding, stable game snapshot/human labels and immutable catalog-only history reuse.",
);
