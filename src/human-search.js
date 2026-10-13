(() => {
  "use strict";
  const R = window.NIKKI_HUMAN_SEARCH_EVALUATION,
    I = window.NikkiI18n;
  if (!R || !I) return;
  const labels = {
    "zh-CN": [
      "真人搜索审核 · 50 条",
      "用户回传；单一审核人、预测可见，非独立盲审。44 正例、6 无答案；原划分35 dev / 15 test。",
      "原 F 按类型",
      "正式名",
      "昵称",
      "错字 / 拼音",
      "描述性",
      "多语言",
      "原 F 漏检古典乐张；F_v2 以已收录名称的单字同音回退修复。测试增幅0，不是新的未见测试。",
      "首次100条候选基准作为历史保留，不与人审混合。",
      "下载人审报告 JSON",
    ],
    en: [
      "Human search review · 50 queries",
      "User-supplied, single reviewer, visible predictions, not blind. 44 positives / 6 negatives; original 35 dev / 15 test split.",
      "Original F by type",
      "Formal",
      "Nickname",
      "Typo / pinyin",
      "Description",
      "Multilingual",
      "A catalog-backed single-character homophone fallback fixes the original F miss. Test gain is zero; not new holdout evidence.",
      "The first 100-query candidate benchmark remains historical and separate.",
      "Download human-review JSON",
    ],
    ja: [
      "人手による検索レビュー・50件",
      "ユーザー提供、予測が見える単一レビュアー、盲検ではありません。正例44、負例6。元の35 dev / 15 test。",
      "元のF・種類別",
      "正式名称",
      "通称",
      "誤字 / 拼音",
      "説明",
      "多言語",
      "収録名に基づく一文字同音補正で修正。テスト改善0、新しいホールドアウトではありません。",
      "最初の100件の候補評価は履歴として別保存。",
      "レビューJSONを保存",
    ],
    ko: [
      "사람 검색 검토 · 50개",
      "사용자 제공, 예측을 본 한 명의 검토자, 맹검 아님. 양성44 / 음성6; 기존35 dev / 15 test.",
      "기존 F 유형별",
      "정식명",
      "별칭",
      "오타 / 병음",
      "설명",
      "다국어",
      "등록명 한 글자 동음 보정으로 누락 수정. 테스트 향상0이며 새 홀드아웃 검증이 아닙니다.",
      "최초100개 후보 평가는 별도 기록으로 유지.",
      "검토 JSON 다운로드",
    ],
    "zh-TW": [
      "真人搜尋審核 · 50 條",
      "使用者回傳；單一審核人、預測可見，非獨立盲審。44 正例、6 無答案；原劃分35 dev / 15 test。",
      "原F按類型",
      "正式名",
      "暱稱",
      "錯字 / 拼音",
      "描述性",
      "多語言",
      "F_v2以已收錄名稱的單字同音回退修復漏檢。測試增幅0，不是新的未見測試。",
      "首次100條候選基準作為歷史保留，不與人審混合。",
      "下載人審JSON",
    ],
  };
  const pct = (v) => (v == null ? "n.a." : (v * 100).toFixed(2) + "%"),
    num = (v) => (v == null ? "n.a." : v.toFixed(4));
  function panel() {
    const l = labels[I.locale] || labels["zh-CN"];
    const cells = (m) =>
      `<td>${m.answerable}</td><td>${m.no_answer}</td><td>${pct(m.hit_at_1)}</td><td>${pct(m.hit_at_5)}</td><td>${num(m.mrr)}</td><td>${pct(m.no_answer_identification)}</td><td>${num(m.mean_response_ms)}</td>`;
    const head =
      "<thead><tr><th>Method / Type</th><th>Positive N</th><th>No-answer N</th><th>Hit@1</th><th>Hit@5</th><th>MRR</th><th>No-answer</th><th>Mean ms</th></tr></thead>";
    return `<section class="ana-card human-search-review" data-no-translate><h2>${l[0]}</h2><p class="adv-status">human_reviewer_A · 2026-10-12 UTC+1 · 50/100</p><p class="ana-note">${l[1]}</p><div class="adv-scroll"><table>${head}<tbody>${Object.entries(
      R.methods,
    )
      .map(([key, v]) => `<tr><th>${key}</th>${cells(v.all.overall)}</tr>`)
      .join(
        "",
      )}</tbody></table></div><h3>${l[2]}</h3><div class="adv-scroll"><table>${head}<tbody>${Object.entries(
      R.methods.F.all.by_type,
    )
      .map(([type, m], i) => `<tr><th>${l[3 + i]}</th>${cells(m)}</tr>`)
      .join(
        "",
      )}</tbody></table></div><p>${l[8]}</p><p class="ana-note">${l[9]} · timings: Node warm model, not page latency.</p><button class="ana-export" data-human-report>${l[10]} ↓</button></section>`;
  }
  document.addEventListener("click", (e) => {
    if (!e.target.closest("[data-human-report]")) return;
    const url = URL.createObjectURL(
        new Blob([JSON.stringify(R, null, 2)], { type: "application/json" }),
      ),
      a = document.createElement("a");
    a.href = url;
    a.download = "human-search-step12.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  window.NikkiHumanEval = { panel };
})();
