// Capture the actual maintained production adapter inputs, excluding unrelated build timestamps.
import fs from "node:fs";
import vm from "node:vm";
import { createHash } from "node:crypto";
export function liveSearchInputs() {
  const capture = {
    createEngine: (documents, aliases) => ({ documents, aliases }),
  };
  const window = {
    NikkiI18n: {},
    NikkiImprovedSearch: capture,
    NikkiHomophoneSearch: capture,
  };
  const context = vm.createContext({
    window,
    requestIdleCallback: () => {},
    setTimeout: () => {},
  });
  for (const file of [
    "data.js",
    "locales.js",
    "analytics-data.js",
    "smart-search-data.js",
    "smart-search.js",
  ])
    vm.runInContext(fs.readFileSync("src/" + file, "utf8"), context, {
      filename: file,
    });
  const input = {
    ...window.NikkiSmartSearch.init(),
    configuration: window.NIKKI_SMART_SEARCH_DATA.configuration,
    selected_method: window.NIKKI_SMART_SEARCH_DATA.selected_method,
  };
  return input;
}
export function liveInputSignature() {
  return createHash("sha256")
    .update(JSON.stringify(liveSearchInputs()))
    .digest("hex");
}
