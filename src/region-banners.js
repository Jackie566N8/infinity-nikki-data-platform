(() => {
  "use strict";
  const D = window.NIKKI_REGION_BANNERS_DATA,
    I = window.NikkiI18n;
  if (!D || !I) return;
  const rows = D.manifest.regions,
    byId = new Map(rows.map((r) => [r.id, r])),
    states = new Map(
      rows.map((r) => [r.id, { primary: "pending", fallback: "pending" }]),
    );
  let auditPromise;
  const esc = (s) =>
    String(s ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  const asset = (ref) => window.NIKKI_ASSETS?.[ref] || ref;
  const strings = {
    "zh-CN": [
      "官方风景宣传图",
      "官方区域活动图",
      "官方合并地区宣传图",
      "主题插画 · 官方图片待补",
      "背景加载中",
      "图片未加载 · 显示主题插画",
      "主题回退 · 非地图底图",
      "区域采集索引 · 装饰背景，非地图底图",
      "区域背景图 · 当前会话检查",
      "主背景可用",
      "仍在检查",
      "官方素材、用户截图和主题占位分类记录。",
      "来源",
    ],
    en: [
      "Official scenery",
      "Official area event image",
      "Official wider-area image",
      "Theme illustration · official art pending",
      "Loading background",
      "Image unavailable · theme illustration",
      "Theme fallback · not a map",
      "Regional gathering index · decorative art, not a map",
      "Region banners · session check",
      "Primary available",
      "Checking",
      "Official art, user screenshots and placeholders are classified separately.",
      "Source",
    ],
    ja: [
      "公式風景画像",
      "公式エリアイベント画像",
      "公式広域画像",
      "テーマイラスト・公式画像待ち",
      "背景読込中",
      "画像読込失敗・テーマ表示",
      "テーマ代替・地図ではありません",
      "採集索引・装飾画像、地図ではありません",
      "エリア背景・セッション検査",
      "主背景の利用可",
      "検査中",
      "公式画像・ユーザー画像・代替画像は別に分類します。",
      "出典",
    ],
    ko: [
      "공식 풍경",
      "공식 지역 이벤트 이미지",
      "공식 광역 이미지",
      "테마 일러스트 · 공식 이미지 대기",
      "배경 로딩 중",
      "이미지 실패 · 테마 표시",
      "테마 대체 · 지도 아님",
      "지역 채집 색인 · 장식 배경, 지도 아님",
      "지역 배경 · 세션 검사",
      "주 배경 사용 가능",
      "검사 중",
      "공식·사용자·대체 이미지는 별도로 분류합니다.",
      "출처",
    ],
    "zh-TW": [
      "官方風景宣傳圖",
      "官方區域活動圖",
      "官方合併地區宣傳圖",
      "主題插畫 · 官方圖片待補",
      "背景載入中",
      "圖片未載入 · 顯示主題插畫",
      "主題回退 · 非地圖底圖",
      "區域採集索引 · 裝飾背景，非地圖底圖",
      "區域背景圖 · 目前工作階段檢查",
      "主背景可用",
      "仍在檢查",
      "官方素材、使用者截圖和主題佔位分類記錄。",
      "來源",
    ],
  };
  const l = () => strings[I.locale] || strings["zh-CN"];
  const userLabels = {
    "zh-CN": "用户提供截图 · 画质修复",
    en: "User screenshot · restored",
    ja: "ユーザー提供スクリーンショット・補正済み",
    ko: "사용자 스크린샷 · 화질 복원",
    "zh-TW": "使用者提供截圖 · 畫質修復",
  };
  for (const [locale, label] of Object.entries(userLabels))
    strings[locale].push(label);
  const label = (r) =>
    l()[
      r.image_kind === "user_screenshot_restored"
        ? 13
        : r.image_kind === "placeholder"
          ? 3
          : r.image_kind === "official_event"
            ? 1
            : r.image_kind === "official_overview"
              ? 2
              : 0
    ];
  const notify = () =>
    window.dispatchEvent(new Event("nikki-region-images-updated"));
  function mark(id, kind, status) {
    Object.assign(states.get(id), {
      [kind]: status,
      checked_at: new Date().toISOString(),
    });
    notify();
  }
  function render(name) {
    const r = rows.find((r) => r.region === name) || rows[0];
    setTimeout(() => auditAll(), 0);
    return `<div class="map-banner" data-region-container="${r.id}" data-image-state="loading" style="--region-sky:${r.palette[0]};--region-hill:${r.palette[1]};--region-ink:${r.palette[2]}"><span class="region-ornament" aria-hidden="true">✧</span><img data-region-banner="${r.id}" data-image-stage="primary" src="${esc(asset(r.primary_path))}" alt="${esc(I.t(r.region) + " · " + label(r))}" decoding="async" style="object-position:${r.object_position}"><span class="region-image-badge" data-region-label>${esc(label(r))}</span><h2>${esc(I.t(r.region))}<small>${esc(l()[7])}</small></h2>${r.source_page ? `<a class="region-credit" href="${esc(r.source_page)}" target="_blank" rel="noopener noreferrer">${esc(l()[12])} ↗</a>` : ""}</div>`;
  }
  function updateImage(img, ok) {
    const r = byId.get(img.dataset.regionBanner);
    if (!r) return;
    const stage = img.dataset.imageStage,
      box = img.closest("[data-region-container]");
    mark(r.id, stage, ok ? "loaded" : "failed");
    if (!box) return;
    const badge = box.querySelector("[data-region-label]");
    if (ok) {
      box.dataset.imageState = stage === "primary" ? "loaded" : "fallback";
      box.classList.remove("image-failed");
      if (badge) badge.textContent = stage === "primary" ? label(r) : l()[5];
      return;
    }
    console.warn(
      `[RegionBanner] ${r.region}: ${stage} image failed; ${stage === "primary" ? r.primary_path : r.fallback_path}`,
    );
    if (stage === "primary") {
      img.dataset.imageStage = "fallback";
      img.src = asset(r.fallback_path);
      box.dataset.imageState = "fallback-loading";
      if (badge) badge.textContent = l()[5];
    } else {
      img.hidden = true;
      box.dataset.imageState = "graphic-only";
      if (badge) badge.textContent = l()[6];
    }
  }
  document.addEventListener(
    "load",
    (e) => {
      if (e.target instanceof HTMLImageElement && e.target.dataset.regionBanner)
        updateImage(e.target, e.target.naturalWidth > 0);
    },
    true,
  );
  document.addEventListener(
    "error",
    (e) => {
      if (e.target instanceof HTMLImageElement && e.target.dataset.regionBanner)
        updateImage(e.target, false);
    },
    true,
  );
  function auditAll() {
    if (auditPromise) return auditPromise;
    auditPromise = Promise.all(
      rows.map(
        (r) =>
          new Promise((resolve) => {
            const img = new Image();
            let settled = false;
            const finish = (ok) => {
              if (settled) return;
              settled = true;
              clearTimeout(timer);
              mark(r.id, "primary", ok ? "loaded" : "failed");
              if (!ok)
                console.warn(
                  `[RegionBanner audit] ${r.region}: ${r.primary_path} unavailable`,
                );
              resolve(ok);
            };
            const timer = setTimeout(() => finish(false), 15000);
            img.onload = () => finish(img.naturalWidth > 0);
            img.onerror = () => finish(false);
            img.decoding = "async";
            img.src = asset(r.primary_path);
          }),
      ),
    );
    return auditPromise;
  }
  function summary() {
    const done = [...states.values()].filter((s) => s.primary !== "pending"),
      ok = done.filter((s) => s.primary === "loaded").length;
    return `${esc(l()[9])} <b>${ok}/${rows.length}</b> · ${esc(l()[10])} ${rows.length - done.length} <span class="quality-caption">${esc(l()[11])}</span>`;
  }
  function qualityPanel() {
    setTimeout(() => auditAll(), 0);
    return `<section class="quality-section" data-no-translate><h2>${esc(l()[8])}</h2><p data-region-check-summary>${summary()}</p></section>`;
  }
  window.addEventListener("nikki-region-images-updated", () =>
    document
      .querySelectorAll("[data-region-check-summary]")
      .forEach((e) => (e.innerHTML = summary())),
  );
  window.NikkiRegions = {
    render,
    auditAll,
    qualityPanel,
    status: () => Object.fromEntries(states),
    manifest: D.manifest,
  };
})();
