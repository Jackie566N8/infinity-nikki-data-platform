// Embed raster/SVG local assets, retaining one shared copy for region banners and homepage art.
import fs from "node:fs";
import path from "node:path";
export function inlineAssets(inline, local) {
  const mime = {
      ".svg": "image/svg+xml",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".webp": "image/webp",
      ".gif": "image/gif",
    },
    shared = {};
  const result = inline.replace(
    /(["'])(assets\/[^"']+\.(?:png|svg|jpe?g|webp|gif))\1/gi,
    (_, quote, file) => {
      const uri =
        "data:" +
        mime[path.extname(file).toLowerCase()] +
        ";base64," +
        fs.readFileSync(local(file)).toString("base64");
      if (
        file === "assets/hero.jpg" ||
        file.startsWith("assets/region-banners/")
      ) {
        shared[file] = uri;
        return quote + file + quote;
      }
      return quote + uri + quote;
    },
  );
  return (
    "<script>window.NIKKI_ASSETS=" +
    JSON.stringify(shared) +
    ";</script>\n" +
    result
  );
}
