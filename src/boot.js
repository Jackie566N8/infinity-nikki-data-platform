(() => {
  "use strict";
  let failure = "";
  const host = () => document.querySelector("#view");
  function fail(message) {
    failure = message;
    const el = host();
    if (el)
      el.innerHTML =
        '<section class="empty" role="alert"><b>✧</b><h1>资料暂未能载入</h1><p>' +
        message +
        '</p><button class="secondary-button" onclick="location.reload()">重新载入</button></section>';
  }
  function verify() {
    const required = [
      "NIKKI_DATA",
      "NikkiI18n",
      "NIKKI_QUALITY",
      "NIKKI_ANALYTICS_DATA",
      "NIKKI_PLANNING_DATA",
      "NikkiWardrobeModel",
    ];
    if (required.some((k) => !window[k])) {
      fail("请完整解压网站文件，再重新打开。已保存的个人资料不会被删除。");
      return false;
    }
    const snapshots = [
      window.NIKKI_QUALITY.snapshot.snapshot_id,
      window.NIKKI_ANALYTICS_DATA.snapshot_id,
      window.NIKKI_PLANNING_DATA.snapshot_id,
      window.NIKKI_ADVANCED_DATA?.provenance.snapshot_id,
    ].filter(Boolean);
    if (new Set(snapshots).size !== 1) {
      fail("本地资料版本不一致，请使用同一份完整的网站包。");
      return false;
    }
    return true;
  }
  document.addEventListener("DOMContentLoaded", () => {
    if (failure) fail(failure);
  });
  window.addEventListener(
    "error",
    (e) => {
      if (e.target?.tagName === "SCRIPT" && !e.target.dataset.optional)
        fail("部分必要资料加载失败，请检查网站文件是否齐全。");
    },
    true,
  );
  window.NikkiBoot = {
    verify,
    fail,
    complete() {
      document.querySelector("#view")?.removeAttribute("aria-busy");
    },
  };
})();
