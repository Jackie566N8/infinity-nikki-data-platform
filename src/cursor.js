(() => {
  "use strict";
  const storageKey = "miraland-momo-cursor-v1";
  let enabled = true;
  try {
    enabled = localStorage.getItem(storageKey) !== "off";
  } catch {}
  function update() {
    document.documentElement.dataset.momoCursor = enabled ? "on" : "off";
    const button = document.getElementById("momo-cursor-toggle");
    if (!button) return;
    const t = window.NikkiI18n?.t || ((text) => text);
    button.setAttribute("aria-pressed", String(enabled));
    button.setAttribute("aria-label", t("大喵光标"));
    button.title = t(enabled ? "关闭大喵光标，使用系统光标" : "开启大喵光标");
    button.querySelector(".cursor-toggle-label").textContent = t("大喵光标");
  }
  // Apply the stored preference before rendering, avoiding a cursor flash.
  update();
  function mount() {
    const button = document.getElementById("momo-cursor-toggle");
    if (!button) return;
    button.addEventListener("click", () => {
      enabled = !enabled;
      try {
        localStorage.setItem(storageKey, enabled ? "on" : "off");
      } catch {}
      update();
    });
    window.addEventListener("storage", (event) => {
      if (event.key === storageKey || event.key === null) {
        enabled = event.newValue !== "off";
        update();
      }
    });
    update();
  }
  document.addEventListener("miraland:languagechange", update);
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", mount, { once: true });
  else mount();
})();
