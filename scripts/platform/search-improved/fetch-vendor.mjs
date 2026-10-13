import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "vendor");
fs.mkdirSync(dir, { recursive: true });
const log = [];
for (const name of ["pinyin-pro", "opencc-js"]) {
  const meta = await (
      await fetch("https://registry.npmjs.org/" + name + "/latest")
    ).json(),
    main = meta.main.replace(/^\.\//, "");
  if (!/^[\w./-]+$/.test(main) || main.includes(".."))
    throw Error("Bad dependency path");
  const url = `https://cdn.jsdelivr.net/npm/${name}@${meta.version}/${main}`,
    r = await fetch(url);
  if (!r.ok) throw Error(r.status);
  const content = await r.text();
  fs.writeFileSync(path.join(dir, name + ".cjs"), content);
  let license = "";
  for (const file of ["LICENSE", "LICENSE.txt", "LICENSE.md"]) {
    const x = await fetch(
      `https://cdn.jsdelivr.net/npm/${name}@${meta.version}/${file}`,
    );
    if (x.ok) {
      license = await x.text();
      break;
    }
  }
  if (!license) throw Error("Missing dependency license");
  fs.writeFileSync(path.join(dir, name + "-LICENSE.txt"), license);
  log.push({
    name,
    version: meta.version,
    license: meta.license,
    url,
    main,
    sha256: crypto.createHash("sha256").update(content).digest("hex"),
    retrieved_at: new Date().toISOString(),
  });
}
fs.writeFileSync(path.join(dir, "manifest.json"), JSON.stringify(log, null, 2));
console.log(log);
const { createRequire } = await import("node:module");
const require = createRequire(import.meta.url),
  py = require("./vendor/pinyin-pro.cjs"),
  cc = require("./vendor/opencc-js.cjs");
console.log(
  py.pinyin("古典乐章", { toneType: "none", type: "array", v: true }),
  cc.Converter({ from: "tw", to: "cn" })("萬相渡浮生"),
);
