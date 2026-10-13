(() => {
  "use strict";
  const D = window.NIKKI_ANALYTICS_DATA,
    M = window.NikkiWardrobeModel,
    S = window.NikkiPreferencesSchema,
    I = window.NikkiI18n;
  if (!D || !M || !S) return;
  const t = (s) => I.t(s),
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
      ),
    num = (n) =>
      Number(n).toLocaleString(I.locale, { maximumFractionDigits: 1 }),
    pct = (n) => (n === null ? "—" : num(n) + "%"),
    name = (o) => I.name({ id: o.id, name: o.name });
  const raw = new Map(window.NIKKI_DATA.records.map((r) => [r.id, r])),
    setMap = new Map(D.outfits.map((o) => [o.id, o])),
    notes = () =>
      window.MiralandNotes?.get() || {
        owned: [],
        saved: [],
        storageOkay: true,
      },
    key = "miraland-public-preferences-v1";
  const metricNames = {
      preference: "喜爱支持率",
      pull_intent: "抽取意向支持率",
      approval: "外观赞同比例",
      collection_rate: "整套持有率",
      mean_completion: "平均部件完成率",
      revenue: "套装收入",
    },
    methodNames = {
      gacha: "抽卡 / 共鸣",
      shop: "商城入口",
      event: "活动",
      craft: "制作线索（设计图）",
      quest: "任务",
      explore: "探索 / 收集",
      challenge: "搭配挑战",
      home: "家园",
      other: "其他 / 待分类",
    };
  let publicData = window.NIKKI_PREFERENCES_DATA,
    localHistory = [],
    loadWarning = "",
    preview = null,
    personalFilters = { scope: "base", rarity: "", style: "" },
    groupFilters = { study_id: "", rarity: "", style: "" },
    targetId = "",
    nearPage = 1,
    seriesId = "";
  try {
    const stored = JSON.parse(localStorage.getItem(key) || "null");
    if (stored) {
      const problems = S.validate(stored.current, D);
      if (problems.length)
        loadWarning = "本地公开数据未通过校验，暂用内置资料。";
      else {
        publicData = stored.current;
        localHistory = Array.isArray(stored.history) ? stored.history : [];
      }
    }
  } catch {
    loadWarning = "本地公开数据无法读取，暂用内置资料。";
  }
  const file = (filename, text, type = "application/json") => {
    const a = document.createElement("a"),
      url = URL.createObjectURL(new Blob([text], { type }));
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  };
  const tabs = () =>
    `<div class="wd-tabs"><button data-nav="wardrobe">${t("我的衣橱")}</button><button data-nav="preferences">${t("玩家偏好")}</button><button data-nav="favorites">${t("收藏与备份")}</button></div>`;
  const head = (title, subtitle) =>
    `<header class="ana-heading"><div><span class="ana-eyebrow">MIRALAND · WARDROBE & PREFERENCES</span><h1>${t(title)}</h1><p>${t(subtitle)}</p></div><span class="wd-private">◈ ${t("个人数据仅在本地")}</span></header>${tabs()}`;
  function select(attr, label, value, choices) {
    return `<label><span>${t(label)}</span><select ${attr}>${choices.map(([v, l]) => `<option value="${esc(v)}" ${String(v) === String(value) ? "selected" : ""}>${esc(t(l))}</option>`).join("")}</select></label>`;
  }
  const basic = (prefix, f) =>
    select(`data-${prefix}-filter="rarity"`, "品质", f.rarity, [
      ["", "全部"],
      ...[5, 4, 3, 2].map((v) => [String(v), v + " 星"]),
    ]) +
    select(`data-${prefix}-filter="style"`, "风格", f.style, [
      ["", "全部"],
      ...M.styles.map((v) => [v, v]),
    ]);
  const card = (
    title,
    body,
    source = "objects + outfits + outfit_clothing + clothing",
  ) =>
    `<section class="ana-card"><h2>${t(title)}</h2>${body}<p class="ana-lineage">${t("来源表")}：<code>${esc(source)}</code></p></section>`;
  const empty = (message) =>
    `<div class="wd-empty">✧<p>${t(message)}</p></div>`;
  const barRows = (rows) =>
    `<div class="wd-progress-list">${rows.map((r) => `<div><span>${esc(typeof r.key === "number" ? r.key + " ★" : t(r.key))}</span><progress max="${r.total || 1}" value="${r.owned}" aria-label="${esc(t(r.key) + " " + r.owned + "/" + r.total)}"></progress><b>${num(r.owned)} / ${num(r.total)}</b><small>${pct(r.percent)}</small></div>`).join("")}</div>`;
  function targetView(p) {
    let o =
      p.outfits.find((o) => o.id === targetId) ||
      setMap.get(targetId) ||
      p.outfits[0];
    if (!o) return empty("当前筛选无匹配套装");
    targetId = o.id;
    const effective = new Set(p.effective_ids),
      missing = [...new Set(o.part_ids)].filter((id) => !effective.has(id)),
      got = o.part_ids.length - missing.length;
    return `<div class="wd-target-picker"><label>${t("目标套装")}<select id="wd-target" aria-label="${t("目标套装")}">${(p.outfits.some((v) => v.id === o.id) ? p.outfits : [o, ...p.outfits]).map((v) => `<option value="${v.id}" ${v.id === o.id ? "selected" : ""}>${esc(name(v))} · ${v.rarity} ★ · ${esc(t(v.form_type === "base" ? "原色" : "附加形态"))}</option>`).join("")}</select></label><button data-detail="${o.id}" class="secondary-button">${t("查看套装")}</button></div><p class="ana-note">${o.member_count_status === "mismatch" ? t("该套装的来源部件数量不一致，逐件拥有不能自动证明整套完成；用户直接标记整套拥有单独计入。") + " " : ""}${t("目标套装保留当前选择，可独立于上方筛选。")} ${esc(o.id)} · ${got} / ${o.part_ids.length}</p><progress class="wd-full-progress" max="${o.part_ids.length || 1}" value="${got}"></progress>${
      !o.part_ids.length
        ? empty("部件关系待补充")
        : missing.length
          ? `<div class="ana-table-scroll"><table><thead><tr><th>${t("缺少部件")}</th><th>${t("类别")}</th><th>${t("获取方式")}</th><th>${t("资料来源")}</th></tr></thead><tbody>${missing
              .map((id) => {
                const r = raw.get(id);
                return `<tr><td><button data-detail="${id}">${esc(name(r))}</button><small>${id}</small></td><td>${esc(t(r.type))}</td><td>${esc(t(r.obtain || "待补充"))}</td><td><a href="${esc(r.source)}" target="_blank" rel="noopener noreferrer">${t("资料来源")} ↗</a></td></tr>`;
              })
              .join("")}</tbody></table></div>`
          : empty("这套衣装的已知部件已集齐")
    }<p class="ana-note">${t("获取方式为历史资料，不代表当前开放。点击缺件可查看详情并标记拥有。")}</p>`;
  }
  function renderPersonal() {
    const n = notes(),
      p = M.personal(D, n, personalFilters),
      pages = Math.max(1, Math.ceil(p.near.length / 10));
    nearPage = Math.min(nearPage, pages);
    const rate = p.totals.outfits
      ? (100 * p.totals.complete) / p.totals.outfits
      : 0;
    return `<div class="analytics-page wardrobe-page" data-no-translate>${head("我的衣橱", "把每一次收集，变成看得见的进度。")}<div class="ana-filters">${select(
      'data-wd-filter="scope"',
      "统计口径",
      personalFilters.scope,
      [
        ["base", "仅原色"],
        ["variants", "仅附加形态"],
        ["all", "全部形态（含进化与焕新）"],
      ],
    )}${basic("wd", personalFilters)}<button class="ana-reset" data-wd-reset>${t("重置筛选")}</button><button class="ana-export" data-wd-export>${t("导出衣橱分析")} CSV ↓</button></div><div class="ana-scope"><b>${t("仅使用本地已拥有标记，不上传、不关联游戏账号。")}</b><p>${t("整套已拥有会推导该形态的已知部件；原色与进化互不推导，推导结果不会写入逐件标记。")}</p><p>${t("完成率按当前形态与筛选范围计算；部件覆盖按部件自身品质、风格筛选。收藏不等于拥有。")}</p>${!n.storageOkay ? `<p role="alert">${t("本地保存不可用，请及时导出收藏备份。")}</p>` : ""}</div>
 <div class="wd-overview"><div class="wd-ring" style="--completion:${rate}%"><div><strong>${pct(p.totals.outfits ? rate : null)}</strong><small>${t("套装完成率")}</small></div></div><div class="ana-kpis"><div><span>${t("已集齐套装")}</span><strong>${num(p.totals.complete)}<small> / ${num(p.totals.outfits)}</small></strong></div><div><span>${t("已收集部件")}</span><strong>${num(p.totals.owned)}<small> / ${num(p.totals.clothing)}</small></strong><small>${t("整套推导")} ${num(p.totals.inferred)}</small></div><div><span>${t("只差一两件")}</span><strong>${num(p.near.length)}</strong></div></div></div>
 ${!n.owned.length ? `<div class="wd-empty">${t("还没有已拥有记录。去图鉴标记衣装，或在收藏页导入备份。")} <button class="secondary-button" data-nav="clothing">${t("服装部件")}</button></div>` : ""}
 <div class="ana-two">${card("按品质查看套装完成率", barRows(p.completion.rarities))}${card("按风格查看套装完成率", barRows(p.completion.styles))}</div>
 <div class="ana-two">${card("各风格部件覆盖", barRows(p.coverage.styles))}${card("各部位收集进度", barRows(p.coverage.categories))}</div>
 ${card(
   "距离完成最近的套装",
   p.near.length
     ? `<p class="ana-note">${t("已开始收集且仅缺 1–2 件；不把尚未开始的两件套当作即将完成。")}</p><div class="wd-near-list">${p.near
         .slice((nearPage - 1) * 10, nearPage * 10)
         .map(
           (o) =>
             `<button data-wd-target="${o.id}"><span>${esc(name(o))}<small>${o.rarity} ★ · ${esc(t(o.style))} · ${esc(t(o.is_base ? "原色" : "附加形态"))}</small></span><progress value="${o.owned}" max="${o.total}"></progress><b>${o.owned}/${o.total}</b><small>${t("缺件")} ${o.missing.length}</small></button>`,
         )
         .join(
           "",
         )}</div><div class="ana-pagination"><button data-wd-page="${nearPage - 1}" ${nearPage === 1 ? "disabled" : ""}>${t("上一页")}</button><span>${nearPage}/${pages}</span><button data-wd-page="${nearPage + 1}" ${nearPage === pages ? "disabled" : ""}>${t("下一页")}</button></div>`
     : empty("暂无只差一两件的套装"),
 )}
 <section class="ana-card" id="wd-target-panel"><h2>${t("目标套装缺件分析")}</h2>${targetView(p)}</section><p class="ana-note">${t("数据快照")} ${esc(D.snapshot_id)} · ${t("部件关系待补充")} ${p.totals.unknown_parts}</p></div>`;
  }
  function provenance(c) {
    return `<p class="wd-source">${t("样本来源")}：<a href="${esc(c.source?.url)}" target="_blank" rel="noopener noreferrer">${esc(c.source?.platform || "—")} ↗</a> · N=${c.study?.sample_size ?? "—"} · ${t("候选套装")} ${c.full.length}<br>${t("存在平台与自愿参与偏差，仅代表该样本。")}<br>${t("采集时间")} ${esc(c.source?.collected_at || "—")} · ${t("来源表")} public_sources / studies / poll_options / option_outfits</p>`;
  }
  function radar(c) {
    const center = [160, 144],
      radius = 102,
      point = (i, value) => {
        const angle = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
        return [
          center[0] + ((radius * value) / 100) * Math.cos(angle),
          center[1] + ((radius * value) / 100) * Math.sin(angle),
        ];
      };
    let svg =
      '<svg viewBox="0 0 320 290" role="img" aria-label="' +
      t("个人与样本偏好雷达图") +
      '">';
    for (const v of [25, 50, 75, 100])
      svg += `<polygon points="${M.styles.map((_, i) => point(i, v).join(",")).join(" ")}" fill="none" stroke="#e6ddec"/>`;
    c.distribution.forEach((r, i) => {
      const p = point(i, 100),
        label = point(i, 124);
      svg += `<line x1="160" y1="144" x2="${p[0]}" y2="${p[1]}" stroke="#eee5f1"/><text x="${label[0]}" y="${label[1]}" text-anchor="middle" font-size="11" fill="#80688f">${esc(t(r.style))}${r.tested ? "" : " —"}</text>`;
    });
    for (const [field, color] of [
      ["community", "#9173b3"],
      ["personal", "#d69cae"],
    ]) {
      const points = c.distribution.map((r, i) =>
        r.tested && r[field] !== null ? point(i, r[field]) : null,
      );
      if (points.every(Boolean))
        svg += `<polygon points="${points.map((p) => p.join(",")).join(" ")}" fill="${color}22" stroke="${color}" stroke-width="2"/>`;
      points.forEach((p, i) => {
        if (p)
          svg += `<circle cx="${p[0]}" cy="${p[1]}" r="4" fill="${color}"><title>${esc(t(c.distribution[i].style))} ${pct(c.distribution[i][field])}</title></circle>`;
      });
    }
    svg += "</svg>";
    return `<div class="wd-radar">${svg}<div><p>● ${t("样本支持分布")} <span class="wd-pink">● ${t("我的可比收藏")}</span></p><p class="ana-note">${t("只比较本样本候选家族；样本支持率归一化为风格分布，不是全体玩家平均。未调查风格显示 —，不补零。")}</p><p class="ana-note">${t("可比收藏")} ${c.comparable_favorites} / ${c.all_favorites} · ${t("未覆盖收藏")} ${c.unmeasured_favorites.length}</p></div></div><div class="ana-table-scroll"><table><thead><tr><th>${t("风格")}</th><th>${t("我的全部收藏")}</th><th>${t("我的可比收藏")}</th><th>${t("样本支持分布")}</th><th>${t("差值（百分点）")}</th></tr></thead><tbody>${c.distribution.map((r) => `<tr><td>${t(r.style)}</td><td>${pct(r.personal_all)}</td><td>${r.tested ? pct(r.personal) : "—"}</td><td>${r.tested ? pct(r.community) : "—"}</td><td>${r.tested && r.personal !== null && r.community !== null ? num(r.personal - r.community) : "—"}</td></tr>`).join("")}</tbody></table></div>${provenance(c)}`;
  }
  function trendView() {
    const series = [
      ...new Set(
        publicData.studies
          .filter(
            (s) =>
              s.comparison_series &&
              ["preference", "pull_intent", "approval"].includes(s.metric),
          )
          .map((s) => s.comparison_series),
      ),
    ];
    if (!series.includes(seriesId)) seriesId = series[0] || "";
    const trend = M.trend(D, publicData, seriesId);
    let body = select(
      'id="pf-series"',
      "可比调查序列",
      seriesId,
      series.length ? series.map((id) => [id, id]) : [["", "数据待录入"]],
    );
    if (!trend.ready)
      return (
        body +
        empty(
          "数据待录入：缺少同平台、同问法、同候选与明确调查时段的跨版本样本。",
        ) +
        `<p class="ana-note">${t("采集快照日期不当作游戏版本日期；不同投票不直接连成趋势线。")}</p>`
      );
    const width = Math.max(680, trend.points.length * 120),
      version = (id) =>
        D.versions.find((v) => v.version_id === id)?.label || id;
    let svg = `<svg viewBox="0 0 ${width} 250" width="${width}" height="250" role="img" aria-label="${t("版本热度趋势")}">`;
    for (const v of [0, 25, 50, 75, 100])
      svg += `<line x1="35" x2="${width - 10}" y1="${205 - v * 1.7}" y2="${205 - v * 1.7}" stroke="#eee8f3"/><text x="3" y="${210 - v * 1.7}" fill="#997dab" font-size="10">${v}%</text>`;
    const colors = ["#8b74ae", "#86afa4", "#d69cae", "#b396ce", "#93acce"];
    M.styles.forEach((style, i) => {
      let previous = null;
      trend.points.forEach((p, j) => {
        const value = p.styles[i].value;
        if (value === null) {
          previous = null;
          return;
        }
        const x =
            60 + (j * (width - 110)) / Math.max(1, trend.points.length - 1),
          y = 205 - value * 1.7;
        if (previous)
          svg += `<line x1="${previous[0]}" y1="${previous[1]}" x2="${x}" y2="${y}" stroke="${colors[i]}" stroke-width="2"/>`;
        svg += `<circle cx="${x}" cy="${y}" r="4" fill="${colors[i]}"><title>${esc(t(style))}: ${pct(value)}</title></circle>`;
        previous = [x, y];
      });
    });
    trend.points.forEach(
      (p, j) =>
        (svg += `<text x="${60 + (j * (width - 110)) / Math.max(1, trend.points.length - 1)}" y="236" text-anchor="middle" font-size="10" fill="#8b759d">${esc(t(version(p.version_id)))}</text>`),
    );
    svg += "</svg>";
    return (
      body +
      `<div class="ana-trend-scroll">${svg}</div><p>${M.styles.map((s, i) => `<span style="color:${colors[i]}">● ${t(s)}</span>`).join("　")}</p><div class="ana-table-scroll"><table>${trend.points.map((p) => `<tr><td>${esc(t(version(p.version_id)))}</td><td>${p.start} → ${p.end}</td><td>N=${p.sample_size}</td><td><a href="${esc(publicData.sources.find((s) => s.source_id === p.source_id).url)}" target="_blank" rel="noopener noreferrer">${t("资料来源")} ↗</a></td></tr>`).join("")}</table></div><p class="ana-note">${t("纵轴为同一候选集合内各风格套装支持率的均值；自愿样本变化不等于因果趋势。")}</p>`
    );
  }
  function outcomeView(metric) {
    const studies = publicData.studies.filter(
      (s) => s.status === "ready" && s.metric === metric,
    );
    return studies.length
      ? studies
          .map((s) => {
            const source = publicData.sources.find(
              (x) => x.source_id === s.source_id,
            );
            return `<h3>${esc(s.title)}</h3><p class="ana-note">${esc(s.measure_note)} · ${esc(s.form_scope)} · ${esc(s.population)}</p><div class="ana-table-scroll"><table>${M.studyRows(
              D,
              s,
            )
              .map(
                (o) =>
                  `<tr><td><button data-detail="${o.id}">${esc(name(o))}</button></td><td>${num(o.value)} ${s.unit === "percent" ? "%" : esc(s.unit)}</td><td>N=${s.sample_size ?? t("未知")} · ${esc(s.sample_unit)}</td><td><a href="${esc(source.url)}" target="_blank" rel="noopener noreferrer">${esc(source.platform)} ↗</a></td></tr>`,
              )
              .join(
                "",
              )}</table></div><p class="ana-note">${t("采集时间")} ${esc(source.collected_at)}</p>`;
          })
          .join("")
      : empty(
          metric === "revenue"
            ? "数据待录入：尚无可核验的逐套官方收入数据。"
            : "数据待录入：尚无对象明确、分母可核验的玩家完成率样本。",
        );
  }
  function entryAssistant() {
    const outfits = [
      ["", "请选择套装"],
      ...D.outfits
        .filter((o) => o.is_base)
        .map((o) => [o.id, name(o) + " · " + o.id]),
    ];
    return `<details class="wd-entry-assistant"><summary>${t("双套装投票录入助手")}</summary><p class="ana-note">${t("只录入已核验的家族级单选投票。A、B、两者、都不选为互斥选项；没有的选项留空，不反推票数。")}</p><form id="pf-entry-form"><div class="wd-entry-grid">${[
      ["platform", "平台", "text"],
      ["url", "来源链接", "url"],
      ["question", "投票原问题", "text"],
      ["population", "样本范围", "text"],
      ["sample", "样本人数", "number"],
      ["mapping", "昵称与套装对应依据", "text"],
      ["note", "本次更新说明", "text"],
    ]
      .map(
        ([k, l, type]) =>
          `<label>${t(l)}<input name="${k}" type="${type}" ${type === "number" ? 'min="1" step="1"' : ""} required></label>`,
      )
      .join("")}${select('name="metric"', "数据类型", "preference", [
      ["preference", "喜爱支持率"],
      ["pull_intent", "抽取意向支持率"],
    ])}${select('name="outfitA" required', "套装 A", "", outfits)}${select('name="outfitB" required', "套装 B", "", outfits)}${[
      ["a", "仅 A（%）"],
      ["b", "仅 B（%）"],
      ["both", "两者（%）"],
      ["neither", "都不选（%）"],
    ]
      .map(
        ([k, l]) =>
          `<label>${t(l)}<input name="${k}" type="number" min="0" max="100" step="0.1"></label>`,
      )
      .join(
        "",
      )}<label>${t("来源发布日期（可留空）")}<input type="date" name="published"></label></div><button type="button" data-pf-draft class="secondary-button">${t("生成草稿并校验")}</button></form></details>`;
  }
  function maintenance() {
    return `<section class="ana-card"><h2>${t("来源、维护与历史")}</h2><p class="ana-note">${t("来源中的原题、采样说明和录入记录保留原文。")}</p><details><summary>${t("来源审查目录")} (${publicData.sources.length})</summary><div class="ana-table-scroll"><table><thead><tr><th>${t("来源")}</th><th>N / ${t("样本范围")}</th><th>${t("数据类型")}</th><th>${t("状态与限制")}</th></tr></thead><tbody>${publicData.sources.map((s) => `<tr><td><a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.platform)} · ${esc(s.title)} ↗</a><small>${esc(s.collected_at)} · ${esc(s.access_method)}</small></td><td>${s.sample_size ?? t("未知")}<small>${esc(s.sample_scope)}</small></td><td>${esc(s.data_type)}</td><td>${t({ usable: "可用", pending: "待补充", excluded: "不纳入偏好统计" }[s.status])}<small>${esc(s.assessment)}</small></td></tr>`).join("")}</tbody></table></div></details><details><summary>${t("检索记录")}</summary>${(publicData.search_log || []).map((r) => `<p class="ana-note"><b>${esc(r.platform)}</b> · ${esc(r.query)}<br>${esc(r.result)}</p>`).join("")}</details>
 <details><summary>${t("数据快照与修改记录")}</summary>${[...(window.NIKKI_PREFERENCES_DATA.history || []), ...localHistory.map((h) => h.snapshot)].map((h) => `<p class="ana-note"><code>${esc(h.snapshot_id)}</code> · ${esc(h.created_at)}<br>${esc(h.note)}</p>`).join("")}<button data-pf-history class="secondary-button">${t("导出本地公开数据历史")}</button></details>
 <details id="pf-maintenance"><summary>${t("录入或更新公开数据")}</summary>${entryAssistant()}<p class="ana-note">${t("按来源和研究 ID 合并，先校验预览再保存；只更新当前浏览器的公开资料，不读取或上传个人衣橱。")}</p><div class="wd-maintenance-actions"><button data-pf-template class="secondary-button">${t("下载录入模板")}</button><button data-pf-export-json class="secondary-button">${t("导出公开数据")}</button><label class="secondary-button">${t("读取 JSON 文件")}<input id="pf-import" type="file" accept=".json,application/json"></label></div><label for="pf-json">${t("粘贴公开数据 JSON")}</label><textarea id="pf-json" rows="9" spellcheck="false" placeholder="${esc(t("先下载模板，填写来源、样本量、选项比例和套装 ID。"))}"></textarea><button data-pf-validate class="secondary-button">${t("校验并预览")}</button><button data-pf-apply class="primary-button" disabled>${t("保存到本地公开资料")}</button><div id="pf-validation" role="status" aria-live="polite"></div></details></section>`;
  }
  function renderCommunity() {
    if (
      !publicData.studies.some(
        (s) => s.study_id === groupFilters.study_id && s.status === "ready",
      )
    )
      groupFilters.study_id =
        publicData.studies.find(
          (s) =>
            s.status === "ready" &&
            ["preference", "pull_intent", "approval"].includes(s.metric),
        )?.study_id || "";
    const c = M.community(D, publicData, notes(), groupFilters),
      eligible = publicData.studies.filter(
        (s) =>
          s.status === "ready" &&
          ["preference", "pull_intent", "approval"].includes(s.metric),
      );
    return `<div class="analytics-page preferences-page" data-no-translate>${head("玩家偏好", "看见样本中的喜爱，也看见数据的边界。")}${loadWarning ? `<p role="alert">${t(loadWarning)}</p>` : ""}<div class="ana-filters">${select('data-pf-filter="study_id"', "调查样本", groupFilters.study_id, eligible.length ? eligible.map((s) => [s.study_id, s.title + " · N=" + s.sample_size]) : [["", "数据待录入"]])}${basic("pf", groupFilters)}<button class="ana-export" data-pf-csv>CSV ↓</button></div>
 <div class="wd-bias"><b>${t("样本来源")}：${esc(c.source?.platform || "—")} · N=${c.study?.sample_size ?? "—"} · ${t("存在平台与自愿参与偏差，仅代表该样本。")}</b><p>${t("不同问题、不同候选与不同平台不合并排名；本次收录不构成全体玩家偏好或完整历史。")}</p><p>${t("品质与风格筛选作用于排行、渠道和推荐；雷达图保留完整调查候选。")}</p><p>${t(c.study?.form_scope === "family" ? "本样本按家族映射，不区分原色与进化偏好。" : c.study?.form_scope === "base" ? "本样本仅统计原色。" : "本样本按具体形态统计。")}</p></div>
 <div class="ana-two">${card("套装人气排行", `<p class="ana-note">${t(metricNames[c.study?.metric] || "数据待录入")} · ${t("筛选不改变原调查分母。")}</p>${c.rows.length ? `<div class="wd-ranking">${c.rows.map((o, i) => `<button data-detail="${o.id}"><span class="wd-rank-number">${i + 1}</span><span>${esc(name(o))}<small>${o.rarity} ★ · ${t(o.style)}</small><progress value="${o.value}" max="100"></progress></span><b>${pct(o.value)}</b></button>`).join("")}</div>` : empty("当前筛选无样本记录")}${c.study ? `<details><summary>${t("查看原始选项与口径")}</summary><p class="ana-note">${esc(c.study.measure_note)}</p><p class="ana-note">${esc(c.study.mapping_note)}</p><ul>${c.study.options.map((o) => `<li>${esc(o.label)}：${pct(o.percent)}</li>`).join("")}</ul></details>` : ""}${provenance(c)}`, "public_sources + studies + poll_options + option_outfits")}${card("个人与样本偏好雷达图", c.preference ? radar(c) : empty("数据待录入"), "本地收藏 + outfits.style + poll_options")}
 </div>${card("收藏中的热门与小众", c.full.length < 2 ? empty("至少需要两个候选套装才能比较高低") : c.comparison.length ? `<p class="ana-note">${t("基准为本调查候选套装支持率的算术均值，不是全体玩家平均。")} ${pct(c.baseline)}</p><div class="ana-table-scroll"><table>${c.comparison.map((o) => `<tr><td><button data-detail="${o.id}">${esc(name(o))}</button></td><td>${pct(o.value)}</td><td>${num(o.delta)} ${t("百分点")}</td></tr>`).join("")}</table></div>${provenance(c)}` : empty("你的收藏尚未被这个样本覆盖，不能判断热门或冷门。"), "本地收藏 + 当前调查候选")}
 ${card("你可能感兴趣", c.recommendations.length ? `<p class="ana-note">${t("同收藏主风格、未收藏且未集齐，并达到本样本候选平均支持率。仅为透明规则推荐。")}</p><div class="wd-recommendations">${c.recommendations.map((o) => `<button data-detail="${o.id}"><b>${esc(name(o))}</b><small>${t(o.style)} · ${pct(o.value)} · N=${o.sample_size}</small></button>`).join("")}</div>${provenance(c)}` : empty("暂时没有同时满足个人偏好与样本支持条件的推荐。"), "本地收藏 / 拥有 + outfits.style + 当前调查")}
 ${card("获取渠道与样本热度", `<p class="ana-note">${t("渠道来自原色家族资料，可重叠；数量仅为本样本覆盖套装数，热度为这些套装支持率的均值。商城不直接等同充值。")}</p><div class="ana-table-scroll"><table><thead><tr><th>${t("获取方式")}</th><th>${t("候选套装")}</th><th>${t("平均样本支持率")}</th></tr></thead><tbody>${c.channels.map((r) => `<tr><td>${t(methodNames[r.method])}</td><td>${r.count}</td><td>${pct(r.mean)}</td></tr>`).join("")}</tbody></table></div>${provenance(c)}`, "studies + source_assertions + recipes + outfit_clothing")}
 ${card("版本热度趋势", trendView(), "studies.period_start / period_end / period_version_id + comparison_series")}
 <div class="ana-two">${card("玩家群体收集与完成率", `<h3>${t("整套持有率")}</h3>${outcomeView("collection_rate")}<h3>${t("平均部件完成率")}</h3>${outcomeView("mean_completion")}`, "studies + observations")}${card("服装流水", outcomeView("revenue"), "studies + observations")}</div>
 ${maintenance()}</div>`;
  }
  function refresh() {
    const p = document.querySelector(".wardrobe-page"),
      c = document.querySelector(".preferences-page");
    if (p) p.outerHTML = renderPersonal();
    if (c) c.outerHTML = renderCommunity();
  }
  function merge(patch) {
    const current = publicData,
      mergeBy = (a, b, key) => [
        ...new Map([...a, ...b].map((x) => [x[key], x])).values(),
      ];
    return {
      schema_version: 1,
      update_note: patch.update_note,
      sources: mergeBy(current.sources, patch.sources || [], "source_id"),
      studies: mergeBy(current.studies, patch.studies || [], "study_id"),
      search_log: [...(current.search_log || []), ...(patch.search_log || [])],
    };
  }
  function validateEntry() {
    preview = null;
    document.querySelector("[data-pf-apply]").disabled = true;
    const status = document.querySelector("#pf-validation");
    try {
      const text = document.querySelector("#pf-json").value;
      if (text.length > 1e6) throw Error(t("文件过大"));
      const patch = JSON.parse(text);
      if (
        patch.schema_version !== 1 ||
        !Array.isArray(patch.sources) ||
        !Array.isArray(patch.studies)
      )
        throw Error("schema_version / sources / studies");
      const data = merge(patch),
        errors = S.validate(data, D);
      if (errors.length) throw Error(errors.join("\n"));
      preview = data;
      status.textContent =
        t("校验通过") +
        ` · ${data.sources.length} ${t("来源")} · ${data.studies.filter((s) => s.status === "ready").length} ${t("可分析调查")} · ` +
        data.update_note;
      document.querySelector("[data-pf-apply]").disabled = false;
    } catch (e) {
      status.textContent = t("未保存") + "：" + e.message;
    }
  }
  document.addEventListener("change", async (e) => {
    const b = e.target;
    if (b.dataset.wdFilter) {
      personalFilters[b.dataset.wdFilter] = b.value;
      nearPage = 1;
      refresh();
    }
    if (b.dataset.pfFilter) {
      groupFilters[b.dataset.pfFilter] = b.value;
      refresh();
    }
    if (b.id === "wd-target") {
      targetId = b.value;
      refresh();
    }
    if (b.id === "pf-series") {
      seriesId = b.value;
      refresh();
    }
    if (b.id === "pf-import") {
      const f = b.files?.[0];
      if (!f) return;
      if (f.size > 1e6) {
        document.querySelector("#pf-validation").textContent = t("文件过大");
        return;
      }
      document.querySelector("#pf-json").value = await f.text();
      preview = null;
      document.querySelector("[data-pf-apply]").disabled = true;
    }
  });
  document.addEventListener("input", (e) => {
    if (e.target.id === "pf-json") {
      preview = null;
      document.querySelector("[data-pf-apply]").disabled = true;
    }
  });
  document.addEventListener("click", async (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.hasAttribute("data-wd-reset")) {
      personalFilters = { scope: "base", rarity: "", style: "" };
      nearPage = 1;
      refresh();
    }
    if (b.dataset.wdTarget) {
      targetId = b.dataset.wdTarget;
      refresh();
      document
        .querySelector("#wd-target-panel")
        .scrollIntoView({ block: "start" });
    }
    if (b.dataset.wdPage) {
      nearPage = Math.max(1, Number(b.dataset.wdPage));
      refresh();
    }
    if (b.hasAttribute("data-wd-export")) {
      const p = M.personal(D, notes(), personalFilters),
        rows = [];
      for (const [chart, values] of Object.entries({
        ...p.completion,
        style_coverage: p.coverage.styles,
        category_coverage: p.coverage.categories,
      }))
        for (const row of values)
          rows.push({
            snapshot_id: D.snapshot_id,
            ...p.filters,
            chart,
            ...row,
          });
      file(
        "miraland-wardrobe.csv",
        window.NikkiAnalyticsModel.toCSV(rows),
        "text/csv;charset=utf-8",
      );
    }
    if (b.hasAttribute("data-pf-csv")) {
      const c = M.community(D, publicData, notes(), groupFilters);
      file(
        "miraland-public-preferences.csv",
        window.NikkiAnalyticsModel.toCSV(
          c.rows.map((o) => ({
            study_id: c.study.study_id,
            source_url: c.source.url,
            collected_at: c.source.collected_at,
            sample_size: c.study.sample_size,
            metric: c.study.metric,
            form_scope: c.study.form_scope,
            rarity_filter: groupFilters.rarity,
            style_filter: groupFilters.style,
            outfit_id: o.id,
            name: o.name,
            value: o.value,
            unit: c.study.unit,
            population: c.study.population,
          })),
        ),
        "text/csv;charset=utf-8",
      );
    }
    if (b.hasAttribute("data-pf-template"))
      file(
        "preferences-template.json",
        JSON.stringify(window.NIKKI_PREFERENCES_DATA.entry_template, null, 2),
      );
    if (b.hasAttribute("data-pf-export-json"))
      file(
        "public-preferences.json",
        JSON.stringify(
          {
            schema_version: 1,
            update_note: publicData.update_note,
            sources: publicData.sources,
            studies: publicData.studies,
            search_log: publicData.search_log,
          },
          null,
          2,
        ),
      );
    if (b.hasAttribute("data-pf-history"))
      file(
        "public-preferences-local-history.json",
        JSON.stringify(
          {
            bundled_history: window.NIKKI_PREFERENCES_DATA.history,
            local_history: localHistory,
          },
          null,
          2,
        ),
      );
    if (b.hasAttribute("data-pf-validate")) validateEntry();
    if (b.hasAttribute("data-pf-draft")) {
      const form = document.querySelector("#pf-entry-form");
      if (!form.reportValidity()) return;
      try {
        const f = Object.fromEntries(new FormData(form)),
          hash = await crypto.subtle.digest(
            "SHA-256",
            new TextEncoder().encode(f.url),
          ),
          suffix = Array.from(new Uint8Array(hash))
            .map((v) => v.toString(16).padStart(2, "0"))
            .join("")
            .slice(0, 20),
          source_id =
            publicData.sources.find((x) => x.url === f.url)?.source_id ||
            "src:entry-" + suffix,
          study_id =
            publicData.studies.find(
              (x) => x.source_id === source_id && x.question === f.question,
            )?.study_id || "study:entry-" + suffix;
        const source = {
          source_id,
          platform: f.platform,
          title: f.question,
          url: f.url,
          collected_at: new Date().toISOString(),
          sample_size: Number(f.sample),
          sample_scope: f.population,
          data_type: f.metric,
          status: "usable",
          assessment: "人工核验录入；" + f.mapping,
          access_method: "manual",
        };
        const options = [
          ["a", "仅 A", [f.outfitA]],
          ["b", "仅 B", [f.outfitB]],
          ["both", "两者", [f.outfitA, f.outfitB]],
          ["neither", "都不选", []],
        ]
          .filter(([k]) => f[k] !== "")
          .map(([k, label, outfit_ids]) => ({
            option_id: study_id + ":" + k,
            label,
            percent: Number(f[k]),
            vote_count: null,
            outfit_ids,
          }));
        const study = {
          study_id,
          source_id,
          title: f.question,
          status: "ready",
          metric: f.metric,
          unit: "percent",
          selection_mode: "single",
          form_scope: "family",
          sample_size: Number(f.sample),
          sample_unit: "participants",
          population: f.population,
          question: f.question,
          candidate_ids: [f.outfitA, f.outfitB],
          options,
          observations: [],
          published_date: f.published || null,
          published_label: f.published || "待补充",
          period_start: null,
          period_end: null,
          period_version_id: null,
          comparison_series: null,
          comparability_note: null,
          measure_note:
            "按公示选项比例计算；共同支持计入双方，不反推整数票数。",
          mapping_note: f.mapping,
        };
        document.querySelector("#pf-json").value = JSON.stringify(
          {
            schema_version: 1,
            update_note: f.note,
            sources: [source],
            studies: [study],
          },
          null,
          2,
        );
        validateEntry();
      } catch (err) {
        document.querySelector("#pf-validation").textContent =
          t("未保存") + "：" + err.message;
      }
    }
    if (b.hasAttribute("data-pf-apply") && preview) {
      const candidate = preview;
      try {
        const created_at = new Date().toISOString(),
          digest = await crypto.subtle.digest(
            "SHA-256",
            new TextEncoder().encode(JSON.stringify(candidate)),
          ),
          id =
            "local-public:" +
            Array.from(new Uint8Array(digest))
              .map((v) => v.toString(16).padStart(2, "0"))
              .join("")
              .slice(0, 24),
          snapshot = {
            snapshot_id: id,
            created_at,
            note: candidate.update_note,
            catalog_snapshot: D.snapshot_id,
          };
        const history = localHistory.length
          ? [...localHistory]
          : [
              {
                snapshot: publicData.snapshot,
                data: {
                  schema_version: 1,
                  sources: publicData.sources,
                  studies: publicData.studies,
                  update_note: publicData.update_note,
                  search_log: publicData.search_log,
                },
              },
            ];
        history.push({ snapshot, data: candidate });
        const next = { ...candidate, snapshot };
        localStorage.setItem(key, JSON.stringify({ current: next, history }));
        publicData = next;
        localHistory = history;
        preview = null;
        refresh();
      } catch (err) {
        const status = document.querySelector("#pf-validation");
        if (status) status.textContent = t("未保存") + "：" + err.message;
      }
    }
  });
  window.addEventListener("miraland-notes-changed", refresh);
  window.addEventListener("storage", (e) => {
    if (e.key !== key && e.key !== null) return;
    try {
      const stored = e.newValue ? JSON.parse(e.newValue) : null;
      if (stored && S.validate(stored.current, D).length) return;
      publicData = stored?.current || window.NIKKI_PREFERENCES_DATA;
      localHistory = stored?.history || [];
      preview = null;
      refresh();
    } catch {}
  });
  window.NikkiWardrobe = {
    render: renderPersonal,
    refresh,
    getResult: () => M.personal(D, notes(), personalFilters),
  };
  window.NikkiPreferences = {
    render: renderCommunity,
    refresh,
    getResult: () => M.community(D, publicData, notes(), groupFilters),
  };
})();
