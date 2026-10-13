(() => {
  "use strict";
  const data = window.NIKKI_DATA,
    I = window.NikkiI18n;
  if (!data || !I) return;
  const records = data.records,
    byId = new Map(records.map((r) => [r.id, r]));
  const normalize = (s) =>
    String(s || "")
      .normalize("NFKC")
      .toLocaleLowerCase()
      .replace(/[“”‘’「」『』"']/g, "")
      .replace(/\s+/g, " ")
      .trim();
  const index = new Map();
  function add(term, id, alias = false) {
    term = normalize(term);
    if (term.length < 2) return;
    const values = index.get(term) || [];
    if (!values.some((v) => v.id === id)) values.push({ id, alias });
    index.set(term, values);
  }
  for (const r of records) {
    for (const name of I.names(r)) add(name, r.id);
    if (r.kind === "eurekas")
      for (const name of I.names(r)) add(name.split(/[·:：]/)[0].trim(), r.id);
  }
  for (const entry of data.outfitAliases?.entries || []) {
    for (const alias of entry.aliases) {
      for (const spelling of [alias, I.traditionalNickname(alias)]) {
        const stem = spelling.replace(/套装$|套裝$|套$/, "");
        for (const term of [
          spelling,
          stem + "套",
          stem + "套装",
          stem + "套裝",
          ...(stem.length > 1 ? [stem] : []),
        ])
          add(term, entry.outfitId, true);
      }
    }
  }
  function find(question) {
    const q = normalize(question);
    if (/^(你好|你好呀|hi|hello|こんにちは|안녕)[!！。 .?？]*$/.test(q))
      return [];
    if (window.NikkiSmartSearch) {
      const hits = NikkiSmartSearch.searchConversational(question);
      if (!hits.length) return [];
      const best = hits[0].score;
      return hits
        .filter((h) => h.score >= best - 0.005)
        .slice(0, 6)
        .map((h) => byId.get(h.id))
        .filter(Boolean);
    }
    const scores = new Map();
    for (const [term, matches] of index) {
      if (!q.includes(term)) continue;
      // Do not match short English names inside unrelated words.
      const at = q.indexOf(term);
      if (
        /^[a-z0-9 ]+$/.test(term) &&
        (/[a-z]/.test(q[at - 1] || "") ||
          /[a-z]/.test(q[at + term.length] || ""))
      )
        continue;
      for (const match of matches) {
        const r = byId.get(match.id),
          score = term.length * 10 + (r.variant ? 0 : 1);
        if ((scores.get(r.id) || 0) < score) scores.set(r.id, score);
      }
    }
    const ranked = [...scores].sort((a, b) => b[1] - a[1]);
    if (!ranked.length) return [];
    // The longest explicit name wins over a contained name (e.g. material vs essence).
    const best = ranked[0][1],
      selected = ranked
        .filter(([, score]) => score >= best - 1)
        .map(([id]) => byId.get(id));
    return selected.slice(0, 6);
  }
  function intent(q) {
    if (
      /现在|目前|今天|最新|返场|返場|复刻|復刻|current|today|available now|rerun|今|最新|현재|복각/i.test(
        q,
      )
    )
      return "current";
    if (/配方|制作|製作|recipe|craft|作り方|製作|제작/i.test(q))
      return "recipe";
    if (/多少分|数值|數值|评分|評分|score|stats|スコア|점수|능력치/i.test(q))
      return "stats";
    if (/进化|進化|evol|色違|진화/i.test(q)) return "evolution";
    if (/几件|幾件|哪些部件|部件|pieces|parts|パーツ|부위|구성/i.test(q))
      return "pieces";
    if (/属于|屬於|所属|所屬|belongs|part of|소속/i.test(q)) return "parent";
    if (
      /哪里|哪裡|在哪|哪里|获得|获取|獲得|取得|怎么得|怎麼得|入手|どこ|획득|얻|어디|where|obtain|how.*get/i.test(
        q,
      )
    )
      return "obtain";
    if (
      /风格|風格|属性|屬性|style|スタイル|스타일|タグ|标签|標籤|태그/i.test(q)
    )
      return "style";
    return "overview";
  }
  function answer(question, contextId = null) {
    const q = normalize(question),
      mode = intent(q);
    if (!q) return { type: "help" };
    if (
      contextId &&
      byId.has(contextId) &&
      mode !== "overview" &&
      /^(那|它|她|这个|這個|这套|這套|那套|怎么|怎麼|哪里|哪裡|哪|有|多少|几|幾|什|是|能|可以|现在|現在|目|what|where|how|when|and|it|its|does|is|can|それ|これ|どこ|どう|入手|進化|何|그|이|어디|어떻|몇|지금|획득|진화)/i.test(
        q,
      ) &&
      q.length < 90
    ) {
      return { type: "record", ids: [contextId], intent: mode, contextId };
    }
    const found = find(q);
    if (found.length) {
      return {
        type: "record",
        ids: found.map((r) => r.id),
        intent: mode,
        query: q,
        contextId: found.length === 1 ? found[0].id : null,
      };
    }
    if (/语言|語言|language|言語|언어/.test(q)) return { type: "language" };
    if (/光标|游標|cursor|カーソル|커서/.test(q)) return { type: "cursor" };
    if (/收藏|favorite|お気に入り|즐겨찾기/.test(q))
      return { type: "favorites" };
    if (/暂停|暫停|别动|不要动|stop moving|pause|止ま|정지|멈춰/.test(q))
      return { type: "pause" };

    if (/地图|地圖|map|マップ|지도/.test(q)) return { type: "map" };
    if (/你好|您好|嗨|hello|^hi[ !?.]*$|こんにちは|안녕/.test(q))
      return { type: "hello" };
    if (/谢谢|謝謝|thank|ありがと|고마|감사/.test(q)) return { type: "thanks" };
    if (
      /难过|難過|不开心|不開心|累了|伤心|傷心|sad|tired|悲しい|疲れ|슬퍼|피곤/.test(
        q,
      )
    )
      return { type: "comfort" };
    if (/喜欢你|喜歡你|可爱|可愛|love you|cute|かわいい|귀여|사랑/.test(q))
      return { type: "affection" };
    if (/你是谁|你是誰|你叫什么|你叫什麼|who are you|あなたは|누구/.test(q))
      return { type: "identity" };
    if (/能做什么|能做什麼|帮|幫|help|できる|도움|무엇/.test(q))
      return { type: "help" };
    return { type: "unknown" };
  }
  window.NikkiCompanionBrain = {
    answer,
    record: (id) => byId.get(id),
    normalize,
  };
})();
