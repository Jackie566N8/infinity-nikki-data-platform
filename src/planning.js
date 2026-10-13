(() => {
  "use strict";
  const D = window.NIKKI_PLANNING_DATA,
    M = window.NikkiPlanningModel,
    I = window.NikkiI18n;
  if (!D || !M || !I) return;
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
    num = (n) => n.toLocaleString(I.locale),
    name = (o) => o.names?.[I.locale] || I.name(o),
    link = (url, label) =>
      `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(label)} ↗</a>`;
  const raw = new Map(window.NIKKI_DATA.records.map((o) => [o.id, o]));
  // Verified names also appear consistently in the material catalogue and detail dialog.
  for (const n of D.name_sources) {
    const r = raw.get(n.material_id);
    if (r) {
      r.name = n.names["zh-CN"];
      r.localized = true;
      delete r.translationNote;
    }
  }
  const key = "miraland-material-plan-v1",
    emptyState = () => ({ schema_version: 1, targets: [], inventory: {} }),
    readyIDs = new Set(
      D.outfits
        .filter((o) => o.availability.status === "complete")
        .map((o) => o.id),
    );
  let state = emptyState(),
    storageOkay = true,
    loadError = false,
    query = "",
    onlyReady = false,
    page = 1,
    filters = { rarity: "", style: "", form: "", acquisition: "" };
  const invalid = new Set();
  try {
    const v = localStorage.getItem(key);
    if (v) state = M.restore(D, JSON.parse(v));
  } catch {
    storageOkay = false;
    loadError = true;
  }
  const result = () =>
    M.analyze(D, [...state.targets, ...(state.skipped || [])], state.inventory);
  const reason = (o) => o.availability?.reason || "配方数据待补充",
    formLabel = {
      base: "原色",
      evolution: "进化",
      renewal: "焕新",
      variant_unknown: "阶段未明",
    };
  function persist() {
    try {
      localStorage.setItem(key, JSON.stringify(state));
      storageOkay = true;
      loadError = false;
    } catch {
      storageOkay = false;
    }
  }
  const costLabel = (o) =>
    o?.form_type === "renewal"
      ? "焕新步骤 × 1（已达 10 级）"
      : o?.form_type === "evolution"
        ? "进化步骤 × 1"
        : "整套制作 × 1";
  const sourceType = {
    community_wiki: "社区 Wiki",
    guide_site: "攻略站",
    game_measured: "游戏内实测",
    official_wiki: "官方 Wiki",
    community_post: "社区整理",
  };
  const detail = (o, label) =>
    `<button class="mp-detail" data-detail="${esc(o.id)}">${esc(label || name(o))}</button>`;
  const selectRows = () => {
    const q = query.normalize("NFKC").toLowerCase().trim();
    return D.outfits
      .filter(
        (o) =>
          (!onlyReady || readyIDs.has(o.id)) &&
          (!filters.rarity || String(o.rarity) === filters.rarity) &&
          (!filters.style || o.style === filters.style) &&
          (!filters.form || o.form_type === filters.form) &&
          (!filters.acquisition || o.obtain === filters.acquisition) &&
          (!q ||
            [
              ...I.names(raw.get(o.id) || o),
              ...(window.NIKKI_DATA.outfitAliases?.entries.find(
                (a) => a.outfitId === (raw.get(o.id)?.group?.[0] || o.id),
              )?.aliases || []),
            ]
              .join(" ")
              .normalize("NFKC")
              .toLowerCase()
              .includes(q)),
      )
      .sort(
        (a, b) =>
          Number(readyIDs.has(b.id)) - Number(readyIDs.has(a.id)) ||
          Number(b.is_base) - Number(a.is_base) ||
          a.id.localeCompare(b.id),
      );
  };
  function choices() {
    const rows = selectRows(),
      pages = Math.max(1, Math.ceil(rows.length / 16));
    page = Math.min(page, pages);
    return `<div class="mp-choice-list">${
      rows
        .slice((page - 1) * 16, page * 16)
        .map(
          (o) =>
            `<label class="mp-choice ${state.targets.includes(o.id) ? "selected" : ""} ${readyIDs.has(o.id) ? "" : "unavailable"}"><input type="checkbox" data-mp-target="${o.id}" ${state.targets.includes(o.id) ? "checked" : ""} ${readyIDs.has(o.id) ? "" : "disabled"}><span><b>${esc(name(o))}</b><small>${o.rarity} ★ · ${t(o.style)} · ${t(formLabel[o.form_type])}</small></span><em class="${readyIDs.has(o.id) ? "ready" : "pending"}">${t(readyIDs.has(o.id) ? "可计算" : reason(o))}</em></label>`,
        )
        .join("") || `<p class="ana-empty">${t("未找到匹配的套装")}</p>`
    }</div><div class="mp-pagination"><span>${num(rows.length)} ${t("套装记录")}</span><button data-mp-page="${page - 1}" ${page <= 1 ? "disabled" : ""}>${t("上一页")}</button><span>${page} / ${pages}</span><button data-mp-page="${page + 1}" ${page >= pages ? "disabled" : ""}>${t("下一页")}</button></div>`;
  }
  function selected(r) {
    return state.targets.length
      ? `<div class="mp-selected">${r.status
          .filter((s) => state.targets.includes(s.id))
          .map(
            (s) =>
              `<div>${detail(s.outfit || { id: s.id, name: s.id })}<span class="${s.ready ? "" : "mp-pending"}">${t(s.ready ? costLabel(s.outfit) : "未计入需求")}</span><button data-mp-remove="${s.id}" aria-label="${esc(t("移除") + " " + name(s.outfit || { name: s.id }))}">×</button></div>`,
          )
          .join("")}</div>`
      : `<p class="mp-empty-selection">✧<br>${t("从左侧选择你的制作目标")}</p>`;
  }
  function statusMessage() {
    return (
      `<p class="mp-batch-note">${(state.skipped || []).length ? `${t("批量选择已跳过不可计算套装")} · ${num(state.skipped.length)} · ${t("导出文件会列明跳过原因。")}` : ""}</p>` +
      `<p class="mp-storage ${storageOkay ? "" : "mp-error"}" role="status">${t(storageOkay ? "库存与目标仅保存在此浏览器。" : loadError ? "本地数据无法读取，暂以空计划展示；原存储未被覆盖。" : "浏览器未允许保存；本次修改仅在当前页面保留。")}</p><p class="mp-error" id="mp-validation" role="alert">${invalid.size ? t("库存须在 0 至 1000000000 之间；件数填整数，千克可填小数。无效输入未保存。") : ""}</p>`
    );
  }
  function kpis(r) {
    return [
      ["已选目标", state.targets.length],
      ["已核对配方", r.totals.ready],
      ["仍缺材料种类", r.totals.missing],
      ["共同材料种类", r.totals.shared],
    ]
      .map(
        ([label, n]) =>
          `<div><span>${t(label)}</span><strong>${num(n)}</strong></div>`,
      )
      .join("");
  }
  function trace(r) {
    return `<details><summary>${t("查看需求构成与来源")}</summary><ul class="mp-trace">${r.items
      .map((i) => {
        const o = D.outfits.find((o) => o.id === i.outfit_id);
        return `<li>${detail(o)} × ${num(i.quantity)} · ${link(i.recipe.source_url, t("配方来源"))}<small>${t(sourceType[i.recipe.source_type] || "社区 Wiki")} · ${i.recipe.prerequisite ? (i.recipe.scope === "renewal" ? t("需先具备 10 级套装") : t("进化需备齐原色副本；前置制作另计")) : ""}<br>${esc(i.recipe.prerequisite || "")}<br>${esc(i.recipe_id)} · ${esc(i.recipe.checked_at)}<br>${esc(i.recipe.source_title || "")} · ${esc(({"zh-CN":{high:"高置信度",medium:"中置信度",low:"推断值，未经验证"},en:{high:"High source confidence",medium:"Medium source confidence",low:"Unverified inference"},ja:{high:"出典確度：高",medium:"出典確度：中",low:"未検証の推測"},ko:{high:"출처 신뢰도: 높음",medium:"출처 신뢰도: 중간",low:"미검증 추론"},"zh-TW":{high:"高置信度",medium:"中置信度",low:"推斷值，未經驗證"}}[I.locale]||{})[i.recipe.source_confidence] || "")}</small></li>`;
      })
      .join("")}</ul></details>`;
  }
  function materialTable(r) {
    if (!r.rows.length)
      return `<div class="ana-empty">${t(r.status.length ? "所选套装暂无可计算配方，材料需求不是零。" : "选择套装后，这里将生成材料清单。")}</div>`;
    return `<div class="ana-table-scroll"><table class="mp-table"><caption>${t("数量单位见各行：件或 kg；空库存按 0 估算，合成材料先扣库存再展开下级。")}</caption><thead><tr>${["材料名称", "总需求量", "已有库存", "缺口数量", "关联目标与来源"].map((k) => `<th scope="col">${t(k)}</th>`).join("")}</tr></thead><tbody>${r.rows.map((a) => `<tr class="${a.shared ? "mp-shared" : ""}" data-mp-row="${a.id}"><th scope="row">${detail(a.material)}${a.shared ? `<span class="mp-star">★ ${num(a.outfit_ids.length)} ${t("套装共同需要")}</span>` : ""}</th><td>${num(a.total)} <small>${t(a.unit === "kg" ? "千克" : "件")}</small></td><td><input type="number" min="0" max="1000000000" step="${a.unit === "kg" ? "0.001" : "1"}" inputmode="decimal" data-mp-stock="${a.id}" aria-label="${esc(name(a.material) + " · " + t("已有库存"))}" placeholder="${t("未填，按 0")}" value="${a.inventory_known ? a.inventory : ""}"></td><td><b class="mp-gap ${a.gap ? "" : "done"}" data-mp-gap="${a.id}">${num(a.gap)}</b></td><td>${a.is_synthetic ? `<p>${t("合成批次")} ${num(a.batches)} · ${t("下级原料已展开")}</p>` : ""}${trace(a)}</td></tr>`).join("")}</tbody></table></div>`;
  }
  function scope(r) {
    return `<div class="mp-warning"><b>${t("部分套装配方数据待完善，结果仅供参考")}</b><p>${t("每个目标按所选形态计算一套。原色制作不含解锁、升级和进化；进化与焕新须独立核验，本页未核实的形态置灰。")}</p><p>${r.status.some((s) => s.ready && s.recipe.scope === "renewal") ? t("焕新目标要求已拥有对应套装全部 10 级部件，仅计算 10→11 级。原色制作、0→10 级费用和活动返还未扣除。") : ""}</p><p>${r.totals.pending ? `${t("仅汇总已核对部分")} · ${num(r.totals.ready)} / ${num(r.totals.selected)} · ${t("待补充目标不按零消耗处理。")}` : t("整套汇总与部件配方不叠加；库存仅在合并需求后扣除一次。")}</p></div>`;
  }
  function regions(r) {
    const cards = r.regions
      .map(
        (a, i) =>
          `<article class="mp-region"><div class="mp-region-head"><div><small>${t(i === 0 ? "优先考虑" : "备选区域")}</small><h3>⌖ ${t(a.region)}</h3></div><b>${num(a.count)}<small>${t("缺料种类")}</small></b></div><progress value="${a.count}" max="${Math.max(1, r.totals.field_materials)}" aria-label="${esc(t("覆盖缺料种类"))}"></progress><ul>${a.rows
            .map(
              (row) =>
                `<li><div>${detail(row.material)}<b>${t("总缺口")} ${num(row.gap)} ${t(row.unit === "kg" ? "千克" : "件")}</b></div>${row.area_evidence
                  .filter((e) => e.region === a.region)
                  .map(
                    (e) =>
                      `<small>${t(e.condition_text || "采集条件待补充")} · ${link(e.source_url, t("区域来源"))}${e.source_published_date ? " · " + e.source_published_date : ""}</small>`,
                  )
                  .join("")}</li>`,
            )
            .join("")}</ul></article>`,
      )
      .join("");
    const others = [
      ["非野外采集材料", r.nonGathering],
      ["区域资料待补充", r.unknownRegions],
    ]
      .filter(([, rows]) => rows.length)
      .map(
        ([title, rows]) =>
          `<div class="mp-other"><h3>${t(title)}</h3>${rows.map((row) => `<p>${detail(row.material)} · ${t("总缺口")} ${num(row.gap)} ${t(row.unit === "kg" ? "千克" : "件")}<br><small>${row.material.guidance ? t(row.material.guidance.text) + " · " + link(row.material.guidance.source_url, t("资料来源")) : t("暂无已核对区域，未纳入区域推荐。")}</small></p>`).join("")}</div>`,
      )
      .join("");
    return `<div class="mp-region-grid">${cards}</div>${!r.totals.missing ? `<div class="ana-empty">${t(r.rows.length ? "已知清单的库存已满足需求。" : "先选择有配方的目标，再查看采集建议。")}</div>` : !r.regions.length ? `<p>${t("当前缺料暂无可推荐的采集区域。")}</p>` : ""}${others}`;
  }
  function audit(r) {
    return `<details class="mp-audit"><summary>${t("配方覆盖与核对记录")}</summary><p>${t("原色配方来自公开索引，焕新清单逐页核对。资料不代表实时游戏数值；完整盘点可导出 CSV。")}</p><div class="ana-table-scroll"><table><thead><tr>${["目标套装", "关联部件数", "配方状态", "资料来源"].map((s) => `<th>${t(s)}</th>`).join("")}</tr></thead><tbody>${r.status
      .slice(0, 30)
      .map(
        (s) =>
          `<tr><td>${detail(s.outfit || { id: s.id, name: s.id })}</td><td>${s.outfit?.part_ids.length ?? "—"}</td><td>${t(s.ready ? costLabel(s.outfit) : s.outfit ? reason(s.outfit) : "配方待补充")}</td><td>${s.ready ? `${link(s.recipe.source_url, t("配方来源"))}${s.recipe.corroborating_urls.map((u) => " · " + link(u, t("交叉核对"))).join("")}<small>${t("来源更新日期")} ${s.recipe.source_published_date || t("未知")}<br>${t("采集时间")} ${esc(s.recipe.checked_at)}</small>` : "—"}</td></tr>`,
      )
      .join("")}</tbody></table></div></details>`;
  }
  function filterControls() {
    return (
      '<div class="mp-filters">' +
      [
        ["rarity", "品质", ["3", "4", "5"]],
        ["style", "风格", ["典雅", "清新", "甜美", "性感", "帅气"]],
        ["form", "形态", Object.keys(formLabel)],
        [
          "acquisition",
          "获取方式",
          [...new Set(D.outfits.map((o) => o.obtain).filter(Boolean))],
        ],
      ]
        .map(
          ([key, label, options]) =>
            `<label>${t(label)}<select data-mp-filter="${key}" aria-label="${t(label)}"><option value="">${t("全部")}</option>${options.map((v) => `<option value="${esc(v)}" ${filters[key] === v ? "selected" : ""}>${esc(t(key === "form" ? formLabel[v] : v))}</option>`).join("")}</select></label>`,
        )
        .join("") +
      "</div>"
    );
  }
  function coverage() {
    const a = D.audit,
      base = a.by_form.find((r) => r.value === "base"),
      den = base.total - base.not_crafting;
    return `<section class="ana-card mp-coverage"><div class="ana-card-head"><div><h2>${t("全量套装与配方覆盖")}</h2><p>${t("可制作原色")} ${num(base.complete)} / ${num(den)} · ${num(Math.round((base.complete / den) * 10000) / 100)}% · ${t("全形态目录")} ${num(a.complete)} / ${num(a.total)}</p></div><button class="ana-export" data-mp-audit-export>${t("导出全量配方盘点")} ↓</button></div><progress value="${base.complete}" max="${den}" aria-label="${t("配方覆盖率")}"></progress><div class="mp-form-counts">${a.by_form.map((f) => `<span>${t(formLabel[f.value])} <b>${num(f.total)}</b> · ${t("可计算")} ${num(f.complete)}</span>`).join("")}</div><p class="ana-note">${t("直接获取不计制作；搜索不到数据仅标待录入，未公开须有明确来源证据。")} ${t("制作材料获取指引")} ${num(a.materials_with_guidance)} / ${num(a.recipe_materials)} · ${t("已核对合成材料配方")} ${num(a.verified_material_synthesis)}</p><details><summary>${t("按品质与获取方式查看缺口")}</summary>${auditGroups(a.by_rarity, "品质")}${auditGroups(a.by_acquisition, "获取方式")}</details><p class="ana-lineage">${t("资料采集日期")} ${D.checked_at.slice(0, 10)} · ${t("网站构建日期")} ${D.built_at.slice(0, 10)}</p></section>`;
  }
  function auditGroups(rows, label) {
    return `<div class="ana-table-scroll"><table><thead><tr>${[label, "套装记录", "可计算", "待补录 / 核实", "直接获取"].map((s) => `<th>${t(s)}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr><th>${esc(t(String(r.value)))}</th><td>${num(r.total)}</td><td>${num(r.complete)}</td><td>${num(r.pending)}</td><td>${num(r.not_crafting)}</td></tr>`).join("")}</tbody></table></div>`;
  }
  function render() {
    invalid.clear();
    const r = result();
    return `<div class="analytics-page planning-page" data-no-translate><div class="ana-heading"><div><div class="ana-eyebrow">MIRALAND · MATERIAL PLANNER</div><h1>${t("材料规划")}</h1><p>${t("把心仪的套装，变成清晰的采集清单。")}</p></div><button class="ana-primary" data-mp-export ${r.status.length ? "" : "disabled"}>${t("导出材料清单 CSV")} ↓</button></div><ol class="mp-steps">${["选择目标", "汇总材料", "填写库存", "共同材料", "区域建议"].map((s, i) => `<li><span>${i + 1}</span>${t(s)}</li>`).join("")}</ol>${coverage()}${scope(r)}<div class="ana-two mp-select-layout"><section class="ana-card"><div class="ana-card-head"><div><h2>01 · ${t("选择目标套装")}</h2><p>${t("全部套装形态均已列出；可计算项已核对完整消耗清单。")}</p></div><button class="ana-export" data-mp-batch>${t("批量选择当前筛选")}</button></div><input class="mp-search" type="search" data-mp-search value="${esc(query)}" placeholder="${t("搜索套装名称或昵称")}" aria-label="${t("搜索套装名称或昵称")}">${filterControls()}<label class="mp-only"><input type="checkbox" data-mp-ready ${onlyReady ? "checked" : ""}>${t("仅显示可计算套装")}</label><div id="mp-choices">${choices()}</div></section><section class="ana-card mp-target-card"><div class="ana-card-head"><div><h2>${t("本次制作目标")}</h2><p>${t("切换筛选不会取消已选目标。")}</p></div><button class="ana-export" data-mp-clear>${t("清空目标")}</button></div>${selected(r)}<div id="mp-storage">${statusMessage()}</div></section></div><div class="ana-kpis" id="mp-kpis">${kpis(r)}</div><section class="ana-card"><div class="ana-card-head"><div><h2>02–04 · ${t("材料需求与库存")}</h2><p>${t("★ 共同材料由多个目标需要，可优先准备；红色标记不代表稀有度。")}</p></div></div><div id="mp-materials">${materialTable(r)}</div><p class="ana-note">${t("库存不会因规划而被消耗，也不会上传；清除浏览器数据会删除本地库存。")}</p><p class="ana-lineage">outfits → recipes → recipe_ingredients → materials · ${t("缺口")} = max(0, ${t("总需求量")} − ${t("已有库存")})</p></section><section class="ana-card"><div class="ana-card-head"><div><h2>05 · ${t("区域采集建议")}</h2><p>${t("按可覆盖的缺料种类数排序，共同材料种类数用于同分排序；未计算路程、时间或产量。")}</p></div><button class="ana-export" data-nav="map">${t("地图与采集")} ↗</button></div><div class="mp-region-note">${t("各区域是备选地点，标注数量为材料总缺口，不是该区域产量或分配额度；同一材料只需补足一次。")}</div><div id="mp-regions">${regions(r)}</div><div class="adv-actions"><button class="secondary-button" data-nav="advanced">${t("查看区域准备顺序与采集条件")} ↗</button></div><p class="ana-note">${t("仅提供区域级建议；没有可靠通行路径，无法生成精确采集路线。")}</p></section><section class="ana-card">${audit(r)}<p class="ana-note">${t("已核对材料名称随五语切换；未收录译名使用备用语言，并保留来源。")} ${link("https://infinity-nikki.fandom.com/wiki/Category:Items", t("名称来源"))}</p><p class="ana-lineage">${t("数据快照")} ${esc(D.snapshot_id)}<br>${D.source_tables.join(" · ")}</p></section></div>`;
  }
  function refresh() {
    const el = document.querySelector(".planning-page");
    if (el) el.outerHTML = render();
  }
  function updateCalculation() {
    const r = result();
    document.querySelector("#mp-kpis").innerHTML = kpis(r);
    document.querySelector("#mp-regions").innerHTML = regions(r);
    document.querySelector("#mp-storage").innerHTML = statusMessage();
    for (const row of r.rows) {
      const el = document.querySelector(`[data-mp-gap="${row.id}"]`);
      if (el) {
        el.textContent = num(row.gap);
        el.classList.toggle("done", row.gap === 0);
      }
    }
    document.querySelector("[data-mp-export]").disabled =
      invalid.size > 0 || !r.status.length;
  }
  document.addEventListener("input", (e) => {
    if (e.target.matches("[data-mp-search]")) {
      query = e.target.value;
      page = 1;
      document.querySelector("#mp-choices").innerHTML = choices();
    }
    if (e.target.matches("[data-mp-stock]")) {
      const id = e.target.dataset.mpStock;
      try {
        if (e.target.validity.badInput) throw Error();
        const n = M.inventoryValue(e.target.value, M.unitFor(D, id));
        if (n === null) delete state.inventory[id];
        else state.inventory[id] = n;
        invalid.delete(id);
        e.target.removeAttribute("aria-invalid");
        persist();
      } catch {
        invalid.add(id);
        e.target.setAttribute("aria-invalid", "true");
      }
      updateCalculation();
    }
  });
  document.addEventListener("change", (e) => {
    if (e.target.matches("[data-mp-filter]")) {
      filters[e.target.dataset.mpFilter] = e.target.value;
      page = 1;
      document.querySelector("#mp-choices").innerHTML = choices();
    }
    if (e.target.matches("[data-mp-ready]")) {
      onlyReady = e.target.checked;
      page = 1;
      document.querySelector("#mp-choices").innerHTML = choices();
    }
    if (e.target.matches("[data-mp-target]")) {
      const id = e.target.dataset.mpTarget;
      if (!readyIDs.has(id)) return;
      state.targets = e.target.checked
        ? [...new Set([...state.targets, id])]
        : state.targets.filter((v) => v !== id);
      persist();
      refresh();
    }
  });
  document.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.hasAttribute("data-mp-audit-export")) {
      const rows = D.outfits.map((o) => ({
        outfit_id: o.id,
        name: name(o),
        form_type: o.form_type,
        rarity: o.rarity,
        acquisition: o.obtain,
        status: o.availability.status,
        reason: t(reason(o)),
        source_url: o.availability.source_url,
        snapshot_id: D.snapshot_id,
      }));
      const url = URL.createObjectURL(
          new Blob([M.csv(rows)], { type: "text/csv;charset=utf-8" }),
        ),
        a = document.createElement("a");
      a.href = url;
      a.download = "miraland-recipe-audit.csv";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    if (b.hasAttribute("data-mp-batch")) {
      const matched = selectRows(),
        ready = matched.filter((o) => readyIDs.has(o.id)).map((o) => o.id),
        skipped = matched.filter((o) => !readyIDs.has(o.id)).map((o) => o.id);
      state.targets = [...new Set([...state.targets, ...ready])];
      state.skipped = skipped;
      persist();
      refresh();
    }
    if (b.hasAttribute("data-mp-clear")) {
      state.targets = [];
      state.skipped = [];
      persist();
      refresh();
    }
    if (b.dataset.mpRemove) {
      state.targets = state.targets.filter((id) => id !== b.dataset.mpRemove);
      persist();
      refresh();
    }
    if (b.dataset.mpPage) {
      page = Number(b.dataset.mpPage);
      document.querySelector("#mp-choices").innerHTML = choices();
    }
    if (b.hasAttribute("data-mp-export") && !invalid.size) {
      const rows = M.exportRows(result(), I.locale, name),
        blob = new Blob([M.csv(rows)], { type: "text/csv;charset=utf-8" }),
        url = URL.createObjectURL(blob),
        a = document.createElement("a");
      a.href = url;
      a.download = "miraland-material-plan.csv";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  });
  window.addEventListener("storage", (e) => {
    if (e.key !== key && e.key !== null) return;
    try {
      state = e.newValue ? M.restore(D, JSON.parse(e.newValue)) : emptyState();
      storageOkay = true;
      loadError = false;
    } catch {
      storageOkay = false;
      loadError = true;
    }
    refresh();
  });
  window.NikkiPlanning = { render, getResult: result, refresh };
})();
