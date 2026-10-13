(() => {
  "use strict";
  const B = window.NikkiCompanionBrain,
    I = window.NikkiI18n,
    A = window.MiralandArchive;
  if (!B || !I || !A) return;
  const langIndex = { "zh-CN": 0, en: 1, ja: 2, ko: 3, "zh-TW": 4 };
  const C = (key) =>
    window.NIKKI_COMPANION_COPY[key]?.[langIndex[I.locale] ?? 0] || key;
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
  const p = (text) => "<p>" + esc(text) + "</p>";
  const button = (action, label, id = "") =>
    `<button type="button" data-pet-action="${action}" data-pet-id="${esc(id)}">${esc(label)}</button>`;
  function source(url) {
    try {
      const u = new URL(url);
      if (!["https:", "http:"].includes(u.protocol)) return "";
      return `<a href="${esc(u.href)}" target="_blank" rel="noopener noreferrer">${esc(C("source"))}</a>`;
    } catch {
      return "";
    }
  }
  let minimized = false;
  try {
    minimized = localStorage.getItem("miraland-nikki-hidden") === "true";
  } catch {}
  let chatting = false,
    contextId = null,
    interactions = 0,
    bubbleKey = "",
    bubbleTimer,
    animationTimer;
  const messages = [{ answer: { type: "welcome" } }];
  const root = document.createElement("div");
  root.id = "nikki-companion";
  root.dataset.noTranslate = "";
  root.innerHTML = `<div class="nikki-walker"><div class="nikki-bubble" role="status" hidden></div><button type="button" class="nikki-sprite" data-pet-action="play">${window.NIKKI_COMPANION_ART}</button><div class="nikki-tools">${button("chat", "♧")}${button("hide", "−")}</div><span class="nikki-hint"></span></div><button type="button" class="nikki-restore" data-pet-action="restore" hidden></button><section class="nikki-chat" role="dialog" aria-modal="false" aria-labelledby="nikki-chat-title" hidden><header><span class="nikki-chat-star" aria-hidden="true">✧</span><div><h2 id="nikki-chat-title"></h2><p class="nikki-subtitle"></p></div><button type="button" data-pet-action="close">×</button></header><div class="nikki-messages" role="log" aria-live="polite" aria-relevant="additions" tabindex="0"></div><div class="nikki-suggestions"></div><form class="nikki-form"><label class="nikki-sr" for="nikki-question"></label><textarea id="nikki-question" maxlength="500" rows="2"></textarea><button type="submit" class="nikki-send"></button></form><p class="nikki-boundary"></p></section>`;
  document.body.append(root);
  const $ = (s) => root.querySelector(s),
    walker = $(".nikki-walker"),
    sprite = $(".nikki-sprite"),
    chat = $(".nikki-chat"),
    log = $(".nikki-messages"),
    input = $("#nikki-question");
  $('[data-pet-action="chat"]').innerHTML =
    '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M19 14a3 3 0 0 1-3 3h-5l-5 4v-4a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3Z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M7 9h8M7 12h5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
  const portrait = document.createElement("img");
  portrait.alt = "";
  portrait.className = "nikki-chat-portrait";
  portrait.src =
    "data:image/svg+xml;charset=utf-8," +
    encodeURIComponent(window.NIKKI_COMPANION_ART);
  $(".nikki-chat-star").replaceWith(portrait);
  function persist() {
    try {
      localStorage.setItem("miraland-nikki-hidden", String(minimized));
    } catch {}
  }
  function answerHTML(a) {
    if (a.type !== "record")
      return (
        p(C(a.type === "pause" ? "paused" : a.type)) +
        (a.type === "map" ? button("section", C("mapAction"), "map") : "")
      );
    const records = a.ids.map(B.record).filter(Boolean);
    if (!records.length) return p(C("unknown"));
    if (records.length > 1)
      return (
        p(C("choices")) +
        `<div class="nikki-links">${records.map((r) => button("choose", I.name(r), r.id)).join("")}</div>`
      );
    const r = records[0],
      mode = a.intent;
    let html =
      p(C("match")) +
      `<strong class="nikki-record-name">${esc(I.name(r))}</strong>`;
    const smartHit = window.NikkiSmartSearch?.searchConversational(
      a.query || r.name,
    ).find((h) => h.id === r.id);
    if (smartHit) html += p(NikkiSmartSearch.explain(smartHit));
    html += `<div class="nikki-record-meta">${esc([r.star ? "★".repeat(r.star) : "", r.type && I.t(r.type), r.style && I.t(r.style), ...(r.tags || []).map((t) => I.t(t))].filter(Boolean).join(" · "))}</div>`;
    if (["recipe", "stats", "current"].includes(mode)) html += p(C(mode));
    if (["overview", "obtain", "current"].includes(mode)) {
      html += p(I.t(r.obtain || C("missing")));
      if (r.kind === "materials")
        html += r.regions?.length
          ? p(r.regions.map((v) => I.t(v)).join(" · "))
          : p(C("noRegion"));
      if (r.kind === "outfits" && mode === "obtain")
        html += `<p class="nikki-note">${esc(C("current"))}</p>`;
    }
    if (["pieces", "evolution", "parent"].includes(mode)) {
      const ids = mode === "evolution" ? r.group : r.related,
        related = (ids || []).map(B.record).filter(Boolean);
      html += related.length
        ? `<div class="nikki-links">${related.map((v) => button("choose", I.name(v), v.id)).join("")}</div>`
        : p(C("noRelated"));
    }
    html += `<div class="nikki-links">${button("record", C("view"), r.id)}${r.kind === "materials" ? button("section", C("mapAction"), "map") : ""}${source(r.mapSource || r.source)}</div>`;
    return (
      html +
      `<small class="nikki-note">${esc(C("date").replace("{date}", window.NIKKI_DATA.date))}</small>`
    );
  }
  function appendMessage(m) {
    const node = document.createElement("div");
    node.className =
      "nikki-message " + (m.user !== undefined ? "nikki-user" : "nikki-answer");
    if (m.user !== undefined) node.textContent = m.user;
    else node.innerHTML = answerHTML(m.answer);
    log.append(node);
    while (log.children.length > 40) log.firstElementChild.remove();
    log.scrollTop = log.scrollHeight;
  }
  function push(m) {
    messages.push(m);
    if (messages.length > 40) messages.shift();
    appendMessage(m);
  }
  function translate() {
    sprite.setAttribute("aria-label", C("sprite"));
    sprite.title = C("hint");
    $(".nikki-hint").textContent = C("hint");
    $("#nikki-chat-title").textContent = C("title");
    $(".nikki-subtitle").textContent = C("subtitle");
    $(".nikki-boundary").textContent = C("boundary");
    input.placeholder = C("input");
    $(".nikki-form label").textContent = C("input");
    $(".nikki-send").textContent = C("send");
    for (const [action, key] of [
      ["chat", "chat"],
      ["hide", "hide"],
      ["close", "close"],
    ]) {
      const el = $(`[data-pet-action="${action}"]`);
      el.title = C(key);
      el.setAttribute("aria-label", C(key));
    }
    $(".nikki-restore").textContent = "✧ " + C("restore");
    $(".nikki-suggestions").innerHTML = ["qOutfit", "qMaterial", "qHelp"]
      .map((key) => button("suggest", C(key), key))
      .join("");
    const scroll = log.scrollTop;
    log.replaceChildren();
    messages.forEach(appendMessage);
    log.scrollTop = scroll;
    if (bubbleKey) $(".nikki-bubble").textContent = C(bubbleKey);
  }
  function closeChat(focus = true) {
    chatting = false;
    chat.hidden = true;
    if (focus && !minimized) sprite.focus({ preventScroll: true });
  }
  function openChat() {
    chatting = true;
    chat.hidden = false;
    $(".nikki-bubble").hidden = true;
    log.scrollTop = log.scrollHeight;
    input.focus({ preventScroll: true });
  }
  function play() {
    interactions++;
    bubbleKey = "interact" + (((interactions - 1) % 3) + 1);
    $(".nikki-bubble").textContent = C(bubbleKey);
    $(".nikki-bubble").hidden = false;
    clearTimeout(bubbleTimer);
    clearTimeout(animationTimer);
    sprite.classList.remove("is-happy");
    void sprite.offsetWidth;
    sprite.classList.add("is-happy");
    animationTimer = setTimeout(
      () => sprite.classList.remove("is-happy"),
      1800,
    );
    bubbleTimer = setTimeout(() => {
      $(".nikki-bubble").hidden = true;
      bubbleKey = "";
    }, 3800);
  }
  function syncVisibility() {
    walker.hidden = minimized;
    $(".nikki-restore").hidden = !minimized;
    if (minimized) closeChat(false);
    persist();
  }
  function ask(q) {
    q = String(q).trim();
    if (!q) return;
    if (q.length > 500) {
      push({ answer: { type: "tooLong" } });
      return;
    }
    push({ user: q });
    const result = B.answer(q, contextId);
    if (result.type === "record") contextId = result.contextId; // Friendly chatter keeps the last discussed record available.
    push({ answer: result });
  }
  root.addEventListener("click", (e) => {
    const el = e.target.closest("[data-pet-action]");
    if (!el) return;
    const action = el.dataset.petAction,
      id = el.dataset.petId;
    if (action === "play") play();
    else if (action === "chat") openChat();
    else if (action === "close") closeChat();
    else if (action === "hide") {
      minimized = true;
      syncVisibility();
      $(".nikki-restore").focus({ preventScroll: true });
    } else if (action === "restore") {
      minimized = false;
      syncVisibility();
      sprite.focus({ preventScroll: true });
    } else if (action === "suggest") {
      ask(C(id));
      input.focus({ preventScroll: true });
    } else if (action === "choose" && B.record(id)) {
      contextId = id;
      push({
        answer: {
          type: "record",
          ids: [id],
          intent: "overview",
          contextId: id,
        },
      });
    } else if (action === "record") {
      closeChat(false);
      A.openRecord(id);
    } else if (action === "section") {
      closeChat(false);
      A.openSection(id);
    }
  });
  sprite.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    openChat();
  });
  sprite.addEventListener("keydown", (e) => {
    if (e.key === "ContextMenu" || (e.shiftKey && e.key === "F10")) {
      e.preventDefault();
      openChat();
    }
  });
  root.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && chatting) {
      e.preventDefault();
      e.stopPropagation();
      closeChat();
    }
  });
  $(".nikki-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const q = input.value;
    if (!q.trim()) return;
    input.value = "";
    ask(q);
    input.focus({ preventScroll: true });
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      $(".nikki-form").requestSubmit();
    }
  });
  document.addEventListener("miraland:languagechange", translate);
  const detail = document.querySelector("#detail");
  if (detail) {
    const syncModal = () =>
      root.classList.toggle("nikki-obscured", detail.open);
    new MutationObserver(syncModal).observe(detail, {
      attributes: true,
      attributeFilter: ["open"],
    });
    syncModal();
  }
  translate();
  syncVisibility();
})();
