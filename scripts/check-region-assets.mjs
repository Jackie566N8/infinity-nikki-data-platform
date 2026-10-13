import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
const manifest = JSON.parse(fs.readFileSync("data/input/region-banners.json"));
const digest = (b) => createHash("sha256").update(b).digest("hex");
function check(ref) {
  let exact =
    ref && !ref.includes("\\") && !ref.startsWith("/") && !ref.includes("..");
  let current = "src";
  for (const part of String(ref).split("/")) {
    if (!fs.existsSync(current) || !fs.readdirSync(current).includes(part)) {
      exact = false;
      break;
    }
    current = path.join(current, part);
  }
  if (!exact || !fs.existsSync(current))
    return {
      path: ref,
      available: false,
      error: "missing file or case/path mismatch",
    };
  const bytes = fs.readFileSync(current),
    ext = path.extname(ref).toLowerCase();
  const valid =
    ext === ".svg"
      ? /<svg[\s>]/.test(bytes.toString()) &&
        !/<script|foreignObject|<!DOCTYPE/i.test(bytes.toString())
      : ext === ".png"
        ? bytes
            .subarray(0, 8)
            .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
        : /^\.jpe?g$/.test(ext)
          ? bytes[0] === 255 &&
            bytes[1] === 216 &&
            bytes.includes(Buffer.from([255, 217]))
          : false;
  return {
    path: ref,
    available: valid,
    bytes: bytes.length,
    sha256: digest(bytes),
    check:
      "exact-case path + file signature; browser decoding verified separately",
  };
}
const rows = manifest.regions.map((r) => ({
  region_id: r.id,
  region: r.region,
  image_kind: r.image_kind,
  region_specific: r.region_specific,
  primary: check(r.primary_path),
  fallback: check(r.fallback_path),
}));
const report = {
  checked_at: new Date().toISOString(),
  scope:
    "Local files, not a new external source retrieval; availability includes original SVG placeholder",
  total: rows.length,
  primary_available: rows.filter((r) => r.primary.available).length,
  fallback_available: rows.filter((r) => r.fallback.available).length,
  official_images: manifest.regions.filter((r) =>
    r.image_kind.startsWith("official"),
  ).length,
  region_specific_official: manifest.regions.filter(
    (r) => r.image_kind.startsWith("official") && r.region_specific,
  ).length,
  placeholders: manifest.regions.filter((r) => r.image_kind === "placeholder")
    .length,
  user_screenshots: manifest.regions.filter(
    (r) => r.image_kind === "user_screenshot_restored",
  ).length,
  rows,
};
report.asset_snapshot_id =
  "region-assets:" + digest(JSON.stringify({ manifest, rows })).slice(0, 24);
fs.writeFileSync(
  "data/input/region-banner-checks.json",
  JSON.stringify(report, null, 2) + "\n",
);
fs.writeFileSync(
  "src/region-banners-data.js",
  "window.NIKKI_REGION_BANNERS_DATA=" +
    JSON.stringify({ manifest, checks: report }) +
    ";",
);
const doc =
  "# 区域背景图状态清单\n\n本地文件，运行时通过 img 元素加载；单文件版通过共享 base64 资产表加载。不使用地理底图。官方素材原版权归 Infold/Papergames，SVG 为项目原创。\n\n| 区域 | 本地资源 | 类型 / 范围 | 来源 | 状态 |\n|---|---|---|---|---|\n" +
  manifest.regions
    .map(
      (r) =>
        `| ${r.region} | ${r.primary_path} | ${r.image_kind}${!r.region_specific && r.image_kind !== "placeholder" ? "（合并地区景观，不宣称精确子区域）" : ""} | ${r.source_page ? `[${r.source_title}](${r.source_page})` : r.source_title} | ${r.image_kind === "placeholder" ? "官方宣传图待替换" : r.image_kind === "user_screenshot_restored" ? "用户提供截图；AI修复版，原图保留" : "原图已下载；保留原版权"} |`,
    )
    .join("\n") +
  `\n\n总计${report.official_images}张官方素材、${report.user_screenshots}张用户提供截图修复版、${report.placeholders}张主背景占位；石树田无人区使用官网 Stonewoods 合并地区图。用户截图不自动归为官网宣传图，原图和修复过程单独记录。9个主资源与9个兜底主题各有不同构图。来源URL、提供/处理日期、尺寸、范围和哈希见 data/input/region-banners.json 与 region-banner-checks.json。\n`;
fs.writeFileSync("docs/REGION_BANNER_STATUS.md", doc);
const dictionary =
  "\n\n## 区域背景图资产（不属于地理点位）\n\n资产配置：`data/input/region-banners.json`；检测结果：`data/input/region-banner-checks.json`；目录：`src/assets/region-banners/`。\n\n| 字段 | 含义 |\n|---|---|\n| id / slug / region | 稳定区域资产ID、ASCII文件名、区域名 |\n| primary_path / fallback_path | 相对src入口的主资源/独立SVG兜底资源 |\n| image_kind | official_scenery / official_promo / official_event / official_overview / user_screenshot_restored / placeholder |\n| region_specific | 来源是否明确指向该具体区域；Stonewoods合并图为false |\n| source_page / source_image / retrieved_at | 来源页、原资源地址、实际下载时间；占位为空 |\n| rights_owner / source_status | 原有权利与来源状态；占位不算官方照片 |\n| original_file / original_sha256 / processing | 用户截图原件位置、哈希、修复方式与处理后哈希 |\n| dimensions / object_position / palette | 原图尺寸、CSS视窗构图、独立主题颜色 |\n| checks.primary / checks.fallback | 大小写、文件魔数、字节数与SHA256；非代替浏览器解码 |\n\n[逐区域状态清单](REGION_BANNER_STATUS.md)。背景可用率包括占位，官方图片覆盖率单列；会话实际成功率与构建检测分开，不将9/9可显示说成9/9官方实景。\n";
if (fs.existsSync("docs/DATA_DICTIONARY.md"))
  fs.writeFileSync(
    "docs/DATA_DICTIONARY.md",
    fs
      .readFileSync("docs/DATA_DICTIONARY.md", "utf8")
      .split("\n\n## 区域背景图资产")[0] + dictionary,
  );
console.log(
  `Region assets: ${report.primary_available}/${report.total} primary, ${report.fallback_available}/${report.total} fallback; ${report.official_images} official, ${report.placeholders} placeholder.`,
);
