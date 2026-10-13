// Local-only Pages subdirectory and file-entry checks. No data gathering or upload.
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import { liveInputSignature } from "./live-search-input.mjs";
const root = path.resolve("."),
  prefix = "/pages-preview/",
  port = 9326;
const hash = (f) =>
  createHash("sha256").update(fs.readFileSync(f)).digest("hex");
const source = JSON.parse(
  fs.readFileSync("data/dataset/search/queries.candidates.json"),
);
const selection = {
  formal: [
    "q001",
    "q019",
    "q055",
    "q007",
    "q025",
    "q031",
    "q037",
    "q043",
    "q049",
    "q091",
  ],
  nickname: [
    "q002",
    "q020",
    "q095",
    "q008",
    "q014",
    "q026",
    "q032",
    "q038",
    "q044",
    "q050",
  ],
  typo_pinyin: [
    "q003",
    "q021",
    "q057",
    "q009",
    "q015",
    "q027",
    "q039",
    "q045",
    "q063",
    "q092",
  ],
  description: [
    "q005",
    "q023",
    "q097",
    "q011",
    "q017",
    "q029",
    "q035",
    "q041",
    "q047",
    "q053",
  ],
  multilingual: [
    "q006",
    "q024",
    "q094",
    "q012",
    "q018",
    "q030",
    "q036",
    "q042",
    "q066",
    "q099",
  ],
};
const queries = Object.entries(selection).flatMap(([type, ids]) =>
  ids.map((id) => {
    const q = source.find((r) => r.query_id === id);
    assert.equal(q.type, type);
    return {
      query_id: id,
      query: q.query,
      type,
      language: q.language,
      split: q.split,
      group_id: q.group_id,
    };
  }),
);
assert.equal(queries.filter((q) => q.split === "test").length, 15);
const server = http.createServer((req, res) => {
  let url;
  try {
    url = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  } catch {
    res.writeHead(400).end();
    return;
  }
  if (!url.startsWith(prefix)) {
    res.writeHead(404).end();
    return;
  }
  const target = path.resolve(root, url.slice(prefix.length) || "index.html");
  if (!target.startsWith(root + path.sep)) {
    res.writeHead(403).end();
    return;
  }
  if (!fs.existsSync(target) || !fs.statSync(target).isFile()) {
    res.writeHead(404).end();
    return;
  }
  const mime = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json",
    ".png": "image/png",
    ".svg": "image/svg+xml",
  };
  res.writeHead(200, {
    "Content-Type": mime[path.extname(target)] || "application/octet-stream",
  });
  fs.createReadStream(target).pipe(res);
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const origin = "http://127.0.0.1:" + server.address().port;
const executable =
  process.env.BROWSER_PATH || "google-chrome";
assert.ok(executable, "Chrome/Chromium is required for this optional check");
const browser = spawn(
  executable,
  [
    "--headless=new",
    "--no-first-run",
    "--disable-gpu",
    "--disable-background-networking",
    "--no-sandbox",
    "--remote-debugging-port=" + port,
    "--user-data-dir=" + path.resolve("review/browser-profile/step10"),
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
  assert.ok(tabs, "Browser connection");
  ws = new WebSocket(tabs.find((t) => t.type === "page").webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let seq = 0;
  const pending = new Map(),
    errors = [],
    badResources = [];
  ws.onmessage = ({ data }) => {
    const j = JSON.parse(data);
    if (j.id) {
      const p = pending.get(j.id);
      pending.delete(j.id);
      j.error ? p.reject(j.error) : p.resolve(j.result);
    }
    if (j.method === "Runtime.exceptionThrown")
      errors.push(j.params.exceptionDetails);
    if (
      j.method === "Network.responseReceived" &&
      j.params.response.url.startsWith(origin) &&
      j.params.response.status >= 400
    )
      badResources.push(j.params.response);
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
  const sections = [
    "outfits",
    "clothing",
    "materials",
    "map",
    "eurekas",
    "makeups",
    "analytics",
    "wardrobe",
    "preferences",
    "planning",
    "advanced",
    "research",
    "quality",
    "favorites",
  ];
  const visits = [];
  for (const url of [
    origin + prefix + "index.html#outfits",
    pathToFileURL(path.join(root, "index.html")).href + "#outfits",
  ]) {
    await send("Page.navigate", { url });
    for (
      let i = 0;
      i < 60 &&
      !(await ev("Boolean(window.MiralandArchive && window.NikkiSmartSearch)"));
      i++
    )
      await sleep(250);
    assert.equal(await ev("Boolean(window.MiralandArchive)"), true);
    assert.ok((await ev("location.href")).includes("/src/index.html"));
    await ev("localStorage.clear();location.reload()");
    for (
      let i = 0;
      i < 60 && !(await ev("Boolean(window.MiralandArchive)"));
      i++
    )
      await sleep(250);
    assert.equal(
      await ev("Boolean(window.MiralandArchive)"),
      true,
      "Fresh storage load",
    );
    for (const locale of ["zh-CN", "en", "ja", "ko", "zh-TW"])
      for (const section of sections) {
        await ev(
          `MiralandArchive.setLanguage(${JSON.stringify(locale)});MiralandArchive.openSection(${JSON.stringify(section)})`,
        );
        assert.ok(
          await ev(
            "document.querySelector('main').textContent.trim().length>0",
          ),
        );
        visits.push({
          entry: url.startsWith("file:") ? "file" : "pages_subpath",
          locale,
          section,
        });
      }
    await ev(
      "MiralandArchive.setLanguage('zh-CN');MiralandArchive.openSection('research')",
    );
    await ev("NikkiModules.load('search_eval')");
    assert.equal(
      await ev("Boolean(window.NikkiSearchEval)"),
      true,
      "Relative lazy evaluation assets",
    );
  }
  await ev("MiralandArchive.setLanguage('zh-CN');NikkiSmartSearch.init()");
  const rows = await ev(
    `(${JSON.stringify(queries)}).map(q=>({...q,ranked:NikkiSmartSearch.search(q.query).map(hit=>({id:hit.id,name_zh:NikkiSmartSearch.record(hit.id)?.name||hit.id,name_en:NikkiSmartSearch.record(hit.id)?.en||'',score:hit.score,reasons:hit.reasons,explanation:NikkiSmartSearch.explain(hit)}))}))`,
  );
  const snapshot = await ev("NIKKI_QUALITY.snapshot.snapshot_id"),
    document_count = await ev("NikkiSmartSearch.init().document_count");
  assert.equal(document_count, 11469);
  const configuration = await ev("NIKKI_SMART_SEARCH_DATA.configuration");
  assert.equal(errors.length, 0, JSON.stringify(errors));
  assert.equal(badResources.length, 0, JSON.stringify(badResources));
  const revision = await ev("NikkiSmartSearch.init().version||'F-v1'");
  const repaired = revision === "F-v2-single-character-homophone";
  if (repaired) {
    assert.equal(
      await ev("NikkiSmartSearch.search('古典乐张')[0]?.id"),
      "o10183",
    );
    assert.equal(
      await ev(
        "NikkiSmartSearch.searchConversational('古典乐张是什么')[0]?.id",
      ),
      "o10183",
    );
    assert.equal(
      await ev("NikkiSmartSearch.search('古典乐张',{rarity:4}).length"),
      0,
    );
    assert.equal(
      await ev("NIKKI_QUALITY.coverage_notes.human_search_approvals"),
      50,
    );
    for (const locale of ["zh-CN", "en", "ja", "ko", "zh-TW"]) {
      await ev(
        `MiralandArchive.setLanguage(${JSON.stringify(locale)});MiralandArchive.openSection('research')`,
      );
      assert.equal(
        await ev(
          "document.querySelectorAll('.human-search-review tbody tr').length",
        ),
        13,
      );
    }
    await ev("MiralandArchive.setLanguage('zh-CN')");
    const report = JSON.parse(
      fs.readFileSync("data/dataset/search-human/step12-comparison.json"),
    );
    for (const q of rows)
      assert.deepEqual(
        q.ranked.map((r) => r.id),
        report.predictions.F_v2.find(
          (r) => r.query_id === q.query_id,
        ).ranked.map((r) => r.id),
      );
  }
  const directory = repaired ? "data/review/step12" : "data/review/step10";
  fs.mkdirSync(directory, { recursive: true });
  const ledger = {
    created_at: new Date().toISOString(),
    scope: repaired
      ? "F_v2_post_review_regression"
      : "live_catalog_F_predictions_only_not_human_gold",
    revision,
    snapshot_id: snapshot,
    method: "F",
    document_count,
    configuration,
    selection:
      "10 per type; 35 development / 15 test; original family splits retained; excludes partial; fixed explicit IDs, not selected by model success",
    hashes: Object.fromEntries(
      [
        "src/data.js",
        "src/locales.js",
        "src/analytics-data.js",
        "src/smart-search-data.js",
        "src/smart-search-model.js",
        "src/smart-search.js",
        "src/smart-vendor-opencc.js",
        "src/smart-vendor-pinyin.js",
        "data/dataset/search/queries.candidates.json",
      ].map((f) => [f, hash(f)]),
    ),
    semantic_input_sha256: liveInputSignature(),
    rows,
  };
  // Never silently replace a frozen prediction ledger after a human review has begun.
  const file =
    directory +
    (repaired ? "/live-v2-predictions.json" : "/live-predictions.json");
  if (fs.existsSync(file)) {
    const old = JSON.parse(fs.readFileSync(file));
    assert.deepEqual(
      old.rows,
      ledger.rows,
      "Production predictions changed; create a new review cohort",
    );
    assert.deepEqual(old.configuration, ledger.configuration);
    for (const f of [
      "src/smart-search-model.js",
      "src/smart-search.js",
      "src/smart-vendor-opencc.js",
      "src/smart-vendor-pinyin.js",
    ])
      assert.equal(old.hashes[f], ledger.hashes[f]);
    if (old.semantic_input_sha256)
      assert.equal(old.semantic_input_sha256, ledger.semantic_input_sha256);
    else {
      // Initial metadata upgrade, before review: all frozen predictions checked unchanged.
      old.semantic_input_sha256 = ledger.semantic_input_sha256;
      old.metadata_note =
        "Build timestamp changes excluded from input identity; full unchanged predictions rechecked before human review.";
      fs.writeFileSync(file, JSON.stringify(old, null, 2) + "\n");
    }
  } else fs.writeFileSync(file, JSON.stringify(ledger, null, 2) + "\n");
  fs.mkdirSync("review/final", { recursive: true });
  fs.writeFileSync(
    repaired
      ? "review/final/step12-pages.json"
      : "review/final/step10-pages.json",
    JSON.stringify(
      {
        checked_at: new Date().toISOString(),
        deployment: "not_deployed",
        visits,
        case_count: visits.length,
        lazy_modules: "passed_both_entries",
        runtime_exceptions: errors.length,
        local_http_errors: badResources.length,
        document_count,
        snapshot_id: snapshot,
        remote_art_and_fonts: "blocked_for_test",
      },
      null,
      2,
    ),
  );
  console.log(
    "PASS root file entry, Pages project subpath, 140 fresh-storage language/page cases, lazy module paths; 50 live F predictions frozen.",
  );
} finally {
  ws?.close();
  browser.kill();
  await new Promise((r) => server.close(r));
}
