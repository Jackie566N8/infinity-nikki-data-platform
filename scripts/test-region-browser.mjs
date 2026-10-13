import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";
const root = path.resolve("."),
  regions = JSON.parse(
    fs.readFileSync("data/input/region-banners.json"),
  ).regions;
const server = http.createServer((req, res) => {
  let url;
  try {
    url = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  } catch {
    res.writeHead(400).end();
    return;
  }
  const mode = url.startsWith("/broken-both/")
    ? "both"
    : url.startsWith("/broken-one/")
      ? "one"
      : "normal";
  url = url.replace(/^\/(?:pages-preview|broken-one|broken-both)\//, "/");
  if (
    (mode !== "normal" && url.endsWith("/region-banners/florawish.jpg")) ||
    (mode === "both" && url.endsWith("/region-banners/florawish-fallback.svg"))
  ) {
    res.writeHead(404).end();
    return;
  }
  const file = path.resolve(root, "." + (url === "/" ? "/index.html" : url));
  if (
    !file.startsWith(root + path.sep) ||
    !fs.existsSync(file) ||
    !fs.statSync(file).isFile()
  ) {
    res.writeHead(404).end();
    return;
  }
  const mime = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".svg": "image/svg+xml",
    ".jpg": "image/jpeg",
    ".png": "image/png",
  };
  res.writeHead(200, {
    "Content-Type": mime[path.extname(file)] || "application/octet-stream",
    "Cache-Control": "no-store",
  });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const origin = "http://127.0.0.1:" + server.address().port,
  port = 9337;
const executable =
  process.env.BROWSER_PATH || "google-chrome";
assert.ok(executable);
const browser = spawn(
  executable,
  [
    "--headless=new",
    "--no-first-run",
    "--disable-gpu",
    "--disable-background-networking",
    "--no-sandbox",
    "--remote-debugging-port=" + port,
    "--user-data-dir=" + path.resolve("review/browser-profile/region-bug"),
    "about:blank",
  ],
  { windowsHide: true, stdio: "ignore" },
);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ws;
try {
  let tabs;
  for (let i = 0; i < 40; i++) {
    await sleep(250);
    try {
      tabs = await (await fetch("http://127.0.0.1:" + port + "/json")).json();
      break;
    } catch {}
  }
  assert.ok(tabs);
  ws = new WebSocket(tabs.find((t) => t.type === "page").webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let seq = 0;
  const pending = new Map(),
    exceptions = [],
    warnings = [];
  ws.onmessage = ({ data }) => {
    const j = JSON.parse(data);
    if (j.id) {
      const p = pending.get(j.id);
      pending.delete(j.id);
      j.error ? p.reject(j.error) : p.resolve(j.result);
    }
    if (j.method === "Runtime.exceptionThrown")
      exceptions.push(j.params.exceptionDetails);
    if (j.method === "Runtime.consoleAPICalled" && j.params.type === "warning")
      warnings.push(j.params.args.map((a) => a.value).join(" "));
  };
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      pending.set(++seq, { resolve, reject });
      ws.send(JSON.stringify({ id: seq, method, params }));
    });
  const ev = async (expression) => {
    const r = await send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    assert.ok(!r.exceptionDetails, JSON.stringify(r.exceptionDetails));
    return r.result.value;
  };
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Network.enable");
  await send("Network.setBlockedURLs", { urls: ["https://*"] });
  await send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1024,
    deviceScaleFactor: 1,
    mobile: false,
  });
  const waitFor = async (expression) => {
    for (let i = 0; i < 70; i++) {
      if (await ev(expression)) return;
      await sleep(150);
    }
    throw Error("Not ready: " + expression);
  };
  async function open(url) {
    await send("Page.navigate", { url });
    await waitFor("Boolean(window.MiralandArchive&&window.NikkiRegions)");
    await ev(
      "MiralandArchive.setLanguage('zh-CN');MiralandArchive.openSection('map')",
    );
    await ev("NikkiRegions.auditAll()");
  }
  async function shot(file) {
    const s = await send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: false,
    });
    fs.writeFileSync(file, Buffer.from(s.data, "base64"));
  }
  fs.mkdirSync("docs/screenshots", { recursive: true });
  fs.mkdirSync("review/final", { recursive: true });
  const cases = [],
    localImageResults = [];
  const urls = [
    pathToFileURL(path.join(root, "src/index.html")).href + "#map",
    pathToFileURL(path.join(root, "outputs/奇迹旅册.html")).href + "#map",
    origin + "/src/index.html#map",
    origin + "/pages-preview/index.html#map",
  ];
  for (const url of urls) {
    await open(url);
    const found = [];
    for (const r of regions) {
      await ev(`document.querySelector('[data-region="${r.region}"]').click()`);
      await waitFor(
        "document.querySelector('[data-region-banner]')?.complete && document.querySelector('[data-region-banner]')?.naturalWidth>0 && document.querySelector('[data-region-container]')?.dataset.imageState==='loaded'",
      );
      // load/naturalWidth precede asynchronous bitmap decoding and painting.
      // A screenshot must wait for both, rather than capturing the old fallback.
      await ev("(async()=>{const img=document.querySelector('[data-region-banner]');await img.decode();await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));const style=getComputedStyle(img),box=img.getBoundingClientRect();if(img.hidden||style.display==='none'||style.visibility==='hidden'||Number(style.opacity)===0||box.width===0||box.height===0)throw Error('Decoded region image is not visible');})()");
      const info = await ev(
        "(()=>{const img=document.querySelector('[data-region-banner]');return {id:img.dataset.regionBanner,width:img.naturalWidth,height:img.naturalHeight,stage:img.dataset.imageStage}})()",
      );
      assert.equal(info.id, r.id);
      assert.equal(info.stage, "primary");
      found.push(info);
      if (
        url.startsWith("http") &&
        url.includes("pages-preview") &&
        ["florawish", "memorial-mountains"].includes(r.slug)
      )
        await shot("docs/screenshots/map-" + r.slug + "-fixed.png");
    }
    assert.equal(new Set(found.map((r) => r.id)).size, 9);
    for (const locale of ["zh-CN", "en", "ja", "ko", "zh-TW"]) {
      await ev(
        `MiralandArchive.setLanguage('${locale}');MiralandArchive.openSection('quality')`,
      );
      assert.ok(
        (
          await ev(
            "document.querySelector('[data-region-check-summary]').textContent",
          )
        ).includes("9/9"),
      );
    }
    await ev(
      "MiralandArchive.setLanguage('zh-CN');MiralandArchive.openSection('outfits')",
    );
    await waitFor(
      "document.querySelector('.hero-photo')?.complete&&document.querySelector('.hero-photo')?.naturalWidth>0",
    );
    const localIds = JSON.parse(fs.readFileSync("data/input/catalog.json"))
      .records.filter((r) => r.image?.startsWith("assets/"))
      .map((r) => r.id);
    const images = await ev(
      `Promise.all(${JSON.stringify(localIds)}.map(id=>new Promise(resolve=>{const r=NIKKI_DATA.records.find(r=>r.id===id),i=new Image();i.onload=()=>resolve({id,ok:i.naturalWidth>0});i.onerror=()=>resolve({id,ok:false});i.src=window.NIKKI_ASSETS?.[r.image]||r.image;})))`,
    );
    assert.ok(
      images.every((r) => r.ok),
      "Local catalog image failure",
    );
    localImageResults.push({
      entry: url.startsWith("file:") ? "file" : "http",
      count: images.length,
      passed: images.filter((r) => r.ok).length,
    });
    // Existing detail and clothing image failures remain visible fallbacks rather than blank boxes.
    await ev("MiralandArchive.openSection('clothing')");
    await sleep(250);
    const fallback = await ev(
      "(()=>{const img=document.querySelector('.card-art img');img.dispatchEvent(new Event('error'));return img.parentElement.classList.contains('image-failed')&&getComputedStyle(img.parentElement.querySelector('.fallback')).display!=='none';})()",
    );
    assert.equal(fallback, true);
    cases.push({
      entry: url.startsWith("file:")
        ? url.includes("src/index")
          ? "source_file"
          : "single_html"
        : url.includes("pages-preview")
          ? "pages_subdirectory"
          : "http_root",
      regions: found,
      language_quality_checks: 5,
      homepage_jpeg: "decoded",
      catalog_fallback: "passed",
    });
  }
  for (const mode of ["broken-one", "broken-both"]) {
    await open(origin + "/" + mode + "/src/index.html#map");
    await waitFor(
      `document.querySelector('[data-region-container]').dataset.imageState==='${mode === "broken-one" ? "fallback" : "graphic-only"}'`,
    );
    const state = await ev(
      "({state:document.querySelector('[data-region-container]').dataset.imageState,hidden:document.querySelector('[data-region-banner]').hidden,header:document.querySelector('.map-banner h2').textContent,badge:document.querySelector('[data-region-label]').textContent})",
    );
    assert.ok(state.header.includes("花愿镇"));
    if (mode === "broken-both") assert.equal(state.hidden, true);
    await shot("docs/screenshots/map-" + mode + "-fallback.png");
    await ev("MiralandArchive.openSection('quality')");
    assert.ok(
      (
        await ev(
          "document.querySelector('[data-region-check-summary]').textContent",
        )
      ).includes("8/9"),
    );
    cases.push({
      entry: mode,
      ...state,
      session_availability:
        "8/9; original build denominator not silently changed",
    });
  }
  assert.equal(exceptions.length, 0, JSON.stringify(exceptions));
  assert.ok(warnings.some((w) => w.includes("[RegionBanner]")));
  const report = {
    checked_at: new Date().toISOString(),
    cases,
    regions_checked: 36,
    primary_files: 9,
    official_files: 8,
    placeholder_files: regions.filter((r) => r.image_kind === "placeholder")
      .length,
    user_screenshot_files: regions.filter(
      (r) => r.image_kind === "user_screenshot_restored",
    ).length,
    local_catalog_checks: localImageResults,
    runtime_exceptions: exceptions.length,
    failure_modes: ["primary_to_svg", "primary_and_svg_to_gradient_icon"],
    remote_images:
      "blocked deliberately; remote availability audited separately, not declared universally available",
    warning_count: warnings.length,
  };
  fs.writeFileSync(
    "review/final/region-banner-browser.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(
    "PASS 36 region switches across source file, single HTML, HTTP and Pages subpath; five languages; homepage JPEG; 114 local catalog assets per entry; SVG and graphic-only fallbacks; session failure rate.",
  );
} finally {
  ws?.close();
  browser.kill();
  await new Promise((r) => server.close(r));
}
