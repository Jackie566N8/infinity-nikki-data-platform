import { execFileSync } from "node:child_process";
import fs from "node:fs";
if (fs.existsSync("data/input/region-banners.json"))
  execFileSync(process.execPath, ["scripts/check-region-assets.mjs"], {
    stdio: "inherit",
    windowsHide: true,
  });
for (const f of ["src/update-aliases.mjs", "src/update-quality.mjs"])
  execFileSync(process.execPath, [f], { stdio: "inherit", windowsHide: true });
fs.mkdirSync("docs", { recursive: true });
fs.copyFileSync("data/dataset/数据字典.md", "docs/DATA_DICTIONARY.md");
if (fs.existsSync("data/input/region-banners.json"))
  execFileSync(process.execPath, ["scripts/check-region-assets.mjs"], {
    stdio: "inherit",
    windowsHide: true,
  });
execFileSync(process.execPath, ["scripts/update-review-assets.mjs"], {
  stdio: "inherit",
  windowsHide: true,
});
if (fs.existsSync("data/dataset/search-human/step12-comparison.json"))
  execFileSync(process.execPath, ["scripts/export-step12-report.mjs"], {
    stdio: "inherit",
    windowsHide: true,
  });
console.log(
  "Site data refreshed in src/. Offline build does not fetch sources or tune the frozen search release.",
);
execFileSync(process.execPath, ["scripts/export-final-data.mjs"], {
  stdio: "inherit", windowsHide: true,
});
execFileSync(process.execPath, ["scripts/export-final-docs.mjs"], {
  stdio: "inherit", windowsHide: true,
});
