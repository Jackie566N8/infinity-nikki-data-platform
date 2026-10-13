(() => {
  "use strict";
  const D = window.NIKKI_ANALYTICS_DATA,
    M = window.NikkiAnalyticsModel;
  if (!D || !M) return;
  const I = window.NikkiI18n,
    t = (s) => I.t(s),
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
    n = (v) => Number(v).toLocaleString(I.locale, { maximumFractionDigits: 2 }),
    pct = (v) => (v === null ? "—" : n(v) + "%");
  const colors = ["#8b74ae", "#96bfb4", "#d99fb8", "#b199ce", "#a7bddd"],
    rarityColors = {
      5: "#b894c7",
      4: "#94b9bd",
      3: "#d6bd98",
      2: "#b5bf91",
      1: "#bfc0ca",
    };
  const methodLabels = {
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
  let filters = { ...M.defaults },
    result,
    drills = {},
    drillSelection = null,
    drillPage = 1;
  const rowMap = new Map([...D.outfits, ...D.clothing].map((r) => [r.id, r]));
  function control(key, label, options) {
    return `<label><span>${t(label)}</span><select data-ana-filter="${key}">${options.map(([value, name]) => `<option value="${esc(value)}" ${String(filters[key]) === String(value) ? "selected" : ""}>${esc(t(name))}</option>`).join("")}</select></label>`;
  }
  function drillButton(key, label, ids, extra = "") {
    drills[key] = { label, ids };
    return `<button type="button" class="ana-drill-button ${extra}" data-ana-drill="${esc(key)}">${label}</button>`;
  }
  function section(key, title, subtitle, body, table) {
    return `<section class="ana-card" id="ana-${key}"><div class="ana-card-head"><div><h2>${t(title)}</h2><p>${t(subtitle)}</p></div><button class="ana-export" data-ana-export="${key}" aria-label="${esc(t("导出"))} ${esc(t(title))} CSV">CSV ↓</button></div>${body}<p class="ana-lineage">${t("来源表")}：<code>${esc(table)}</code></p></section>`;
  }
  function bars(rows, denominator, kind) {
    const max = Math.max(
      4,
      Math.ceil(Math.max(1, ...rows.map((r) => r.count)) / 4) * 4,
    );
    return `<div class="ana-bars">${rows
      .map((r, i) => {
        const label = kind === "rarity" ? `${r.key} ★` : t(r.key);
        return drillButton(
          kind + ":" + i,
          `<span>${esc(label)}</span><span class="ana-bar-track"><i style="width:${(r.count / max) * 100}%;background:${kind === "rarity" ? rarityColors[r.key] || colors[0] : colors[i % 5]}"></i></span><b>${n(r.count)}</b><small>${pct(denominator ? (r.count / denominator) * 100 : null)}</small>`,
          r.ids,
          "ana-bar",
        );
      })
      .join("")}</div>`;
  }
  function ring() {
    let start = 0;
    const stops = result.style
      .filter((r) => r.count)
      .map((r) => {
        const end = start + (r.count / result.totals.outfits) * 100,
          c = colors[M.styles.indexOf(r.key)] || "#ccc",
          s = `${c} ${start}% ${end}%`;
        start = end;
        return s;
      });
    return `<div class="ana-ring-layout"><div class="ana-ring" style="background:${stops.length ? "conic-gradient(" + stops.join(",") + ")" : "#ede8f2"}" role="img" aria-label="${esc(result.style.map((r) => t(r.key) + " " + r.count).join(", "))}"><div><strong>${n(result.totals.outfits)}</strong><small>${t(filters.scope === "base" ? "独立套装" : "套装形态")}</small></div></div><div class="ana-ring-legend">${result.style.map((r, i) => drillButton("style:" + i, `<i style="background:${colors[i]}"></i><span>${esc(t(r.key))}</span><b>${n(r.count)}</b><small>${pct(r.percent)}</small>`, r.ids)).join("")}</div></div>`;
  }
  function heatmap() {
    const max = Math.max(1, ...result.heat.map((r) => r.count));
    return `<div class="ana-heat-scroll"><table class="ana-heat"><caption>${t("数字为部件数；颜色越深，数量越多。点击查看记录。")}</caption><thead><tr><th>${t("类别")}</th>${M.styles.map((s) => `<th>${esc(t(s))}</th>`).join("")}</tr></thead><tbody>${result.category
      .map(
        (cat) =>
          `<tr><th>${esc(t(cat.key))}</th>${M.styles
            .map((style) => {
              const row = result.heat.find(
                  (r) => r.category === cat.key && r.style === style,
                ),
                key = "heat:" + cat.key + ":" + style;
              drills[key] = {
                label: esc(t(style) + " × " + t(cat.key)),
                ids: row.ids,
              };
              return `<td><button data-ana-drill="${esc(key)}" style="background:rgba(125,96,163,${row.count ? 0.12 + (0.72 * row.count) / max : 0.035});color:${row.count / max > 0.52 ? "#fff" : "#766282"}" aria-label="${esc(t(cat.key) + " · " + t(style) + " · " + row.count)}">${n(row.count)}</button></td>`;
            })
            .join("")}</tr>`,
      )
      .join("")}</tbody></table></div>`;
  }
  function combinations() {
    const rows = result.combinations.slice(0, 10);
    return `<div class="ana-combo-list">${rows.map((r, i) => drillButton("combo:" + i, `<span>${esc([t(r.style), ...r.tags.map(t)].join(" × "))}</span><b>${n(r.count)}</b><small>${pct(r.percent)}</small>`, r.ids)).join("") || `<p>${t("当前筛选无匹配记录")}</p>`}</div><p class="ana-note">${t("仅列出出现过的最低频完整标签组合，最多 10 组；不把未收录组合当成零频事实。")}</p>`;
  }
  function acquisition() {
    return `<div class="ana-methods">${result.acquisition.map((r, i) => `<div class="ana-method"><div>${drillButton("method:" + i, esc(t(methodLabels[r.method])), r.ids)}<b>${n(r.count)}</b><small>${pct(r.percent)}</small></div><div class="ana-stacked" aria-hidden="true">${r.rarities.map((v) => `<i style="width:${result.totals.outfits ? (v.count / result.totals.outfits) * 100 : 0}%;background:${rarityColors[v.key] || colors[0]}"></i>`).join("")}</div><small>${t("原色")} ${r.base_count} · ${t("附加形态")} ${r.additional_count}</small></div>`).join("")}</div><div class="ana-legend">${result.rarity.map((r) => `<span><i style="background:${rarityColors[r.key] || colors[0]}"></i>${r.key} ★</span>`).join("")}</div><details><summary>${t("查看归类规则")}</summary><p class="ana-note">${t("同一套装可属于多个获取标签，占比之和可能超过 100%。商城入口不等于已证实付费，制作线索只表示关联部件存在设计图，不代表完整配方。附加形态继承原色获取渠道，不表示无需进化条件即可直接获得。")}</p><pre>${esc(JSON.stringify(D.method_rules, null, 2))}</pre></details>`;
  }
  function trend() {
    const rows = result.versions.filter((r) => r.anchor_date),
      max = Math.max(
        4,
        Math.ceil(Math.max(1, ...rows.map((r) => r.count)) / 4) * 4,
      ),
      width = Math.max(880, rows.length * 66 + 50),
      height = 260,
      plot = 176;
    let svg = `<svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="${t("各版本新增套装趋势")}">`;
    for (let j = 0; j <= 4; j++) {
      const y = 20 + plot - (j * plot) / 4;
      svg += `<line x1="40" x2="${width - 8}" y1="${y}" y2="${y}" stroke="#eee8f3"/><text x="32" y="${y + 4}" text-anchor="end" fill="#aa99b7" font-size="10">${Math.ceil((max * j) / 4)}</text>`;
    }
    rows.forEach((r, i) => {
      const x = 50 + i * 66,
        base = (r.base_count / max) * plot,
        extra = (r.additional_count / max) * plot;
      svg += `<g><title>${esc(t(r.label))}: ${r.base_count} ${t("原色")}, ${r.additional_count} ${t("附加形态")}; ${t("待补充")} ${r.pending}</title><rect x="${x}" y="${20 + plot - base}" width="35" height="${base}" rx="3" fill="#937db2"/><rect x="${x}" y="${20 + plot - base - extra}" width="35" height="${extra}" rx="3" fill="#d6adc6"/><text x="${x + 17}" y="${14 + plot - base - extra}" text-anchor="middle" font-size="10" fill="#856b9b">${r.count}${r.pending ? "*" : ""}</text><text x="${x + 17}" y="222" text-anchor="middle" font-size="10" fill="#8f7c9e">${r.anchor_date.slice(2, 7)}</text><text x="${x + 17}" y="241" text-anchor="middle" font-size="9" fill="#a796b2">${i + 1}</text></g>`;
    });
    svg += "</svg>";
    return `<div class="ana-legend"><span><i style="background:#937db2"></i>${t("原色")}</span><span><i style="background:#d6adc6"></i>${t("附加形态")}</span><span>* ${t("该版本另有待补充记录")}</span></div><div class="ana-trend-scroll">${svg}</div><p class="ana-note">${t("横轴为各版本收录实装标记的最早日期，并非已确认的版本上线日。版本序号对应下表，日期不会随筛选变化。")}</p><div class="ana-table-scroll"><table><thead><tr><th>#</th><th>${t("版本 / 季节")}</th><th>${t("最早收录实装日期")}</th><th>${t("当前统计数量")}</th><th>${t("待补充")}</th><th>${t("日期来源")}</th></tr></thead><tbody>${result.versions.map((r, i) => `<tr><td>${r.anchor_date ? rows.findIndex((v) => v.version_id === r.version_id) + 1 : "—"}</td><th>${esc(t(r.label))}</th><td>${r.anchor_date || t("待补充")}</td><td>${drillButton("version:" + i, `${n(r.count)} <small>(${r.base_count} + ${r.additional_count})</small>`, r.ids)}</td><td>${drillButton("pending:" + i, r.pending ? n(r.pending) : "—", r.pending_ids)}</td><td>${r.anchor_source_urls.length ? `<a href="${esc(r.anchor_source_urls[0])}" target="_blank" rel="noopener noreferrer">BWIKI ↗</a>` : t("当前筛选无可用日期")}<small>${t("明细保留逐条日期与出处")}</small></td></tr>`).join("")}</tbody></table></div>`;
  }
  function render() {
    result = M.analyze(D, filters);
    drills = {};
    drillSelection = null;
    const clothNote = result.associated
      ? "部件图仅统计当前筛选套装关联的部件，并按部件自身品质、风格再次筛选；同一部件 ID 只计一次。"
      : "部件图统计全部服装目录，按部件自身品质、风格筛选；原色口径排除部件变体。";
    return `<div class="analytics-page" data-no-translate><div class="ana-heading"><div><span class="ana-eyebrow">MIRALAND · ANALYTICS</span><h1>${t("数据分析")}</h1><p>${t("图鉴与版本分析中心")}</p></div><button class="ana-primary" data-ana-export="all">${t("导出全部图表与明细")} CSV ↓</button></div><div class="ana-meta"><span>${t("原资料整理日期")} ${D.source_date}</span><span>${t("数据快照")} <code>${esc(D.snapshot_id.slice(9, 21))}</code></span><button data-nav="quality">${t("数据质量")} ↗</button></div>
<section class="ana-filters">${control("scope", "统计口径", [
      ["base", "独立套装 / 原色部件"],
      ["all", "全部形态（含进化与焕新）"],
    ])}${control("rarity", "品质", [["", "全部"], ...[...new Set([...D.outfits, ...D.clothing].map((r) => r.rarity))].sort((a, b) => b - a).map((v) => [String(v), v + " 星"])])}${control("style", "风格", [["", "全部"], ...M.styles.map((s) => [s, s])])}${control("method", "获取方式", [["", "全部"], ...M.methods.map((m) => [m, methodLabels[m]])])}${control(
      "clothingScope",
      "部件范围",
      [
        ["catalog", "全部服装目录"],
        ["linked", "筛选套装的关联部件"],
      ],
    )}<button class="ana-reset" data-ana-reset>${t("重置筛选")} ↺</button></section>
<div class="ana-scope"><b>${t(filters.scope === "base" ? "当前：每个独立套装只计原色一次。" : "当前：每个套装形态计一条，包含进化、焕新及阶段未明变体。")}</b><p>${t(clothNote)}</p>${filters.method ? `<p>${t("选中获取方式后，部件范围自动限定为匹配套装的关联部件。")}</p>` : ""}</div>
<div class="ana-kpis">${[
      ["当前套装记录", result.totals.outfits],
      ["独立套装家族", result.totals.families],
      ["当前部件记录", result.totals.clothing],
      ["可用于日期趋势", result.totals.dated],
    ]
      .map(
        ([k, v]) => `<div><span>${t(k)}</span><strong>${n(v)}</strong></div>`,
      )
      .join("")}</div>
${!result.totals.outfits ? `<p class="ana-empty">${t("当前筛选无匹配套装；部件图按所选范围独立统计。")}</p>` : ""}<section id="ana-drill-panel" class="ana-card" hidden tabindex="-1"></section>
<div class="ana-two">${section("style", "套装风格分布", "按套装主风格统计，占比分母为当前筛选套装数。", ring(), "objects.style + outfits")}${section("rarity", "套装品质分布", "数量与占比均使用当前筛选结果。", bars(result.rarity, result.totals.outfits, "rarity"), "objects.rarity + outfits")}</div>
${section("category", "服装类别分布", clothNote, bars(result.category, result.totals.clothing, "category"), "objects.category + clothing + outfit_clothing")}
<div class="ana-two ana-asymmetric">${section("heat", "风格 × 类别热力图", "按部件自身主风格与类别交叉计数，零表示当前筛选没有匹配记录。", heatmap(), "objects.style/category + clothing + outfit_clothing")}${section("combinations", "少见的风格与标签组合", "目前只有单一主风格字段；这里分析主风格与完整标签组合，不推测第二风格。", combinations(), "objects.style + outfits + object_tags")}</div>
${section("acquisition", "获取方式与套装结构", "按原色家族的来源说明归类；颜色表示品质，获取标签可重叠。", acquisition(), "source_assertions + outfits.base_outfit_id + recipes + outfit_clothing")}
${section("versions", "各版本新增套装趋势", "按来源版本标签分组，仅绘制有正式实装日期的记录；测试及混合测试说明保留为待补充。", trend(), "outfits + object_releases + versions + releases + sources")}
<section class="ana-card ana-caveat"><h2>${t("历史覆盖与统计边界")}</h2><p>${t("当前筛选有待补充的历史日期记录")}：<b>${n(result.totals.pending)}</b>。${t("这些记录仍计入图鉴分布，但未当成零新增或塞入采集日期。")}</p>${drillButton(
      "all-pending",
      t("查看待补充记录"),
      result.pending.map((r) => r.id),
    )}<p>${t("趋势表示当前目录中可追溯的实装记录，不是官方完整历史。未出现的历史版本覆盖情况待补充；无完整版本日历，不能将缺失版本补成零。")}</p><p>${t("统计来自规范数据表；点击图表数字可查看对象 ID、来源与实装原文。CSV 保留筛选条件、快照 ID、分母和成员 ID。")}</p></section></div>`;
  }
  function refresh() {
    const host = document.querySelector(".analytics-page");
    if (host) host.outerHTML = render();
  }
  function showDrill(key, page = 1) {
    const selection = drills[key];
    if (!selection) return;
    drillSelection = key;
    drillPage = page;
    const el = document.querySelector("#ana-drill-panel"),
      pages = Math.max(1, Math.ceil(selection.ids.length / 15));
    drillPage = Math.min(pages, Math.max(1, page));
    const rows = selection.ids
      .slice((drillPage - 1) * 15, drillPage * 15)
      .map((id) => rowMap.get(id))
      .filter(Boolean);
    el.hidden = false;
    el.innerHTML = `<div class="ana-card-head"><div><h2>${t("统计明细")}</h2><p>${selection.label} · ${n(selection.ids.length)}</p></div><button data-ana-close aria-label="${t("关闭")}">×</button></div><div class="ana-table-scroll"><table><thead><tr><th>${t("名称")}</th><th>ID</th><th>${t("品质")} / ${t("风格")}</th><th>${t("来源实装原文")}</th><th>${t("资料来源")}</th></tr></thead><tbody>${rows.map((r) => `<tr><td><button data-detail="${r.id}">${esc(I.name({ id: r.id, name: r.name }))}</button></td><td><code>${r.id}</code></td><td>${r.rarity} ★ · ${esc(t(r.style))}</td><td>${esc(r.release_label || t("待补充"))}${r.release_context === "test_release" ? `<small>${t("测试 / 混合说明，待补充")}</small>` : ""}</td><td><a href="${esc(r.date_source_url || r.source_url)}" target="_blank" rel="noopener noreferrer">${t("资料来源")} ↗</a></td></tr>`).join("") || `<tr><td colspan="5">${t("当前筛选无匹配记录")}</td></tr>`}</tbody></table></div><div class="ana-pagination"><span>${drillPage} / ${pages}</span><button data-ana-drill-page="${drillPage - 1}" ${drillPage === 1 ? "disabled" : ""}>${t("上一页")}</button><button data-ana-drill-page="${drillPage + 1}" ${drillPage === pages ? "disabled" : ""}>${t("下一页")}</button></div>`;
    el.scrollIntoView({ block: "nearest" });
    el.focus({ preventScroll: true });
  }
  document.addEventListener("change", (e) => {
    if (e.target.dataset.anaFilter) {
      const key = e.target.dataset.anaFilter;
      filters[key] = e.target.value;
      refresh();
      document
        .querySelector(`[data-ana-filter="${key}"]`)
        ?.focus({ preventScroll: true });
    }
  });
  document.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.hasAttribute("data-ana-reset")) {
      filters = { ...M.defaults };
      refresh();
    }
    if (b.dataset.anaExport) {
      const rows = M.exportRows(D, result, b.dataset.anaExport),
        blob = new Blob([M.toCSV(rows)], { type: "text/csv;charset=utf-8" }),
        url = URL.createObjectURL(blob),
        a = document.createElement("a");
      a.href = url;
      a.download = "miraland-analysis-" + b.dataset.anaExport + ".csv";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    if (b.dataset.anaDrill) showDrill(b.dataset.anaDrill);
    if (b.dataset.anaDrillPage)
      showDrill(drillSelection, Number(b.dataset.anaDrillPage));
    if (b.hasAttribute("data-ana-close"))
      document.querySelector("#ana-drill-panel").hidden = true;
  });
  window.NikkiAnalytics = { render, getResult: () => M.analyze(D, filters) };
})();
