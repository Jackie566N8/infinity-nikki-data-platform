import { inlineAssets } from "./inline-assets.mjs";
import fs from "node:fs";
import path from "node:path";
const root = path.resolve("src"),
  files = [],
  local = (file) => {
    const resolved = path.resolve(root, file);
    if (!resolved.startsWith(root + path.sep))
      throw Error("Unsupported local asset path");
    return resolved;
  },
  script = (file) =>
    "<script>" +
    fs.readFileSync(local(file), "utf8").replaceAll("</script", "<\\/script") +
    "</script>";
let html = fs.readFileSync(local("index.html"), "utf8");
html = html.replace(/<link\b[^>]*>/g, (tag) => {
  const href = tag.match(/href="([^"]+)"/)?.[1];
  if (!/rel="stylesheet"/.test(tag) || !href || /^https?:|^data:/.test(href))
    return tag;
  let css = fs.readFileSync(local(href), "utf8");
  css = css.replace(/url\(["']?(assets\/[^)'"\s]+)["']?\)/g, (_, f) => {
    const ext = path.extname(f).slice(1),
      type =
        ext === "svg"
          ? "image/svg+xml"
          : ext === "png"
            ? "image/png"
            : "application/octet-stream";
    return (
      'url("data:' +
      type +
      ";base64," +
      fs.readFileSync(local(f)).toString("base64") +
      '")'
    );
  });
  return "<style>" + css + "</style>";
});
html = html.replace(/<script\b([^>]*)>\s*<\/script>/g, (tag, attributes) => {
  const src = attributes.match(/src="([^"]+)"/)?.[1];
  if (!src || /^https?:/.test(src)) return tag;
  if (/\bdefer\b/.test(attributes)) {
    files.push(src);
    return "";
  }
  return script(src);
});
// Keep the original deferred execution order. Evaluation is inserted after the application, matching its lazy-load initialization context.
const appIndex = files.indexOf("app.js");
if (appIndex < 0) throw Error("Missing app");
files.splice(
  appIndex + 1,
  0,
  "search-eval-data.js",
  "search-model.js",
  "search-eval.js",
);
let inline = files.map((f) => script(f)).join("\n");
inline = inlineAssets(inline, local);
html = html.replace("</body>", () => inline + "\n</body>");
fs.mkdirSync("outputs", { recursive: true });
fs.writeFileSync("outputs/奇迹旅册.html", html);
console.log(
  "Offline single HTML",
  Buffer.byteLength(html),
  "bytes; no external code dependencies. Remote art and optional fonts remain source URLs.",
);
