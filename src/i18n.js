(() => {
  "use strict";
  const supported = ["zh-CN", "en", "ja", "ko", "zh-TW"];
  const tags = {
    "zh-CN": "简体中文",
    en: "English",
    ja: "日本語",
    ko: "한국어",
    "zh-TW": "繁體中文",
  };
  let locale = "zh-CN";
  try {
    const saved = localStorage.getItem("miraland-language-v1");
    if (supported.includes(saved)) locale = saved;
  } catch {}
  const source = window.NIKKI_LOCALES?.locales || {};
  const originalText = new WeakMap(),
    originalAttributes = new WeakMap(),
    compiled = {};
  const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  for (const [lang, pack] of Object.entries(source)) {
    const patterns = [],
      parts = [];
    for (const [key, value] of Object.entries(pack.terms).sort(
      (a, b) => b[0].length - a[0].length,
    )) {
      if (key.includes("{")) {
        const keys = [];
        let cursor = 0,
          pattern = "";
        for (const m of key.matchAll(/\{(\w+)\}/g)) {
          pattern += escape(key.slice(cursor, m.index));
          keys.push(m[1]);
          pattern += ["n", "page", "pages", "saved", "owned"].includes(m[1])
            ? "([0-9][0-9,.]*)"
            : "(.+?)";
          cursor = m.index + m[0].length;
        }
        pattern += escape(key.slice(cursor));
        patterns.push({
          re: new RegExp("^" + pattern + "$", "u"),
          keys,
          value,
        });
        parts.push(pattern);
      } else if (/[\u3400-\u9fff]/.test(key)) parts.push(escape(key));
    }
    compiled[lang] = { patterns, re: new RegExp(parts.join("|"), "gu") };
  }
  function t(text) {
    if (locale === "zh-CN" || typeof text !== "string") return text;
    const pack = source[locale],
      c = compiled[locale];
    if (!pack || !c) return text;
    const leading = text.match(/^\s*/)[0],
      trailing = text.match(/\s*$/)[0],
      key = text.trim();
    if (Object.hasOwn(pack.terms, key))
      return leading + pack.terms[key] + trailing;
    const format = (pattern, match) =>
      pattern.value.replace(
        /\{(\w+)\}/g,
        (_, k) => match[pattern.keys.indexOf(k) + 1],
      );
    for (const pattern of c.patterns) {
      const m = key.match(pattern.re);
      if (m) return leading + format(pattern, m) + trailing;
    }
    return text.replace(c.re, (match) => {
      if (Object.hasOwn(pack.terms, match)) return pack.terms[match];
      for (const pattern of c.patterns) {
        const m = match.match(pattern.re);
        if (m) return format(pattern, m);
      }
      return match;
    });
  }
  function name(record) {
    return locale === "zh-CN"
      ? record.name
      : source[locale]?.names[record.id] || record.en || record.name;
  }
  function names(record) {
    return [
      record.name,
      record.en,
      ...Object.values(source).map((p) => p.names[record.id]),
    ].filter(Boolean);
  }
  function terms(text) {
    return [text, ...Object.values(source).map((p) => p.terms[text])].filter(
      Boolean,
    );
  }
  const nicknameChars = {
    镜: "鏡",
    圣: "聖",
    鸟: "鳥",
    鱼: "魚",
    猫: "貓",
    龙: "龍",
    飞: "飛",
    灵: "靈",
    纸: "紙",
    风: "風",
    电: "電",
    鹅: "鵝",
    药: "藥",
    狮: "獅",
    剧: "劇",
  };
  const traditionalNickname = (value) =>
    [...value].map((c) => nicknameChars[c] || c).join("");
  const nickname = (value) =>
    locale === "zh-TW" ? traditionalNickname(value) : value;
  const skip =
    ".language-control,[data-no-translate],script,style,noscript,.card-title,#detail-title,.related span,.material-row b,.detail-text>.en,.alias-link,.nickname-directory span,.nickname-tags,.nickname-guide [data-nickname],.nickname-details li";
  function localize(root = document.body) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (node.parentElement?.closest(skip)) continue;
      const prior = originalText.get(node),
        raw =
          prior && prior.last === node.nodeValue ? prior.raw : node.nodeValue;
      const translated = t(raw);
      if (node.nodeValue !== translated) node.nodeValue = translated;
      originalText.set(node, { raw, last: translated });
    }
    for (const el of root.querySelectorAll(
      "[aria-label],[placeholder],[title],img[alt]",
    )) {
      if (el.closest(".language-control,[data-no-translate]")) continue;
      const previous = originalAttributes.get(el) || {};
      for (const attr of ["aria-label", "placeholder", "title", "alt"]) {
        if (!el.hasAttribute(attr)) continue;
        const value = el.getAttribute(attr),
          old = previous[attr],
          raw = old?.last === value ? old.raw : value,
          translated = t(raw);
        if (value !== translated) el.setAttribute(attr, translated);
        previous[attr] = { raw, last: translated };
      }
      originalAttributes.set(el, previous);
    }
    document.documentElement.lang = locale;
    const selector = document.getElementById("language-select");
    if (selector) selector.value = locale;
    document.title =
      t(document.getElementById("breadcrumb")?.textContent || "套装图鉴") +
      " · " +
      t("奇迹旅册");
  }
  function setLocale(next) {
    if (!supported.includes(next)) return false;
    locale = next;
    try {
      localStorage.setItem("miraland-language-v1", next);
    } catch {}
    document.documentElement.lang = locale;
    document.dispatchEvent(new Event("miraland:languagechange"));
    return true;
  }
  function mount() {
    const form = document.getElementById("global-form");
    if (!form || document.getElementById("language-select")) return;
    const label = document.createElement("label");
    label.className = "language-control";
    label.innerHTML =
      '<span aria-hidden="true">◎</span><select id="language-select" aria-label="Language / 语言 / 言語 / 언어">' +
      supported
        .map(
          (k) =>
            '<option value="' +
            k +
            '" lang="' +
            k +
            '">' +
            tags[k] +
            "</option>",
        )
        .join("") +
      "</select>";
    form.after(label);
    label.querySelector("select").value = locale;
  }
  window.NikkiI18n = {
    t,
    name,
    names,
    terms,
    nickname,
    traditionalNickname,
    localize,
    setLocale,
    mount,
    get locale() {
      return locale;
    },
  };
})();
