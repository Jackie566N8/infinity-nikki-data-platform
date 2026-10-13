// Read-only collection into a staging folder. It never overwrites reviewed facts.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
const destination = path.resolve(
    "review/source-staging/" + new Date().toISOString().replaceAll(":", "-"),
  ),
  checks = [];
fs.mkdirSync(destination, { recursive: true });
async function get(url, name) {
  const r = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw Error(url + " returned " + r.status);
  const bytes = Buffer.from(await r.arrayBuffer());
  fs.writeFileSync(path.join(destination, name), bytes);
  checks.push({
    url,
    file: name,
    verified_at: new Date().toISOString(),
    sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
  });
  return JSON.parse(bytes);
}
const manifest = await get(
  "https://gongeo.us/catalog/index.json",
  "manifest.json",
);
for (const name of ["outfits", "outfitItems", "items", "sketches", "makeups"]) {
  const entry = manifest.files[name];
  if (
    !entry ||
    !entry.path.startsWith("/catalog/") ||
    entry.path.includes("..")
  )
    throw Error("Unexpected source manifest path");
  await get("https://gongeo.us" + entry.path, name + ".json");
}
fs.writeFileSync(
  path.join(destination, "provenance.json"),
  JSON.stringify(
    {
      source_version: manifest.gameVersion,
      source_generated_at: manifest.generatedAt,
      checks,
      policy:
        "staging only; verify semantic forms, IDs, names, quantities and units before applying; do not modify the frozen experiment",
    },
    null,
    2,
  ),
);
console.log(
  "Staged source catalog in",
  destination,
  "; no reviewed data changed.",
);
