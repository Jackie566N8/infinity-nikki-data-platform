(() => {
  "use strict";
  if (window.NikkiBoot && !window.NikkiBoot.verify()) return;
  const data = window.NIKKI_DATA;
  if (!data) {
    document.getElementById("view").innerHTML =
      '<div class="empty"><h1>资料未能载入</h1><p>请将网站文件完整解压后，重新打开 index.html。</p></div>';
    return;
  }
  const records = data.records,
    byId = new Map(records.map((r) => [r.id, r])),
    $ = (s) => document.querySelector(s),
    esc = (s) =>
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
  const i18n = window.NikkiI18n,
    recordName = (r) => i18n.name(r);
  i18n.mount();
  const kinds = {
    outfits: "套装图鉴",
    clothing: "服装部件",
    materials: "材料与道具",
    makeups: "妆容图鉴",
    eurekas: "祝福闪光",
    map: "地图与采集",
    guides: "冒险指南",
    favorites: "我的收藏",
    sources: "资料来源",
    quality: "数据质量",
    analytics: "数据分析",
    wardrobe: "我的衣橱",
    preferences: "玩家偏好",
    planning: "材料规划",
    advanced: "推荐与昵称研究",
    research: "研究实验室",
    search_eval: "搜索评估",
    search: "全站搜索",
  };
  const icons = {
    outfits: "♧",
    clothing: "♧",
    materials: "❀",
    makeups: "◇",
    eurekas: "✦",
    map: "⌖",
    guides: "▤",
    favorites: "♡",
    quality: "◈",
    analytics: "▥",
    wardrobe: "♧",
    preferences: "◎",
    planning: "❀",
    advanced: "✧",
    research: "◇",
    search_eval: "⌕",
  };
  const navs = [
    "outfits",
    "clothing",
    "materials",
    "map",
    "makeups",
    "eurekas",
    "guides",
    "analytics",
    "wardrobe",
    "preferences",
    "planning",
    "advanced",
    "research",
    "search_eval",
    "quality",
    "favorites",
  ];
  const count = (k) => records.filter((r) => r.kind === k).length,
    num = (n) => n.toLocaleString(i18n.locale);
  const styles = ["典雅", "清新", "甜美", "性感", "帅气"];
  const defaultState = () => ({
    route: "outfits",
    q: "",
    star: "",
    style: "",
    type: "",
    obtain: "",
    variants: false,
    sort: "default",
    page: 1,
    layout: "grid",
    region: "花愿镇",
    favKind: "",
    localized: false,
    owned: false,
  });
  let state = defaultState(),
    saved = new Set(),
    owned = new Set(),
    storageOkay = true;
  try {
    const v = JSON.parse(localStorage.getItem("miraland-notes-v1") || "{}");
    saved = new Set(
      (Array.isArray(v.saved) ? v.saved : []).filter((x) => byId.has(x)),
    );
    owned = new Set(
      (Array.isArray(v.owned) ? v.owned : []).filter((x) => byId.has(x)),
    );
  } catch {
    storageOkay = false;
  }
  const persist = () => {
    try {
      localStorage.setItem(
        "miraland-notes-v1",
        JSON.stringify({ saved: [...saved], owned: [...owned] }),
      );
      return true;
    } catch {
      storageOkay = false;
      toast("浏览器未允许保存；本次操作只在当前页面保留。");
      return false;
    } finally {
      window.dispatchEvent(new Event("miraland-notes-changed"));
    }
  };
  function toast(t) {
    $("#toast").textContent = i18n.t(t);
    $("#toast").classList.add("show");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => $("#toast").classList.remove("show"), 2800);
  }
  const external = (url, label, cls = "") =>
    `<a class="${cls}" href="${esc(url.replace(/^(https:\/\/gongeo\.us)\/zh(?=\/|$)/, "$1/" + ({ "zh-CN": "zh", "zh-TW": "tw" }[i18n.locale] || i18n.locale)))}" target="_blank" rel="noopener noreferrer">${label} ↗</a>`;
  const asset = (url) => window.NIKKI_ASSETS?.[url] || url;
  const selectedEurekaColors = new Map();
  const pic = (r, cls = "") =>
    r.image
      ? `<img class="${cls}" src="${esc(asset(r.image))}" alt="${esc(recordName(r))}" loading="lazy" referrerpolicy="no-referrer"><span class="fallback"><b>✧</b>图片暂不可用</span>`
      : '<span class="fallback" style="display:block"><b>✧</b>来源未提供图片</span>';

  // Keep nickname provenance on the base outfit; all of its forms share the search terms.
  const normalizeSearch = (value) =>
    String(value ?? "")
      .normalize("NFKC")
      .toLocaleLowerCase()
      .replace(/[“”‘’「」『』"']/g, "")
      .trim();
  const aliasCatalog = data.outfitAliases || { entries: [] },
    aliasById = new Map();
  function aliasForms(alias) {
    return [
      ...new Set(
        [alias, i18n.traditionalNickname(alias)].flatMap((value) => {
          const stem = normalizeSearch(value).replace(/套装$|套裝$|套$/, "");
          return [
            normalizeSearch(value),
            stem + "套",
            stem + "套装",
            stem + "套裝",
            ...(stem.length >= 2 ? [stem] : []),
          ];
        }),
      ),
    ];
  }
  for (const entry of aliasCatalog.entries) {
    const base = byId.get(entry.outfitId);
    if (!base || base.kind !== "outfits") continue;
    entry.searchTerms = [...new Set(entry.aliases.flatMap(aliasForms))];
    for (const id of [base.id, ...(base.group || [])]) aliasById.set(id, entry);
  }
  const searchText = new Map(
    records.map((r) => [
      r.id,
      normalizeSearch(
        [
          ...i18n.names(r),
          ...[
            r.type,
            r.style,
            r.obtain,
            r.season,
            r.variation,
            ...r.tags,
            ...(r.regions || []),
          ].flatMap((v) => i18n.terms(v)),
        ].join(" "),
      ),
    ]),
  );
  let smartMatches = new Map(),
    legacyMode = false;
  const queryWords = () =>
    normalizeSearch(state.q).split(/\s+/).filter(Boolean);
  function matchedNickname(r) {
    const entry = aliasById.get(r.id);
    if (!entry) return "";
    const words = queryWords();
    return (
      entry.aliases.find((alias) =>
        words.some((word) => aliasForms(alias).includes(word)),
      ) || ""
    );
  }
  function searchRank(r) {
    const exact = normalizeSearch(state.q);
    return (
      (i18n.names(r).some((name) => normalizeSearch(name) === exact)
        ? 400
        : aliasById.get(r.id)?.searchTerms.includes(exact)
          ? 300
          : matchedNickname(r)
            ? 200
            : 0) + (r.variant ? 0 : 1)
    );
  }
  function aliasNotice(rows) {
    const entries = [
      ...new Map(
        rows
          .filter((r) => matchedNickname(r))
          .map((r) => [aliasById.get(r.id).outfitId, aliasById.get(r.id)]),
      ).values(),
    ];
    if (!entries.length) return "";
    return (
      '<aside class="alias-notice" aria-label="昵称匹配说明"><span class="alias-spark" aria-hidden="true">✧</span><div><strong>认出这个昵称了</strong><p>' +
      entries
        .map(
          (e) =>
            '<span data-no-translate lang="zh-CN">' +
            esc(i18n.nickname(matchedNickname(byId.get(e.outfitId)))) +
            '</span> → <button class="alias-link" data-detail="' +
            e.outfitId +
            '">' +
            esc(recordName(byId.get(e.outfitId))) +
            "</button>",
        )
        .join("；") +
      "</p><small>" +
      (entries.length > 1 ? "找到多个相关套装，可查看详情确认；" : "") +
      "昵称适用于整套及其进化形态，详情中可查看出处。</small></div></aside>"
    );
  }
  function nicknameDetails(r) {
    const entry = aliasById.get(r.id);
    if (!entry) return "";
    return (
      '<section class="nickname-details"><h3>玩家昵称</h3><div class="nickname-tags">' +
      entry.aliases
        .map(
          (a) =>
            '<button class="chip" data-quick="' +
            esc(a) +
            '">' +
            esc(i18n.nickname(a)) +
            "</button>",
        )
        .join("") +
      '</div><p class="subtle">社区称呼 · 同时支持短称、“套”和“套装”写法。' +
      (r.variant ? "此形态沿用原色套装的昵称。" : "") +
      "</p><details><summary>昵称出处 · " +
      entry.sources.length +
      " 条</summary><ul>" +
      entry.sources
        .map(
          (s) =>
            "<li>" +
            external(s.url, esc(s.platform + " · " + s.title)) +
            "<small>" +
            esc(s.aliases.join("、")) +
            (s.note ? " · " + esc(s.note) : "") +
            "</small></li>",
        )
        .join("") +
      "</ul><small>核对日期：" +
      esc(aliasCatalog.verifiedAt) +
      "</small></details></section>"
    );
  }
  function nicknameGuide() {
    return (
      '<div class="nickname-guide"><span>也可以搜玩家昵称</span>' +
      ["神女套", "镜子套", "圣女套", "精灵套", "白龙套"]
        .map(
          (a) =>
            '<button type="button" class="chip" data-nickname="' +
            a +
            '">' +
            esc(i18n.nickname(a)) +
            "</button>",
        )
        .join("") +
      "<small>已收录 " +
      aliasCatalog.entries.length +
      " 套 · 详情可查出处</small></div>"
    );
  }

  const star = (r) => (r.star ? "★".repeat(Math.min(5, r.star)) : "");
  function nav() {
    const sep = '<div class="nav-separator"></div>';
    $("#navigation").innerHTML = navs
      .map(
        (k, i) =>
          (i === 4 || i === 7 ? sep : "") +
          `<button data-nav="${k}" class="nav-link ${state.route === k ? "active" : ""}" ${state.route === k ? 'aria-current="page"' : ""}><span class="nav-icon" aria-hidden="true">${icons[k]}</span>${kinds[k]}</button>`,
      )
      .join("");
    $("#breadcrumb").textContent = kinds[state.route];
    $("#saved-count").textContent = saved.size;
    document.title = kinds[state.route] + " · 奇迹旅册";
  }
  function navigate(route, q = "") {
    $("#global-query").value = route === "search" ? q : "";
    if (!kinds[route]) route = "outfits";
    const region = state.region;
    state = { ...defaultState(), route, q, region };
    if (route === "search") state.variants = true;
    location.hash = route + (q ? "?q=" + encodeURIComponent(q) : "");
    render();
    window.scrollTo(0, 0);
    $(".sidebar").classList.remove("open");
  }
  function parseHash() {
    const [route, query] = location.hash.slice(1).split("?");
    const q = new URLSearchParams(query || "").get("q") || "";
    if (route && kinds[route] && (state.route !== route || state.q !== q)) {
      $("#global-query").value = route === "search" ? q : "";
      state = { ...defaultState(), route, q };
      if (route === "search") state.variants = true;
      render();
    }
  }
  function hero() {
    return `<section class="hero"><span class="hero-image-fallback" aria-hidden="true">✧</span><img class="hero-photo" src="${esc(asset("assets/hero.jpg"))}" alt="暖暖与大喵眺望奇迹大陆"><div class="hero-copy"><div class="eyebrow">INFINITY NIKKI · MIRALAND ARCHIVE</div><h1>把奇迹，收进你的旅册</h1><p>从一件心动的衣装，找到下一段冒险。</p><div class="hero-shortcuts"><button class="pill-link" data-quick="心愿金蔷薇"><span data-no-translate>✧ ${esc(recordName(byId.get("o10062")))}</span></button><button class="pill-link" data-nav="map">⌖ 采集去哪儿</button><button class="pill-link" data-nav="guides">冒险指南</button></div></div><span class="hero-sign">© INFOLD GAMES / PAPERGAMES</span></section><section class="stats" aria-label="实际收录统计">${[
      ["outfits", "套装记录 · 含进化"],
      ["clothing", "服装部件 · 含进化"],
      ["materials", "材料与其他道具"],
      ["eurekas", "祝福闪光"],
    ]
      .map(
        ([k, label]) =>
          `<button class="stat" data-nav="${k}"><span class="stat-icon">${icons[k]}</span><span><strong>${num(count(k))}</strong><small>${label}</small></span></button>`,
      )
      .join("")}</section>`;
  }
  function section(title, sub = "", en = "") {
    return `<div class="section-head"><div><h2>${esc(title)}${en ? `<span>${en}</span>` : ""}</h2>${sub ? `<p>${esc(sub)}</p>` : ""}</div><span class="source-chip">${esc(data.version)} · ${i18n.t("原始基线")} ${esc(data.date)}</span></div>`;
  }
  function chip(key, v, label) {
    return `<button class="chip ${String(state[key]) === String(v) ? "active" : ""}" data-filter="${key}" data-value="${esc(v)}" aria-pressed="${String(state[key]) === String(v)}">${label}</button>`;
  }
  function catalogBase() {
    return records.filter(
      (r) =>
        state.route === "search" ||
        (state.route === "favorites"
          ? saved.has(r.id) && (!state.favKind || r.kind === state.favKind)
          : r.kind === state.route),
    );
  }
  function filters() {
    const base = catalogBase(),
      isMat = state.route === "materials",
      isOther = ["materials", "eurekas", "favorites", "search"].includes(
        state.route,
      );
    const types = [...new Set(base.map((r) => r.type).filter(Boolean))].sort(
      (a, b) => a.localeCompare(b, "zh"),
    );
    const obtain = [...new Set(base.map((r) => r.obtain).filter(Boolean))]
      .filter((x) => x.length < 32)
      .sort((a, b) => a.localeCompare(b, "zh"));
    return `<section class="filters" aria-label="图鉴筛选"><div class="filter-row"><span class="filter-label">品质</span>${chip("star", "", "全部")}${[
      5, 4, 3, 2, 1,
    ]
      .filter((n) => base.some((r) => r.star === n))
      .map((n) => chip("star", n, n + " 星"))
      .join(
        "",
      )}<button class="text-button reset" data-action="reset">重置筛选 ↺</button></div>${!isMat ? `<div class="filter-row"><span class="filter-label">风格</span>${chip("style", "", "全部")}${styles.map((x) => chip("style", x, x)).join("")}</div>` : ""}<div class="filter-row"><input class="local-search" id="local-query" value="${esc(state.q)}" placeholder="${isMat ? "搜索中文 / 英文名称…" : ["outfits", "search", "favorites"].includes(state.route) ? "搜索正式名称、玩家昵称、标签…" : "搜索名称、标签、获取途径…"}" aria-label="筛选当前图鉴"><select data-select="type" aria-label="筛选分类"><option value="">全部分类</option>${types.map((x) => `<option ${state.type === x ? "selected" : ""} value="${esc(x)}">${esc(x)}</option>`).join("")}</select>${!isMat ? `<select data-select="obtain" aria-label="筛选获取途径"><option value="">全部获取途径</option>${obtain.map((x) => `<option ${state.obtain === x ? "selected" : ""} value="${esc(x)}">${esc(x)}</option>`).join("")}</select>` : ""}${!isOther ? `<label class="checkbox-label"><input type="checkbox" id="variants" ${state.variants ? "checked" : ""}>包含进化形态</label>` : ""}${isMat ? `<label class="checkbox-label"><input type="checkbox" id="localized" ${state.localized ? "checked" : ""}>仅已核实中文名</label>` : ""}</div></section>`;
  }
  function getResults() {
    let list = catalogBase();
    smartMatches.clear();
    if (!legacyMode && normalizeSearch(state.q) && window.NikkiSmartSearch) {
      const scope = [
          "outfits",
          "clothing",
          "materials",
          "eurekas",
          "makeups",
        ].includes(state.route)
          ? state.route
          : undefined,
        hits = NikkiSmartSearch.search(state.q, {
          kind: scope,
          rarity: state.star,
          style: state.style,
          type: state.type,
          obtain: state.obtain,
          base:
            !state.variants && ["outfits", "clothing"].includes(state.route),
        });
      smartMatches = new Map(hits.map((h, i) => [h.id, { ...h, rank: i }]));
      list = list.filter(
        (r) =>
          smartMatches.has(r.id) &&
          (!state.star || r.star === +state.star) &&
          (!state.style || r.style === state.style) &&
          (!state.type || r.type === state.type) &&
          (!state.obtain || r.obtain === state.obtain) &&
          (state.variants ||
            ["search", "favorites", "materials", "eurekas"].includes(
              state.route,
            ) ||
            !r.variant) &&
          (!state.localized || r.localized),
      );
      if (state.sort === "name")
        list.sort((a, b) =>
          recordName(a).localeCompare(recordName(b), i18n.locale),
        );
      else if (state.sort === "star") list.sort((a, b) => b.star - a.star);
      else
        list.sort(
          (a, b) => smartMatches.get(a.id).rank - smartMatches.get(b.id).rank,
        );
      return list;
    }
    const words = queryWords();
    list = list.filter(
      (r) =>
        (!state.star || r.star === +state.star) &&
        (!state.style || r.style === state.style) &&
        (!state.type || r.type === state.type) &&
        (!state.obtain || r.obtain === state.obtain) &&
        (state.variants ||
          ["search", "favorites", "materials", "eurekas"].includes(
            state.route,
          ) ||
          !r.variant) &&
        (!state.localized || r.localized) &&
        words.every(
          (w) =>
            searchText.get(r.id).includes(w) ||
            aliasById.get(r.id)?.searchTerms.includes(w),
        ),
    );
    if (state.sort === "name")
      list.sort((a, b) =>
        recordName(a).localeCompare(recordName(b), i18n.locale),
      );
    else if (state.sort === "star") list.sort((a, b) => b.star - a.star);
    else if (normalizeSearch(state.q))
      list.sort((a, b) => searchRank(b) - searchRank(a));
    else if (
      state.route === "outfits" &&
      !state.q &&
      !state.star &&
      !state.style &&
      !state.type
    ) {
      const featured = ["o10062", "o10165", "o10294", "o10001", "o10048"];
      list.sort((a, b) =>
        (featured.includes(a.id) ? featured.indexOf(a.id) : -1) === -1
          ? featured.includes(b.id)
            ? 1
            : 0
          : featured.includes(b.id)
            ? featured.indexOf(a.id) - featured.indexOf(b.id)
            : -1,
      );
    } else if (state.route === "materials")
      list.sort(
        (a, b) =>
          Number(!!b.regions?.length) - Number(!!a.regions?.length) ||
          Number(!!b.localized) - Number(!!a.localized),
      );
    return list;
  }
  function card(r) {
    return `<article class="card kind-${r.kind}"><button class="favorite ${saved.has(r.id) ? "saved" : ""}" data-save="${r.id}" aria-label="${saved.has(r.id) ? "取消收藏" : "收藏"}${esc(recordName(r))}" aria-pressed="${saved.has(r.id)}">${saved.has(r.id) ? "♥" : "♡"}</button><button class="card-main" data-detail="${r.id}" aria-label="查看${esc(recordName(r))}详情"><div class="card-art">${pic(r)}${r.kind === "outfits" ? `<span class="card-badge">${esc(r.type === "套装" ? (r.variant ? "进化形态" : "风格套装") : r.type)}</span>` : ""}<span class="stars card-stars" aria-label="${r.star}星">${star(r)}</span></div><div class="card-info"><h3 class="card-title">${esc(recordName(r))}</h3>${matchedNickname(r) ? `<div class="nickname-match">昵称 · <span data-no-translate lang="zh-CN">${esc(i18n.nickname(matchedNickname(r)))}</span></div>` : ""}${smartMatches.has(r.id) ? `<div class="smart-match" data-no-translate>${esc(NikkiSmartSearch.explain(smartMatches.get(r.id)))}</div>` : ""}<div class="card-sub">${esc(r.kind === "materials" ? (r.localized ? r.en : "中文名待核实") : r.kind === "eurekas" ? r.type + " · " + (r.colors?.length || 1) + " 种颜色" : r.obtain || r.type)}</div><div class="card-tags">${r.style ? `<span class="tag" data-style="${r.style}">${r.style}</span>` : ""}<span class="tag">${esc(r.tags[0] || r.type)}</span>${r.kind === "outfits" ? `<span class="card-count">${r.related.length} 件部件</span>` : owned.has(r.id) ? '<span class="card-count">已拥有 ✓</span>' : ""}</div></div></button></article>`;
  }
  function resultArea() {
    const rows = getResults(),
      size = 24,
      pages = Math.max(1, Math.ceil(rows.length / size));
    state.page = Math.min(state.page, pages);
    return `${aliasNotice(rows)}${state.q && window.NikkiSmartSearch?.visualQuery(state.q) ? `<p class="smart-coverage">${i18n.t("颜色和元素标签仅覆盖部分部件；未匹配不表示游戏不存在此类服装。")}</p>` : ""}<div class="result-toolbar"><span>找到 <b>${num(rows.length)}</b> 条记录 ${state.route === "outfits" && !state.variants ? "· 当前显示原色" : ""}</span><div class="toolbar-right"><select aria-label="排序方式" data-select="sort">${[
      ["default", normalizeSearch(state.q) ? "智能匹配" : "图鉴顺序"],
      ["star", "品质优先"],
      ["name", "名称排序"],
    ]
      .map(
        ([v, l]) =>
          `<option value="${v}" ${state.sort === v ? "selected" : ""}>${l}</option>`,
      )
      .join(
        "",
      )}</select><button class="view-toggle" data-action="layout" aria-label="切换${state.layout === "grid" ? "列表" : "网格"}视图">${state.layout === "grid" ? "☷" : "▦"}</button></div></div><div class="catalog ${state.layout === "list" ? "list" : ""}">${
      rows.length
        ? rows
            .slice((state.page - 1) * size, state.page * size)
            .map(card)
            .join("")
        : `<div class="empty"><b>✧</b><h3>${state.route === "favorites" && !saved.size ? "你的旅册，等待第一份心动" : "暂时没有找到相符的记录"}</h3><p>${state.route === "favorites" && !saved.size ? "点击图鉴中的爱心，就能把喜欢的衣装收在这里。" : "试试正式名称，或清除部分筛选条件；社区昵称仍在持续补充。"}</p><button class="secondary-button" data-action="reset">清除筛选</button></div>`
    }</div><div class="pagination" aria-label="结果分页"><button data-page="${state.page - 1}" ${state.page === 1 ? "disabled" : ""} aria-label="上一页">‹</button>${[
      ...new Set([1, state.page - 1, state.page, state.page + 1, pages]),
    ]
      .filter((n) => n >= 1 && n <= pages)
      .sort((a, b) => a - b)
      .map(
        (p, i, a) =>
          (i && p - a[i - 1] > 1 ? "<span>…</span>" : "") +
          `<button data-page="${p}" class="${p === state.page ? "active" : ""}" ${p === state.page ? 'aria-current="page"' : ""}>${p}</button>`,
      )
      .join(
        "",
      )}<button data-page="${state.page + 1}" ${state.page === pages ? "disabled" : ""} aria-label="下一页">›</button><span>第 ${state.page} / ${pages} 页</span></div>`;
  }
  function catalogView() {
    let before = state.route === "outfits" ? hero() : "";
    const descriptions = {
      outfits: "寻找心动的衣装，也寻找它背后的奇迹。",
      clothing: "从发型到饰品，按风格与获取途径找到每一件衣装。",
      materials: "材料、货币与探索道具；支持中英文名称检索。",
      makeups: "查找全妆与妆容部件。",
      eurekas: "按风格、品质与装备位置查找祝福闪光。",
      search: "正式名称、玩家昵称都能查；可用空格组合昵称与风格等关键词。",
      favorites: "收藏和拥有状态仅保存在当前浏览器，可导出备份。",
    };
    before += section(
      kinds[state.route],
      descriptions[state.route],
      state.route === "outfits" ? "OUTFIT COLLECTION" : "",
    );
    if (state.route === "materials")
      before +=
        '<div class="notice">材料索引保留来源中的英文名称。已核实的常用材料优先显示；采集区域为已整理资料，不代表全地图全部点位。</div>';
    if (state.route === "favorites")
      before += `<div class="favorite-tools"><button class="secondary-button" data-action="export">↓ 导出收藏备份</button><label class="secondary-button" for="import-file">↑ 导入备份</label><input id="import-file" type="file" accept="application/json,.json" hidden><span class="subtle">已收藏 ${saved.size} 条 · 标记拥有 ${owned.size} 条</span></div><div class="filter-row">${chip("favKind", "", "全部")}${["outfits", "clothing", "materials", "makeups", "eurekas"].map((k) => chip("favKind", k, kinds[k])).join("")}</div>`;
    if (!storageOkay && state.route === "favorites")
      before +=
        '<div class="notice">当前浏览器未开放本地存储，请导出备份，以免关闭页面后丢失记录。</div>';
    return (
      before +
      filters() +
      (["outfits", "search"].includes(state.route) ? nicknameGuide() : "") +
      '<div id="results">' +
      resultArea() +
      "</div>"
    );
  }
  const regions = [
    "花愿镇",
    "微风绿野",
    "小石树田村",
    "石树田无人区",
    "祈愿树林",
    "纪念山地",
    "花焰群岛",
    "丹青屿",
    "伊赞之土",
  ];
  function mapView() {
    const list = records.filter(
      (r) => r.kind === "materials" && r.regions?.includes(state.region),
    );
    return (
      section(
        "地图与采集",
        "先选区域，再找材料。精确点位可前往社区互动地图。",
        "FIELD NOTES",
      ) +
      `<div class="map-layout"><aside class="region-menu"><h3>探索区域</h3>${regions.map((r) => `<button data-region="${r}" class="${state.region === r ? "active" : ""}">⌖　${r}</button>`).join("")}</aside><section class="map-panel">${window.NikkiRegions?.render(state.region) || '<div class="map-banner"><h2>区域背景待载入</h2></div>'}<div class="map-body"><div class="map-actions">${external("https://map.caimogu.cc/wxnn.html", "打开中文互动地图", "primary-button")}${external("https://infinitynikki.th.gl/", "打开国际服地图", "secondary-button")}<button class="secondary-button" data-action="embed-map">在本页查看地图</button></div><div id="map-embed"></div><section class="map-advanced"><h3>材料采集准备</h3>${window.NikkiAdvanced?.routePanel() || ""}</section><p class="subtle">精确坐标与点位收集状态由地图来源提供；本站收藏不与游戏账户同步。</p><h3>已整理的区域材料 <span class="subtle">${list.length} 种</span></h3>${list.length ? `<div class="material-list">${list.map((r) => `<button class="material-row" data-detail="${r.id}">${pic(r)}<span><b>${esc(recordName(r))}</b><small>${r.type} · 查看采集说明</small></span></button>`).join("")}</div>` : '<div class="empty"><b>⌖</b><h3>这个区域的材料分布待补充</h3><p>可通过上方地图入口选择对应地区。本站尚未核实该区材料，不显示推测点位。</p></div>'}<div class="notice">区域资料主要来自 1.0 时期公开攻略，可能未覆盖后续新增产地。点击材料可查看对应来源和原始资料日期。</div></div></section></div>`
    );
  }
  const guideData = [
    [
      "解锁探索能力",
      "沿主线推进，在无限之心查看能力套装与解锁条件。漂浮、清洁、捕虫、钓鱼等能力是探索与材料收集的重要入口。",
      "https://infinity-nikki.fandom.com/wiki/Ability_Outfit",
      "能力套装资料",
    ],
    [
      "先找设计图，再收集材料",
      "从服装详情跳转到来源查看制作配方。收集材料前先确认名称、区域和能力条件，精粹与普通材料需要区分。",
      "https://gongeo.us/zh/items",
      "查找部件与设计图",
    ],
    [
      "搭配挑战与养成",
      "根据关卡风格与标签选择衣装，结合祝福闪光补足分数。相同风格的部件也会有不同数值，具体等级评分以来源和游戏内数据为准。",
      "https://gongeo.us/zh/tierlist",
      "查看搭配资料",
    ],
    [
      "奇想星与灵感露珠",
      "打开互动地图，选择奇想星、灵感露珠、宝箱等分类。洞窟、地面和高处可能重叠，请结合点位说明寻找。",
      "https://map.caimogu.cc/wxnn.html",
      "进入收集地图",
    ],
    [
      "限时共鸣与活动",
      "图鉴中的获取途径是历史来源，不表示对应共鸣或活动现在正在开放。当前活动时间与规则请查看官方公告。",
      "https://infinitynikki.nuanpaper.com/",
      "查看官方资讯",
    ],
    [
      "珍稀材料采集",
      "部分材料需要等待昼夜变化、动物上岸，或先捕虫再清洁。首次获取后，可在游戏地图中查看该材料的追踪功能。",
      "https://xin.18183.com/wiki/4453583.html",
      "查看珍稀材料指南",
    ],
  ];
  function guidesView() {
    return (
      section("冒险指南", "把图鉴、制作和探索连在一起。", "TRAVEL COMPANION") +
      `<div class="guide-grid">${guideData.map(([title, body, url, label], i) => `<article class="guide-card"><div class="guide-number">0${i + 1}</div><h2>${title}</h2><p>${body}</p>${external(url, label)}</article>`).join("")}</div>`
    );
  }
  function sourcesView() {
    const localized = records.filter(
      (r) => r.kind === "materials" && r.localized,
    ).length;
    return (
      section(
        "资料来源与收录说明",
        "让每一条记录，都有迹可循。",
        "SOURCES & COVERAGE",
      ) +
      `<div class="source-card"><h2>本次收录范围</h2><p>整理日期：${data.date}。服装目录来源版本标识为 ${data.version}，目录生成日期为 ${data.catalogDate.slice(0, 10)}。这是可离线查询的资料快照，并非实时连接游戏的数据库。</p><table class="source-table"><thead><tr><th>图鉴</th><th>记录数</th><th>说明</th></tr></thead><tbody>${["outfits", "clothing", "makeups", "eurekas", "materials"].map((k) => `<tr><td>${kinds[k]}</td><td>${num(count(k))}</td><td>${k === "materials" ? `${localized} 条已核实中文名，其余保留英文；包括材料之外的道具` : k === "eurekas" ? "按头部、手部、脚部记录" : "含进化或变体，不能视为独立原色数量"}</td></tr>`).join("")}</tbody></table></div><div class="source-card"><h2>来源与查证入口</h2><ul><li>${external("https://gongeo.us/zh/items", "gongeo.us 暖暖共鸣录")}：公开服装目录、中文名称、品质、风格、获取途径与套装关联。</li><li>${external("https://wiki.biligame.com/wxnn/套装图鉴", "BWIKI · 满天星攻略组")}：套装类别、部分实装与服装图鉴信息。</li><li>${external("https://www.infinity-nikki.com/items/", "Infinity Nikki DB")}：材料及道具名称、分类和图标索引。</li><li>${external("https://www.gamersky.com/handbook/202412/1855245.shtml", "游民星空植物图鉴")}、${external("https://xin.18183.com/wiki/4453583.html", "18183 珍稀材料指南")}：已注明日期的区域采集资料。</li><li>${external("https://map.caimogu.cc/wxnn.html", "踩蘑菇互动地图")}、${external("https://infinitynikki.th.gl/", "The Hidden Gaming Lair 地图")}：第三方精确点位。本站不自行生成未核实坐标。</li></ul></div><div class="source-card"><h2>玩家昵称检索</h2><p>已整理 ${aliasCatalog.entries.length} 套服装的社区昵称，核对日期 ${esc(aliasCatalog.verifiedAt)}。来源包括哔哩哔哩、抖音、TapTap 及 BWIKI 的公开页面；点击套装详情中的“昵称出处”可逐条查阅。</p><p>支持短称及“套／套装”结尾，正式名称始终保留。同一昵称若对应多个套装，会展示相关候选。昵称库是人工核对的快照，不会实时抓取社交平台；未收录的称呼可改用正式名称查询。</p><details class="nickname-directory"><summary>查看已收录的 ${aliasCatalog.entries.length} 套昵称</summary><div>${aliasCatalog.entries.map((e) => `<p><button class="alias-link" data-detail="${e.outfitId}">${esc(recordName(byId.get(e.outfitId)))}</button><span>${esc(e.aliases.map(i18n.nickname).join(" / "))}</span></p>`).join("")}</div></details></div><div class="source-card"><h2>哪些信息仍需要查阅来源</h2><p>部件的完整等级评分、全部制作配方与数量、所有语言的材料对照，以及全版本精确采集坐标尚未完整纳入本站。条目详情提供原始来源入口；未核实的字段保留为空，不补写推测值。部分名称相同的记录代表不同形态。</p><p>祝福闪光的全部部位及颜色图片已内置，支持离线查看；其他图片从原资料图床加载，个别资源可能失效或受网络限制。无图片时仍可查询名称与属性。后续更新需重新整理数据，不会自动同步。</p></div><div class="source-card"><h2>图片与内容归属</h2><p>这是非官方玩家资料站，与叠纸游戏、Infold Games 无隶属关系。游戏名称、角色与美术版权归原权利人所有。页头图片来自 ${external("https://infinitynikki.infoldgames.com/en/news/77", "无限暖暖官网")}；图鉴图片来自各条目注明的资料源。请勿将本站图片视为可自由商用素材。</p><p>Infinity Nikki DB 标注其 Wiki 内容基于 ${external("https://creativecommons.org/licenses/by-sa/3.0/", "CC BY-SA")}。本网站对这部分数据的整理与改编遵循相同许可，详细出处保留在每条记录中。</p></div><div class="source-card"><h2>收藏与隐私</h2><p>收藏及“已拥有”标记只存于当前浏览器，不上传、不关联游戏账号。清除浏览器数据或更换设备后不会自动恢复，可在“我的收藏”中导出和导入备份。</p></div>`
    );
  }
  function render() {
    nav();
    if (state.route === "search_eval" && !window.NikkiSearchEval) {
      const failed = window.NikkiModules.status("search_eval") === "error";
      $("#view").innerHTML = failed
        ? '<section class="empty" role="alert"><h1>' +
          i18n.t("评估资料暂未能载入") +
          "</h1><p>" +
          i18n.t("请完整解压网站文件后重试。") +
          '</p><button class="secondary-button" data-retry-eval>' +
          i18n.t("重试") +
          "</button></section>"
        : '<section class="module-loading" role="status"><span class="loading-star">✧</span><h1>' +
          i18n.t("搜索评估") +
          "</h1><p>" +
          i18n.t("评估资料载入中…") +
          "</p></section>";
      if (!failed)
        window.NikkiModules.load("search_eval")
          .then(() => {
            if (state.route === "search_eval") render();
          })
          .catch(() => {
            if (state.route === "search_eval") render();
          });
      return;
    }
    $("#view").innerHTML =
      state.route === "map"
        ? mapView()
        : state.route === "guides"
          ? guidesView()
          : state.route === "sources"
            ? sourcesView()
            : state.route === "research"
              ? window.NikkiResearch.render()
              : state.route === "advanced"
                ? window.NikkiAdvanced.render()
                : state.route === "search_eval"
                  ? window.NikkiSearchEval.render()
                  : state.route === "planning"
                    ? window.NikkiPlanning.render()
                    : state.route === "wardrobe"
                      ? window.NikkiWardrobe.render()
                      : state.route === "preferences"
                        ? window.NikkiPreferences.render()
                        : state.route === "analytics"
                          ? window.NikkiAnalytics.render()
                          : state.route === "quality"
                            ? window.NikkiQuality.render()
                            : catalogView();
    if (state.route === "analytics")
      $("#view").insertAdjacentHTML(
        "beforeend",
        '<div class="adv-actions"><button class="secondary-button" data-nav="research">' +
          i18n.t("探索关联、聚类与评估不确定性") +
          " ↗</button></div>",
      );
    i18n.localize();
  }
  function updateLocalQuery(query) {
    state.q = query;
    state.page = 1;
    history.replaceState(
      null,
      "",
      "#" + state.route + (query ? "?q=" + encodeURIComponent(query) : ""),
    );
    if (state.route === "search") $("#global-query").value = query;
    refreshResults();
  }
  function refreshResults() {
    if ($("#results")) {
      $("#results").innerHTML = resultArea();
      i18n.localize($("#results"));
    }
  }
  function smartFeatureDetails(r) {
    const extra = window.NIKKI_SMART_SEARCH_DATA?.supplement[r.id];
    if (!extra?.evidence?.length) return "";
    const colors = extra.colors.map((c) => NikkiImprovedSearch.COLORS[c] || c);
    return (
      '<section class="smart-feature-details"><h3>' +
      i18n.t("检索标签与来源") +
      "</h3>" +
      (colors.length
        ? "<p>" +
          i18n.t("社区颜色") +
          "：" +
          colors.map(i18n.t).map(esc).join(" · ") +
          "</p>"
        : "") +
      (extra.verified_elements.length
        ? "<p>" +
          i18n.t("明确描述元素") +
          "：" +
          extra.verified_elements.map(i18n.t).map(esc).join(" · ") +
          "</p>"
        : "") +
      (extra.description_mentions.length
        ? "<p>" +
          i18n.t("描述提及，未作为视觉图案验证") +
          "：" +
          extra.description_mentions.map(i18n.t).map(esc).join(" · ") +
          "</p>"
        : "") +
      "<small>" +
      i18n.t("这些补充标签来自社区资料，不是游戏官方颜色字段。") +
      "</small><p>" +
      [...new Set(extra.evidence.map((e) => e.source_url))]
        .map((u) => external(u, i18n.t("标签来源")))
        .join(" · ") +
      "</p></section>"
    );
  }
  function detail(id) {
    const r = byId.get(id);
    if (!r) return;
    const memberAudit = window.NIKKI_ANALYTICS_DATA.outfits.find(
      (o) => o.id === id,
    );
    const effective = window.NikkiWardrobeModel.effectiveOwned(
      window.NIKKI_ANALYTICS_DATA,
      { owned: [...owned] },
    ).effective;
    const related = r.related.map((x) => byId.get(x)).filter(Boolean),
      variations = (r.group || []).map((x) => byId.get(x)).filter(Boolean),
      got = related.filter((x) => effective.has(x.id)).length;
    const previewColor =
      r.colors?.find((c) => c.id === selectedEurekaColors.get(id)) ||
      r.colors?.[0];
    const props = [
      ["分类", r.type],
      ["风格", r.style],
      ["标签", r.tags.join(" · ")],
      ["获取途径", r.obtain || "来源暂未提供"],
      ["进化", r.variation],
      ["服装图鉴", r.season],
      ["实装记录", r.release],
      ["采集区域", r.regions?.join("、")],
      ["资料日期", r.regionDate],
    ];
    $("#detail-content").innerHTML =
      `<div class="detail-top"><div class="detail-image ${r.kind === "eurekas" ? "eureka-detail-image" : ""}">${pic(previewColor ? { ...r, image: previewColor.image, name: r.name + " · " + previewColor.name } : r)}</div><div class="detail-text"><div class="eyebrow">${kinds[r.kind]} · ${r.gameId || "MIRALAND"}</div><h2 id="detail-title">${esc(recordName(r))}</h2><div class="en">${esc(r.en)}</div><div class="stars">${star(r)}</div><dl class="detail-props">${props
        .filter(([, v]) => v)
        .map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`)
        .join(
          "",
        )}</dl>${r.colors?.length ? `<fieldset class="eureka-color-picker"><legend>颜色预览 · <span id="eureka-color-name">${esc(previewColor.name)}</span></legend><div class="eureka-colors">${r.colors.map((c) => `<button type="button" class="eureka-color ${c.id === previewColor.id ? "active" : ""}" data-eureka-color="${c.id}" aria-label="预览${esc(c.name)}${esc(recordName(r))}" aria-pressed="${c.id === previewColor.id}">${pic({ name: r.name + " · " + c.name, image: c.image })}<span>${esc(c.name)}</span></button>`).join("")}</div></fieldset>` : ""}${memberAudit?.member_count_status === "mismatch" ? `<p class="notice">${i18n.t("部件数量来源不一致，完整性待核实。")} ${r.related.length} / ${memberAudit.member_count_expected} · ${external(memberAudit.member_count_source_url, "核对来源")}</p>` : ""}${nicknameDetails(r)}${window.NikkiSmartSearch ? smartFeatureDetails(r) : ""}${r.translationNote ? `<p class="subtle">${esc(r.translationNote)}</p>` : ""}<div class="detail-actions"><button class="primary-button" data-save="${r.id}" data-detail-refresh="true">${saved.has(r.id) ? "♥ 已收藏" : "♡ 收藏条目"}</button><button class="secondary-button" data-own="${r.id}">${owned.has(r.id) ? "✓ 已拥有" : "＋ 标记拥有"}</button></div>${r.kind === "materials" ? `<div class="map-actions"><button class="secondary-button" data-material-map="${r.id}">⌖ 查看采集区域</button></div>` : ""}</div></div>${related.length ? `<section class="detail-bottom"><h3>${r.kind === "outfits" ? "套装部件" : r.kind === "materials" ? "相关套装（部分用途）" : "所属套装"}</h3>${r.kind === "outfits" ? `<div class="progress-line"><span>已拥有 ${got} / ${related.length}</span><progress max="${related.length}" value="${got}">${got}</progress></div>` : ""}<div class="related-grid">${related.map((x) => `<button class="related" data-detail="${x.id}">${pic(x)}<span>${esc(recordName(x))}${owned.has(x.id) ? " ✓" : ""}</span></button>`).join("")}</div></section>` : ""}${variations.length > 1 ? `<section class="detail-bottom"><h3>原色与进化形态</h3><div class="filter-row">${variations.map((x) => `<button class="chip ${x.id === r.id ? "active" : ""}" data-detail="${x.id}">${esc(recordName(x))}</button>`).join("")}</div></section>` : ""}${window.NikkiAdvanced?.recommendationDetails(r) || ""}<div class="detail-source">${external(r.source, r.kind === "materials" ? "原始道具资料" : r.kind === "eurekas" ? "祝福闪光资料与图片来源" : "制作配方与完整数值")}${r.mapSource ? "　·　" + external(r.mapSource, "采集说明来源") : ""}${r.obtainSource ? "　·　" + external(r.obtainSource, "获取说明来源") : ""}<br>${r.kind === "eurekas" ? "图片已按部位与颜色核对并内置，可离线查看。<br>" : ""}快照整理于 ${data.date}。获取途径可能是历史活动；当前开放状态请以游戏公告为准。</div>`;
    $("#detail").dataset.record = id;
    if (!$("#detail").open) $("#detail").showModal();
    $("#detail").scrollTop = 0;
    i18n.localize($("#detail"));
  }
  function toggleSave(id) {
    if (!byId.has(id)) return;
    saved.has(id) ? saved.delete(id) : saved.add(id);
    persist();
    $("#saved-count").textContent = saved.size;
    document.querySelectorAll(`[data-save="${id}"]`).forEach((b) => {
      b.classList.toggle("saved", saved.has(id));
      b.setAttribute("aria-pressed", saved.has(id));
      b.innerHTML = b.dataset.detailRefresh
        ? saved.has(id)
          ? "♥ 已收藏"
          : "♡ 收藏条目"
        : saved.has(id)
          ? "♥"
          : "♡";
      b.setAttribute(
        "aria-label",
        (saved.has(id) ? "取消收藏" : "收藏") + byId.get(id).name,
      );
    });
    if (state.route === "favorites") render();
    toast(saved.has(id) ? "已收进你的旅册" : "已取消收藏");
  }
  document.addEventListener(
    "error",
    (e) => {
      if (e.target.tagName === "IMG" && !e.target.dataset.regionBanner) {
        e.target.parentElement.classList.add("image-failed");
        const ref = e.target.getAttribute("src") || "";
        console.warn(
          "[CatalogImage] Image unavailable:",
          e.target.alt,
          ref.startsWith("data:") ? "embedded image" : ref,
        );
      }
    },
    true,
  );
  document.addEventListener(
    "load",
    (e) => {
      if (
        e.target.tagName === "IMG" &&
        !e.target.dataset.regionBanner &&
        e.target.naturalWidth > 0
      )
        e.target.parentElement?.classList.remove("image-failed");
    },
    true,
  );
  document.addEventListener("click", (e) => {
    const b = e.target.closest("button,[data-nav]");
    if (!b) return;
    if (b.dataset.nav) {
      if ($("#detail").open) $("#detail").close();
      navigate(b.dataset.nav);
      return;
    }
    if (b.dataset.quick) {
      if ($("#detail").open) $("#detail").close();
      navigate("search", b.dataset.quick);
      return;
    }
    if (b.dataset.nickname) {
      $("#local-query").value = b.dataset.nickname;
      updateLocalQuery(b.dataset.nickname);
      return;
    }
    if (b.dataset.eurekaColor) {
      const r = byId.get($("#detail").dataset.record),
        color = r?.colors?.find((c) => c.id === Number(b.dataset.eurekaColor));
      if (!color) return;
      selectedEurekaColors.set(r.id, color.id);
      const box = $("#detail .detail-image");
      box.classList.remove("image-failed");
      box.innerHTML = pic({
        ...r,
        image: color.image,
        name: r.name + " · " + color.name,
      });
      $("#eureka-color-name").textContent = i18n.t(color.name);
      document.querySelectorAll("[data-eureka-color]").forEach((btn) => {
        const active = Number(btn.dataset.eurekaColor) === color.id;
        btn.classList.toggle("active", active);
        btn.setAttribute("aria-pressed", active);
      });
      return;
    }
    if (b.dataset.detail) {
      detail(b.dataset.detail);
      return;
    }
    if (b.dataset.save) {
      toggleSave(b.dataset.save);
      return;
    }
    if (b.dataset.own) {
      const id = b.dataset.own;
      owned.has(id) ? owned.delete(id) : owned.add(id);
      persist();
      detail(id);
      refreshResults();
      return;
    }
    if (b.dataset.materialMap) {
      const r = byId.get(b.dataset.materialMap);
      $("#detail").close();
      if (r.regions?.length) state.region = r.regions[0];
      navigate("map");
      return;
    }
    if (b.dataset.filter) {
      state[b.dataset.filter] = b.dataset.value;
      state.page = 1;
      render();
      return;
    }
    if (b.dataset.page) {
      state.page = +b.dataset.page;
      refreshResults();
      $("#results").scrollIntoView({ block: "start", behavior: "smooth" });
      return;
    }
    if (b.dataset.region) {
      state.region = b.dataset.region;
      render();
      return;
    }
    switch (b.dataset.action) {
      case "reset": {
        const route = state.route,
          region = state.region;
        state = {
          ...defaultState(),
          route,
          region,
          variants: route === "search",
        };
        history.replaceState(null, "", "#" + route);
        if (route === "search") $("#global-query").value = "";
        render();
        break;
      }
      case "layout":
        state.layout = state.layout === "grid" ? "list" : "grid";
        refreshResults();
        break;
      case "export": {
        const blob = new Blob(
            [
              JSON.stringify(
                {
                  format: "miraland-notes-v1",
                  date: new Date().toISOString(),
                  saved: [...saved],
                  owned: [...owned],
                },
                null,
                2,
              ),
            ],
            { type: "application/json" },
          ),
          url = URL.createObjectURL(blob),
          a = document.createElement("a");
        a.href = url;
        a.download = "奇迹旅册-收藏备份.json";
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        break;
      }
      case "embed-map":
        $("#map-embed").innerHTML =
          '<p class="subtle">地图由踩蘑菇提供。如第三方限制嵌入或加载失败，请使用上方“打开中文互动地图”。</p><iframe title="踩蘑菇无限暖暖互动地图" src="https://map.caimogu.cc/wxnn.html" loading="lazy" referrerpolicy="no-referrer" style="width:100%;height:560px;border:1px solid #e7e2ed;border-radius:8px"></iframe>';
        b.disabled = true;
        break;
    }
  });
  document.addEventListener("change", async (e) => {
    if (e.target.id === "language-select") {
      const openId = $("#detail").open ? $("#detail").dataset.record : null;
      const scroll = window.scrollY;
      if (i18n.setLocale(e.target.value)) {
        render();
        if (openId) detail(openId);
        window.scrollTo(0, scroll);
      }
      return;
    }
    if (e.target.dataset.select) {
      state[e.target.dataset.select] = e.target.value;
      state.page = 1;
      refreshResults();
    }
    if (e.target.id === "variants" || e.target.id === "localized") {
      state[e.target.id] = e.target.checked;
      state.page = 1;
      refreshResults();
    }
    if (e.target.id === "import-file") {
      const f = e.target.files?.[0];
      if (!f) return;
      if (f.size > 2e6) {
        toast("备份文件过大，请选择正确的收藏备份。");
        return;
      }
      try {
        const v = JSON.parse(await f.text());
        if (
          v.format !== "miraland-notes-v1" ||
          !Array.isArray(v.saved) ||
          !Array.isArray(v.owned) ||
          ![...v.saved, ...v.owned].every((x) => typeof x === "string")
        )
          throw Error();
        const valid = v.saved.filter((x) => byId.has(x));
        valid.forEach((x) => saved.add(x));
        v.owned.filter((x) => byId.has(x)).forEach((x) => owned.add(x));
        persist();
        render();
        toast("备份已合并，导入 " + valid.length + " 条收藏。");
      } catch {
        toast("无法读取备份，请选择本站导出的 JSON 文件。");
      }
    }
  });
  document.addEventListener("input", (e) => {
    if (e.target.id === "local-query") {
      updateLocalQuery(e.target.value);
    }
  });
  $("#global-form").addEventListener("submit", (e) => {
    e.preventDefault();
    navigate("search", $("#global-query").value.trim());
  });
  $("#menu").onclick = () => $(".sidebar").classList.toggle("open");
  $("#close-detail").onclick = () => $("#detail").close();
  $("#detail").addEventListener("click", (e) => {
    if (e.target === $("#detail")) {
      const r = $("#detail").getBoundingClientRect();
      if (
        e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom
      )
        $("#detail").close();
    }
  });
  document.addEventListener("keydown", (e) => {
    if (
      e.key === "/" &&
      !["INPUT", "TEXTAREA", "SELECT"].includes(
        document.activeElement.tagName,
      ) &&
      !$("#detail").open
    ) {
      e.preventDefault();
      $("#global-query").focus();
    }
    if (e.key === "Escape") $(".sidebar").classList.remove("open");
  });
  document.addEventListener("click", () =>
    queueMicrotask(() => i18n.localize()),
  );
  window.MiralandNotes = {
    get: () => ({ saved: [...saved], owned: [...owned], storageOkay }),
  };
  window.addEventListener("storage", (e) => {
    if (e.key !== "miraland-notes-v1" && e.key !== null) return;
    try {
      const v = JSON.parse(e.newValue || "{}");
      saved = new Set(
        (Array.isArray(v.saved) ? v.saved : []).filter((id) => byId.has(id)),
      );
      owned = new Set(
        (Array.isArray(v.owned) ? v.owned : []).filter((id) => byId.has(id)),
      );
      storageOkay = true;
      render();
      if ($("#detail").open) detail($("#detail").dataset.record);
      window.dispatchEvent(new Event("miraland-notes-changed"));
    } catch {}
  });
  window.addEventListener("hashchange", parseHash);
  parseHash();
  render();
  if (document.modelContext?.registerTool) {
    try {
      Promise.resolve(
        document.modelContext.registerTool({
          name: "search_miraland_archive",
          title: "搜索无限暖暖图鉴",
          description: "搜索资料并显示匹配结果；不修改收藏。",
          inputSchema: {
            type: "object",
            properties: { query: { type: "string" } },
            required: ["query"],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: true, untrustedContentHint: true },
          execute(input) {
            if (
              !input ||
              typeof input.query !== "string" ||
              input.query.length > 200
            )
              throw new Error("query 必须为不超过 200 字的字符串");
            navigate("search", input.query);
            const results = getResults();
            return {
              total: results.length,
              items: results.slice(0, 20).map(({ id, name, kind, source }) => ({
                id,
                name,
                kind,
                source,
              })),
            };
          },
        }),
      ).catch(() => {});
    } catch {}
  }
  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-retry-eval]")) {
      window.NikkiModules.retry("search_eval").then(render).catch(render);
    }
  });
  window.NikkiBoot?.complete();
  window.MiralandArchive = {
    openRecord(id) {
      if (!byId.has(id)) return false;
      detail(id);
      return true;
    },
    openSection(route) {
      if (!Object.hasOwn(kinds, route)) return false;
      navigate(route);
      return true;
    },
    setLanguage(locale) {
      if (!i18n.setLocale(locale)) return false;
      const id = $("#detail").open ? $("#detail").dataset.record : null;
      render();
      if (id) detail(id);
      return true;
    },
    get language() {
      return i18n.locale;
    },
    search(query) {
      navigate("search", query);
      return getResults();
    },
    searchLegacy(query) {
      legacyMode = true;
      try {
        navigate("search", query);
        return getResults();
      } finally {
        legacyMode = false;
      }
    },
    counts: Object.fromEntries(
      Object.keys(kinds)
        .filter((k) => count(k))
        .map((k) => [k, count(k)]),
    ),
  };
})();
