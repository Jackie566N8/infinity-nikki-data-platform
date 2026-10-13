(() => {
  "use strict";
  const D = window.NIKKI_ADVANCED_DATA,
    M = window.NikkiAdvancedModel,
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
    raw = new Map(window.NIKKI_DATA.records.map((r) => [r.id, r])),
    byId = new Map(D.documents.map((r) => [r.id, r])),
    name = (id) => I.name(raw.get(id) || byId.get(id) || { name: id, id }),
    pct = (v) => (v === null ? "—" : (v * 100).toFixed(1) + "%"),
    num = (v) => Number(v).toLocaleString(I.locale);
  const fieldLabels = {
      style: "主风格",
      tags: "图鉴标签",
      rarity: "品质",
      methods: "获取渠道",
      colors: "套装颜色",
      elements: "套装元素",
      difficulty: "实测获取难度",
    },
    methods = {
      gacha: "抽卡 / 共鸣",
      shop: "商城入口",
      event: "活动",
      craft: "制作线索（设计图）",
      quest: "任务",
      explore: "探索 / 收集",
      challenge: "搭配挑战",
      home: "家园",
    };
  let selected = "o10349",
    filters = { rarity: "", style: "", method: "" },
    researchPage = 1;
  let engine;
  const link = (url, label) =>
    /^https?:\/\//.test(url || "")
      ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(label)} ↗</a>`
      : "";
  function getRecommendations(id, limit = 6, f = {}) {
    const base = D.form_to_base[id];
    if (!base) return [];
    if (!Object.values(f).some(Boolean))
      return (D.recommendations[base] || []).slice(0, limit);
    engine ||= M.createModel(D.documents);
    return engine.recommend(base, limit, f);
  }
  function reasons(r) {
    return r.blocks
      .filter((b) => b.shared.length)
      .map(
        (b) =>
          t(fieldLabels[b.field]) +
          "：" +
          b.shared
            .map((v) =>
              b.field === "rarity"
                ? v + " ★"
                : b.field === "methods"
                  ? t(methods[v] || v)
                  : t(v),
            )
            .join(" · "),
      )
      .join("；");
  }
  function sourceDetails(a, b) {
    const rows = [a, b].filter(Boolean);
    return `<details class="adv-evidence"><summary>${t("查看依据与贡献")}</summary>${rows.map((d) => `<p>${esc(name(d.id))} · ${esc(d.id)} ${link(d.source_url, t("图鉴来源"))}</p>${(d.method_evidence || []).map((e) => `<p>${t("获取渠道")}：${esc(t(methods[e.method] || e.method))} ${link(e.source_url, t("原文"))}</p>`).join("")}`).join("")}</details>`;
  }
  function cards(id, f = {}) {
    const base = D.form_to_base[id],
      a = byId.get(base),
      rows = getRecommendations(id, 6, f);
    return rows.length
      ? `<div class="adv-recommendations">${rows
          .map((r) => {
            const b = byId.get(r.id),
              record = raw.get(r.id);
            return `<article class="adv-recommendation"><button class="adv-item" data-detail="${r.id}">${record?.image ? `<img loading="lazy" src="${esc(record.image)}" alt="${esc(name(r.id))}" onerror="this.hidden=true">` : '<span aria-hidden="true">✧</span>'}<b>${esc(name(r.id))}</b><small>${esc(t(b.style))} · ${b.rarity} ★</small></button><div class="adv-meter"><span>${t("特征相似度")} ${pct(r.score)}</span><progress aria-label="${esc(t("特征相似度"))}" value="${r.score}" max="1">${pct(r.score)}</progress></div><p>${esc(reasons(r))}</p><small>${t("有效特征权重覆盖")} ${pct(r.coverage)}</small><details class="adv-evidence"><summary>${t("计算明细")}</summary>${r.blocks.map((c) => `<div>${t(fieldLabels[c.field])} · ${t("权重")} ${c.weight} · cos ${c.similarity.toFixed(3)} · ${t("贡献")} ${c.contribution.toFixed(3)}</div>`).join("")}</details>${sourceDetails(a, b)}</article>`;
          })
          .join("")}</div>`
      : `<p class="adv-note">${t("当前条件下没有足够依据推荐套装。")}</p>`;
  }
  function recommendationDetails(record) {
    if (record.kind !== "outfits") return "";
    const base = D.form_to_base[record.id];
    return `<section class="detail-bottom adv-detail" data-no-translate><h3>${t("你可能也喜欢")}</h3><p class="adv-note">${t("按独立原色套装推荐，排除同家族进化与焕新；附加形态使用原色参考画像。相似度不是喜欢概率。")}${record.id !== base ? " " + t("当前参考原色") + "：" + esc(name(base)) : ""}</p>${cards(record.id)}<p class="adv-note">${t("套装级颜色、元素及实测难度待补充，未据部件或名称推断。获取渠道不等同获取难度。")} <button class="adv-link" data-adv-open>${t("方法、覆盖率与研究")} ↗</button></p></section>`;
  }
  function select(key, label, values) {
    return `<label><span>${t(label)}</span><select data-adv-filter="${key}"><option value="">${t("全部")}</option>${values.map(([v, l]) => `<option value="${esc(v)}" ${filters[key] === String(v) ? "selected" : ""}>${esc(t(l))}</option>`).join("")}</select></label>`;
  }
  function researchTable() {
    const S = D.nickname_study,
      rows = S.rows.slice((researchPage - 1) * 12, researchPage * 12),
      pages = Math.ceil(S.rows.length / 12);
    return `<div class="adv-scroll"><table><thead><tr><th>${t("社区昵称")}</th><th>${t("正式名称")}</th><th>${t("字面相似度")}</th><th>${t("证据来源")}</th></tr></thead><tbody>${rows.map((r) => `<tr><td>${esc(I.nickname(r.alias))}</td><td><button class="adv-link" data-detail="${r.outfit_id}">${esc(name(r.outfit_id))}</button><small>${esc(r.outfit_id)}</small></td><td>${pct(r.name_similarity)}</td><td>${r.sources.map((s) => link(s.url, s.platform) + "<small>" + esc(t(s.note)) + "</small>").join("")}<small>${t("创造机制待考证")}</small></td></tr>`).join("")}</tbody></table></div><div class="adv-pagination"><button data-adv-page="${researchPage - 1}" ${researchPage === 1 ? "disabled" : ""}>${t("上一页")}</button><span>${researchPage} / ${pages}</span><button data-adv-page="${researchPage + 1}" ${researchPage === pages ? "disabled" : ""}>${t("下一页")}</button></div>`;
  }
  function render() {
    const S = D.nickname_study;
    return `<div class="advanced-page" data-no-translate><div class="adv-heading"><div><span class="ana-eyebrow">MIRALAND · DATA SCIENCE</span><h1>${t("推荐与昵称研究")}</h1><p>${t("用可追溯的特征，解释相遇的理由。")}</p></div><button class="ana-primary" data-adv-export="report">${t("导出研究数据")} JSON ↓</button></div><p class="adv-note">${t("数据快照")} ${esc(D.provenance.snapshot_id)} · ${t("昵称证据核对")} ${D.provenance.alias_checked_at}</p>
<div class="adv-tabs"><a href="#adv-similar">${t("相似套装")}</a><a href="#adv-nicknames">${t("昵称研究")}</a><a href="#adv-route">${t("采集准备")}</a><a href="#adv-privacy">${t("搜索使用方案")}</a></div>
<section class="ana-card" id="adv-similar"><div class="ana-card-head"><div><h2>${t("相似套装推荐")}</h2><p>${t("按独立原色套装推荐，排除同家族进化与焕新；附加形态使用原色参考画像。相似度不是喜欢概率。")}</p></div><button class="ana-export" data-adv-export="recommendations">CSV ↓</button></div><div class="adv-controls"><label class="adv-target"><span>${t("参考套装")}</span><select data-adv-target>${D.documents.map((o) => `<option value="${o.id}" ${o.id === selected ? "selected" : ""}>${esc(name(o.id))} · ${o.rarity} ★</option>`).join("")}</select></label>${select(
      "rarity",
      "品质",
      [...new Set(D.documents.map((r) => r.rarity))]
        .sort((a, b) => b - a)
        .map((v) => [String(v), v + " ★"]),
    )}${select(
      "style",
      "风格",
      [...new Set(D.documents.map((r) => r.style))]
        .filter(Boolean)
        .map((v) => [v, v]),
    )}${select("method", "获取渠道", Object.entries(methods))}</div>${cards(selected, filters)}<details class="adv-evidence"><summary>${t("推荐公式与统计边界")}</summary><p>${t("分块余弦相似度：分子为已知字段权重乘余弦之和，分母为两侧均有数据的字段权重之和。标签使用 IDF，缺失字段不当作不相似。")}</p><p><code>Σ(w × cosine) / Σ(w known to both)</code> · <code>IDF = log((N+1)/(df+1))+1</code></p><p>${t("至少有共同风格、标签或已核实视觉依据，最低得分 0.35，最多展示 6 套。权重为声明的启发式规则，尚未通过玩家反馈验证。")}</p><p>${t("覆盖率分母为全部预设字段权重总和，不能把低覆盖的高分理解为全面相似。")}</p></details><h3>${t("原色套装特征覆盖率")}</h3><div class="adv-coverage">${D.coverage.map((c) => `<div><span>${t(fieldLabels[c.field])}</span><b>${c.numerator} / ${c.denominator}</b><progress aria-label="${esc(t(fieldLabels[c.field]))}" value="${c.numerator}" max="${c.denominator}"></progress><small>${t("权重")} ${c.weight}</small></div>`).join("")}</div><p class="adv-note">${t("套装级颜色、元素及实测难度待补充，未据部件或名称推断。获取渠道不等同获取难度。")}</p><p class="ana-lineage">${t("来源表")}：objects + outfits + object_tags + source_assertions · ${esc(D.provenance.method_version)}</p></section>
<section class="ana-card" id="adv-nicknames"><div class="ana-card-head"><div><h2>${t("社区昵称研究")}</h2><p>${t("有出处的称呼样本，不代表全体玩家偏好；本次未重新抓取社交媒体。")}</p></div><button class="ana-export" data-adv-export="nicknames">CSV ↓</button></div><div class="adv-kpis">${[
      ["收录原色", S.object_count + " / " + S.denominator_base_outfits],
      ["实际昵称观察", S.alias_count],
      ["多昵称对象率", pct(S.multiplicity_rate)],
      ["昵称歧义率", pct(S.ambiguity_rate)],
    ]
      .map(([k, v]) => `<div><span>${t(k)}</span><strong>${v}</strong></div>`)
      .join(
        "",
      )}</div><p class="adv-note">${t("多昵称对象率：有多个规范化昵称的对象 / 样本对象。歧义率：指向多个对象的昵称词 / 样本昵称词。两者不是同一指标。")}</p><p>${t("昵称来源平台")}：${S.platforms.map((p) => esc(p.platform) + " " + p.source_count).join(" · ")} · ${t("来源页总数")} ${S.source_count}</p><p class="adv-note">${t("平台数是来源页数，不是玩家样本量，也不是热度。观察时间未知，核对时间不等于称呼产生时间。")}</p><p class="adv-note">${t("所有观察为社区已使用的称呼；首创者、官方创造或翻译形成尚未证实，创造机制待考证。")}</p><h3>${t("昵称与正式名的字面相似度")}</h3><div class="adv-histogram" role="img" aria-label="${esc(t("昵称与正式名的字面相似度"))}">${S.bins.map((b, i) => `<div><span>${b.min.toFixed(1)}–${b.max.toFixed(1)}${i === 4 ? " *" : ""}</span><div><i style="width:${(b.count / Math.max(1, ...S.bins.map((r) => r.count))) * 100}%"></i></div><b>${b.count}</b></div>`).join("")}</div><p class="adv-note">${t("区间左闭右开，最后一组含 1；每个实际昵称计一次。繁简和套装后缀规范化；生成的检索别名、进化继承别名不另计。")} · ${t("平均字面相似度")} ${S.mean_similarity.toFixed(3)}</p><details class="adv-evidence"><summary>${t("字面距离的解释")}</summary><p>${t("相似度 = 1 − 编辑距离 / 最大字符长度。只衡量字面，不衡量语义或人气；低字面相似度说明需要昵称词典，不能证明推荐或搜索效果提升。")}</p></details><div id="adv-research-table">${researchTable()}</div></section>
<section class="ana-card" id="adv-route"><h2>${t("材料采集准备")}</h2>${routePanel()}<p class="ana-lineage">${t("来源表")}：recipe_ingredients → materials → gathering_areas / gathering_points</p></section>
<section class="ana-card" id="adv-privacy"><h2>${t("搜索使用分析方案")}</h2><p class="adv-status">${t("仅设计，未启用；不采集搜索或点击日志。")}</p><p>${t("未来需用户主动同意，默认关闭。查询可能含个人信息，应在本地删除或遮盖敏感内容；原始查询词需另行明确同意。")}</p><div class="adv-scroll"><table><thead><tr><th>${t("拟定字段")}</th><th>${t("用途与限制")}</th></tr></thead><tbody>${[
      ["event_id", "随机事件号，无账号或设备关联"],
      [
        "query_category / query_text_redacted",
        "默认类别；经另行同意才记录脱敏查询词",
      ],
      [
        "result_count / clicked_object_id",
        "零结果与点击统计；无点击不等于不满意",
      ],
      ["timestamp_hour / search_method_version", "小时级 UTC 与算法版本"],
      [
        "consent_version / consent_receipt",
        "同意版本与可撤回凭据；凭据单独存储",
      ],
    ]
      .map(([k, v]) => `<tr><th><code>${k}</code></th><td>${t(v)}</td></tr>`)
      .join(
        "",
      )}</tbody></table></div><p>${t("拟定指标：零结果率、热门脱敏词、无点击率与主动反馈。样本只代表同意参与的用户。保留期拟定 30 天，可撤回和删除；方案未上线，不提供真实使用指标。")}</p><p class="adv-note">${t("脱敏不保证匿名。需评估重识别风险，不保留 IP、设备标识、游戏账号、完整时间或跨站行为。个人衣橱不进入日志。")}</p><button class="ana-export" data-adv-export="telemetry">${t("下载日志字段方案")} JSON ↓</button></section></div>`;
  }
  function routePanel() {
    const plan = window.NikkiPlanning.getResult(),
      R = M.regionPlan(plan),
      material = (id) => name(id),
      unit = (u) => t(u === "kg" ? "千克" : "件");
    return `<div class="adv-route" data-no-translate><p class="adv-status">${t("区域准备顺序；精确采集路线待补充。")}</p><p class="adv-note">${t("基于本地材料计划，不受地图当前选中区域限制。")} · ${t("可计算目标")} ${plan.totals.ready} / ${plan.totals.selected}${plan.totals.pending ? " · " + t("数据不全目标未纳入计算") : ""}</p><p class="adv-note">${t("没有已核实坐标、传送点或通行路径，不能计算距离或最短路线。下面的编号只表示材料覆盖优先顺序。")}</p>${!plan.totals.ready ? `<p>${t("先在材料规划选择可计算套装并填写库存。")}</p>` : !R.steps.length ? `<p>${t("当前没有可安排区域的采集缺口。")}</p>` : `<ol class="adv-route-list">${R.steps.map((s) => `<li><span class="adv-step">${s.order}</span><div><h3>${esc(t(s.region))}</h3><p>${t("尚未安排的材料种数")} ${s.rows.length}</p><ul>${s.rows.map((r) => `<li><button class="adv-link" data-detail="${r.id}">${esc(material(r.id))}</button> · ${t("总缺口")} ${r.gap} ${unit(r.unit)}${r.shared ? " · ★ " + t("共同材料") : ""}<small>${t("候选区域")}：${r.alternatives.map((v) => esc(t(v))).join(" · ")}</small>${r.evidence.map((e) => `<small>${esc(t(e.condition_text || "采集条件待补充"))} ${link(e.source_url, t("采集来源"))}</small>`).join("")}</li>`).join("")}</ul></div></li>`).join("")}</ol>`}<p class="adv-note">${t("同一材料只安排一次；优先覆盖更多未安排材料，平局优先共同材料。候选产区可能重叠，编号不表示真实路程；总缺口不代表当地供应量。")}</p><p class="adv-note">${t("传送点、跨区通行、天气、时段和能力解锁待核实；请查阅条件原文，确认后再采集。")}</p>${R.unknown_region_ids.length ? `<p>${t("区域待补充")}：${R.unknown_region_ids.map((id) => `<button class="adv-link" data-detail="${id}">${esc(material(id))}</button>`).join(" · ")}</p>` : ""}${R.non_gathering_ids.length ? `<p>${t("活动、商店等非采集途径")}：${R.non_gathering_ids.map((id) => `<button class="adv-link" data-detail="${id}">${esc(material(id))}</button>`).join(" · ")}</p>` : ""}<div class="adv-actions"><button class="secondary-button" data-nav="planning">${t("调整材料规划")}</button><button class="secondary-button" data-nav="map">${t("查看地图来源")}</button>${plan.totals.ready ? `<button class="ana-export" data-adv-export="regions">${t("导出区域准备清单")} CSV ↓</button>` : ""}</div></div>`;
  }
  function download(content, type, file) {
    const url = URL.createObjectURL(new Blob([content], { type })),
      a = document.createElement("a");
    a.href = url;
    a.download = file;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function exportData(which) {
    let data,
      type = "application/json",
      file = "miraland-advanced.json";
    if (which === "report") data = JSON.stringify(D, null, 2);
    if (which === "telemetry") {
      data = JSON.stringify(
        {
          enabled: false,
          design_only: true,
          default_collection: "none",
          consent: "explicit_opt_in; separate raw-query permission",
          proposed_fields: [
            "event_id",
            "query_category",
            "query_text_redacted",
            "result_count",
            "clicked_object_id",
            "first_click_rank",
            "timestamp_hour",
            "search_method_version",
            "classifier_version",
            "explicit_feedback",
            "consent_version",
            "consent_receipt_hash",
            "expires_at",
          ],
          retention_days: 30,
          no_session_or_device_id: true,
          metrics: [
            "zero_results_rate",
            "top_redacted_queries",
            "no_click_rate",
            "explicit_feedback",
          ],
          caveat:
            "no_click is not dissatisfaction; redaction is not guaranteed anonymity",
        },
        null,
        2,
      );
      file = "search-usage-design.json";
    }
    if (which === "recommendations") {
      data = window.NikkiPlanningModel.csv(
        getRecommendations(selected, 6, filters).map((r, i) => ({
          source_id: selected,
          target_id: r.id,
          rank: i + 1,
          similarity: r.score,
          feature_weight_coverage: r.coverage,
          explanations: reasons(r),
          blocks: JSON.stringify(r.blocks),
          filters: JSON.stringify(filters),
          scope: D.provenance.scope,
          snapshot_id: D.provenance.snapshot_id,
          method_version: D.provenance.method_version,
        })),
      );
      type = "text/csv;charset=utf-8";
      file = "outfit-recommendations.csv";
    }
    if (which === "nicknames") {
      data = window.NikkiPlanningModel.csv(
        D.nickname_study.rows.map((r) => ({
          ...r,
          sources: JSON.stringify(r.sources),
          sample_scope: "source_attested_nicknames; not_all_players",
          snapshot_id: D.provenance.snapshot_id,
        })),
      );
      type = "text/csv;charset=utf-8";
      file = "nickname-study.csv";
    }
    if (which === "regions") {
      const p = window.NikkiPlanning.getResult(),
        r = M.regionPlan(p);
      data = window.NikkiPlanningModel.csv([
        {
          row_type: "header",
          scope: r.mode,
          exact_route: false,
          point_count: 0,
          teleport_count: 0,
          distance: null,
          selected_ids: p.status.map((r) => r.id).join("|"),
          pending_ids: p.status
            .filter((r) => !r.ready)
            .map((r) => r.id)
            .join("|"),
          snapshot_id: p.snapshot_id,
        },
        ...r.steps.flatMap((s) =>
          s.rows.map((row) => ({
            row_type: "area_preparation",
            order: s.order,
            region: s.region,
            material_id: row.id,
            material_name: name(row.id),
            total_shortage: row.gap,
            unit: row.unit,
            alternative_regions: row.alternatives.join("|"),
            local_supply: "unknown",
            conditions: row.evidence.map((e) => e.condition_text).join("|"),
            source_urls: row.evidence.map((e) => e.source_url).join("|"),
            scope: r.mode,
          })),
        ),
        ...r.unknown_region_ids.map((id) => ({
          row_type: "unknown_region",
          material_id: id,
        })),
        ...r.non_gathering_ids.map((id) => ({
          row_type: "non_gathering",
          material_id: id,
        })),
      ]);
      type = "text/csv;charset=utf-8";
      file = "area-preparation.csv";
    }
    if (data !== undefined) download(data, type, file);
  }
  function refresh() {
    const el = document.querySelector(".advanced-page");
    if (el) el.outerHTML = render();
  }
  document.addEventListener("change", (e) => {
    if (e.target.hasAttribute("data-adv-target")) {
      selected = e.target.value;
      refresh();
    }
    if (e.target.dataset.advFilter) {
      filters[e.target.dataset.advFilter] = e.target.value;
      refresh();
    }
  });
  document.addEventListener("click", (e) => {
    const exp = e.target.closest("[data-adv-export]"),
      p = e.target.closest("[data-adv-page]"),
      jump = e.target.closest(".adv-tabs a");
    if (exp) exportData(exp.dataset.advExport);
    if (p) {
      researchPage = Number(p.dataset.advPage);
      document.querySelector("#adv-research-table").innerHTML = researchTable();
    }
    if (jump) {
      e.preventDefault();
      document.querySelector(jump.getAttribute("href"))?.scrollIntoView({
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
      });
    }
    if (e.target.closest("[data-adv-open]")) {
      document.querySelector("#detail")?.close();
      window.MiralandArchive.openSection("advanced");
    }
  });
  function qualityPanel() {
    return `<section class="adv-quality" data-no-translate><h2>${t("原色套装特征覆盖率")}</h2><div class="adv-coverage">${D.coverage.map((c) => `<div><span>${t(fieldLabels[c.field])}</span><b>${c.numerator} / ${c.denominator}</b><progress aria-label="${esc(t(fieldLabels[c.field]))}" value="${c.numerator}" max="${c.denominator}"></progress></div>`).join("")}</div><p class="adv-note">${t("套装级颜色、元素及实测难度待补充，未据部件或名称推断。获取渠道不等同获取难度。")}</p><button class="adv-link" data-nav="advanced">${t("方法、覆盖率与研究")} ↗</button></section>`;
  }
  window.NikkiAdvanced = {
    render,
    recommendationDetails,
    routePanel,
    getRecommendations,
    exportData,
    qualityPanel,
  };
})();
