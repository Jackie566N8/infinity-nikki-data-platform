(() => {
  "use strict";
  const R = window.NIKKI_RESEARCH_DATA,
    I = window.NikkiI18n;
  if (!R || !I) return;
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
    pct = (v) => (v * 100).toFixed(1) + "%",
    name = (id) => I.name(raw.get(id) || { id, name: id }),
    link = (url, label) =>
      `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(label)} ↗</a>`;
  let chosen = 1;
  function members() {
    const c = R.clusters.find((c) => c.cluster === chosen);
    return `<h3>${t("分组成员")} ${chosen} · ${c.n}</h3><div class="rs-members">${c.ids.map((id) => `<button class="adv-link" data-detail="${id}">${esc(name(id))}</button>`).join("")}</div>`;
  }
  function render() {
    if (R.snapshot_id !== window.NIKKI_QUALITY.snapshot.snapshot_id)
      return `<div class="empty"><h1>${t("研究资料待更新")}</h1><p>${t("研究快照与图鉴版本不一致，暂不混合展示。")}</p></div>`;
    const a = R.association,
      C = window.NIKKI_ANALYTICS_DATA;
    return `<div class="research-page analytics-page" data-no-translate><div class="ana-heading"><div><span class="ana-eyebrow">MIRALAND · RESEARCH LAB</span><h1>${t("研究实验室")}</h1><p>${t("关联、聚类与评估不确定性：从结果到证据。")}</p></div><button class="ana-primary" data-rs-export="report">JSON ↓</button></div><p class="ana-note">${t("独立原色")} N=${R.n} · ${t("固定目录实验，不随图鉴筛选变化。")} · <code>${esc(R.snapshot_id)}</code></p>
<section class="ana-card"><h2>${t("品质与主风格的关联")}</h2><p class="ana-note">${t("Cramér’s V 衡量类别关联强度；不是因果关系或玩家偏好。")}</p><div class="adv-kpis">${[
      ["Cramér’s V", a.cramers_v.toFixed(3)],
      ["χ²", a.chi_square.toFixed(2)],
      [t("置换 p 值"), a.permutation_p.toFixed(4)],
      [t("样本量"), a.n],
    ]
      .map(([k, v]) => `<div><span>${k}</span><strong>${v}</strong></div>`)
      .join(
        "",
      )}</div><div class="adv-scroll"><table><thead><tr><th>${t("品质")}</th>${a.styles.map((s) => `<th>${t(s)}</th>`).join("")}</tr></thead><tbody>${a.rarities.map((q, i) => `<tr><th>${q} ★</th>${a.counts[i].map((n) => `<td>${n}</td>`).join("")}</tr>`).join("")}</tbody></table></div><p>${t(a.permutation_p<0.05?'目录置换检验提示关联线索；只对本目录成立，不解释为因果或玩家偏好。':'当前目录中的关联较弱，置换检验未提供显著关联证据；不能说品质导致风格变化。')}</p><p class="ana-note">${t("固定种子")} ${a.seed} · ${a.permutations} ${t("次置换")} · ${t("目录不是随机抽样，检验仅作探索。")}</p><button class="ana-export" data-rs-export="association">CSV ↓</button><p class="ana-lineage">objects.rarity/style + outfits.is_base</p></section>
<section class="ana-card"><h2>${t("套装特征聚类")}</h2><p class="ana-note">${t("使用主风格、图鉴标签、品质、获取渠道的加权余弦距离；没有推断整套颜色、元素或玩家画像。")}</p><div class="adv-kpis"><div><span>${t("选择的 K")}</span><strong>${R.selected_k}</strong></div><div><span>${t("平均轮廓系数")}</span><strong>${R.silhouette.toFixed(3)}</strong></div><div><span>${t("去掉获取渠道后的 ARI")}</span><strong>${R.sensitivity.without_methods.ari_vs_main.toFixed(3)}</strong></div><div><span>${t("去掉标签后的 ARI")}</span><strong>${R.sensitivity.without_tags.ari_vs_main.toFixed(3)}</strong></div></div><div class="rs-k-bars">${R.selection.map((v) => `<div><span>K=${v.k}${v.k === R.selected_k ? " ★" : ""}</span><progress max="1" value="${Math.max(0, v.silhouette)}" aria-label="K ${v.k} silhouette"></progress><b>${v.silhouette.toFixed(3)}</b></div>`).join("")}</div><p>${t("这五组主要复现已有主风格，尚未发现超越标签的新隐藏结构；ARI=1 表示去掉字段后分组仍一致。")}</p><p class="ana-note">${t("K=2–8，每个 K 五次初始化；按同一目录的轮廓系数选型，属于探索而非外部验证。")}</p><div class="adv-scroll"><table><thead><tr>${["分组", "数量", "代表套装", "主风格", "常见标签"].map((k) => `<th>${t(k)}</th>`).join("")}</tr></thead><tbody>${R.clusters
      .map(
        (c) =>
          `<tr><td><button class="adv-link" data-rs-cluster="${c.cluster}">${c.cluster} ↗</button></td><td>${c.n}</td><td><button class="adv-link" data-detail="${c.medoid_id}">${esc(name(c.medoid_id))}</button></td><td>${Object.entries(
            c.styles,
          )
            .map(([s, n]) => esc(t(s)) + " " + n)
            .join(
              " · ",
            )}</td><td>${c.top_tags.map(([tag, n]) => esc(t(tag)) + " " + n).join(" · ")}</td></tr>`,
      )
      .join(
        "",
      )}</tbody></table></div><div id="rs-members">${members()}</div><button class="ana-export" data-rs-export="clusters">CSV ↓</button><p class="ana-lineage">outfits + object_tags + source_assertions · Python / NumPy / DuckDB</p></section>
${window.NikkiHumanEval?.panel()||''}
${uncertaintyPanel()}
<section class="ana-card"><h2>${t("官方日期与活动样本")}</h2><p class="ana-note">${t("公告发布日期、推出日期和网站采集日期分开；只展示已核对样本，不补造完整历史。")}</p><div class="adv-scroll"><table><thead><tr>${["版本", "公告推出日期", "来源时区", "公告发布日期", "来源"].map((k) => `<th>${t(k)}</th>`).join("")}</tr></thead><tbody>${C.official_calendar.map((v) => `<tr><td>${v.version_number}</td><td>${v.launch_date}</td><td>${v.time_zone}</td><td>${v.source_published_date}</td><td>${link(v.source_url, t("官方公告"))}</td></tr>`).join("")}</tbody></table></div><details><summary>${t("活动样本")} ${C.events.length}</summary>${C.events.map((e) => `<div class="rs-event"><b>${esc(e.name)}</b><p>${e.start_date} → ${e.end_datetime} · ${e.time_zone}</p><p class="ana-note">${t("更新后开启，精确开始时间未知；公告排期不等于当前开放。")}</p>${e.objects.map((o) => `<button class="adv-link" data-detail="${o.object_id}">${esc(name(o.object_id))}</button>`).join(" · ")} · ${link(e.source_url, t("来源"))}</div>`).join("")}</details></section></div>`;
  }
  function uncertaintyPanel() {
    const s = R.search_uncertainty,
      f = s.methods.F;
    return `<section class="ana-card rs-uncertainty" data-no-translate><h2>${t("搜索评估：效果与不确定性")}</h2><p class="adv-status">${t("候选标签，真人审核为 0；不是正式 Gold Standard。")} · historical 100-query candidate experiment (not the human-reviewed subset)</p><div class="adv-scroll"><table><thead><tr>${["方法", "正例数量", "Hit@1", "查询独立假设下的95%区间", "负例数量", "无答案识别率"].map((k) => `<th>${t(k)}</th>`).join("")}</tr></thead><tbody>${Object.entries(
      s.methods,
    )
      .map(
        ([m, v]) =>
          `<tr><th>${m}</th><td>${v.positive_n}</td><td>${pct(v.hit1)}</td><td>${v.hit1_wilson_query_iid_only.map(pct).join(" – ")}</td><td>${v.negative_n}</td><td>${pct(v.no_answer_rate)}</td></tr>`,
      )
      .join(
        "",
      )}</tbody></table></div><p>${t("F 相对 C 提高 50 个百分点，但按四个套装家族配对的双侧精确检验 p=0.125，不能宣称已证明显著泛化提升。")}</p><p class="ana-note">${t("上述 Wilson 区间假设查询独立，而同一家族改写相关；区间仅供诊断。六个负例全正确，其独立假设区间下界约61%，不能理解为拒答能力已稳定达到100%。")}</p><p class="ana-note">${t("保留原冻结测试与权重；新视觉标签和调参需要新版本及独立的人审测试集。")}</p><button class="ana-export" data-rs-export="uncertainty">CSV ↓</button><button class="ana-export" data-nav="search_eval">${t("完整搜索评估")} ↗</button></section>`;
  }
  function download(content, file, type) {
    const url = URL.createObjectURL(new Blob([content], { type })),
      a = document.createElement("a");
    a.href = url;
    a.download = file;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  document.addEventListener("click", (e) => {
    const c = e.target.closest("[data-rs-cluster]"),
      b = e.target.closest("[data-rs-export]");
    if (c) {
      chosen = Number(c.dataset.rsCluster);
      document.querySelector("#rs-members").innerHTML = members();
    }
    if (b) {
      const kind = b.dataset.rsExport;
      if (kind === "report") {
        download(
          JSON.stringify(R, null, 2),
          "research-report.json",
          "application/json",
        );
        return;
      }
      let rows = [];
      if (kind === "association")
        rows = R.association.rarities.flatMap((q, i) =>
          R.association.styles.map((style, j) => ({
            rarity: q,
            style,
            count: R.association.counts[i][j],
          })),
        );
      if (kind === "clusters")
        rows = R.clusters.flatMap((c) =>
          c.ids.map((id) => ({
            cluster: c.cluster,
            outfit_id: id,
            outfit_name: name(id),
            medoid_id: c.medoid_id,
            k: R.selected_k,
            silhouette: R.silhouette,
            scope: "independent_base_catalog_not_players",
          })),
        );
      if (kind === "uncertainty")
        rows = Object.entries(R.search_uncertainty.methods).map(
          ([method, v]) => ({
            method,
            ...v,
            hit1_wilson_query_iid_only: JSON.stringify(
              v.hit1_wilson_query_iid_only,
            ),
            no_answer_wilson_query_iid_only: JSON.stringify(
              v.no_answer_wilson_query_iid_only,
            ),
            human_approved: 0,
          }),
        );
      download(
        window.NikkiPlanningModel.csv(
          rows.map((r) => ({
            ...r,
            snapshot_id: R.snapshot_id,
            method: R.method,
            seed: R.seed,
          })),
        ),
        kind + ".csv",
        "text/csv;charset=utf-8",
      );
    }
  });
  window.NikkiResearch = { render, uncertaintyPanel };
})();
