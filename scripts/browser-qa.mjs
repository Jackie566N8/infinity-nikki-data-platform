import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";
const executable =
  process.env.BROWSER_PATH || "google-chrome";
if (!executable)
  throw Error(
    "Set BROWSER_PATH to Chrome/Chromium to run local UI verification.",
  );
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
  port = 9315,
  profile = path.resolve("review/browser-profile"),
  browser = spawn(
    executable,
    [
      "--headless=new",
      "--disable-gpu",
      "--disable-extensions",
      "--disable-background-networking",
      "--no-first-run",
      "--no-sandbox",
      "--remote-debugging-port=" + port,
      "--user-data-dir=" + profile,
      "about:blank",
    ],
    { windowsHide: true, stdio: "ignore" },
  );
let ws, send;
try {
  let tabs;
  for (let i = 0; i < 35; i++) {
    await sleep(300);
    try {
      tabs = await (await fetch("http://127.0.0.1:" + port + "/json")).json();
      break;
    } catch {}
  }
  if (!tabs) throw Error("Test browser unavailable");
  ws = new WebSocket(tabs.find((t) => t.type === "page").webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let seq = 0;
  const pending = new Map(),
    errors = [],
    requests = [];
  ws.onmessage = ({ data }) => {
    const j = JSON.parse(data);
    if (j.id) {
      const p = pending.get(j.id);
      pending.delete(j.id);
      j.error ? p.reject(j.error) : p.resolve(j.result);
    }
    if (j.method === "Runtime.exceptionThrown")
      errors.push(j.params.exceptionDetails);
    if (j.method === "Network.requestWillBeSent") requests.push(j.params);
  };
  send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      pending.set(++seq, { resolve, reject });
      ws.send(JSON.stringify({ id: seq, method, params }));
    });
  const ev = async (expression) => {
      const r = await send("Runtime.evaluate", {
        expression,
        returnByValue: true,
        awaitPromise: true,
        userGesture: true,
      });
      if (r.exceptionDetails) throw Error(JSON.stringify(r.exceptionDetails));
      return r.result.value;
    },
    ready = async () => {
      for (let i = 0; i < 35; i++) {
        if (await ev("Boolean(window.NikkiSearchEval)")) return;
        await sleep(120);
      }
      throw Error("Lazy evaluation module not ready");
    };
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Network.enable");
  await send("Network.emulateNetworkConditions", {
    offline: true,
    latency: 0,
    downloadThroughput: 0,
    uploadThroughput: 0,
  });
  fs.mkdirSync("docs/screenshots", { recursive: true });
  fs.mkdirSync("review/final", { recursive: true });
  const cases = [];
  for (const file of [
    ...(!process.argv.includes('--standalone-only') ? ['src/index.html'] : []),
    ...(!process.argv.includes("--source-only") &&
    fs.existsSync("outputs/奇迹旅册.html")
      ? ["outputs/奇迹旅册.html"]
      : []),
  ]) {
    await send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 1050,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await send("Page.navigate", {
      url: pathToFileURL(path.resolve(file)).href + "#outfits",
    });
    await sleep(1600);
    await ev("localStorage.clear();location.reload()");
    await sleep(1800);
    for(let retry=0;retry<40&&!await ev('Boolean(window.MiralandArchive)');retry++) await sleep(250);
    if(!await ev('Boolean(window.MiralandArchive)')) console.log(JSON.stringify({errors,diagnostic:await ev('({ready:document.readyState,title:document.title,body:document.body?.textContent.slice(-900)})')}));
    assert.equal(
      await ev("Boolean(window.MiralandArchive)"),
      true,
      "fresh-storage boot",
    );
    const freshCases = [];
    for (const locale of ["zh-CN", "en", "ja", "ko", "zh-TW"]) {
      await ev(`MiralandArchive.setLanguage('${locale}')`);
      for (const section of [
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
      ]) {
        await ev(`MiralandArchive.openSection('${section}')`);
        assert.ok(
          await ev("document.querySelector('main').textContent.trim().length"),
          "fresh empty page " + locale + "/" + section,
        );
        freshCases.push({ locale, section, local_data: "cleared_at_boot" });
      }
    }
    await ev("MiralandArchive.setLanguage('zh-CN')");
    const info = {
      file,
      dom_content_loaded_ms: await ev(
        'performance.getEntriesByType("navigation")[0].domContentLoadedEventEnd',
      ),
      heap_after_start: await ev("performance.memory?.usedJSHeapSize"),
      navigation: [],
      fresh_storage_cases: freshCases,
    };
    if (file.startsWith("src"))
      assert.equal(
        await ev("Boolean(window.NIKKI_SEARCH_EVAL_DATA)"),
        false,
        "eval must not load at startup",
      );
    for (const route of [
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
    ]) {
      info.navigation.push(
        await ev(
          `(()=>{const at=performance.now();MiralandArchive.openSection('${route}');return {route:'${route}',ms:performance.now()-at};})()`,
        ),
      );
      assert.ok(
        await ev('document.querySelector("#view").textContent.length>30'),
      );
    }
    assert.equal(await ev("NIKKI_QUALITY.validation.error_count"), 0);
    assert.equal(
      await ev("NIKKI_RESEARCH_DATA.n"),
      await ev("NIKKI_QUALITY.totals.independent_outfits"),
    );
    assert.equal(await ev('MiralandArchive.search("神女套")[0].id'), "o10349");
    assert.equal(
      await ev('MiralandArchive.search("shennvtao")[0].id'),
      "o10349",
    );
    assert.equal(
      await ev('MiralandArchive.search("生于无暇")[0].id'),
      "o10349",
    );
    assert.equal(
      await ev('MiralandArchive.search("1星生于无瑕原色套装").length'),
      0,
    );
    assert.equal(
      await ev('MiralandArchive.search("如果爱上一朵花")[0].id'),
      "o10347",
    );
    await ev('MiralandArchive.openRecord("o10206")');
    assert.ok(
      await ev(
        'document.querySelector("#detail").textContent.includes("完整性待核实")',
      ),
    );
    await ev('document.querySelector("#close-detail").click()');
    await ev(
      "MiralandArchive.openSection('wardrobe');window.qaSet=NIKKI_ANALYTICS_DATA.outfits.find(o=>o.is_base&&o.member_count_status==='match'&&o.part_ids.length>=7);window.qaNotes={owned:qaSet.part_ids.slice(1),saved:['o10330','o10331']};localStorage.setItem('miraland-notes-v1',JSON.stringify(qaNotes));dispatchEvent(new StorageEvent('storage',{key:'miraland-notes-v1',newValue:JSON.stringify(qaNotes)}))",
    );
    assert.ok(
      await ev("NikkiWardrobe.getResult().near.some(o=>o.id===qaSet.id)"),
    );
    await ev("MiralandArchive.openSection('preferences')");
    assert.equal(
      await ev("NikkiPreferences.getResult().study.sample_size"),
      62,
    );
    await ev(
      "MiralandArchive.openSection('planning');document.querySelector('[data-mp-clear]').click();const search=document.querySelector('[data-mp-search]');search.value='轻盈泡泡';search.dispatchEvent(new Event('input',{bubbles:true}));const box=[...document.querySelectorAll('[data-mp-target]')].find(b=>b.dataset.mpTarget==='o10048');box.checked=true;box.dispatchEvent(new Event('change',{bubbles:true}))",
    );
    assert.ok(await ev("NikkiPlanning.getResult().totals.ready===1"));
    const before = await ev(
      'NikkiPlanning.getResult().rows.find(r=>r.id==="mlampchili").total',
    );
    await ev(
      "const stock=document.querySelector('[data-mp-stock=mlampchili]');stock.value='3';stock.dispatchEvent(new Event('input',{bubbles:true}))",
    );
    assert.equal(
      await ev(
        'NikkiPlanning.getResult().rows.find(r=>r.id==="mlampchili").gap',
      ),
      before - 3,
    );
    await ev("MiralandArchive.openSection('map')");
    assert.ok(
      await ev('document.querySelectorAll(".adv-route-list>li").length>0'),
    );
    assert.equal(
      await ev(
        "NikkiAdvancedModel.regionPlan(NikkiPlanning.getResult()).distance",
      ),
      null,
    );
    await ev(
      "MiralandArchive.openSection('advanced');document.querySelector('.adv-item').click()",
    );
    assert.equal(
      await ev(
        'document.querySelectorAll("#detail .adv-recommendation").length',
      ),
      6,
    );
    await ev('document.querySelector("#close-detail").click()');
    await ev(
      "MiralandArchive.openSection('research');document.querySelector('[data-rs-cluster=" +
        '"2"' +
        "]').click()",
    );
    assert.ok(
      await ev(
        'document.querySelector("#rs-members").textContent.includes("2")',
      ),
    );
    await ev(
      "window.qaBlobs=[];URL.createObjectURL=b=>{qaBlobs.push(b);return 'blob:qa-no-download'};HTMLAnchorElement.prototype.click=function(){};document.querySelector('[data-rs-export=clusters]').click();document.querySelector('[data-rs-export=uncertainty]').click();NikkiAdvanced.exportData('regions');NikkiAdvanced.exportData('telemetry')",
    );
    const blobs = await ev("Promise.all(qaBlobs.map(b=>b.text()))");
    assert.ok(blobs[0].includes("snapshot_id"));
    assert.ok(blobs[1].includes("human_approved"));
    assert.ok(blobs[2].includes("exact_route"));
    assert.equal(JSON.parse(blobs[3]).enabled, false);
    for (const [lang, title] of [
      ["zh-CN", "研究实验室"],
      ["en", "Research lab"],
      ["ja", "研究ラボ"],
      ["ko", "연구 실험실"],
      ["zh-TW", "研究實驗室"],
    ]) {
      await ev(`MiralandArchive.setLanguage('${lang}')`);
      assert.equal(
        await ev('document.querySelector(".research-page h1").textContent'),
        title,
      );
    }
    if (file.startsWith("src")) {
      await send("Network.setBlockedURLs", { urls: ["*search-eval-data.js*"] });
      await ev(
        "MiralandArchive.setLanguage('zh-CN');MiralandArchive.openSection('search_eval')",
      );
      await sleep(300);
      assert.ok(
        await ev('Boolean(document.querySelector("[data-retry-eval]"))'),
      );
      await send("Network.setBlockedURLs", { urls: [] });
      await ev('document.querySelector("[data-retry-eval]").click()');
      await ready();
      await ev(
        'window.qaSnapshot=NIKKI_PLANNING_DATA.snapshot_id;NIKKI_PLANNING_DATA.snapshot_id="bad-qa"',
      );
      assert.equal(await ev("NikkiBoot.verify()"), false);
      await ev("NIKKI_PLANNING_DATA.snapshot_id=qaSnapshot");
      assert.equal(await ev("NikkiBoot.verify()"), true);
    }
    await ev(
      "MiralandArchive.setLanguage('zh-CN');MiralandArchive.openSection('search_eval')",
    );
    await ready();
    assert.equal(await ev("NIKKI_SEARCH_EVAL_DATA.report.checks.approved"), 0);
    assert.equal(
      await ev("NIKKI_SMART_SEARCH_DATA.comparison.annotation_status"),
      "provisional_not_human_reviewed",
    );
    assert.ok(await ev('document.querySelector(".search-eval-page")'));
    info.responsive = [];
    for (const width of [320, 390, 768, 1440]) {
      await send("Emulation.setDeviceMetricsOverride", {
        width,
        height: 844,
        deviceScaleFactor: 1,
        mobile: width < 800,
      });
      for (const lang of ["zh-CN", "en", "ja", "ko", "zh-TW"]) {
        await ev(`MiralandArchive.setLanguage('${lang}')`);
        for (const route of [
          "analytics",
          "wardrobe",
          "preferences",
          "planning",
          "advanced",
          "research",
          "quality",
          "search_eval",
          "map",
        ]) {
          await ev(`MiralandArchive.openSection('${route}')`);
          const overflow = await ev(
            "document.documentElement.scrollWidth>innerWidth",
          );
          assert.equal(
            overflow,
            false,
            file + " " + width + " " + lang + " " + route,
          );
          info.responsive.push({ width, lang, route, overflow });
        }
      }
    }
    await send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 1050,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await ev(
      "MiralandArchive.setLanguage('en');MiralandArchive.openSection('research');scrollTo(0,0)",
    );
    await sleep(250);
    if (file.startsWith("src")) {
      await send("Page.captureScreenshot", { format: "png" }).then((s) =>
        fs.writeFileSync(
          "docs/screenshots/research-desktop.png",
          Buffer.from(s.data, "base64"),
        ),
      );
      await ev("MiralandArchive.search('shennvtao');scrollTo(0,0)");
      await sleep(250);
      await send("Page.captureScreenshot", { format: "png" }).then((s) =>
        fs.writeFileSync(
          "docs/screenshots/search-desktop.png",
          Buffer.from(s.data, "base64"),
        ),
      );
      await ev("MiralandArchive.openSection('planning');scrollTo(0,0)");
      await sleep(250);
      await send("Page.captureScreenshot", { format: "png" }).then((s) =>
        fs.writeFileSync(
          "docs/screenshots/materials-desktop.png",
          Buffer.from(s.data, "base64"),
        ),
      );
    }
    cases.push(info);
    console.log(
      "PASS " +
        file +
        ": all modules, ownership, stock, route limits, exports, five languages and " +
        info.responsive.length +
        " responsive checks",
    );
  }
  await send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await ev(
    "MiralandArchive.setLanguage('zh-CN');MiralandArchive.openSection('research');scrollTo(0,0)",
  );
  await sleep(450);
  await send("Page.captureScreenshot", { format: "png" }).then((s) =>
    fs.writeFileSync(
      "docs/screenshots/research-mobile.png",
      Buffer.from(s.data, "base64"),
    ),
  );
  assert.deepEqual(errors, []);
  assert.ok(
    !requests.some(
      (r) =>
        r.request.method !== "GET" ||
        ["Fetch", "XHR", "WebSocket"].includes(r.type),
    ),
  );
  fs.writeFileSync(
    "review/final/browser-verification.json",
    JSON.stringify(
      {
        checked_at: new Date().toISOString(),
        cases,
        javascript_exceptions: errors.length,
        upload_requests: 0,
        download_verification:
          "export Blob contents only; OS save not exercised",
        network:
          "offline; external remote images separately HTTP/signature sampled",
      },
      null,
      2,
    ),
  );
} finally {
  try {
    if (send) await send("Browser.close");
  } catch {}
  ws?.close();
  browser.kill();
}
